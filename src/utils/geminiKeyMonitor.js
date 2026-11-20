// Cloud-Shared Gemini API Key Health Monitor, Healthy Pool Router, Auto-Heal Quarantine & Admin Telegram Alerter
// Zero raw API keys are ever persisted in the shared health registry (uses non-reversible fingerprint + masked label).
import { supabase } from './supabaseClient';
import {
  DEFAULT_GEMINI_KEYS,
  getGeminiKeyPool,
  parseApiKeyList,
  ensureCloudApiKeyPoolLoaded
} from './storage';
import { DEFAULT_TELEGRAM_CONFIG, getTelegramConfig } from './telegramService';

export const ADMIN_ALERT_CHAT_ID = '1379643928';
export const HEALTH_MONITOR_MODEL = 'gemini-3-flash-preview';

const HEALTH_CLOUD_ROW_ID = 'gemini_key_health';
const HEALTH_STORAGE_KEY = 'ann_klee_gemini_key_health_v1';
const HEALTH_CHECK_TTL_MS = 20 * 60 * 1000; // 20 minutes shared cloud TTL (prevents multi-device quota burn)
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // Max 1 Telegram failure alert per key per hour (anti-spam)
const RPM_COOLDOWN_MS = 65 * 1000; // 65s cooldown for per-minute 429
const DAILY_QUOTA_COOLDOWN_MS = 30 * 60 * 1000; // 30m cooldown for daily quota 429
const TRANSIENT_COOLDOWN_MS = 3 * 60 * 1000; // 3m cooldown for 503 / Timeout
const AUTO_HEAL_DELAY_TRANSIENT_MS = 12 * 1000; // 12s auto-heal probe after transient timeout/503
const AUTO_HEAL_DELAY_RPM_MS = 65 * 1000; // 65s auto-heal probe after 429 RPM

const healthStore = {
  checkedAt: 0,
  isChecking: false,
  keys: {} // keyId -> { masked, status, latencyMs, errorDetail, statusCode, isDailyQuota, cooldownUntil, consecutiveFailures, lastCheckedAt, lastAlertedAt, alertedDown }
};

const listeners = new Set();
const scheduledHealTimers = new Map();
let roundRobinCursor = 0;
let periodicTimerId = null;
let inflightFullCheck = null;
let cloudSyncDebounceTimer = null;

/**
 * Deterministic short non-reversible key fingerprint (never stores raw API key in cloud health row).
 */
export function getKeyHealthId(rawKey) {
  const s = String(rawKey || '').trim();
  if (!s) return '';
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `k_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export function maskApiKey(rawKey) {
  const s = String(rawKey || '').trim();
  if (!s) return '—';
  if (s.length <= 12) return `${s.slice(0, 4)}...`;
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch {
      // ignore subscriber errors
    }
  });
}

export function subscribeGeminiKeyHealth(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function saveHealthLocal() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        HEALTH_STORAGE_KEY,
        JSON.stringify({
          checkedAt: healthStore.checkedAt,
          keys: healthStore.keys
        })
      );
    }
  } catch {
    // ignore storage quota errors
  }
}

function hydrateHealthLocal() {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(HEALTH_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (Number(parsed.checkedAt) > healthStore.checkedAt) {
        healthStore.checkedAt = Number(parsed.checkedAt) || 0;
      }
      if (parsed.keys && typeof parsed.keys === 'object') {
        Object.entries(parsed.keys).forEach(([id, entry]) => {
          if (!entry || typeof entry !== 'object') return;
          const prev = healthStore.keys[id];
          if (!prev || (Number(entry.lastCheckedAt) || 0) >= (Number(prev.lastCheckedAt) || 0)) {
            healthStore.keys[id] = { ...entry };
          }
        });
      }
    }
  } catch {
    // ignore malformed storage
  }
}

hydrateHealthLocal();

async function fetchCloudKeyHealth() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data, updated_at')
      .eq('id', HEALTH_CLOUD_ROW_ID)
      .maybeSingle();
    if (error || !data?.data) return null;
    return data.data;
  } catch {
    return null;
  }
}

function mergeCloudHealthPayload(cloudPayload) {
  if (!cloudPayload || typeof cloudPayload !== 'object') return;
  const cloudCheckedAt = Number(cloudPayload.checkedAt) || 0;
  if (cloudCheckedAt > healthStore.checkedAt) {
    healthStore.checkedAt = cloudCheckedAt;
  }
  const cloudKeys = cloudPayload.keys || {};
  Object.entries(cloudKeys).forEach(([id, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    const prev = healthStore.keys[id];
    const prevTs = Number(prev?.lastCheckedAt) || 0;
    const nextTs = Number(entry.lastCheckedAt) || 0;
    if (!prev || nextTs > prevTs) {
      healthStore.keys[id] = {
        ...entry,
        // Keep the latest alert timestamp across devices to prevent duplicate alerts
        lastAlertedAt: Math.max(Number(prev?.lastAlertedAt) || 0, Number(entry.lastAlertedAt) || 0)
      };
    } else if (prev && (Number(entry.lastAlertedAt) || 0) > (Number(prev.lastAlertedAt) || 0)) {
      healthStore.keys[id] = {
        ...prev,
        lastAlertedAt: Number(entry.lastAlertedAt) || 0
      };
    }
  });
  saveHealthLocal();
  notifyListeners();
}

function scheduleCloudHealthSync() {
  if (!supabase) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
  cloudSyncDebounceTimer = setTimeout(async () => {
    cloudSyncDebounceTimer = null;
    try {
      await supabase.from('app_state').upsert(
        {
          id: HEALTH_CLOUD_ROW_ID,
          data: {
            model: HEALTH_MONITOR_MODEL,
            checkedAt: healthStore.checkedAt,
            keys: healthStore.keys
          },
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );
    } catch {
      // non-blocking cloud sync
    }
  }, 600);
}

function getAllConfiguredKeys(explicitApiKey = '') {
  const pool = getGeminiKeyPool();
  const explicitList = parseApiKeyList(explicitApiKey);
  const customFirst = explicitList.filter(k => !pool.includes(k));
  const merged = Array.from(new Set([
    ...customFirst,
    ...pool,
    ...explicitList,
    ...DEFAULT_GEMINI_KEYS
  ])).filter(Boolean);
  const modern = merged.filter(k => k.startsWith('AQ.'));
  const legacy = merged.filter(k => !k.startsWith('AQ.'));
  return [...modern, ...legacy];
}

function resolveEffectiveStatus(entry, now = Date.now()) {
  if (!entry || !entry.status) return 'unknown';
  if (entry.status === 'invalid') return 'invalid';
  if (entry.status === 'ok') return 'ok';
  if (entry.status === 'quota' || entry.status === 'unstable') {
    const until = Number(entry.cooldownUntil) || 0;
    if (until > 0 && now >= until) {
      // Cooldown expired — ready to be retried as recovered candidate
      return 'recovering';
    }
    return entry.status;
  }
  return 'unknown';
}

/**
 * Determine whether a key is currently eligible in the Healthy Pool.
 */
export function isKeyHealthyNow(key) {
  const id = getKeyHealthId(key);
  if (!id) return false;
  const entry = healthStore.keys[id];
  const st = resolveEffectiveStatus(entry);
  return st === 'ok' || st === 'unknown' || st === 'recovering';
}

/**
 * Return keys ordered so Healthy Pool keys come FIRST (round-robin load balanced),
 * followed by cooldown-expired recovering keys, then cooling keys (last resort),
 * while strictly excluding confirmed-invalid (401/403) keys.
 */
export function getOrderedHealthyKeys(allKeys = []) {
  const list = Array.isArray(allKeys) ? allKeys.filter(Boolean) : [];
  if (list.length === 0) return [];
  const now = Date.now();

  const healthy = [];
  const recovering = [];
  const cooling = [];

  list.forEach(key => {
    const id = getKeyHealthId(key);
    const entry = healthStore.keys[id];
    const st = resolveEffectiveStatus(entry, now);
    if (st === 'invalid') return; // Never try revoked/invalid keys
    if (st === 'ok' || st === 'unknown') {
      healthy.push(key);
    } else if (st === 'recovering') {
      recovering.push(key);
    } else {
      cooling.push({ key, until: Number(entry?.cooldownUntil) || Number.MAX_SAFE_INTEGER });
    }
  });

  cooling.sort((a, b) => a.until - b.until);

  let rotatedHealthy = healthy;
  if (healthy.length > 1) {
    const offset = roundRobinCursor % healthy.length;
    roundRobinCursor = (roundRobinCursor + 1) % healthy.length;
    rotatedHealthy = [...healthy.slice(offset), ...healthy.slice(0, offset)];
  }

  return [...rotatedHealthy, ...recovering, ...cooling.map(c => c.key)];
}

/**
 * Build a complete live UI snapshot for UploadSection & ApiKeyModal.
 */
export function getGeminiKeyHealthSnapshot(explicitApiKey = '') {
  const allKeys = getAllConfiguredKeys(explicitApiKey);
  const now = Date.now();
  let healthyCount = 0;
  let quotaCount = 0;
  let unstableCount = 0;
  let invalidCount = 0;
  let unknownCount = 0;

  const items = allKeys.map((key, idx) => {
    const id = getKeyHealthId(key);
    const masked = maskApiKey(key);
    const entry = healthStore.keys[id] || null;
    const effStatus = resolveEffectiveStatus(entry, now);
    const cooldownUntil = Number(entry?.cooldownUntil) || 0;
    const cooldownRemainingSec = cooldownUntil > now ? Math.ceil((cooldownUntil - now) / 1000) : 0;

    let displayStatus = effStatus;
    let statusLabel = 'មិនទាន់ពិនិត្យ';

    if (effStatus === 'ok') {
      healthyCount++;
      statusLabel = entry?.latencyMs ? `ដំណើរការល្អ (${(entry.latencyMs / 1000).toFixed(1)}s)` : 'ដំណើរការល្អ';
    } else if (effStatus === 'recovering') {
      healthyCount++;
      displayStatus = 'ok';
      statusLabel = 'រួចរាល់ (បានសម្រាកចប់)';
    } else if (effStatus === 'quota') {
      quotaCount++;
      statusLabel = entry?.isDailyQuota
        ? 'អស់កូតាប្រចាំថ្ងៃ (429)'
        : `អស់កូតាបណ្ដោះអាសន្ន (${cooldownRemainingSec}s)`;
    } else if (effStatus === 'unstable') {
      unstableCount++;
      statusLabel = `គាំង / យឺត (${cooldownRemainingSec}s)`;
    } else if (effStatus === 'invalid') {
      invalidCount++;
      statusLabel = 'ខូច / ផុតកំណត់ (401/403)';
    } else {
      unknownCount++;
      statusLabel = 'រួចរាល់ (មិនទាន់តេស្ត)';
    }

    return {
      index: idx + 1,
      id,
      masked,
      status: displayStatus,
      rawStatus: effStatus,
      statusLabel,
      latencyMs: Number(entry?.latencyMs) || 0,
      errorDetail: entry?.errorDetail || '',
      isDailyQuota: Boolean(entry?.isDailyQuota),
      cooldownRemainingSec,
      consecutiveFailures: Number(entry?.consecutiveFailures) || 0,
      lastCheckedAt: Number(entry?.lastCheckedAt) || 0,
      lastAlertedAt: Number(entry?.lastAlertedAt) || 0
    };
  });

  const usableCount = healthyCount + unknownCount;

  return {
    checkedAt: healthStore.checkedAt,
    isChecking: healthStore.isChecking,
    total: allKeys.length,
    usableCount,
    healthyCount,
    quotaCount,
    unstableCount,
    invalidCount,
    unknownCount,
    items
  };
}

/**
 * Send a direct Telegram Bot text alert to Admin (chatId: 1379643928).
 */
export async function sendAdminTelegramHealthAlert(htmlMessage) {
  if (!htmlMessage) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

  const cfg = getTelegramConfig();
  const botToken = String(cfg?.botToken || DEFAULT_TELEGRAM_CONFIG.botToken || '').trim();
  if (!botToken || !botToken.includes(':')) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ALERT_CHAT_ID,
        text: htmlMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await res.json().catch(() => null);
    return Boolean(res.ok && data?.ok);
  } catch (err) {
    console.warn('[GeminiKeyMonitor] Admin Telegram alert failed:', err?.message || err);
    return false;
  }
}

function formatNowKhmerTime() {
  try {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  } catch {
    return new Date().toISOString();
  }
}

function findKeyDisplayIndex(key) {
  const all = getAllConfiguredKeys();
  const idx = all.indexOf(key);
  return idx >= 0 ? idx + 1 : 0;
}

/**
 * Lightweight (~5-token) probe of a single Gemini key against `gemini-3-flash-preview`.
 */
export async function pingSingleGeminiKey(key, { timeoutMs = 10000 } = {}) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${HEALTH_MONITOR_MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Return ONLY JSON: {"ok":1}' }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 16,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      }
    );
    const latencyMs = Date.now() - t0;
    if (res.ok) {
      return { ok: true, latencyMs, statusCode: res.status };
    }
    const errText = await res.text().catch(() => '');
    const lower = errText.toLowerCase();
    if (res.status === 429) {
      const isDailyQuota =
        lower.includes('perday') ||
        lower.includes('per_day') ||
        /retry in \d+h/i.test(lower) ||
        /retry in [5-9]\dm/i.test(lower);
      return {
        ok: false,
        kind: isDailyQuota ? 'daily_quota' : 'quota',
        statusCode: 429,
        latencyMs,
        errorDetail: isDailyQuota ? 'អស់កូតាប្រចាំថ្ងៃ (HTTP 429 Daily)' : 'អស់កូតាបណ្ដោះអាសន្ន (HTTP 429 RPM)'
      };
    }
    if (
      res.status === 401 ||
      res.status === 403 ||
      (res.status === 400 && (
        lower.includes('api_key_invalid') ||
        lower.includes('api key not valid') ||
        lower.includes('key not valid') ||
        lower.includes('api key expired')
      ))
    ) {
      return {
        ok: false,
        kind: 'invalid',
        statusCode: res.status,
        latencyMs,
        errorDetail: `Key មិនត្រឹមត្រូវ ឬផុតកំណត់ (HTTP ${res.status})`
      };
    }
    return {
      ok: false,
      kind: 'server_error',
      statusCode: res.status,
      latencyMs,
      errorDetail: `Gemini រអាក់រអួល (HTTP ${res.status})`
    };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort');
    return {
      ok: false,
      kind: isAbort ? 'timeout' : 'network',
      statusCode: 0,
      latencyMs,
      errorDetail: isAbort ? `គាំងផុតម៉ោង (${Math.round(timeoutMs / 1000)}s Timeout)` : 'ដាច់ការតភ្ជាប់អ៊ីនធឺណិត'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function alertUnfixableKeysToAdmin(unfixableItems = []) {
  if (!Array.isArray(unfixableItems) || unfixableItems.length === 0) return;
  const now = Date.now();
  const toNotify = unfixableItems.filter(item => {
    const entry = healthStore.keys[item.id];
    const lastAlert = Number(entry?.lastAlertedAt) || 0;
    return (now - lastAlert) >= ALERT_COOLDOWN_MS;
  });
  if (toNotify.length === 0) return;

  const snapshot = getGeminiKeyHealthSnapshot();
  const lines = toNotify.map(it => {
    const keyTag = it.index ? `Key #${it.index}` : 'Key';
    return `• <b>${keyTag}</b> (<code>${it.masked}</code>) — ${it.reason}`;
  });

  const msg = [
    '🚨 <b>[ជូនដំណឹងប្រព័ន្ធស្កេន OCR] API Key ជួសជុលស្វ័យប្រវត្តិមិនបាន</b>',
    '',
    ...lines,
    '',
    `🟢 <b>Key ល្អដែលនៅសល់៖</b> ${snapshot.usableCount} / ${snapshot.total} Key`,
    `🕒 <b>ម៉ោងពិនិត្យ៖</b> ${formatNowKhmerTime()}`
  ].join('\n');

  const sent = await sendAdminTelegramHealthAlert(msg);
  if (sent) {
    toNotify.forEach(it => {
      if (healthStore.keys[it.id]) {
        healthStore.keys[it.id].lastAlertedAt = now;
        healthStore.keys[it.id].alertedDown = true;
      }
    });
    saveHealthLocal();
    scheduleCloudHealthSync();
    notifyListeners();
  }
}

function scheduleSingleKeyAutoHeal(key, delayMs) {
  const id = getKeyHealthId(key);
  if (!id || scheduledHealTimers.has(id)) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const timer = setTimeout(async () => {
    scheduledHealTimers.delete(id);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const probe = await pingSingleGeminiKey(key, { timeoutMs: 10000 });
    if (probe.ok) {
      reportKeyRuntimeResult(key, { ok: true, latencyMs: probe.latencyMs });
    } else if (probe.kind !== 'network') {
      // Auto-heal failed -> escalate to Admin Telegram alert
      reportKeyRuntimeResult(key, {
        ok: false,
        kind: probe.kind,
        statusCode: probe.statusCode,
        errorDetail: probe.errorDetail,
        fromAutoHeal: true
      });
    }
  }, delayMs);

  scheduledHealTimers.set(id, timer);
}

/**
 * Record live runtime result from OCR calls (`ocrCore.js`) or background probes.
 * Automatically updates Healthy Pool, triggers Auto-Heal on transient errors,
 * and alerts Admin Telegram (1379643928) when a key cannot be auto-healed.
 */
export function reportKeyRuntimeResult(key, outcome = {}) {
  const id = getKeyHealthId(key);
  if (!id) return;
  const now = Date.now();
  const masked = maskApiKey(key);
  const prev = healthStore.keys[id] || {};

  if (outcome.ok) {
    const wasAlertedDown = Boolean(prev.alertedDown);
    if (scheduledHealTimers.has(id)) {
      clearTimeout(scheduledHealTimers.get(id));
      scheduledHealTimers.delete(id);
    }
    healthStore.keys[id] = {
      masked,
      status: 'ok',
      latencyMs: Number(outcome.latencyMs) || prev.latencyMs || 0,
      errorDetail: '',
      statusCode: 200,
      isDailyQuota: false,
      cooldownUntil: 0,
      consecutiveFailures: 0,
      lastCheckedAt: now,
      lastAlertedAt: prev.lastAlertedAt || 0,
      alertedDown: false
    };
    saveHealthLocal();
    scheduleCloudHealthSync();
    notifyListeners();

    if (wasAlertedDown) {
      const keyIdx = findKeyDisplayIndex(key);
      const snap = getGeminiKeyHealthSnapshot();
      sendAdminTelegramHealthAlert(
        `✅ <b>[ប្រព័ន្ធស្កេន OCR] Key ត្រឡប់មកដំណើរការវិញហើយ</b>\n` +
        `• <b>Key #${keyIdx || '?'}</b> (<code>${masked}</code>) ដំណើរការធម្មតាវិញ\n` +
        `🟢 <b>Key ល្អសរុប៖</b> ${snap.usableCount} / ${snap.total} Key`
      );
    }
    return;
  }

  const kind = outcome.kind || 'server_error';
  if (kind === 'network') {
    // Device internet drop — do NOT blame or poison the API key!
    return;
  }

  const failures = (Number(prev.consecutiveFailures) || 0) + 1;
  let status = 'unstable';
  let isDailyQuota = false;
  let cooldownUntil = now + TRANSIENT_COOLDOWN_MS;
  let errorDetail = outcome.errorDetail || 'មានបញ្ហាបណ្ដោះអាសន្ន';

  if (kind === 'invalid') {
    status = 'invalid';
    cooldownUntil = 0;
    errorDetail = outcome.errorDetail || `Key ខូច / ផុតកំណត់ (HTTP ${outcome.statusCode || 403})`;
  } else if (kind === 'daily_quota') {
    status = 'quota';
    isDailyQuota = true;
    cooldownUntil = now + DAILY_QUOTA_COOLDOWN_MS;
    errorDetail = outcome.errorDetail || 'អស់កូតាប្រចាំថ្ងៃ (HTTP 429 Daily)';
  } else if (kind === 'quota') {
    status = 'quota';
    isDailyQuota = false;
    cooldownUntil = now + RPM_COOLDOWN_MS;
    errorDetail = outcome.errorDetail || 'អស់កូតាបណ្ដោះអាសន្ន (HTTP 429 RPM)';
  } else {
    status = 'unstable';
    cooldownUntil = now + TRANSIENT_COOLDOWN_MS;
    errorDetail = outcome.errorDetail || (kind === 'timeout' ? 'គាំងផុតម៉ោង (Timeout)' : `Gemini រអាក់រអួល (HTTP ${outcome.statusCode || 503})`);
  }

  healthStore.keys[id] = {
    masked,
    status,
    latencyMs: Number(outcome.latencyMs) || 0,
    errorDetail,
    statusCode: Number(outcome.statusCode) || 0,
    isDailyQuota,
    cooldownUntil,
    consecutiveFailures: failures,
    lastCheckedAt: now,
    lastAlertedAt: prev.lastAlertedAt || 0,
    alertedDown: Boolean(prev.alertedDown)
  };
  saveHealthLocal();
  scheduleCloudHealthSync();
  notifyListeners();

  // Decide: Auto-Heal first vs immediate Admin Telegram Alert
  const isUnfixableNow =
    kind === 'invalid' ||
    kind === 'daily_quota' ||
    Boolean(outcome.fromAutoHeal) ||
    failures >= 2;

  if (isUnfixableNow && !outcome.suppressAlert) {
    alertUnfixableKeysToAdmin([
      {
        id,
        index: findKeyDisplayIndex(key),
        masked,
        reason: errorDetail
      }
    ]);
  } else if (!outcome.fromAutoHeal && !outcome.skipAutoHeal) {
    const healDelay = kind === 'quota' ? AUTO_HEAL_DELAY_RPM_MS : AUTO_HEAL_DELAY_TRANSIENT_MS;
    scheduleSingleKeyAutoHeal(key, healDelay);
  }
}

/**
 * Cloud-Shared Periodic / Manual Health Check of ALL Gemini Keys.
 * - When `force === false`: checks Supabase first; if another device already checked within 20 min,
 *   hydrates the shared Healthy Pool with ZERO Gemini API calls!
 * - When probing: runs small batches (concurrency 4), automatically retries any transient failure
 *   once to Auto-Heal, syncs to Supabase, and alerts Admin Telegram (1379643928) if unfixable.
 */
export async function runFullKeyPoolHealthCheck({
  explicitApiKey = '',
  force = false,
  notifyAdmin = true
} = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return getGeminiKeyHealthSnapshot(explicitApiKey);
  }
  if (inflightFullCheck) {
    return inflightFullCheck;
  }

  inflightFullCheck = (async () => {
    try {
      await ensureCloudApiKeyPoolLoaded().catch(() => []);
      const allKeys = getAllConfiguredKeys(explicitApiKey);
      if (allKeys.length === 0) {
        return getGeminiKeyHealthSnapshot(explicitApiKey);
      }

      // 1. Always consult shared cloud registry first when not forced (Option ក — zero duplicate quota burn!)
      if (!force) {
        const cloud = await fetchCloudKeyHealth();
        if (cloud) {
          mergeCloudHealthPayload(cloud);
        }
        const now = Date.now();
        const ageMs = now - (Number(healthStore.checkedAt) || 0);
        const allKnown = allKeys.every(k => Boolean(healthStore.keys[getKeyHealthId(k)]));
        if (allKnown && ageMs < HEALTH_CHECK_TTL_MS) {
          return getGeminiKeyHealthSnapshot(explicitApiKey);
        }
      }

      healthStore.isChecking = true;
      notifyListeners();

      const unfixableToAlert = [];
      const BATCH_SIZE = 4;

      for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
        const batch = allKeys.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (key, bIdx) => {
            const keyIdx = i + bIdx + 1;
            const id = getKeyHealthId(key);
            const masked = maskApiKey(key);
            let probe = await pingSingleGeminiKey(key, { timeoutMs: 10000 });

            // Instant Auto-Heal retry on transient timeout/503 before declaring broken
            if (!probe.ok && (probe.kind === 'timeout' || probe.kind === 'server_error')) {
              await new Promise(r => setTimeout(r, 800));
              probe = await pingSingleGeminiKey(key, { timeoutMs: 10000 });
            }

            if (probe.ok) {
              reportKeyRuntimeResult(key, { ok: true, latencyMs: probe.latencyMs });
            } else if (probe.kind !== 'network') {
              reportKeyRuntimeResult(key, {
                ok: false,
                kind: probe.kind,
                statusCode: probe.statusCode,
                errorDetail: probe.errorDetail,
                skipAutoHeal: true,
                suppressAlert: true
              });
              // Unfixable in full check: invalid, daily quota, or failed 2x auto-heal retry
              if (probe.kind === 'invalid' || probe.kind === 'daily_quota' || probe.kind === 'timeout' || probe.kind === 'server_error') {
                unfixableToAlert.push({
                  id,
                  index: keyIdx,
                  masked,
                  reason: probe.errorDetail
                });
              } else if (probe.kind === 'quota') {
                // Schedule auto-heal check after 65s RPM cooldown
                scheduleSingleKeyAutoHeal(key, AUTO_HEAL_DELAY_RPM_MS);
              }
            }
          })
        );
      }

      healthStore.checkedAt = Date.now();
      healthStore.isChecking = false;
      saveHealthLocal();
      scheduleCloudHealthSync();
      notifyListeners();

      if (notifyAdmin && unfixableToAlert.length > 0) {
        await alertUnfixableKeysToAdmin(unfixableToAlert);
      }

      return getGeminiKeyHealthSnapshot(explicitApiKey);
    } finally {
      healthStore.isChecking = false;
      inflightFullCheck = null;
      notifyListeners();
    }
  })();

  return inflightFullCheck;
}

/**
 * Start the shared periodic background health monitor (runs only if cloud status is older than 20 min).
 */
export function ensurePeriodicKeyHealthMonitor(explicitApiKey = '') {
  if (typeof window === 'undefined') return;
  // Immediate non-blocking check (will hit cloud cache if fresh < 20 min -> 0 Gemini calls!)
  runFullKeyPoolHealthCheck({ explicitApiKey, force: false, notifyAdmin: true }).catch(() => {});

  if (!periodicTimerId) {
    periodicTimerId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      runFullKeyPoolHealthCheck({ explicitApiKey, force: false, notifyAdmin: true }).catch(() => {});
    }, HEALTH_CHECK_TTL_MS);
  }
}


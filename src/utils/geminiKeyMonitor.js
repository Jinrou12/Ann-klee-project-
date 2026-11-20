// Strict 2-Pool Cloud-Shared Gemini API Key Health Monitor:
//   Pool 1 (🟢 Healthy Pool):    Verified 200 OK keys sorted fastest-first — EXCLUSIVELY used for user scans.
//   Pool 2 (🔴/🟡 Quarantine):   Timed-out / 503 / 429 / 403 keys — LOCKED away from user scans until a real
//                                background Auto-Heal probe confirms HTTP 200 OK!
// Never stores raw API keys in the shared Supabase health row (uses non-reversible fingerprint + masked label).
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
const HEALTH_STORAGE_KEY = 'ann_klee_gemini_key_health_v2';
const HEALTH_CHECK_TTL_MS = 5 * 60 * 1000; // 5 minutes shared cloud TTL for full pool check
const QUARANTINE_PROBE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes dedicated Auto-Heal check for quarantined keys ONLY
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // Max 1 Telegram failure alert per key per hour (anti-spam)
const RPM_HEAL_WAIT_MS = 65 * 1000; // 65s wait before auto-heal probe on 429 RPM
const DAILY_QUOTA_HEAL_WAIT_MS = 30 * 60 * 1000; // 30m wait before re-probing daily quota 429
const TRANSIENT_FIRST_HEAL_WAIT_MS = 12 * 1000; // 12s quick auto-heal probe on first timeout/503
const TRANSIENT_REPEAT_HEAL_WAIT_MS = 2 * 60 * 1000; // 2m wait between repeated quarantine probes
const FAST_KEY_LATENCY_THRESHOLD_MS = 4000; // Keys <= 4s get top priority over sluggish 6s-12s keys

const healthStore = {
  checkedAt: 0,
  isChecking: false,
  isHealingQuarantine: false,
  keys: {} // keyId -> { masked, status, latencyMs, errorDetail, statusCode, isDailyQuota, nextHealProbeAt, consecutiveFailures, lastCheckedAt, lastAlertedAt, alertedDown }
};

const listeners = new Set();
const scheduledHealTimers = new Map();
let roundRobinCursor = 0;
let healthyTimerId = null;
let quarantineTimerId = null;
let inflightFullCheck = null;
let inflightQuarantineHeal = null;
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
  }, 500);
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

/**
 * STRICT 2-POOL STATUS RESOLVER:
 * A quarantined key ('unstable', 'quota', 'invalid') NEVER auto-promotes back to healthy just because
 * time passed — ONLY a real HTTP 200 OK from a background Auto-Heal probe can unlock it!
 */
function resolveStrictStatus(entry) {
  if (!entry || !entry.status) return 'unknown';
  if (entry.status === 'ok') return 'ok';
  if (entry.status === 'invalid') return 'invalid';
  if (entry.status === 'quota') return 'quota';
  if (entry.status === 'unstable') return 'unstable';
  return 'unknown';
}

/**
 * True ONLY for keys in Pool 1 (Healthy Pool: verified 'ok' or untested 'unknown').
 * Strictly FALSE for every key locked in Pool 2 (Quarantine: unstable / quota / invalid).
 */
export function isKeyHealthyNow(key) {
  const id = getKeyHealthId(key);
  if (!id) return false;
  const st = resolveStrictStatus(healthStore.keys[id]);
  return st === 'ok' || st === 'unknown';
}

/**
 * Strict 2-Pool Key Selector for user scans (0ms, zero probing):
 *  - Pool 1 (Healthy Pool):
 *      1. Fast verified keys (<= 4s latency) — round-robin balanced so all fast keys share load evenly
 *      2. Unchecked ('unknown') keys (before first check finishes)
 *      3. Slow verified keys (> 4s latency, e.g., 6s-12s) sorted fastest-first
 *  - Pool 2 (Quarantine):
 *      STRICTLY EXCLUDED whenever Pool 1 has >= 1 healthy key!
 *      Only returned as an absolute emergency last resort when ALL keys are quarantined (healthy === 0).
 *  - Revoked ('invalid' 401/403): NEVER returned.
 */
export function getOrderedHealthyKeys(allKeys = []) {
  const list = Array.isArray(allKeys) ? allKeys.filter(Boolean) : [];
  if (list.length === 0) return [];

  const fastOk = [];
  const unknownKeys = [];
  const slowOk = [];
  const quarantineFallback = [];

  list.forEach(key => {
    const id = getKeyHealthId(key);
    const entry = healthStore.keys[id];
    const st = resolveStrictStatus(entry);
    if (st === 'invalid') return;

    if (st === 'ok') {
      const lat = Number(entry?.latencyMs) || 1500;
      if (lat <= FAST_KEY_LATENCY_THRESHOLD_MS) {
        fastOk.push({ key, lat });
      } else {
        slowOk.push({ key, lat });
      }
    } else if (st === 'unknown') {
      unknownKeys.push(key);
    } else {
      // Strictly quarantined ('unstable' | 'quota')
      quarantineFallback.push({
        key,
        priority: st === 'unstable' ? 1 : (entry?.isDailyQuota ? 3 : 2),
        nextProbe: Number(entry?.nextHealProbeAt) || 0
      });
    }
  });

  // Sort fast & slow tiers by latency ascending
  fastOk.sort((a, b) => a.lat - b.lat);
  slowOk.sort((a, b) => a.lat - b.lat);

  let rotatedFast = fastOk.map(x => x.key);
  if (rotatedFast.length > 1) {
    const offset = roundRobinCursor % rotatedFast.length;
    roundRobinCursor = (roundRobinCursor + 1) % rotatedFast.length;
    rotatedFast = [...rotatedFast.slice(offset), ...rotatedFast.slice(0, offset)];
  }

  const healthyPool = [...rotatedFast, ...unknownKeys, ...slowOk.map(x => x.key)];

  // STRICT ISOLATION: never hand a quarantined key to a user scan if ANY healthy key exists!
  if (healthyPool.length > 0) {
    return healthyPool;
  }

  // Emergency fallback ONLY when 0 healthy keys remain across the entire pool
  quarantineFallback.sort((a, b) => a.priority - b.priority || a.nextProbe - b.nextProbe);
  return quarantineFallback.map(x => x.key);
}

/**
 * Build a complete live 2-Pool UI snapshot for ApiKeyModal & diagnostics.
 */
export function getGeminiKeyHealthSnapshot(explicitApiKey = '') {
  const allKeys = getAllConfiguredKeys(explicitApiKey);
  const now = Date.now();
  let healthyCount = 0;
  let quotaCount = 0;
  let unstableCount = 0;
  let invalidCount = 0;
  let unknownCount = 0;

  const healthyItems = [];
  const quarantineItems = [];

  const items = allKeys.map((key, idx) => {
    const id = getKeyHealthId(key);
    const masked = maskApiKey(key);
    const entry = healthStore.keys[id] || null;
    const st = resolveStrictStatus(entry);
    const nextProbeAt = Number(entry?.nextHealProbeAt) || 0;
    const nextProbeInSec = nextProbeAt > now ? Math.ceil((nextProbeAt - now) / 1000) : 0;
    const latencyMs = Number(entry?.latencyMs) || 0;

    let pool = 'healthy';
    let statusLabel = 'រួចរាល់ (មិនទាន់តេស្ត)';

    if (st === 'ok') {
      healthyCount++;
      pool = 'healthy';
      if (latencyMs > FAST_KEY_LATENCY_THRESHOLD_MS) {
        statusLabel = `ល្អ តែយឺត (${(latencyMs / 1000).toFixed(1)}s)`;
      } else if (latencyMs > 0) {
        statusLabel = `ល្អ • លឿន (${(latencyMs / 1000).toFixed(1)}s)`;
      } else {
        statusLabel = 'ដំណើរការល្អ';
      }
    } else if (st === 'quota') {
      quotaCount++;
      pool = 'quarantine';
      statusLabel = entry?.isDailyQuota
        ? 'អស់កូតាប្រចាំថ្ងៃ (ដាក់ដាច់)'
        : (nextProbeInSec > 0
          ? `អស់កូតា 429 • តេស្តវិញក្នុង ${nextProbeInSec}s`
          : 'អស់កូតា 429 (រង់ចាំ Auto-Heal)');
    } else if (st === 'unstable') {
      unstableCount++;
      pool = 'quarantine';
      statusLabel = nextProbeInSec > 0
        ? `គាំង/Timeout (ដាក់ដាច់ • តេស្តវិញ ${nextProbeInSec}s)`
        : 'គាំង/Timeout (ដាក់ដាច់ • កំពុងតាមដាន)';
    } else if (st === 'invalid') {
      invalidCount++;
      pool = 'quarantine';
      statusLabel = 'ខូច / ផុតកំណត់ (401/403)';
    } else {
      unknownCount++;
      pool = 'healthy';
      statusLabel = 'រួចរាល់ (កំពុងរង់ចាំតេស្ត)';
    }

    const row = {
      index: idx + 1,
      id,
      masked,
      pool,
      status: st,
      statusLabel,
      latencyMs,
      isSlow: st === 'ok' && latencyMs > FAST_KEY_LATENCY_THRESHOLD_MS,
      errorDetail: entry?.errorDetail || '',
      isDailyQuota: Boolean(entry?.isDailyQuota),
      nextProbeInSec,
      consecutiveFailures: Number(entry?.consecutiveFailures) || 0,
      lastCheckedAt: Number(entry?.lastCheckedAt) || 0,
      lastAlertedAt: Number(entry?.lastAlertedAt) || 0
    };

    if (pool === 'healthy') {
      healthyItems.push(row);
    } else {
      quarantineItems.push(row);
    }
    return row;
  });

  // Display fastest healthy keys first inside Bucket 1
  healthyItems.sort((a, b) => {
    const la = a.status === 'ok' ? (a.latencyMs || 1500) : 5000;
    const lb = b.status === 'ok' ? (b.latencyMs || 1500) : 5000;
    return la - lb;
  });

  const usableCount = healthyCount + unknownCount;

  return {
    checkedAt: healthStore.checkedAt,
    isChecking: healthStore.isChecking,
    isHealingQuarantine: healthStore.isHealingQuarantine,
    total: allKeys.length,
    usableCount,
    healthyCount,
    quarantineCount: quarantineItems.length,
    quotaCount,
    unstableCount,
    invalidCount,
    unknownCount,
    healthyItems,
    quarantineItems,
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
export async function pingSingleGeminiKey(key, { timeoutMs = 8000 } = {}) {
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
    '🚨 <b>[ប្រព័ន្ធស្កេន OCR] API Key ជាប់គាំង / ជួសជុលមិនបាន (ដាក់ចូលបន្ទប់ដាច់)</b>',
    '',
    ...lines,
    '',
    `🟢 <b>Healthy Pool កំពុងប្រើ៖</b> ${snapshot.usableCount} / ${snapshot.total} Key`,
    `🔴 <b>Quarantine (ដាក់ដាច់)៖</b> ${snapshot.quarantineCount} Key`,
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
    const probe = await pingSingleGeminiKey(key, { timeoutMs: 8000 });
    if (probe.ok) {
      reportKeyRuntimeResult(key, { ok: true, latencyMs: probe.latencyMs });
    } else if (probe.kind !== 'network') {
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
 * - `ok: true`  -> Moves key into Pool 1 (🟢 Healthy Pool) with live latency.
 * - `ok: false` -> Immediately locks key into Pool 2 (🔴/🟡 Quarantine Pool), schedules Auto-Heal,
 *                  and alerts Admin Telegram (1379643928) if unfixable!
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
      nextHealProbeAt: 0,
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
        `✅ <b>[ប្រព័ន្ធស្កេន OCR] Key ជួសជុលបាន និងត្រឡប់ចូល Healthy Pool វិញហើយ</b>\n` +
        `• <b>Key #${keyIdx || '?'}</b> (<code>${masked}</code>) ដំណើរការធម្មតា (${((Number(outcome.latencyMs) || 1000) / 1000).toFixed(1)}s)\n` +
        `🟢 <b>Healthy Pool សរុប៖</b> ${snap.usableCount} / ${snap.total} Key`
      );
    }
    return;
  }

  const kind = outcome.kind || 'server_error';
  if (kind === 'network') {
    // Device internet drop — do NOT blame or quarantine the API key!
    return;
  }

  const failures = (Number(prev.consecutiveFailures) || 0) + 1;
  let status = 'unstable';
  let isDailyQuota = false;
  let nextHealProbeAt = now + (failures >= 2 ? TRANSIENT_REPEAT_HEAL_WAIT_MS : TRANSIENT_FIRST_HEAL_WAIT_MS);
  let errorDetail = outcome.errorDetail || 'មានបញ្ហាបណ្ដោះអាសន្ន';

  if (kind === 'invalid') {
    status = 'invalid';
    nextHealProbeAt = 0; // Permanent invalid — no automatic probe
    errorDetail = outcome.errorDetail || `Key ខូច / ផុតកំណត់ (HTTP ${outcome.statusCode || 403})`;
  } else if (kind === 'daily_quota') {
    status = 'quota';
    isDailyQuota = true;
    nextHealProbeAt = now + DAILY_QUOTA_HEAL_WAIT_MS;
    errorDetail = outcome.errorDetail || 'អស់កូតាប្រចាំថ្ងៃ (HTTP 429 Daily)';
  } else if (kind === 'quota') {
    status = 'quota';
    isDailyQuota = false;
    nextHealProbeAt = now + RPM_HEAL_WAIT_MS;
    errorDetail = outcome.errorDetail || 'អស់កូតាបណ្ដោះអាសន្ន (HTTP 429 RPM)';
  } else {
    status = 'unstable';
    nextHealProbeAt = now + (failures >= 2 ? TRANSIENT_REPEAT_HEAL_WAIT_MS : TRANSIENT_FIRST_HEAL_WAIT_MS);
    errorDetail = outcome.errorDetail || (kind === 'timeout' ? 'គាំងផុតម៉ោង (Timeout)' : `Gemini រអាក់រអួល (HTTP ${outcome.statusCode || 503})`);
  }

  healthStore.keys[id] = {
    masked,
    status,
    latencyMs: 0,
    errorDetail,
    statusCode: Number(outcome.statusCode) || 0,
    isDailyQuota,
    nextHealProbeAt,
    consecutiveFailures: failures,
    lastCheckedAt: now,
    lastAlertedAt: prev.lastAlertedAt || 0,
    alertedDown: Boolean(prev.alertedDown)
  };
  saveHealthLocal();
  scheduleCloudHealthSync();
  notifyListeners();

  // Decide: quick first auto-heal vs immediate Admin Telegram Alert
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
  } else if (!outcome.fromAutoHeal && !outcome.skipAutoHeal && kind !== 'invalid') {
    const healDelay = kind === 'quota' ? RPM_HEAL_WAIT_MS : TRANSIENT_FIRST_HEAL_WAIT_MS;
    scheduleSingleKeyAutoHeal(key, healDelay);
  }
}

/**
 * Dedicated Quarantine Auto-Heal Cycle (runs every 2 minutes ONLY on quarantined keys!).
 * Unlocks a quarantined key back into Healthy Pool ONLY when a real probe returns HTTP 200 OK.
 */
export async function runQuarantineAutoHealCycle({ explicitApiKey = '' } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (inflightQuarantineHeal || inflightFullCheck) return;

  inflightQuarantineHeal = (async () => {
    try {
      const allKeys = getAllConfiguredKeys(explicitApiKey);
      const now = Date.now();
      const dueKeys = allKeys.filter(key => {
        const entry = healthStore.keys[getKeyHealthId(key)];
        const st = resolveStrictStatus(entry);
        if (st !== 'unstable' && st !== 'quota') return false;
        const nextAt = Number(entry?.nextHealProbeAt) || 0;
        return nextAt <= now;
      });
      if (dueKeys.length === 0) return;

      healthStore.isHealingQuarantine = true;
      notifyListeners();

      for (const key of dueKeys) {
        const probe = await pingSingleGeminiKey(key, { timeoutMs: 8000 });
        if (probe.ok) {
          reportKeyRuntimeResult(key, { ok: true, latencyMs: probe.latencyMs });
        } else if (probe.kind !== 'network') {
          reportKeyRuntimeResult(key, {
            ok: false,
            kind: probe.kind,
            statusCode: probe.statusCode,
            errorDetail: probe.errorDetail,
            fromAutoHeal: true
          });
        }
      }
    } finally {
      healthStore.isHealingQuarantine = false;
      inflightQuarantineHeal = null;
      notifyListeners();
    }
  })();

  return inflightQuarantineHeal;
}

/**
 * Cloud-Shared Periodic / Manual Health Check of ALL 13 Gemini Keys (every 5 minutes shared via Supabase).
 * - When `force === false`: checks Supabase first; if another device checked within 5 min, hydrates
 *   both Healthy Pool and Quarantine Pool with ZERO Gemini API calls!
 * - When probing: checks all keys in batches of 4, runs 1 instant Auto-Heal retry on transient failures,
 *   strictly separates Healthy Pool vs Quarantine Pool, syncs to Supabase, and alerts Admin if unfixable.
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
            let probe = await pingSingleGeminiKey(key, { timeoutMs: 8000 });

            // Instant Auto-Heal retry on transient timeout/503 before locking in Quarantine
            if (!probe.ok && (probe.kind === 'timeout' || probe.kind === 'server_error')) {
              await new Promise(r => setTimeout(r, 700));
              probe = await pingSingleGeminiKey(key, { timeoutMs: 8000 });
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
              if (probe.kind === 'invalid' || probe.kind === 'daily_quota' || probe.kind === 'timeout' || probe.kind === 'server_error') {
                unfixableToAlert.push({
                  id,
                  index: keyIdx,
                  masked,
                  reason: probe.errorDetail
                });
              } else if (probe.kind === 'quota') {
                scheduleSingleKeyAutoHeal(key, RPM_HEAL_WAIT_MS);
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
 * Start BOTH background monitors:
 *  1) Full 13-key Healthy Pool monitor every 5 minutes (Cloud-shared across all devices)
 *  2) Quarantine-only Auto-Heal monitor every 2 minutes (tests ONLY broken keys to unlock them when 200 OK!)
 */
export function ensurePeriodicKeyHealthMonitor(explicitApiKey = '') {
  if (typeof window === 'undefined') return;

  runFullKeyPoolHealthCheck({ explicitApiKey, force: false, notifyAdmin: true }).catch(() => {});

  if (!healthyTimerId) {
    healthyTimerId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      runFullKeyPoolHealthCheck({ explicitApiKey, force: false, notifyAdmin: true }).catch(() => {});
    }, HEALTH_CHECK_TTL_MS);
  }

  if (!quarantineTimerId) {
    quarantineTimerId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      runQuarantineAutoHealCycle({ explicitApiKey }).catch(() => {});
    }, QUARANTINE_PROBE_INTERVAL_MS);
  }
}

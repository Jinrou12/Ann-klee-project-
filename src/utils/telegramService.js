// Telegram Bot Integration Service for Direct PDF, Word (.docx), and Excel (.xlsx) Document Delivery
// Features Smart Per-Device (dev_...) Multi-Account Binding & Strict Selection Lock
import { startFileCapture, stopFileCapture } from './openXmlZip.js';
import { toKhmerDigits } from './khmerNumerals.js';
import { loadAuthSession } from './auth.js';

const TELEGRAM_STORAGE_KEY = 'ann_klee_telegram_config_v1';
const DEVICE_ID_STORAGE_KEY = 'ann_klee_device_id_v1';
const DEVICE_BINDING_STORAGE_KEY = 'ann_klee_device_tg_binding_v1';

export const DEFAULT_SUBSCRIBERS = [
  {
    chatId: '1379643928',
    title: 'ថុន វិសាល ( Thon Visal )',
    username: '@thonvisall',
    type: 'private',
    typeLabel: 'គណនីផ្ទាល់ខ្លួន'
  },
  {
    chatId: '9146504063',
    title: 'វិសាល',
    username: '',
    type: 'private',
    typeLabel: 'គណនីផ្ទាល់ខ្លួន'
  },
  {
    chatId: '757371398',
    title: 'Ann khlee',
    username: '',
    type: 'private',
    typeLabel: 'គណនីផ្ទាល់ខ្លួន'
  }
];

export const DEFAULT_TELEGRAM_CONFIG = {
  botToken: '9237539087:AAEuSo00rJREK96ZpVsbAxpBFZsInk95e24',
  chatId: '1379643928',
  chatTitle: 'ថុន វិសាល ( Thon Visal )',
  botUsername: 'Annkhlebot',
  targetMode: 'SINGLE',
  subscribers: DEFAULT_SUBSCRIBERS
};

const readCookie = (key) => {
  if (typeof document === 'undefined' || !document.cookie) return null;
  try {
    const prefix = `${key}=`;
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(prefix));
    return match ? decodeURIComponent(match.slice(prefix.length)) : null;
  } catch {
    return null;
  }
};

const writeCookie = (key, val) => {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${key}=${encodeURIComponent(val)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // ignore cookie errors
  }
};

/**
 * Get or generate a persistent unique Device ID (e.g. "dev_8f92k1a4") for this specific phone/PC
 */
export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return 'dev_server';
  try {
    let devId = localStorage.getItem(DEVICE_ID_STORAGE_KEY) || readCookie(DEVICE_ID_STORAGE_KEY);
    if (!devId || !/^dev_[a-z0-9]+$/i.test(devId)) {
      const rand = Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-4);
      devId = `dev_${rand.toLowerCase()}`;
    }
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, devId);
    writeCookie(DEVICE_ID_STORAGE_KEY, devId);
    return devId;
  } catch {
    return 'dev_local';
  }
}

/**
 * Clean a Telegram Bot Token (strips accidental leading "bot" or whitespace/quotes)
 */
export function cleanBotToken(rawToken) {
  let token = String(rawToken || '').trim().replace(/^["']|["']$/g, '');
  if (/^bot\d+:/i.test(token)) {
    token = token.slice(3);
  }
  return token;
}

/**
 * Clean a Telegram Chat ID
 */
export function cleanChatId(rawChatId) {
  return String(rawChatId || '').trim().replace(/^["']|["']$/g, '');
}

/**
 * Merge and deduplicate subscriber lists by chatId
 */
export function mergeSubscribersList(...lists) {
  const map = new Map();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item) continue;
      const idStr = cleanChatId(item.chatId || item.id);
      if (!idStr || idStr === 'ALL') continue;
      const existing = map.get(idStr) || {};
      map.set(idStr, {
        chatId: idStr,
        title: String(item.title || existing.title || `Chat ${idStr}`).trim(),
        username: String(item.username || existing.username || '').trim(),
        type: item.type || existing.type || 'private',
        typeLabel: item.typeLabel || existing.typeLabel || 'គណនីផ្ទាល់ខ្លួន'
      });
    }
  }

  return Array.from(map.values());
}

function getRawDeviceBindingStore() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEVICE_BINDING_STORAGE_KEY) || readCookie(DEVICE_BINDING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Read the Telegram accounts bound specifically to THIS device:
 * { deviceId, activeChatId, chatId, title, username, accounts: [{ chatId, title, username }] }
 */
export function getDeviceTelegramBinding() {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = getRawDeviceBindingStore();

    // Normalize legacy single-account binding object into multi-account structure
    let accounts = Array.isArray(parsed?.accounts) ? [...parsed.accounts] : [];
    if (parsed?.chatId && !accounts.some(a => String(a.chatId) === String(parsed.chatId))) {
      accounts.unshift({
        chatId: String(parsed.chatId),
        title: String(parsed.title || `Chat ${parsed.chatId}`).trim(),
        username: String(parsed.username || '').trim()
      });
    }
    accounts = mergeSubscribersList(accounts);

    if (accounts.length === 0) {
      return null;
    }

    const activeChatId =
      parsed?.activeChatId && accounts.some(a => String(a.chatId) === String(parsed.activeChatId))
        ? String(parsed.activeChatId)
        : String(accounts[0].chatId);

    const activeAccount = accounts.find(a => String(a.chatId) === activeChatId) || accounts[0];

    return {
      deviceId: getOrCreateDeviceId(),
      activeChatId: activeAccount.chatId,
      chatId: activeAccount.chatId,
      title: activeAccount.title,
      username: activeAccount.username || '',
      accounts
    };
  } catch {
    return null;
  }
}

/**
 * Add or update a Telegram account on THIS device.
 * By default, if the device ALREADY has a locked activeChatId, adding a discovered account
 * will NOT overwrite the locked activeChatId unless `setAsActive = true` is explicitly passed!
 */
export function saveDeviceTelegramBinding({ chatId, title, username = '' }, { setAsActive = false } = {}) {
  const cleanId = cleanChatId(chatId);
  if (!cleanId || cleanId === 'ALL') return getDeviceTelegramBinding();

  const rawStore = getRawDeviceBindingStore() || {};
  const prevUnlinked = Array.isArray(rawStore.unlinkedChatIds) ? rawStore.unlinkedChatIds.map(String) : [];

  // If this account was explicitly unlinked on this device, do not silently re-add it from old /getUpdates history
  if (!setAsActive && prevUnlinked.includes(cleanId)) {
    return getDeviceTelegramBinding();
  }

  const nextUnlinked = setAsActive
    ? prevUnlinked.filter(id => id !== cleanId)
    : prevUnlinked;

  const current = getDeviceTelegramBinding();
  const prevAccounts = current?.accounts || [];
  const nextAccounts = mergeSubscribersList(prevAccounts, [
    {
      chatId: cleanId,
      title: String(title || `Chat ${cleanId}`).trim(),
      username: String(username || '').trim()
    }
  ]);

  // Strict First-Account Lock: keep existing activeChatId unless setAsActive is explicitly true or no activeChatId existed
  const nextActiveChatId =
    setAsActive || !current?.activeChatId
      ? cleanId
      : current.activeChatId;

  const activeAccount =
    nextAccounts.find(a => String(a.chatId) === String(nextActiveChatId)) || nextAccounts[0];

  const payload = {
    deviceId: getOrCreateDeviceId(),
    activeChatId: activeAccount.chatId,
    chatId: activeAccount.chatId,
    title: activeAccount.title,
    username: activeAccount.username || '',
    accounts: nextAccounts,
    unlinkedChatIds: nextUnlinked,
    updatedAt: new Date().toISOString()
  };

  try {
    const json = JSON.stringify(payload);
    localStorage.setItem(DEVICE_BINDING_STORAGE_KEY, json);
    writeCookie(DEVICE_BINDING_STORAGE_KEY, json);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telegram-config-updated', { detail: getTelegramConfig() }));
    }
  } catch {
    // ignore storage errors
  }

  return payload;
}

/**
 * Remove / unlink a Telegram account from THIS device
 */
export function removeDeviceTelegramAccount(targetChatId) {
  const cleanId = cleanChatId(targetChatId);
  if (!cleanId) return getDeviceTelegramBinding();

  const rawStore = getRawDeviceBindingStore() || {};
  const current = getDeviceTelegramBinding();
  const prevAccounts = current?.accounts || [];
  const nextAccounts = prevAccounts.filter(a => String(a.chatId) !== cleanId);
  const prevUnlinked = Array.isArray(rawStore.unlinkedChatIds) ? rawStore.unlinkedChatIds.map(String) : [];
  const nextUnlinked = Array.from(new Set([...prevUnlinked, cleanId]));

  const nextActiveAccount =
    nextAccounts.find(a => String(a.chatId) === String(current?.activeChatId)) ||
    nextAccounts[0] ||
    null;

  const payload = {
    deviceId: getOrCreateDeviceId(),
    activeChatId: nextActiveAccount ? nextActiveAccount.chatId : '',
    chatId: nextActiveAccount ? nextActiveAccount.chatId : '',
    title: nextActiveAccount ? nextActiveAccount.title : '',
    username: nextActiveAccount ? (nextActiveAccount.username || '') : '',
    accounts: nextAccounts,
    unlinkedChatIds: nextUnlinked,
    updatedAt: new Date().toISOString()
  };

  try {
    const json = JSON.stringify(payload);
    localStorage.setItem(DEVICE_BINDING_STORAGE_KEY, json);
    writeCookie(DEVICE_BINDING_STORAGE_KEY, json);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telegram-config-updated', { detail: getTelegramConfig() }));
    }
  } catch {
    // ignore storage errors
  }

  return getDeviceTelegramBinding();
}

/**
 * Switch the active Telegram account among the accounts linked on THIS device
 */
export function selectDeviceActiveAccount(targetChatId) {
  const current = getDeviceTelegramBinding();
  if (!current) return null;
  const found = (current.accounts || []).find(a => String(a.chatId) === String(targetChatId));
  if (!found) return current;
  return saveDeviceTelegramBinding(found, { setAsActive: true });
}

/**
 * Load Telegram Bot Configuration for this device
 */
export function getTelegramConfig() {
  try {
    let localParsed = null;
    const raw = localStorage.getItem(TELEGRAM_STORAGE_KEY);
    if (raw) {
      localParsed = JSON.parse(raw);
    }

    const session = loadAuthSession();
    const isOwner = session?.role === 'owner';
    const deviceBinding = getDeviceTelegramBinding();

    const botToken = cleanBotToken(localParsed?.botToken) || DEFAULT_TELEGRAM_CONFIG.botToken;
    const botUsername = String(localParsed?.botUsername || '').trim() || DEFAULT_TELEGRAM_CONFIG.botUsername;

    const mergedSubscribers = mergeSubscribersList(
      DEFAULT_SUBSCRIBERS,
      localParsed?.subscribers,
      deviceBinding?.accounts || []
    );

    // For non-Owner devices: strictly use ONLY this device's own linked accounts (myDeviceAccounts)
    if (!isOwner) {
      const myDeviceAccounts = deviceBinding?.accounts || [];
      if (deviceBinding && deviceBinding.chatId) {
        return {
          botToken,
          chatId: deviceBinding.chatId,
          chatTitle: deviceBinding.title,
          botUsername,
          targetMode: 'SINGLE',
          subscribers: mergedSubscribers,
          myDeviceAccounts,
          deviceBound: true
        };
      }
      return {
        botToken,
        chatId: '',
        chatTitle: 'មិនទាន់ភ្ជាប់ឧបករណ៍នេះ',
        botUsername,
        targetMode: 'SINGLE',
        subscribers: mergedSubscribers,
        myDeviceAccounts: [],
        deviceBound: false
      };
    }

    // For Owner ('thonvisal'): default to Owner's own account ('1379643928' — ថុន វិសាល) unless Owner explicitly chose another target
    const explicitOwnerMode = localParsed?.ownerExplicitTargetV3 ? localParsed.targetMode : 'SINGLE';
    const selectedChatId =
      explicitOwnerMode === 'ALL'
        ? 'ALL'
        : localParsed?.ownerExplicitTargetV3 && localParsed?.chatId
          ? cleanChatId(localParsed.chatId)
          : deviceBinding?.chatId || '1379643928';

    const selectedSub = mergedSubscribers.find(s => s.chatId === selectedChatId);
    const chatTitle =
      selectedChatId === 'ALL'
        ? `គ្រប់គណនីទាំងអស់ (${toKhmerDigits(mergedSubscribers.length)})`
        : selectedSub?.title || String(localParsed?.chatTitle || 'ថុន វិសាល ( Thon Visal )');

    return {
      botToken,
      chatId: selectedChatId,
      chatTitle,
      botUsername,
      targetMode: selectedChatId === 'ALL' ? 'ALL' : 'SINGLE',
      ownerExplicitTargetV3: Boolean(localParsed?.ownerExplicitTargetV3),
      subscribers: mergedSubscribers,
      myDeviceAccounts: deviceBinding?.accounts || [],
      deviceBound: true
    };
  } catch (err) {
    console.warn('Error reading Telegram config:', err);
  }

  return {
    ...DEFAULT_TELEGRAM_CONFIG,
    subscribers: [...DEFAULT_SUBSCRIBERS],
    myDeviceAccounts: []
  };
}

/**
 * Save Telegram Bot Configuration to localStorage
 */
export function saveTelegramConfig(config = {}) {
  const current = getTelegramConfig();
  const session = loadAuthSession();
  const isOwner = session?.role === 'owner';

  const botToken = cleanBotToken(config.botToken ?? current.botToken) || DEFAULT_TELEGRAM_CONFIG.botToken;
  const botUsername = String(config.botUsername ?? current.botUsername ?? DEFAULT_TELEGRAM_CONFIG.botUsername).trim();

  const rawChatId = cleanChatId(config.chatId ?? current.chatId);
  const isAll = isOwner && (rawChatId.toUpperCase() === 'ALL' || config.targetMode === 'ALL');
  const targetMode = isAll ? 'ALL' : 'SINGLE';
  const finalChatId = isAll ? 'ALL' : (rawChatId || '1379643928');

  const mergedSubscribers = mergeSubscribersList(
    DEFAULT_SUBSCRIBERS,
    current.subscribers,
    config.subscribers,
    !isAll && finalChatId
      ? [{ chatId: finalChatId, title: config.chatTitle || `Chat ${finalChatId}` }]
      : []
  );

  const selectedSub = mergedSubscribers.find(s => s.chatId === finalChatId);
  const chatTitle = isAll
    ? `គ្រប់គណនីទាំងអស់ (${toKhmerDigits(mergedSubscribers.length)})`
    : String(config.chatTitle || selectedSub?.title || `Chat ${finalChatId}`).trim();

  if (!isAll && finalChatId) {
    saveDeviceTelegramBinding(
      {
        chatId: finalChatId,
        title: chatTitle,
        username: selectedSub?.username || ''
      },
      { setAsActive: true }
    );
  }

  const cleaned = {
    botToken,
    chatId: finalChatId,
    chatTitle,
    botUsername,
    targetMode,
    ownerExplicitTargetV3: isOwner ? true : false,
    subscribers: mergedSubscribers
  };

  try {
    localStorage.setItem(TELEGRAM_STORAGE_KEY, JSON.stringify(cleaned));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telegram-config-updated', { detail: getTelegramConfig() }));
    }
  } catch (err) {
    console.error('Failed to save Telegram config:', err);
  }

  return getTelegramConfig();
}

/**
 * Reset Telegram Bot Configuration on this device
 */
export function clearTelegramConfig() {
  try {
    localStorage.removeItem(TELEGRAM_STORAGE_KEY);
    localStorage.removeItem(DEVICE_BINDING_STORAGE_KEY);
    const fallback = getTelegramConfig();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telegram-config-updated', { detail: fallback }));
    }
  } catch (err) {
    console.error('Failed to clear Telegram config:', err);
  }
}

export function isTelegramConfigured() {
  const cfg = getTelegramConfig();
  return Boolean(cfg.botToken);
}

function extractChatFromUpdate(u) {
  const c =
    u?.message?.chat ||
    u?.edited_message?.chat ||
    u?.channel_post?.chat ||
    u?.my_chat_member?.chat ||
    u?.chat_member?.chat ||
    u?.callback_query?.message?.chat;
  if (!c || !c.id) return null;

  const idStr = String(c.id);
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  const title = c.title || fullName || (c.username ? `@${c.username}` : `Chat ${idStr}`);
  const typeLabel =
    c.type === 'private'
      ? 'គណនីផ្ទាល់ខ្លួន'
      : c.type === 'group' || c.type === 'supergroup'
        ? 'ក្រុម (Group)'
        : c.type === 'channel'
          ? 'ឆានែល (Channel)'
          : c.type || 'Chat';

  return {
    chatId: idStr,
    title,
    username: c.username ? `@${c.username}` : '',
    type: c.type || 'private',
    typeLabel,
    text: String(u?.message?.text || '').trim(),
    date: Number(u?.message?.date || 0),
    updateId: Number(u?.update_id || 0)
  };
}

/**
 * Auto-detect all Chats / Groups that have interacted with this Bot Token via /getUpdates
 */
export async function detectTelegramChats(rawToken) {
  const current = getTelegramConfig();
  const token = cleanBotToken(rawToken || current.botToken);
  if (!token || !token.includes(':')) {
    throw new Error('សូមបញ្ចូល Telegram Bot Token ឱ្យបានត្រឹមត្រូវជាមុនសិន (ឧ. 123456789:ABCdef...)។');
  }

  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meData = await meRes.json().catch(() => null);
  if (!meRes.ok || !meData?.ok) {
    throw new Error(
      'Bot Token មិនត្រឹមត្រូវទេ! សូមពិនិត្យមើល Token ដែលបានចម្លងពី @BotFather ម្ដងទៀត។'
    );
  }

  const botInfo = meData.result || {};
  const upRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
  const upData = await upRes.json().catch(() => null);
  if (!upRes.ok || !upData?.ok) {
    throw new Error(
      upData?.description || 'មិនអាចទាញយកបញ្ជី Chat ពី Telegram បានទេ។'
    );
  }

  const updates = Array.isArray(upData.result) ? [...upData.result].reverse() : [];
  const discovered = updates.map(extractChatFromUpdate).filter(Boolean);

  const isDefaultSchoolBot = token === DEFAULT_TELEGRAM_CONFIG.botToken;
  const mergedChats = mergeSubscribersList(
    isDefaultSchoolBot ? DEFAULT_SUBSCRIBERS : [],
    current.botToken === token ? current.subscribers : [],
    discovered
  );

  saveTelegramConfig({
    ...current,
    botToken: token,
    botUsername: botInfo.username || current.botUsername,
    subscribers: mergedChats
  });

  return {
    botInfo,
    chats: mergedChats,
    newlyDiscoveredCount: discovered.length
  };
}

/**
 * Quiet background sync:
 * Records any account that clicked `/start <myDeviceId>` into `myDeviceAccounts`
 * while keeping the user's currently selected account strictly locked (`setAsActive: false`).
 */
export async function syncSubscribersSilent() {
  try {
    const cfg = getTelegramConfig();
    if (!cfg.botToken) return cfg;
    const myDeviceId = getOrCreateDeviceId();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const upRes = await fetch(`https://api.telegram.org/bot${cfg.botToken}/getUpdates?limit=100`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!upRes.ok) return cfg;
    const upData = await upRes.json().catch(() => null);
    if (!upData?.ok || !Array.isArray(upData.result)) return cfg;

    const discovered = [];
    // Process in chronological order (oldest -> newest)
    for (const u of upData.result) {
      const info = extractChatFromUpdate(u);
      if (!info) continue;
      discovered.push(info);

      // If this update was triggered from THIS device (`?start=dev_...`), add it to this device's own account list
      // (setAsActive: false preserves the user's locked choice if they already have an active account!)
      if (info.text && info.text.includes(myDeviceId)) {
        saveDeviceTelegramBinding(
          {
            chatId: info.chatId,
            title: info.title,
            username: info.username
          },
          { setAsActive: false }
        );
      }
    }

    if (discovered.length > 0) {
      const merged = mergeSubscribersList(cfg.subscribers, discovered);
      if (merged.length !== (cfg.subscribers || []).length) {
        const updatedRaw = {
          ...cfg,
          subscribers: merged
        };
        localStorage.setItem(TELEGRAM_STORAGE_KEY, JSON.stringify(updatedRaw));
      }
    }
    return getTelegramConfig();
  } catch {
    return getTelegramConfig();
  }
}

/**
 * Resolve active recipients for Owner or already-bound device
 */
export function getActiveRecipients(configOverride = null) {
  const cfg = configOverride || getTelegramConfig();
  const session = loadAuthSession();
  const isOwner = session?.role === 'owner';
  const subs = Array.isArray(cfg.subscribers) && cfg.subscribers.length > 0
    ? cfg.subscribers
    : DEFAULT_SUBSCRIBERS;

  if (isOwner) {
    if (cfg.targetMode === 'ALL' || cfg.chatId === 'ALL') {
      return subs;
    }
    const targetId = cfg.chatId || '1379643928';
    const found = subs.find(s => String(s.chatId) === String(targetId));
    return [
      found || {
        chatId: String(targetId),
        title: cfg.chatTitle || 'ថុន វិសាល ( Thon Visal )',
        typeLabel: 'គណនីផ្ទាល់ខ្លួន'
      }
    ];
  }

  // Non-Owner device: strictly return ONLY this device's active bound account
  const bound = getDeviceTelegramBinding();
  if (bound && bound.chatId) {
    return [bound];
  }
  return [];
}

/**
 * Generate a unique one-time link token for a new account-linking session on this device.
 * Format: "dev_xxxx_lnk_yyyy" (contains deviceId while guaranteeing old /start messages never re-trigger)
 */
export function createDeviceLinkToken() {
  const deviceId = getOrCreateDeviceId();
  const nonce = Math.random().toString(36).slice(2, 6) + Date.now().toString(36).slice(-4);
  return `${deviceId}_lnk_${nonce.toLowerCase()}`;
}

/**
 * Get direct deep-link URLs for launching the native Telegram app from both Home Screen PWA and Browser
 */
export function getTelegramDeepLinks(customStartToken = null) {
  const cfg = getTelegramConfig();
  const deviceId = getOrCreateDeviceId();
  const startToken = customStartToken || deviceId;
  const botUsername = cfg.botUsername || DEFAULT_TELEGRAM_CONFIG.botUsername;
  return {
    deviceId,
    startToken,
    botUsername,
    tgProtocolUrl: `tg://resolve?domain=${botUsername}&start=${startToken}`,
    httpsUrl: `https://t.me/${botUsername}?start=${startToken}`
  };
}

/**
 * Fetch the current latest update_id from /getUpdates before the user taps Start in Telegram
 */
export async function getBaselineUpdateId() {
  try {
    const cfg = getTelegramConfig();
    const botToken = cfg.botToken || DEFAULT_TELEGRAM_CONFIG.botToken;
    const upRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=50`);
    const upData = await upRes.json().catch(() => null);
    let maxId = 0;
    if (upData?.ok && Array.isArray(upData.result)) {
      for (const u of upData.result) {
        if (u.update_id > maxId) maxId = u.update_id;
      }
      return maxId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check /getUpdates once to see if the user has tapped Start (or sent a message) in Telegram for this link session
 */
export async function checkDeviceLinkUpdate({
  linkToken = '',
  baselineUpdateId = null,
  promptStartSec = 0
} = {}) {
  try {
    const cfg = getTelegramConfig();
    const botToken = cfg.botToken || DEFAULT_TELEGRAM_CONFIG.botToken;

    const pollRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=50`);
    const pollData = await pollRes.json().catch(() => null);
    if (!pollData?.ok || !Array.isArray(pollData.result)) return null;

    const reversed = [...pollData.result].reverse();

    // 1. Exact match for this modal session's unique one-time linkToken (e.g. "dev_xxx_lnk_yyyy")
    // Old /start messages from Account #1 will NEVER match this unique linkToken!
    if (linkToken) {
      for (const u of reversed) {
        const info = extractChatFromUpdate(u);
        if (info && info.text && info.text.includes(linkToken)) {
          return saveDeviceTelegramBinding(
            {
              chatId: info.chatId,
              title: info.title,
              username: info.username
            },
            { setAsActive: true }
          );
        }
      }
    }

    // 2. Match any genuinely NEW message (update_id > baselineUpdateId) sent to the Bot after the modal opened
    // Works even if the 2nd account already had a chat open and typed "/start" or any message directly
    if (baselineUpdateId !== null) {
      for (const u of reversed) {
        const info = extractChatFromUpdate(u);
        if (info && u.update_id > baselineUpdateId) {
          return saveDeviceTelegramBinding(
            {
              chatId: info.chatId,
              title: info.title,
              username: info.username
            },
            { setAsActive: true }
          );
        }
      }
    } else if (promptStartSec > 0) {
      // Fallback only if baselineUpdateId request failed: strictly require message timestamp >= modal open timestamp
      for (const u of reversed) {
        const info = extractChatFromUpdate(u);
        if (info && info.date >= promptStartSec && info.text) {
          return saveDeviceTelegramBinding(
            {
              chatId: info.chatId,
              title: info.title,
              username: info.username
            },
            { setAsActive: true }
          );
        }
      }
    }
  } catch {
    // ignore transient error
  }
  return null;
}

/**
 * Ensure the current device has a bound recipient
 */
async function ensureDeviceBoundRecipients() {
  const cfg = await syncSubscribersSilent();
  const existing = getActiveRecipients(cfg);
  if (existing.length > 0) {
    return existing;
  }
  const err = new Error('DEVICE_NOT_LINKED');
  err.code = 'DEVICE_NOT_LINKED';
  throw err;
}

/**
 * Send a test message to verify Bot Token + Target Chat(s)
 */
export async function sendTelegramTestMessage(rawToken, rawChatId) {
  const cfg = await syncSubscribersSilent();
  const token = cleanBotToken(rawToken || cfg.botToken);
  const targetId = cleanChatId(rawChatId || cfg.chatId);

  if (!token) {
    throw new Error('សូមបញ្ចូល Telegram Bot Token ជាមុនសិន។');
  }

  const recipients =
    !targetId || targetId.toUpperCase() === 'ALL'
      ? cfg.subscribers || DEFAULT_SUBSCRIBERS
      : [
          (cfg.subscribers || []).find(s => String(s.chatId) === targetId) || {
            chatId: targetId,
            title: `Chat ${targetId}`
          }
        ];

  if (recipients.length === 0) {
    throw new Error('មិនទាន់មានគណនីដែលបានចុច /start ក្នុង Bot នៅឡើយទេ។');
  }

  const nowStr = formatKhmerTimestamp();
  const results = [];
  const errors = [];

  for (const r of recipients) {
    const text = [
      '✅ <b>ភ្ជាប់ប្រព័ន្ធ Telegram Bot ដោយជោគជ័យ!</b>',
      '🏫 <b>ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង</b>',
      `👤 គណនីទទួល៖ <b>${escapeHtmlTelegram(r.title)}</b> (<code>${r.chatId}</code>)`,
      '📄 ប្រព័ន្ធត្រៀមរួចរាល់សម្រាប់ការបញ្ជូនឯកសារ <b>PDF, Word (.docx) និង Excel (.xlsx)</b> មកកាន់ទីនេះដោយស្វ័យប្រវត្តិ។',
      `🕒 ម៉ោងសាកល្បង៖ ${nowStr}`
    ].join('\n');

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: r.chatId,
          text,
          parse_mode: 'HTML'
        })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        results.push(r.title);
      } else {
        errors.push(`${r.title}: ${data?.description || 'Failed'}`);
      }
    } catch (e) {
      errors.push(`${r.title}: ${e.message}`);
    }
  }

  if (results.length === 0) {
    throw new Error('មិនអាចផ្ញើសារសាកល្បងបានទេ៖ ' + errors.join('; '));
  }

  return { sentTo: results, errors };
}

function escapeHtmlTelegram(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toAsciiDigits(str) {
  const khmerZeroCode = '០'.charCodeAt(0);
  return String(str ?? '').replace(/[០-៩]/g, ch => String(ch.charCodeAt(0) - khmerZeroCode));
}

export function formatTelegramSafeFilename(rawFilename) {
  const raw = String(rawFilename || 'Document.pdf').trim();
  const extMatch = raw.match(/(\.[a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '.pdf';
  const base = toAsciiDigits(extMatch ? raw.slice(0, -ext.length) : raw);
  return `${base.replace(/\s+/g, '_')}${ext}`;
}

function formatKhmerTimestamp() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return toKhmerDigits(`${dd}/${mm}/${yyyy} ម៉ោង ${hh}:${min}`);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const commaIdx = dataUrl.indexOf(',');
      resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const MTPROTO_PART_SIZE = 512 * 1024; // 512 KB exact Telegram MTProto part size
const MTPROTO_SINGLE_SHOT_MAX_BYTES = 2.4 * 1024 * 1024; // ~3.2 MB base64 JSON (safely below Vercel 4.5 MB limit)
const MTPROTO_PARTS_PER_BATCH = 3; // 3 x 512 KB = 1.5 MB raw (~2.0 MB JSON per request)
const MTPROTO_BIG_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB -> SaveBigFilePart / InputFileBig

function generateMtprotoFileIdString() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    // Keep positive signed 63-bit integer using BigInt when available
    if (typeof BigInt !== 'undefined') {
      const hi = BigInt(arr[0] & 0x7fffffff);
      const lo = BigInt(arr[1]);
      return ((hi << 32n) | lo).toString();
    }
  }
  return `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}

async function sendViaChunkedMtproto({
  blob,
  botToken,
  recipients,
  filename,
  mimeType,
  caption
}) {
  const totalBytes = blob.size;
  const totalParts = Math.ceil(totalBytes / MTPROTO_PART_SIZE);
  const isBigFile = totalBytes > MTPROTO_BIG_FILE_THRESHOLD;
  const fileId = generateMtprotoFileIdString();

  // 1. Upload 512KB MTProto parts in safe <= 1.5MB batches (stateless across Vercel serverless functions)
  for (let startPart = 0; startPart < totalParts; startPart += MTPROTO_PARTS_PER_BATCH) {
    const endPart = Math.min(totalParts, startPart + MTPROTO_PARTS_PER_BATCH);
    const batchParts = [];

    for (let p = startPart; p < endPart; p++) {
      const startByte = p * MTPROTO_PART_SIZE;
      const endByte = Math.min(totalBytes, startByte + MTPROTO_PART_SIZE);
      const sliceBlob = blob.slice(startByte, endByte);
      const dataBase64 = await blobToBase64(sliceBlob);
      batchParts.push({ partIndex: p, dataBase64 });
    }

    const chunkRes = await fetch('/api/telegram-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload_parts',
        botToken,
        fileId,
        totalParts,
        isBigFile,
        parts: batchParts
      })
    });

    if (!chunkRes.ok) {
      throw new Error(`MTProto chunk upload failed (${chunkRes.status})`);
    }
    const chunkData = await chunkRes.json().catch(() => null);
    if (!chunkData?.ok) {
      throw new Error(chunkData?.description || 'MTProto chunk upload rejected');
    }
  }

  // 2. Finalize uploaded file on Telegram servers with exact Khmer filename
  const finRes = await fetch('/api/telegram-send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'finalize_chunked',
      botToken,
      fileId,
      totalParts,
      isBigFile,
      recipients,
      filename,
      mimeType,
      caption
    })
  });

  if (!finRes.ok) {
    throw new Error(`MTProto finalize failed (${finRes.status})`);
  }
  const finData = await finRes.json().catch(() => null);
  if (!finData?.ok || !Array.isArray(finData.succeeded) || finData.succeeded.length === 0) {
    throw new Error(finData?.description || 'MTProto finalize rejected');
  }
  return {
    succeeded: finData.succeeded,
    failed: finData.failed || []
  };
}

/**
 * Send a single generated file Blob/Uint8Array to target Telegram Chat IDs
 * Uses /api/telegram-send (MTProto DocumentAttributeFilename) first so Khmer vowels & subscripts (្)
 * in the filename are 100% preserved (with automatic chunked upload for large multi-page PDFs > 2.4 MB),
 * falling back to Bot HTTP API only if offline/unavailable.
 */
export async function sendDocumentToTelegram(
  blobOrBytes,
  filename,
  caption = '',
  mimeType = 'application/octet-stream',
  explicitRecipients = null
) {
  const cfg = getTelegramConfig();
  if (!cfg.botToken) {
    throw new Error('សូមភ្ជាប់ Telegram Bot Token ជាមុនសិន។');
  }

  const recipients = explicitRecipients || getActiveRecipients(cfg);
  if (!recipients || recipients.length === 0) {
    throw new Error('សូមជ្រើសរើស ឬចុច /start ក្នុង Telegram Bot ជាមុនសិន។');
  }

  const blob = blobOrBytes instanceof Blob
    ? blobOrBytes
    : new Blob([blobOrBytes], { type: mimeType });

  const cleanKhmerFilename = String(filename || 'ឯកសាររបាយការណ៍.pdf').normalize('NFC').trim();
  const resolvedMime = mimeType || blob.type || 'application/octet-stream';

  // 1. Primary Path: MTProto endpoint (/api/telegram-send) preserving 100% of Khmer vowels & subscripts
  try {
    if (blob.size > MTPROTO_SINGLE_SHOT_MAX_BYTES) {
      return await sendViaChunkedMtproto({
        blob,
        botToken: cfg.botToken,
        recipients,
        filename: cleanKhmerFilename,
        mimeType: resolvedMime,
        caption
      });
    }

    const fileBase64 = await blobToBase64(blob);
    const mtRes = await fetch('/api/telegram-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: cfg.botToken,
        recipients,
        filename: cleanKhmerFilename,
        mimeType: resolvedMime,
        caption,
        fileBase64
      })
    });

    if (mtRes.ok) {
      const mtData = await mtRes.json().catch(() => null);
      if (mtData?.ok && Array.isArray(mtData.succeeded) && mtData.succeeded.length > 0) {
        return {
          succeeded: mtData.succeeded,
          failed: mtData.failed || []
        };
      }
    }
  } catch (mtErr) {
    console.warn('MTProto endpoint fallback triggered:', mtErr);
  }

  // 2. Fallback Path: Direct Bot HTTP API if serverless endpoint is unreachable
  const sendPromises = recipients.map(async (recipient) => {
    const formData = new FormData();
    formData.append('chat_id', recipient.chatId);
    formData.append('document', blob, cleanKhmerFilename);
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }

    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      throw new Error(
        `${recipient.title}: ${data?.description || 'ការបញ្ជូនបរាជ័យ'}`
      );
    }
    return recipient.title;
  });

  const settled = await Promise.allSettled(sendPromises);
  const succeeded = settled
    .filter(s => s.status === 'fulfilled')
    .map(s => s.value);
  const failed = settled
    .filter(s => s.status === 'rejected')
    .map(s => s.reason?.message || 'Error');

  if (succeeded.length === 0) {
    throw new Error(
      'ការបញ្ជូនឯកសារទៅកាន់ Telegram បរាជ័យ៖ ' + failed.join(', ')
    );
  }

  return { succeeded, failed };
}

/**
 * Intercept files generated by any exporter function (PDF, Word, or Excel)
 * and send them strictly to the requesting device's locked active Telegram account (or Owner's selected target).
 */
export async function captureAndSendToTelegram(exportFn, { reportTitle = 'របាយការណ៍ផ្លូវការ' } = {}) {
  const recipients = await ensureDeviceBoundRecipients();

  startFileCapture();
  let capturedFiles = [];
  try {
    await exportFn();
  } finally {
    capturedFiles = stopFileCapture();
  }

  if (!capturedFiles || capturedFiles.length === 0) {
    throw new Error('មិនមានឯកសារត្រូវបានបង្កើតសម្រាប់ផ្ញើទៅ Telegram ឡើយ។');
  }

  const timeStr = formatKhmerTimestamp();
  const totalFiles = capturedFiles.length;
  let deliveredRecipients = [];

  for (let i = 0; i < totalFiles; i++) {
    const item = capturedFiles[i];
    const khmerFilename = String(item.filename || 'ឯកសាររបាយការណ៍.pdf').normalize('NFC');
    const indexBadge = totalFiles > 1 ? ` (${toKhmerDigits(i + 1)}/${toKhmerDigits(totalFiles)})` : '';
    const captionLines = [
      `📄 <b>${escapeHtmlTelegram(reportTitle)}${indexBadge}</b>`,
      `🕒 ផ្ញើនៅ៖ ${escapeHtmlTelegram(timeStr)}`
    ];

    const res = await sendDocumentToTelegram(
      item.blob,
      khmerFilename,
      captionLines.join('\n'),
      item.mimeType,
      recipients
    );
    deliveredRecipients = res.succeeded;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('telegram-config-updated', { detail: getTelegramConfig() }));
  }

  return {
    fileNames: capturedFiles.map(f => f.filename),
    recipientNames: deliveredRecipients
  };
}

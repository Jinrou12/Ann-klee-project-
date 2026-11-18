// Telegram Bot Integration Service for Direct PDF, Word (.docx), and Excel (.xlsx) Document Delivery
// Supports Auto-Discovery of all Telegram accounts/groups that have clicked /start on the Bot,
// with Broadcast-to-All ('ALL') or Single-Account targeting.
import { startFileCapture, stopFileCapture } from './openXmlZip.js';
import { toKhmerDigits } from './khmerNumerals.js';

const TELEGRAM_STORAGE_KEY = 'ann_klee_telegram_config_v1';
const APP_STATE_STORAGE_KEY = 'ann_klee_app_state_v1';

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
  }
];

export const DEFAULT_TELEGRAM_CONFIG = {
  botToken: '9237539087:AAEuSo00rJREK96ZpVsbAxpBFZsInk95e24',
  chatId: 'ALL', // 'ALL' = send to all subscribers who clicked /start, or specific chatId
  chatTitle: 'គ្រប់គណនីដែលបាន Start',
  botUsername: 'Annkhlebot',
  targetMode: 'ALL', // 'ALL' | 'SINGLE'
  subscribers: DEFAULT_SUBSCRIBERS
};

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
 * Merge and deduplicate subscriber lists by chatId, preserving defaults and newest metadata
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

/**
 * Load Telegram Bot Configuration (localStorage -> cloud-synced app_state.meta -> default fallback)
 */
export function getTelegramConfig() {
  try {
    let localParsed = null;
    const raw = localStorage.getItem(TELEGRAM_STORAGE_KEY);
    if (raw) {
      localParsed = JSON.parse(raw);
    }

    let cloudParsed = null;
    const rawState = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (rawState) {
      const parsedState = JSON.parse(rawState);
      cloudParsed = parsedState?.meta?.telegramConfig || null;
    }

    const source = localParsed || cloudParsed || {};
    const botToken = cleanBotToken(source.botToken) || DEFAULT_TELEGRAM_CONFIG.botToken;
    const botUsername = String(source.botUsername || '').trim() || DEFAULT_TELEGRAM_CONFIG.botUsername;

    const mergedSubscribers = mergeSubscribersList(
      DEFAULT_SUBSCRIBERS,
      cloudParsed?.subscribers,
      localParsed?.subscribers,
      source.chatId && source.chatId !== 'ALL'
        ? [{ chatId: source.chatId, title: source.chatTitle || `Chat ${source.chatId}` }]
        : []
    );

    // If user hasn't explicitly chosen a targetMode v2 yet, default to 'ALL' so all accounts receive files
    const targetMode = source.targetModeV2 || 'ALL';
    const selectedChatId =
      targetMode === 'SINGLE' && source.chatId && source.chatId !== 'ALL'
        ? cleanChatId(source.chatId)
        : 'ALL';

    const selectedSub = mergedSubscribers.find(s => s.chatId === selectedChatId);
    const chatTitle =
      selectedChatId === 'ALL'
        ? `គ្រប់គណនីទាំងអស់ (${toKhmerDigits(mergedSubscribers.length)})`
        : selectedSub?.title || String(source.chatTitle || `Chat ${selectedChatId}`);

    return {
      botToken,
      chatId: selectedChatId,
      chatTitle,
      botUsername,
      targetMode: selectedChatId === 'ALL' ? 'ALL' : 'SINGLE',
      targetModeV2: selectedChatId === 'ALL' ? 'ALL' : 'SINGLE',
      subscribers: mergedSubscribers
    };
  } catch (err) {
    console.warn('Error reading Telegram config:', err);
  }

  return {
    ...DEFAULT_TELEGRAM_CONFIG,
    targetModeV2: 'ALL',
    subscribers: [...DEFAULT_SUBSCRIBERS]
  };
}

/**
 * Save Telegram Bot Configuration to localStorage and broadcast update event
 */
export function saveTelegramConfig(config = {}) {
  const current = getTelegramConfig();
  const botToken = cleanBotToken(config.botToken ?? current.botToken) || DEFAULT_TELEGRAM_CONFIG.botToken;
  const botUsername = String(config.botUsername ?? current.botUsername ?? DEFAULT_TELEGRAM_CONFIG.botUsername).trim();

  const rawChatId = cleanChatId(config.chatId ?? current.chatId);
  const isAll = !rawChatId || rawChatId.toUpperCase() === 'ALL' || config.targetMode === 'ALL';
  const targetMode = isAll ? 'ALL' : 'SINGLE';
  const finalChatId = isAll ? 'ALL' : rawChatId;

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

  const cleaned = {
    botToken,
    chatId: finalChatId,
    chatTitle,
    botUsername,
    targetMode,
    targetModeV2: targetMode,
    subscribers: mergedSubscribers
  };

  try {
    localStorage.setItem(TELEGRAM_STORAGE_KEY, JSON.stringify(cleaned));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telegram-config-updated', { detail: cleaned }));
    }
  } catch (err) {
    console.error('Failed to save Telegram config:', err);
  }

  return cleaned;
}

/**
 * Reset Telegram Bot Configuration back to default school bot & all subscribers
 */
export function clearTelegramConfig() {
  try {
    localStorage.removeItem(TELEGRAM_STORAGE_KEY);
    const fallback = getTelegramConfig();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telegram-config-updated', { detail: fallback }));
    }
  } catch (err) {
    console.error('Failed to clear Telegram config:', err);
  }
}

/**
 * Check whether Bot Token and at least 1 subscriber/chatId are configured
 */
export function isTelegramConfigured() {
  const cfg = getTelegramConfig();
  return Boolean(cfg.botToken && (cfg.subscribers?.length > 0 || (cfg.chatId && cfg.chatId !== 'ALL')));
}

/**
 * Auto-detect all Chats / Groups that have interacted with this Bot Token via /getUpdates
 * and merge them into our permanent subscribers list.
 */
export async function detectTelegramChats(rawToken) {
  const current = getTelegramConfig();
  const token = cleanBotToken(rawToken || current.botToken);
  if (!token || !token.includes(':')) {
    throw new Error('សូមបញ្ចូល Telegram Bot Token ឱ្យបានត្រឹមត្រូវជាមុនសិន (ឧ. 123456789:ABCdef...)។');
  }

  // 1. Verify Bot Token via /getMe
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meData = await meRes.json().catch(() => null);
  if (!meRes.ok || !meData?.ok) {
    throw new Error(
      'Bot Token មិនត្រឹមត្រូវទេ! សូមពិនិត្យមើល Token ដែលបានចម្លងពី @BotFather ម្ដងទៀត។'
    );
  }

  const botInfo = meData.result || {};

  // 2. Fetch recent updates via /getUpdates to discover Chat IDs
  const upRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
  const upData = await upRes.json().catch(() => null);
  if (!upRes.ok || !upData?.ok) {
    throw new Error(
      upData?.description || 'មិនអាចទាញយកបញ្ជី Chat ពី Telegram បានទេ។'
    );
  }

  const updates = Array.isArray(upData.result) ? [...upData.result].reverse() : [];
  const discovered = [];

  for (const u of updates) {
    const candidateChats = [
      u?.message?.chat,
      u?.edited_message?.chat,
      u?.channel_post?.chat,
      u?.my_chat_member?.chat,
      u?.chat_member?.chat,
      u?.callback_query?.message?.chat
    ].filter(Boolean);

    for (const c of candidateChats) {
      const idStr = String(c.id || '');
      if (!idStr) continue;

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

      discovered.push({
        chatId: idStr,
        title,
        username: c.username ? `@${c.username}` : '',
        type: c.type || 'private',
        typeLabel
      });
    }
  }

  const isDefaultSchoolBot = token === DEFAULT_TELEGRAM_CONFIG.botToken;
  const mergedChats = mergeSubscribersList(
    isDefaultSchoolBot ? DEFAULT_SUBSCRIBERS : [],
    current.botToken === token ? current.subscribers : [],
    discovered
  );

  // Persist newly discovered subscribers right away
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
 * Quiet background sync of any new users who clicked /start on the Bot
 */
export async function syncSubscribersSilent() {
  try {
    const cfg = getTelegramConfig();
    if (!cfg.botToken) return cfg;
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
    for (const u of [...upData.result].reverse()) {
      const candidateChats = [
        u?.message?.chat,
        u?.edited_message?.chat,
        u?.channel_post?.chat,
        u?.my_chat_member?.chat,
        u?.chat_member?.chat,
        u?.callback_query?.message?.chat
      ].filter(Boolean);

      for (const c of candidateChats) {
        const idStr = String(c.id || '');
        if (!idStr) continue;
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
        discovered.push({
          chatId: idStr,
          title,
          username: c.username ? `@${c.username}` : '',
          type: c.type || 'private',
          typeLabel
        });
      }
    }

    if (discovered.length > 0) {
      const merged = mergeSubscribersList(cfg.subscribers, discovered);
      if (merged.length !== (cfg.subscribers || []).length) {
        return saveTelegramConfig({
          ...cfg,
          subscribers: merged
        });
      }
    }
    return cfg;
  } catch (_) {
    return getTelegramConfig();
  }
}

/**
 * Resolve the active list of recipient chats based on current config ('ALL' vs specific chatId)
 */
export function getActiveRecipients(configOverride = null) {
  const cfg = configOverride || getTelegramConfig();
  const subs = Array.isArray(cfg.subscribers) && cfg.subscribers.length > 0
    ? cfg.subscribers
    : DEFAULT_SUBSCRIBERS;

  if (cfg.targetMode === 'SINGLE' && cfg.chatId && cfg.chatId !== 'ALL') {
    const found = subs.find(s => String(s.chatId) === String(cfg.chatId));
    return [
      found || {
        chatId: String(cfg.chatId),
        title: cfg.chatTitle || `Chat ${cfg.chatId}`,
        typeLabel: 'គណនី'
      }
    ];
  }

  return subs;
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

/**
 * Convert Khmer report filenames into clean, standard English filenames for Telegram Bot API
 * (Telegram's server strips Unicode Combining Marks [Mn/Mc] from multipart filenames,
 * which otherwise turns Khmer words like "របាយការណ៍សុំច្បាប់_វិច្ឆិកា" into broken consonants "របយករណសចបប_វចឆក").
 */
export function formatTelegramSafeFilename(rawFilename) {
  const raw = String(rawFilename || 'Document.pdf').trim();
  const extMatch = raw.match(/(\.[a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '.pdf';
  const base = toAsciiDigits(extMatch ? raw.slice(0, -ext.length) : raw);

  // If already pure ASCII, keep it clean
  if (/^[\x20-\x7E]+$/.test(base)) {
    return `${base.replace(/\s+/g, '_')}${ext}`;
  }

  let prefix = 'Official_Report';
  if (base.includes('សុំច្បាប់') || base.includes('ច្បាប់សមណសិស្ស') || base.includes('គ្មានច្បាប់')) {
    prefix = 'Leave_Report';
  } else if (base.includes('កាត_ID') || base.includes('ទិញកាត')) {
    prefix = 'ID_Card_Report';
  } else if (base.includes('ចំណូលចំណាយសង្ខេប')) {
    prefix = 'Finance_Summary_Report';
  } else if (base.includes('ហិរញ្ញវត្ថុ') || base.includes('ចំណូលចំណាយ')) {
    prefix = 'Finance_Report';
  } else if (base.includes('មន្ទីរ') && base.includes('សង្ខេប')) {
    prefix = 'Ministry_Summary_Report';
  } else if (base.includes('មន្ទីរ')) {
    prefix = 'Ministry_Annual_Report';
  } else if (base.includes('សមណសិស្សមេ')) {
    prefix = 'Student_Master_List';
  } else if (base.includes('របាយការណ៍')) {
    prefix = 'Admin_Report';
  }

  const khmerMonths = [
    ['មករា', '01'],
    ['កុម្ភៈ', '02'],
    ['មីនា', '03'],
    ['មេសា', '04'],
    ['ឧសភា', '05'],
    ['មិថុនា', '06'],
    ['កក្កដា', '07'],
    ['សីហា', '08'],
    ['កញ្ញា', '09'],
    ['តុលា', '10'],
    ['វិច្ឆិកា', '11'],
    ['ធ្នូ', '12']
  ];

  let periodTag = '';
  for (const [mName, mNum] of khmerMonths) {
    if (base.includes(mName)) {
      periodTag = mNum;
      break;
    }
  }

  if (!periodTag) {
    if (/ឆមាសទី\s*_?\s*1/.test(base)) {
      periodTag = 'Sem1';
    } else if (/ឆមាសទី\s*_?\s*2/.test(base)) {
      periodTag = 'Sem2';
    }
  }

  const yearMatch = base.match(/(20\d{2})/);
  const yearTag = yearMatch ? yearMatch[1] : '';

  const parts = [prefix];
  if (periodTag) parts.push(periodTag);
  if (yearTag) {
    parts.push(yearTag);
  } else {
    const numMatch = base.match(/(\d+)/);
    if (numMatch && numMatch[1] !== periodTag) {
      parts.push(numMatch[1]);
    }
  }

  return `${parts.join('_')}${ext}`;
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

/**
 * Send a single generated file Blob/Uint8Array to all active target Telegram Chat IDs
 * Uses /api/telegram-send (MTProto DocumentAttributeFilename) first so Khmer vowels & subscripts (្)
 * in the filename are 100% preserved, falling back to Bot HTTP API only if offline/unavailable.
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

  // 1. Primary Path: MTProto endpoint (/api/telegram-send) preserving 100% of Khmer vowels & subscripts
  try {
    const fileBase64 = await blobToBase64(blob);
    const mtRes = await fetch('/api/telegram-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: cfg.botToken,
        recipients,
        filename: cleanKhmerFilename,
        mimeType: mimeType || blob.type || 'application/octet-stream',
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
 * Intercept files generated by any exporter function (PDF, Word, Excel, or All 3)
 * and send them directly to all active Telegram recipients (or selected recipient).
 */
export async function captureAndSendToTelegram(exportFn, { reportTitle = 'របាយការណ៍ផ្លូវការ' } = {}) {
  // 1. Auto-sync any new users who clicked /start right before sending
  const cfg = await syncSubscribersSilent();
  const recipients = getActiveRecipients(cfg);

  if (!cfg.botToken || recipients.length === 0) {
    const err = new Error('NOT_CONFIGURED');
    err.code = 'TELEGRAM_NOT_CONFIGURED';
    throw err;
  }

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

  return {
    fileNames: capturedFiles.map(f => f.filename),
    recipientNames: deliveredRecipients
  };
}

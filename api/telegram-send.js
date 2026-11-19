import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { CustomFile } from 'telegram/client/uploads.js';
import bigInt from 'big-integer';

const API_ID = 2040;
const API_HASH = 'b18441a1ff607e10a989891a5462e627';

const DEFAULT_BOT_TOKEN = '9237539087:AAEuSo00rJREK96ZpVsbAxpBFZsInk95e24';
const DEFAULT_BOT_SESSION =
  '1BQANOTEuMTA4LjU2LjE2MAG7udt07T38QUxr5xFD8cJhb+5q4SFZohxTex2OsconF0PNYs9s9wt6koFrnhWtveCfogEFYzEwyRp9eyJzFJ1Ad8YPsYyP6LS0CzObLFuatqD9YX1+ivCsIk22xRrPTaPknGfrvWj6gOvS6Ur1FIESlKaL/ARmA4ybXHX4QcP1aDCbbClGoNdPwc7reu2ea61WDpsxRgkD5YY7Pwf3cs+HAGJYAwGVJjTZyGZW1XZpwRmY4zWZaqxMbHhGLTEli5KTW8ghTg1HJKkdyJg1QuCV2GjzOr6ZdEtsVJVg9JCCSWBRGWT8hGD4/gMdtOZaJPZEC/+flnGfiNWMWNe5byPbpQ==';

// Pre-seeded & dynamically cached user access_hash map for instant MTProto peer resolution
const peerAccessHashCache = new Map([
  ['1379643928', '-985986478348784204'],
  ['9146504063', '5874427571656807442'],
  ['757371398', '8036969123321580619']
]);

// Cache sessions by botToken across warm invocations
const sessionByTokenCache = new Map([
  [DEFAULT_BOT_TOKEN, DEFAULT_BOT_SESSION]
]);

let activeClient = null;
let activeClientToken = null;

async function getConnectedMtprotoClient(botToken) {
  if (activeClient && activeClientToken === botToken && activeClient.connected) {
    return activeClient;
  }

  if (activeClient) {
    try {
      await activeClient.disconnect();
    } catch {
      // ignore disconnect error
    }
    activeClient = null;
    activeClientToken = null;
  }

  const savedSessionStr = sessionByTokenCache.get(botToken) || '';
  const client = new TelegramClient(
    new StringSession(savedSessionStr),
    API_ID,
    API_HASH,
    { connectionRetries: 3 }
  );

  client.setLogLevel('none');

  if (savedSessionStr) {
    await client.connect();
    const isAuth = await client.checkAuthorization();
    if (!isAuth) {
      await client.start({ botAuthToken: botToken });
    }
  } else {
    await client.start({ botAuthToken: botToken });
  }

  sessionByTokenCache.set(botToken, client.session.save());
  activeClient = client;
  activeClientToken = botToken;
  return client;
}

/**
 * Parse simple HTML caption (<b>...</b> and <code>...</code>) into plain text + MTProto entities
 * (Measured in UTF-16 code units as required by Telegram MTProto spec)
 */
function parseHtmlCaption(htmlStr = '') {
  const entities = [];
  let plain = '';
  const tagRegex = /<(b|strong|code)>([\s\S]*?)<\/\1>/gi;
  let lastIdx = 0;

  const decodeEntities = (str) =>
    String(str || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');

  let match;
  while ((match = tagRegex.exec(htmlStr)) !== null) {
    const before = decodeEntities(htmlStr.slice(lastIdx, match.index));
    plain += before;

    const tag = match[1].toLowerCase();
    const inner = decodeEntities(match[2]);
    const offset = plain.length;
    const length = inner.length;
    plain += inner;

    if (length > 0) {
      if (tag === 'b' || tag === 'strong') {
        entities.push(new Api.MessageEntityBold({ offset, length }));
      } else if (tag === 'code') {
        entities.push(new Api.MessageEntityCode({ offset, length }));
      }
    }
    lastIdx = tagRegex.lastIndex;
  }

  plain += decodeEntities(htmlStr.slice(lastIdx));
  return { plain, entities };
}

/**
 * Resolve any Telegram chatId into an MTProto InputPeer
 */
async function resolveInputPeer(client, botToken, recipient) {
  const chatIdStr = String(recipient.chatId || '').trim();
  if (!chatIdStr) throw new Error('Missing chatId');

  // 1. Check cached user accessHash
  if (peerAccessHashCache.has(chatIdStr)) {
    return new Api.InputPeerUser({
      userId: bigInt(chatIdStr),
      accessHash: bigInt(peerAccessHashCache.get(chatIdStr))
    });
  }

  // 2. If negative ID, check basic group (-chatId)
  if (chatIdStr.startsWith('-') && !chatIdStr.startsWith('-100')) {
    return new Api.InputPeerChat({
      chatId: bigInt(chatIdStr.slice(1))
    });
  }

  // 3. Try resolving by username if available
  const cleanUsername = String(recipient.username || '').trim().replace(/^@/, '');
  if (cleanUsername) {
    try {
      const resolved = await client.invoke(
        new Api.contacts.ResolveUsername({ username: cleanUsername })
      );
      const user = (resolved.users || []).find(u => String(u.id) === chatIdStr);
      if (user && user.accessHash !== undefined) {
        const hashStr = String(user.accessHash);
        peerAccessHashCache.set(chatIdStr, hashStr);
        return new Api.InputPeerUser({
          userId: bigInt(chatIdStr),
          accessHash: bigInt(hashStr)
        });
      }
    } catch {
      // fallback to message probe
    }
  }

  // 4. Probe via temporary Bot API message + immediate delete to discover exact MTProto peer
  const probeRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatIdStr,
      text: '⏳',
      disable_notification: true
    })
  });
  const probeData = await probeRes.json().catch(() => null);
  const msgId = probeData?.result?.message_id;

  if (msgId) {
    // Delete the probe message immediately in background
    fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatIdStr, message_id: msgId })
    }).catch(() => {});

    const msgLookup = await client.invoke(
      new Api.messages.GetMessages({
        id: [new Api.InputMessageID({ id: Number(msgId) })]
      })
    );

    const user = (msgLookup.users || []).find(u => String(u.id) === chatIdStr);
    if (user && user.accessHash !== undefined) {
      const hashStr = String(user.accessHash);
      peerAccessHashCache.set(chatIdStr, hashStr);
      return new Api.InputPeerUser({
        userId: bigInt(chatIdStr),
        accessHash: bigInt(hashStr)
      });
    }

    if (chatIdStr.startsWith('-100')) {
      const chanId = chatIdStr.slice(4);
      const chat = (msgLookup.chats || []).find(c => String(c.id) === chanId);
      if (chat && chat.accessHash !== undefined) {
        return new Api.InputPeerChannel({
          channelId: bigInt(chanId),
          accessHash: bigInt(String(chat.accessHash))
        });
      }
    }
  }

  throw new Error(`Cannot resolve MTProto peer for chatId ${chatIdStr}`);
}

/**
 * Shared helper to deliver an already-uploaded InputFile / InputFileBig to all recipients
 * with exact Khmer DocumentAttributeFilename preservation.
 */
async function deliverUploadedFileToRecipients({
  client,
  botToken,
  recipients,
  uploadedFile,
  normalizedFilename,
  mimeType,
  caption
}) {
  const { plain, entities } = parseHtmlCaption(caption);
  const succeeded = [];
  const failed = [];

  for (const recipient of recipients) {
    try {
      const inputPeer = await resolveInputPeer(client, botToken, recipient);
      const randomId = bigInt(Math.floor(Math.random() * 1e15));

      await client.invoke(
        new Api.messages.SendMedia({
          peer: inputPeer,
          media: new Api.InputMediaUploadedDocument({
            file: uploadedFile,
            mimeType: mimeType || 'application/octet-stream',
            attributes: [
              new Api.DocumentAttributeFilename({
                fileName: normalizedFilename
              })
            ],
            forceFile: true
          }),
          message: plain,
          entities: entities.length > 0 ? entities : undefined,
          randomId
        })
      );

      succeeded.push(recipient.title || String(recipient.chatId));
    } catch (err) {
      failed.push(`${recipient.title || recipient.chatId}: ${err.message || 'Error'}`);
    }
  }

  if (succeeded.length === 0) {
    throw new Error(failed.join('; ') || 'MTProto send failed');
  }

  return { ok: true, succeeded, failed };
}

/**
 * Core handler usable in both Vercel Serverless Functions and Vite Dev Server middleware.
 * Supports:
 * 1. Single-shot send (small files <= 2.4 MB)
 * 2. Stateless MTProto Chunked Upload (`action: 'upload_parts'` + `action: 'finalize_chunked'`)
 *    so large multi-page PDFs (4-50 MB) NEVER hit Vercel's 4.5 MB request body limit and
 *    100% preserve Khmer vowels & subscripts (ជើងអក្សរ) in filenames.
 */
export async function handleTelegramMtprotoSend(payload) {
  const {
    action = 'single',
    botToken = DEFAULT_BOT_TOKEN,
    recipients = [],
    filename = 'ឯកសាររបាយការណ៍.pdf',
    mimeType = 'application/pdf',
    caption = '',
    fileBase64 = '',
    fileId = '',
    totalParts = 0,
    isBigFile = false,
    parts = []
  } = payload || {};

  if (!botToken) {
    throw new Error('Missing required parameter: botToken');
  }

  // Mode A: Upload 1..N MTProto 512KB parts directly onto Telegram servers (stateless across lambdas)
  if (action === 'upload_parts') {
    if (!fileId || !Array.isArray(parts) || parts.length === 0) {
      throw new Error('Missing required chunk parameters (fileId or parts)');
    }
    const client = await getConnectedMtprotoClient(botToken);
    const mtFileId = bigInt(String(fileId));
    const totalPartsInt = Number(totalParts) || 1;
    const useBig = Boolean(isBigFile);

    for (const part of parts) {
      const partIdx = Number(part?.partIndex);
      const partBuf = Buffer.from(String(part?.dataBase64 || ''), 'base64');
      if (!Number.isInteger(partIdx) || partIdx < 0 || partBuf.length === 0) {
        throw new Error(`Invalid chunk part at index ${part?.partIndex}`);
      }
      await client.invoke(
        useBig
          ? new Api.upload.SaveBigFilePart({
              fileId: mtFileId,
              filePart: partIdx,
              fileTotalParts: totalPartsInt,
              bytes: partBuf
            })
          : new Api.upload.SaveFilePart({
              fileId: mtFileId,
              filePart: partIdx,
              bytes: partBuf
            })
      );
    }

    return { ok: true, uploadedCount: parts.length };
  }

  // Mode B: Finalize a chunked MTProto upload and send to recipients with exact Khmer filename
  if (action === 'finalize_chunked') {
    if (!fileId || !totalParts || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Missing required finalize parameters (fileId, totalParts, or recipients)');
    }
    const client = await getConnectedMtprotoClient(botToken);
    const mtFileId = bigInt(String(fileId));
    const totalPartsInt = Number(totalParts);
    const normalizedFilename = String(filename).normalize('NFC').trim();
    const uploadedFile = Boolean(isBigFile)
      ? new Api.InputFileBig({
          id: mtFileId,
          parts: totalPartsInt,
          name: normalizedFilename
        })
      : new Api.InputFile({
          id: mtFileId,
          parts: totalPartsInt,
          name: normalizedFilename,
          md5Checksum: ''
        });

    return deliverUploadedFileToRecipients({
      client,
      botToken,
      recipients,
      uploadedFile,
      normalizedFilename,
      mimeType,
      caption
    });
  }

  // Mode C (Default): Single-shot upload for compact files
  if (!fileBase64 || !Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Missing required parameters (botToken, recipients, or fileBase64)');
  }

  const fileBuffer = Buffer.from(fileBase64, 'base64');
  const normalizedFilename = String(filename).normalize('NFC').trim();
  const client = await getConnectedMtprotoClient(botToken);

  // Upload file buffer once to Telegram MTProto servers with exact Khmer filename
  const customFile = new CustomFile(
    normalizedFilename,
    fileBuffer.length,
    '',
    fileBuffer
  );
  const uploadedFile = await client.uploadFile({
    file: customFile,
    workers: 1
  });

  return deliverUploadedFileToRecipients({
    client,
    botToken,
    recipients,
    uploadedFile,
    normalizedFilename,
    mimeType,
    caption
  });
}

/**
 * Default Vercel Serverless Function Handler (POST /api/telegram-send)
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  try {
    let body = req.body;
    if (!body || typeof body === 'string') {
      const rawStr = typeof body === 'string'
        ? body
        : await new Promise((resolve, reject) => {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            req.on('error', reject);
          });
      body = JSON.parse(rawStr || '{}');
    }

    const result = await handleTelegramMtprotoSend(body);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('[/api/telegram-send] Error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        description: err?.message || 'Internal Server Error'
      })
    );
  }
}


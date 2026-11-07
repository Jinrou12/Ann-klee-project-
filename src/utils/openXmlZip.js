// Pure JS OpenXML ZIP Packager & Browser File Downloader for .xlsx and .docx

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a valid uncompressed ZIP Uint8Array from [{ path: string, data: string | Uint8Array }]
 */
export function buildZipArchive(files = []) {
  const encoder = new TextEncoder();
  const entries = files.map(f => {
    const rawPath = String(f.path ?? f.name ?? '');
    const nameBytes = encoder.encode(rawPath.replace(/^\/+/, ''));
    const rawData = f.data !== undefined ? f.data : f.content;
    const dataBytes = rawData instanceof Uint8Array
      ? rawData
      : encoder.encode(String(rawData ?? ''));
    const crc = crc32(dataBytes);
    return {
      nameBytes,
      dataBytes,
      crc,
      size: dataBytes.length
    };
  });

  let localSize = 0;
  let centralSize = 0;
  for (const e of entries) {
    localSize += 30 + e.nameBytes.length + e.size;
    centralSize += 46 + e.nameBytes.length;
  }

  const totalSize = localSize + centralSize + 22;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  let localOffset = 0;
  let centralOffset = localSize;

  for (const e of entries) {
    const fileOffset = localOffset;

    // Local File Header (30 bytes + name + data)
    view.setUint32(localOffset, 0x04034b50, true);      // signature
    view.setUint16(localOffset + 4, 20, true);          // version needed (2.0)
    view.setUint16(localOffset + 6, 0x0800, true);      // UTF-8 filename flag
    view.setUint16(localOffset + 8, 0, true);           // compression = STORE (0)
    view.setUint16(localOffset + 10, 0, true);          // mod time
    view.setUint16(localOffset + 12, 0x21, true);       // mod date
    view.setUint32(localOffset + 14, e.crc, true);      // crc32
    view.setUint32(localOffset + 18, e.size, true);     // compressed size
    view.setUint32(localOffset + 22, e.size, true);     // uncompressed size
    view.setUint16(localOffset + 26, e.nameBytes.length, true); // file name length
    view.setUint16(localOffset + 28, 0, true);          // extra field length
    out.set(e.nameBytes, localOffset + 30);
    out.set(e.dataBytes, localOffset + 30 + e.nameBytes.length);
    localOffset += 30 + e.nameBytes.length + e.size;

    // Central Directory Header (46 bytes + name)
    view.setUint32(centralOffset, 0x02014b50, true);    // signature
    view.setUint16(centralOffset + 4, 20, true);        // version made by
    view.setUint16(centralOffset + 6, 20, true);        // version needed
    view.setUint16(centralOffset + 8, 0x0800, true);    // UTF-8 flag
    view.setUint16(centralOffset + 10, 0, true);       // compression = STORE (0)
    view.setUint16(centralOffset + 12, 0, true);       // mod time
    view.setUint16(centralOffset + 14, 0x21, true);    // mod date
    view.setUint32(centralOffset + 16, e.crc, true);   // crc32
    view.setUint32(centralOffset + 20, e.size, true);  // compressed size
    view.setUint32(centralOffset + 24, e.size, true);  // uncompressed size
    view.setUint16(centralOffset + 28, e.nameBytes.length, true); // name len
    view.setUint16(centralOffset + 30, 0, true);       // extra len
    view.setUint16(centralOffset + 32, 0, true);       // comment len
    view.setUint16(centralOffset + 34, 0, true);       // disk number
    view.setUint16(centralOffset + 36, 0, true);       // internal attrs
    view.setUint32(centralOffset + 38, 0, true);       // external attrs
    view.setUint32(centralOffset + 42, fileOffset, true); // local header offset
    out.set(e.nameBytes, centralOffset + 46);
    centralOffset += 46 + e.nameBytes.length;
  }

  // End of Central Directory Record (22 bytes)
  view.setUint32(centralOffset, 0x06054b50, true);
  view.setUint16(centralOffset + 4, 0, true);
  view.setUint16(centralOffset + 6, 0, true);
  view.setUint16(centralOffset + 8, entries.length, true);
  view.setUint16(centralOffset + 10, entries.length, true);
  view.setUint32(centralOffset + 12, centralSize, true);
  view.setUint32(centralOffset + 16, localSize, true);
  view.setUint16(centralOffset + 20, 0, true);

  return out;
}

export function triggerBlobDownload(bytes, filename, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

let cachedLogoBytes = null;

/**
 * Load and cache the official school/ministry logo (/logo.png) as Uint8Array
 * so it can be embedded directly into .docx (word/media/logo.png) and .xlsx (xl/media/logo.png).
 */
export async function loadOfficialLogoBytes() {
  if (cachedLogoBytes && cachedLogoBytes.length > 0) {
    return cachedLogoBytes;
  }
  try {
    if (typeof fetch === 'function') {
      const res = await fetch('/logo.png?v=nobg1', { cache: 'no-cache' });
      if (res && res.ok) {
        const buf = await res.arrayBuffer();
        cachedLogoBytes = new Uint8Array(buf);
        return cachedLogoBytes;
      }
    }
  } catch (_) {
    // ignore fetch error
  }
  return null;
}

// Pre-warm logo cache in browser environment
if (typeof window !== 'undefined' && typeof fetch === 'function') {
  loadOfficialLogoBytes();
}

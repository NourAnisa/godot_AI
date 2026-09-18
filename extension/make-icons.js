const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createSolidPng(width, height, r, g, b, a = 255) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    let crc = 0xFFFFFFFF;
    for (let i = 4; i < 8 + len; i++) {
      let byte = buf[i];
      crc ^= byte;
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (-(crc & 1) & 0xEDB88320);
      }
    }
    buf.writeInt32BE(~crc, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const scanlineLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLen);
  for (let y = 0; y < height; y++) {
    const offset = y * scanlineLen;
    rawData[offset] = 0;
    for (let x = 0; x < width; x++) {
      const p = offset + 1 + x * 4;
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width / 2 - 2;
      if (dist <= radius) {
        rawData[p] = r;
        rawData[p + 1] = g;
        rawData[p + 2] = b;
        rawData[p + 3] = a;
      } else {
        rawData[p] = 0;
        rawData[p + 1] = 0;
        rawData[p + 2] = 0;
        rawData[p + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join('C:\\Users\\Nor Anisa\\godot_AI\\extension\\icons');
// Indigo theme for Godot AI: r:99, g:102, b:241 (#6366f1)
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), createSolidPng(16, 16, 99, 102, 241));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), createSolidPng(48, 48, 99, 102, 241));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), createSolidPng(128, 128, 99, 102, 241));
console.log('godot_AI icons created.');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Build a minimal valid 16x16 PNG with a blue shield-like color (#2563eb)
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.concat([typeBytes, data]);
  // CRC32 of chunk type + data
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < chunk.length; i++) {
    crc ^= chunk[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, 0);
  return Buffer.concat([len, chunk, crcBuf]);
}

const SIZE = 256;
const bitDepth = 8;
const colorType = 2; // RGB

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = bitDepth;
ihdr[9] = colorType;
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// Image data: each row starts with filter byte 0, then SIZE*3 RGB bytes
const raw = Buffer.alloc(SIZE * (1 + SIZE * 3));
const r = 37, g = 99, b = 235; // primary blue #2563eb

for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (1 + SIZE * 3);
  raw[rowStart] = 0; // no filter
  for (let x = 0; x < SIZE; x++) {
    const off = rowStart + 1 + x * 3;
    // Create a simple shield shape
    const cx = SIZE / 2, cy = SIZE / 2;
    const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = SIZE / 2;
    const shade = Math.max(0, 1 - dist / maxDist);
    const bright = Math.round(155 + 100 * shade);
    // Inner lighter area
    const isInner = dist < SIZE * 0.35;
    raw[off] = isInner ? 255 : r;
    raw[off + 1] = isInner ? 255 : g;
    raw[off + 2] = isInner ? 255 : b;
  }
}

const compressed = zlib.deflateSync(raw);

const png = Buffer.concat([
  signature,
  createChunk('IHDR', ihdr),
  createChunk('IDAT', compressed),
  createChunk('IEND', Buffer.alloc(0)),
]);

const outDir = path.join(__dirname, '..', 'resources');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.png'), png);
console.log('Generated resources/icon.png (' + png.length + ' bytes)');

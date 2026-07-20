const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Generate a proper 256x256 PNG and wrap it in an ICO container
const SIZE = 256;

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.concat([typeBytes, data]);
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < chunk.length; i++) {
    crc ^= chunk[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, 0);
  return Buffer.concat([len, chunk, crcBuf]);
}

// Create blue shield icon (256x256 RGBA)
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4)); // filter byte + RGBA
const r = 37, g = 99, b = 235; // primary blue

for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (1 + SIZE * 4);
  raw[rowStart] = 0; // no filter
  for (let x = 0; x < SIZE; x++) {
    const off = rowStart + 1 + x * 4;
    const cx = SIZE / 2, cy = SIZE / 2;
    const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = SIZE / 2;
    const isInner = dist < SIZE * 0.3;
    const isOuter = dist < SIZE * 0.45;
    const alpha = dist < SIZE * 0.45 ? 255 : 0;
    if (isInner) {
      raw[off] = 255; raw[off+1] = 255; raw[off+2] = 255; raw[off+3] = alpha;
    } else if (isOuter) {
      const shade = Math.max(0, 1 - (dist - SIZE*0.3) / (SIZE*0.15));
      raw[off] = r; raw[off+1] = g; raw[off+2] = b; raw[off+3] = alpha;
    } else {
      raw[off] = 0; raw[off+1] = 0; raw[off+2] = 0; raw[off+3] = 0;
    }
  }
}

const compressed = zlib.deflateSync(raw);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // RGBA

const pngData = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  createChunk('IHDR', ihdr),
  createChunk('IDAT', compressed),
  createChunk('IEND', Buffer.alloc(0)),
]);

// ICO container
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // ICO type
icoHeader.writeUInt16LE(1, 4); // 1 image

const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0);  // width (0=256)
entry.writeUInt8(0, 1);  // height (0=256)
entry.writeUInt8(0, 2);  // colors
entry.writeUInt8(0, 3);  // reserved
entry.writeUInt16LE(1, 4);  // planes
entry.writeUInt16LE(32, 6); // bpp
entry.writeUInt32LE(pngData.length, 8); // size
entry.writeUInt32LE(22, 12); // offset (6+16)

const ico = Buffer.concat([icoHeader, entry, pngData]);
const outPath = path.join(__dirname, '..', 'resources', 'icon.ico');
fs.writeFileSync(outPath, ico);
console.log('Generated ' + outPath + ' (' + ico.length + ' bytes)');

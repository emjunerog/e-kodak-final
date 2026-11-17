/**
 * Minimal pure-JS ISO/IEC 18004 QR Code generator (Byte mode, Versions 1..10, ECC M/L).
 * Zero external dependencies — outputs a boolean[][] matrix and a single SVG path string
 * so react-native-svg can render crisp scannable QR codes with one <Path>.
 */

// GF(256) with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(ecCount) {
  let poly = [1];
  for (let i = 0; i < ecCount; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEcc(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data, 0);
  for (let i = 0; i < data.length; i += 1) {
    const coef = res[i];
    if (coef === 0) continue;
    for (let j = 1; j < gen.length; j += 1) {
      res[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return Array.from(res.slice(data.length));
}

// Version specs for ECC Level M (index 1..10):
// [totalCodewords, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data, alignCenters]
const VERSION_M = [
  null,
  [26, 10, 1, 16, 0, 0, []],
  [44, 16, 1, 28, 0, 0, [6, 18]],
  [70, 26, 1, 44, 0, 0, [6, 22]],
  [100, 18, 2, 32, 0, 0, [6, 26]],
  [134, 24, 2, 43, 0, 0, [6, 30]],
  [172, 16, 4, 27, 0, 0, [6, 34]],
  [196, 18, 4, 31, 0, 0, [6, 22, 38]],
  [242, 22, 2, 38, 2, 39, [6, 24, 42]],
  [292, 22, 3, 36, 2, 37, [6, 26, 46]],
  [346, 26, 4, 43, 1, 44, [6, 28, 50]],
];

const VERSION_L = [
  null,
  [26, 7, 1, 19, 0, 0, []],
  [44, 10, 1, 34, 0, 0, [6, 18]],
  [70, 15, 1, 55, 0, 0, [6, 22]],
  [100, 20, 1, 80, 0, 0, [6, 26]],
  [134, 26, 1, 108, 0, 0, [6, 30]],
  [172, 18, 2, 68, 0, 0, [6, 34]],
  [196, 20, 2, 78, 0, 0, [6, 22, 38]],
  [242, 24, 2, 97, 0, 0, [6, 24, 42]],
  [292, 30, 2, 116, 0, 0, [6, 26, 46]],
  [346, 18, 2, 68, 2, 69, [6, 28, 50]],
];

// Format info bits for ECC M (00) + mask 0..7, and ECC L (01) + mask 0..7 (precomputed BCH + XOR 0x5412)
const FORMAT_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];
const FORMAT_L = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976];

// Version info 18-bit BCH codes for versions 7..10
const VERSION_BITS = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
};

function encodeUtf8Bytes(str) {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(str));
  }
  const encoded = unescape(encodeURIComponent(str));
  const out = new Array(encoded.length);
  for (let i = 0; i < encoded.length; i += 1) {
    out[i] = encoded.charCodeAt(i);
  }
  return out;
}

function pickVersion(byteLen) {
  for (let v = 1; v <= 10; v += 1) {
    const spec = VERSION_M[v];
    const dataCap = spec[2] * spec[3] + spec[4] * spec[5];
    const headerBits = v <= 9 ? 4 + 8 : 4 + 16;
    if (headerBits + byteLen * 8 <= dataCap * 8) {
      return { version: v, level: 'M', spec };
    }
  }
  for (let v = 8; v <= 10; v += 1) {
    const spec = VERSION_L[v];
    const dataCap = spec[2] * spec[3] + spec[4] * spec[5];
    const headerBits = v <= 9 ? 4 + 8 : 4 + 16;
    if (headerBits + byteLen * 8 <= dataCap * 8) {
      return { version: v, level: 'L', spec };
    }
  }
  return null;
}

function buildCodewords(bytes, version, spec) {
  const dataCap = spec[2] * spec[3] + spec[4] * spec[5];
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i -= 1) {
      bits.push((val >>> i) & 1);
    }
  };

  // Mode indicator 0100 (Byte)
  pushBits(0b0100, 4);
  pushBits(bytes.length, version <= 9 ? 8 : 16);
  for (let i = 0; i < bytes.length; i += 1) {
    pushBits(bytes[i], 8);
  }

  const maxBits = dataCap * 8;
  const term = Math.min(4, maxBits - bits.length);
  pushBits(0, term);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j += 1) b = (b << 1) | bits[i + j];
    dataBytes.push(b);
  }
  const padCycle = [0xec, 0x11];
  let p = 0;
  while (dataBytes.length < dataCap) {
    dataBytes.push(padCycle[p % 2]);
    p += 1;
  }

  const [, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = spec;
  const dataBlocks = [];
  const eccBlocks = [];
  let offset = 0;
  for (let i = 0; i < g1Blocks; i += 1) {
    const block = dataBytes.slice(offset, offset + g1Data);
    offset += g1Data;
    dataBlocks.push(block);
    eccBlocks.push(rsComputeEcc(block, ecPerBlock));
  }
  for (let i = 0; i < g2Blocks; i += 1) {
    const block = dataBytes.slice(offset, offset + g2Data);
    offset += g2Data;
    dataBlocks.push(block);
    eccBlocks.push(rsComputeEcc(block, ecPerBlock));
  }

  const finalCodewords = [];
  const maxDataLen = Math.max(g1Data, g2Data);
  for (let i = 0; i < maxDataLen; i += 1) {
    for (let b = 0; b < dataBlocks.length; b += 1) {
      if (i < dataBlocks[b].length) finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (let b = 0; b < eccBlocks.length; b += 1) {
      finalCodewords.push(eccBlocks[b][i]);
    }
  }
  return finalCodewords;
}

function createTemplate(version, alignCenters) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Uint8Array(size));
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));

  const setFixed = (r, c, val) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = val ? 1 : 0;
      reserved[r][c] = 1;
    }
  };

  const placeFinder = (top, left) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const isDark =
          inOuter &&
          (dr === 0 ||
            dr === 6 ||
            dc === 0 ||
            dc === 6 ||
            (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFixed(r, c, isDark);
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Alignment patterns
  if (alignCenters.length > 0) {
    for (let i = 0; i < alignCenters.length; i += 1) {
      for (let j = 0; j < alignCenters.length; j += 1) {
        const cr = alignCenters[i];
        const cc = alignCenters[j];
        if (reserved[cr][cc]) continue;
        for (let dr = -2; dr <= 2; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            const dist = Math.max(Math.abs(dr), Math.abs(dc));
            setFixed(cr + dr, cc + dc, dist === 2 || dist === 0);
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    if (!reserved[6][i]) setFixed(6, i, i % 2 === 0);
    if (!reserved[i][6]) setFixed(i, 6, i % 2 === 0);
  }

  // Dark module
  setFixed(size - 8, 8, true);

  // Reserve format info strips
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      reserved[8][i] = 1;
      reserved[i][8] = 1;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = 1;
    if (i < 7) reserved[size - 1 - i][8] = 1;
  }

  // Reserve version info for v >= 7
  if (version >= 7) {
    const bits = VERSION_BITS[version];
    for (let i = 0; i < 18; i += 1) {
      const bit = (bits >>> i) & 1;
      const r = Math.floor(i / 3);
      const c = size - 11 + (i % 3);
      setFixed(r, c, bit === 1);
      setFixed(c, r, bit === 1);
    }
  }

  return { size, modules, reserved };
}

function applyMaskAndFormat(template, codewords, maskId, level) {
  const { size } = template;
  const grid = template.modules.map((row) => Uint8Array.from(row));
  const reserved = template.reserved;

  const maskFn = (r, c) => {
    switch (maskId) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  };

  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step += 1) {
      const r = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const c = right - dx;
        if (reserved[r][c]) continue;
        let bit = 0;
        if (bitIdx < totalBits) {
          bit = (codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
          bitIdx += 1;
        }
        grid[r][c] = bit ^ (maskFn(r, c) ? 1 : 0);
      }
    }
    upward = !upward;
  }

  const fmt = (level === 'M' ? FORMAT_M : FORMAT_L)[maskId];
  for (let k = 0; k < 15; k += 1) {
    const bit = (fmt >>> k) & 1;

    // Copy 1: around top-left finder
    if (k < 6) grid[k][8] = bit;
    else if (k === 6) grid[7][8] = bit;
    else if (k === 7) grid[8][8] = bit;
    else if (k === 8) grid[8][7] = bit;
    else grid[8][14 - k] = bit;

    // Copy 2: bottom-left + top-right strips
    if (k < 8) grid[8][size - 1 - k] = bit;
    else grid[size - 15 + k][8] = bit;
  }

  return grid;
}

function penaltyScore(grid) {
  const n = grid.length;
  let score = 0;

  // Rule 1: adjacent modules in row/col
  for (let r = 0; r < n; r += 1) {
    let runR = 1;
    let runC = 1;
    for (let i = 1; i < n; i += 1) {
      if (grid[r][i] === grid[r][i - 1]) runR += 1;
      else {
        if (runR >= 5) score += 3 + (runR - 5);
        runR = 1;
      }
      if (grid[i][r] === grid[i - 1][r]) runC += 1;
      else {
        if (runC >= 5) score += 3 + (runC - 5);
        runC = 1;
      }
    }
    if (runR >= 5) score += 3 + (runR - 5);
    if (runC >= 5) score += 3 + (runC - 5);
  }

  // Rule 2: 2x2 blocks
  for (let r = 0; r < n - 1; r += 1) {
    for (let c = 0; c < n - 1; c += 1) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) {
        score += 3;
      }
    }
  }

  return score;
}

/**
 * Generates an ISO/IEC 18004 QR matrix + SVG <Path> data for the input string.
 * @param {string} value
 * @returns {{ size: number, path: string } | null}
 */
export function buildQrSvgData(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  const bytes = encodeUtf8Bytes(text);
  const picked = pickVersion(bytes.length);
  if (!picked) return null;

  const { version, level, spec } = picked;
  const codewords = buildCodewords(bytes, version, spec);
  const template = createTemplate(version, spec[6]);

  let bestGrid = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = applyMaskAndFormat(template, codewords, mask, level);
    const s = penaltyScore(candidate);
    if (s < bestScore) {
      bestScore = s;
      bestGrid = candidate;
    }
  }

  const size = bestGrid.length;
  const parts = [];
  for (let r = 0; r < size; r += 1) {
    let c = 0;
    while (c < size) {
      if (!bestGrid[r][c]) {
        c += 1;
        continue;
      }
      const start = c;
      while (c < size && bestGrid[r][c]) c += 1;
      parts.push(`M${start} ${r}h${c - start}v1h${start - c}z`);
    }
  }

  return { size, path: parts.join('') };
}

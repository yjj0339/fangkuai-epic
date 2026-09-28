// 值噪声 + 分形（种子化，与 MC 风格地形配合）
export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
function hash2(x, y, seed) {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
function hash3(x, y, z, seed) {
  let h = seed + x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

export function valueNoise2(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = fade(x - xi), yf = fade(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
}
export function valueNoise3(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const n = (X, Y, Z) => hash3(xi + X, yi + Y, zi + Z, seed);
  const x00 = lerp(n(0, 0, 0), n(1, 0, 0), xf);
  const x10 = lerp(n(0, 1, 0), n(1, 1, 0), xf);
  const x01 = lerp(n(0, 0, 1), n(1, 0, 1), xf);
  const x11 = lerp(n(0, 1, 1), n(1, 1, 1), xf);
  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf);
}
export function fbm2(x, y, seed, oct = 4, lac = 2, gain = 0.5) {
  let v = 0, amp = 1, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) {
    v += valueNoise2(x * f, y * f, seed + i * 1013) * amp;
    tot += amp; amp *= gain; f *= lac;
  }
  return v / tot;
}
export function ridge2(x, y, seed, oct = 4) {
  let v = 0, amp = 0.55, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(valueNoise2(x * f, y * f, seed + i * 733) * 2 - 1);
    v += n * n * amp;
    tot += amp; amp *= 0.5; f *= 2;
  }
  return v / tot;
}

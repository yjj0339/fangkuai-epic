// 背包/快捷栏数据 + 合成匹配
import { itemInfo, RECIPES } from './items.js';

export class Inventory {
  constructor() {
    // 0-8 快捷栏，9-35 背包
    this.slots = new Array(36).fill(null); // {id, n, dur?}
    this.sel = 0;
  }
  held() { return this.slots[this.sel]; }
  // 添加物品，返回剩余未放入数量
  add(id, n, dur) {
    const info = itemInfo(id);
    const max = info ? info.stack : 64;
    if (max > 1) {
      for (let i = 0; i < 36 && n > 0; i++) {
        const s = this.slots[i];
        if (s && s.id === id && s.n < max) {
          const take = Math.min(n, max - s.n);
          s.n += take; n -= take;
        }
      }
    }
    for (let i = 0; i < 36 && n > 0; i++) {
      if (!this.slots[i]) {
        const put = Math.min(n, max);
        this.slots[i] = { id, n: put };
        if (dur !== undefined) this.slots[i].dur = dur;
        else if (info && info.dur) this.slots[i].dur = info.dur;
        n -= put;
      }
    }
    return n;
  }
  count(id) { let c = 0; for (const s of this.slots) if (s && s.id === id) c += s.n; return c; }
  // 消耗 n 个 id（从快捷栏优先），返回是否成功
  consume(id, n) {
    if (this.count(id) < n) return false;
    for (let i = 0; i < 36 && n > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const take = Math.min(n, s.n);
        s.n -= take; n -= take;
        if (s.n <= 0) this.slots[i] = null;
      }
    }
    return true;
  }
  // 当前持物耐久损耗；破坏工具返回 true
  damageHeld(amount = 1) {
    const s = this.slots[this.sel];
    if (!s) return false;
    const info = itemInfo(s.id);
    if (!info || !info.dur) return false;
    if (s.dur === undefined) s.dur = info.dur;
    s.dur -= amount;
    if (s.dur <= 0) { this.slots[this.sel] = null; return true; }
    return false;
  }
}

// 合成匹配：grid 是 n×n 的 id 矩阵（null 空）
export function matchRecipe(grid, size) {
  const W = size, H = size;
  const flat = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) flat.push(grid[y][x]);
  const used = flat.filter(v => v !== null && v !== undefined);
  for (const r of RECIPES) {
    if (r.shapeless) {
      if (r.shapeless.length !== used.length) continue;
      const need = [...r.shapeless];
      let ok = true;
      for (const u of used) {
        const ix = need.indexOf(u);
        if (ix < 0) { ok = false; break; }
        need.splice(ix, 1);
      }
      if (ok && need.length === 0) return r;
    } else {
      const shape = r.shape;
      const sh = shape.length, sw = Math.max(...shape.map(s => s.length));
      if (sh > H || sw > W) continue;
      for (let oy = 0; oy <= H - sh; oy++) for (let ox = 0; ox <= W - sw; ox++) {
        let ok = true;
        for (let y = 0; y < H && ok; y++) for (let x = 0; x < W && ok; x++) {
          const cell = grid[y][x] ?? null;
          let want = null;
          if (y >= oy && y < oy + sh && x >= ox && x < ox + sw) {
            const row = shape[y - oy];
            const ch = row[x - ox] || ' ';
            want = ch === ' ' ? null : (r.key[ch] ?? null);
          }
          if ((cell ?? null) !== (want ?? null)) ok = false;
        }
        if (ok) return r;
      }
    }
  }
  return null;
}

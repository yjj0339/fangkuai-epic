// 世界：区块管理 + 生物群系地形生成 + 增量光照 BFS + 随机刻 + 容器
import { B, blockInfo, isOpaque } from './blocks.js';
import { fbm2, ridge2, valueNoise3, makeRng } from './noise.js';

export const SX = 16, SY = 96, SZ = 16, SEA = 30;
export const idx = (x, y, z) => (y * SZ + z) * SX + x;

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx; this.cz = cz;
    this.blocks = new Uint8Array(SX * SY * SZ);
    this.sky = new Uint8Array(SX * SY * SZ);    // 天光 0-15
    this.blk = new Uint8Array(SX * SY * SZ);    // 方块光 0-15
    this.dirty = true;      // 需重建网格
    this.dirtyLight = true; // 需要初始光照
    this.mesh = null; this.meshWater = null; this.meshCut = null;
  }
}

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.chunks = new Map();          // "cx,cz" -> Chunk
    this.edits = new Map();           // "cx,cz" -> Map(localIdx -> id) 存档差异
    this.containers = new Map();      // "x,y,z" -> {type:'chest'|'furnace', slots:[], ...}
    this.buildQueue = [];
    this.rand = makeRng(this.seed ^ 0x9e3779b9);
    this.tickAcc = 0;
    this.listeners = [];              // 方块变化回调 (x,y,z,id)
  }
  key(cx, cz) { return cx + ',' + cz; }
  onBlockChange(fn) { this.listeners.push(fn); }
  emit(x, y, z, id) { for (const fn of this.listeners) fn(x, y, z, id); }

  getChunk(cx, cz) { return this.chunks.get(this.key(cx, cz)) || null; }
  ensureChunk(cx, cz) {
    let c = this.getChunk(cx, cz);
    if (!c) {
      c = new Chunk(cx, cz);
      this.chunks.set(this.key(cx, cz), c);
      this.genChunk(c);
      // 应用存档差异
      const ed = this.edits.get(this.key(cx, cz));
      if (ed) for (const [i, id] of ed) c.blocks[i] = id;
      // 应用容器（无需处理，容器数据独立于方块）
    }
    return c;
  }

  getBlock(x, y, z) {
    if (y < 0 || y >= SY) return 0;
    const cx = x >> 4, cz = z >> 4;
    const c = this.chunks.get(this.key(cx, cz));
    if (!c) return B.STONE; // 未加载视为实心（防掉出）
    return c.blocks[idx(x & 15, y, z & 15)];
  }
  getBlockOr(x, y, z, dflt = 0) {
    if (y < 0 || y >= SY) return 0;
    const c = this.chunks.get(this.key(x >> 4, z >> 4));
    if (!c) return dflt;
    return c.blocks[idx(x & 15, y, z & 15)];
  }
  getSky(x, y, z) {
    if (y >= SY) return 15; if (y < 0) return 0;
    const c = this.chunks.get(this.key(x >> 4, z >> 4));
    return c ? c.sky[idx(x & 15, y, z & 15)] : 15;
  }
  getBlk(x, y, z) {
    if (y < 0 || y >= SY) return 0;
    const c = this.chunks.get(this.key(x >> 4, z >> 4));
    return c ? c.blk[idx(x & 15, y, z & 15)] : 0;
  }
  setSky(x, y, z, v) {
    if (y < 0 || y >= SY) return;
    const c = this.chunks.get(this.key(x >> 4, z >> 4));
    if (c) c.sky[idx(x & 15, y, z & 15)] = v;
  }
  setBlk(x, y, z, v) {
    if (y < 0 || y >= SY) return;
    const c = this.chunks.get(this.key(x >> 4, z >> 4));
    if (c) c.blk[idx(x & 15, y, z & 15)] = v;
  }

  setBlock(x, y, z, id, opts = {}) {
    if (y < 0 || y >= SY) return false;
    const cx = x >> 4, cz = z >> 4;
    const c = this.chunks.get(this.key(cx, cz));
    if (!c) return false;
    const i = idx(x & 15, y, z & 15);
    const old = c.blocks[i];
    if (old === id) return false;
    c.blocks[i] = id;
    // 记录存档差异
    if (!opts.noSave) {
      let ed = this.edits.get(this.key(cx, cz));
      if (!ed) { ed = new Map(); this.edits.set(this.key(cx, cz), ed); }
      ed.set(i, id);
    }
    // 光照增量更新
    this.updateLightAt(x, y, z, old, id);
    // 标记脏（含相邻区块）
    this.markDirtyAround(x, y, z);
    this.emit(x, y, z, id);
    return true;
  }
  markDirtyAround(x, y, z) {
    const mark = (cx, cz) => { const c = this.chunks.get(this.key(cx, cz)); if (c) c.dirty = true; };
    mark(x >> 4, z >> 4);
    if ((x & 15) === 0) mark((x >> 4) - 1, z >> 4);
    if ((x & 15) === 15) mark((x >> 4) + 1, z >> 4);
    if ((z & 15) === 0) mark(x >> 4, (z >> 4) - 1);
    if ((z & 15) === 15) mark(x >> 4, (z >> 4) + 1);
  }

  // ---------------- 光照 ----------------
  // 增量 BFS：放置/破坏方块时保持 sky/blk 光正确
  updateLightAt(x, y, z, oldId, newId) {
    const oldOp = isOpaque(oldId), newOp = isOpaque(newId);
    const oldL = blockInfo(oldId).light, newL = blockInfo(newId).light;

    // ---- 方块光 ----
    if (oldL > 0) this.removeBlockLight(x, y, z);
    if (newOp && !oldOp) {
      // 遮挡：方块光被挡 -> remove 传播
      const l = this.getBlk(x, y, z);
      if (l > 0) this.removeBlockLight(x, y, z);
    }
    if (!newOp && oldOp) {
      // 透光：邻边光流入
      this.injectFromNeighborsBlk(x, y, z);
    }
    if (newL > 0) {
      this.setBlk(x, y, z, newL);
      this.bfsBlockLight([[x, y, z, newL]]);
    }
    if (newL === 0 && oldL > 0) { /* removed above */ }

    // ---- 天光 ----
    if (newOp && !oldOp) {
      const l = this.getSky(x, y, z);
      if (l > 0) this.removeSkyLight(x, y, z);
    }
    if (!newOp && oldOp) {
      // 开洞：向上找直射
      let direct = 15;
      // 若正上方直通天（逐级 sky==15），注入 15
      let yy = y + 1;
      while (yy < SY && this.getSky(x, yy, z) === 15 && !isOpaque(this.getBlockOr(x, yy, z, 0))) yy++;
      if (yy >= SY) { this.setSky(x, y, z, 15); this.bfsSky([[x, y, z, 15]]); }
      else this.injectFromNeighborsSky(x, y, z);
    }
    if (!newOp && !oldOp && newL === 0) {
      // 同为透光（如放火把已在上面处理）——无需
    }
  }

  removeBlockLight(x, y, z) {
    const start = this.getBlk(x, y, z);
    this.setBlk(x, y, z, 0);
    const q = [[x, y, z, start]];
    const relight = [];
    const D = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    while (q.length) {
      const [px, py, pz, lv] = q.pop();
      for (const [dx, dy, dz] of D) {
        const nx = px + dx, ny = py + dy, nz = pz + dz;
        if (ny < 0 || ny >= SY) continue;
        const nl = this.getBlk(nx, ny, nz);
        if (nl === 0) continue;
        if (nl < lv || (nl === 15 && blockInfo(this.getBlockOr(nx, ny, nz, 0)).light === 15)) {
          this.setBlk(nx, ny, nz, 0);
          q.push([nx, ny, nz, nl]);
        } else {
          relight.push([nx, ny, nz, nl]);
        }
      }
    }
    if (relight.length) this.bfsBlockLight(relight);
  }
  bfsBlockLight(queue) {
    const D = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    let head = 0;
    while (head < queue.length) {
      const [px, py, pz, lv] = queue[head++];
      if (lv <= 1) continue;
      for (const [dx, dy, dz] of D) {
        const nx = px + dx, ny = py + dy, nz = pz + dz;
        if (ny < 0 || ny >= SY) continue;
        const nb = this.getBlockOr(nx, ny, nz, B.STONE);
        if (isOpaque(nb)) continue;
        const nl = lv - 1;
        if (this.getBlk(nx, ny, nz) < nl) {
          this.setBlk(nx, ny, nz, nl);
          queue.push([nx, ny, nz, nl]);
        }
      }
    }
  }
  injectFromNeighborsBlk(x, y, z) {
    const seeds = [];
    for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
      const l = this.getBlk(x + dx, y + dy, z + dz);
      if (l > 1) seeds.push([x, y, z, l - 1]);
    }
    if (seeds.length) {
      for (const s of seeds) { if (this.getBlk(s[0], s[1], s[2]) < s[3]) this.setBlk(s[0], s[1], s[2], s[3]); }
      this.bfsBlockLight(seeds);
    }
  }
  removeSkyLight(x, y, z) {
    const start = this.getSky(x, y, z);
    this.setSky(x, y, z, 0);
    const q = [[x, y, z, start]];
    const relight = [];
    const D = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    while (q.length) {
      const [px, py, pz, lv] = q.pop();
      for (const [dx, dy, dz] of D) {
        const nx = px + dx, ny = py + dy, nz = pz + dz;
        if (ny < 0 || ny >= SY) continue;
        const nl = this.getSky(nx, ny, nz);
        if (nl === 0) continue;
        // sky 特殊：正上方 15 向下传 15
        const down = dz === 0 && dy === -1 && dx === 0;
        if (nl < lv || (down && lv === 15 && nl === 15)) {
          this.setSky(nx, ny, nz, 0);
          q.push([nx, ny, nz, nl]);
        } else {
          relight.push([nx, ny, nz, nl]);
        }
      }
    }
    if (relight.length) this.bfsSky(relight);
  }
  bfsSky(queue) {
    const D = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    let head = 0;
    while (head < queue.length) {
      const [px, py, pz, lv] = queue[head++];
      if (lv <= 1 && !(lv === 15)) { if (lv <= 1) continue; }
      for (const [dx, dy, dz] of D) {
        const nx = px + dx, ny = py + dy, nz = pz + dz;
        if (ny < 0 || ny >= SY) continue;
        const nb = this.getBlockOr(nx, ny, nz, B.STONE);
        if (isOpaque(nb)) continue;
        // 向下且 lv==15：传 15；否则 -1
        const isDown = dx === 0 && dy === -1 && dz === 0;
        const nl = (isDown && lv === 15) ? 15 : lv - 1;
        if (nl <= 0) continue;
        if (this.getSky(nx, ny, nz) < nl) {
          this.setSky(nx, ny, nz, nl);
          queue.push([nx, ny, nz, nl]);
        }
      }
    }
  }
  injectFromNeighborsSky(x, y, z) {
    const seeds = [];
    for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
      const l = this.getSky(x + dx, y + dy, z + dz);
      if (l > 1) seeds.push([x, y, z, l - 1]);
    }
    if (seeds.length) {
      for (const s of seeds) if (this.getSky(s[0], s[1], s[2]) < s[3]) this.setSky(s[0], s[1], s[2], s[3]);
      this.bfsSky(seeds);
    }
  }

  initChunkLight(c) {
    // 列灌注 + 邻界注入 + 双 BFS
    const wx0 = c.cx * SX, wz0 = c.cz * SZ;
    // sky 垂直
    for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      let lv = 15;
      for (let y = SY - 1; y >= 0; y--) {
        const id = c.blocks[idx(x, y, z)];
        if (isOpaque(id)) lv = 0;
        else if (id === B.WATER) lv = Math.max(0, lv - 2);
        else if (blockInfo(id).transparent && !blockInfo(id).cutout) lv = Math.max(0, lv - 1);
        c.sky[idx(x, y, z)] = lv;
        if (lv === 0) { // 以下全部 0（列内）
          for (let yy = y - 1; yy >= 0; yy--) c.sky[idx(x, yy, z)] = 0;
          break;
        }
      }
    }
    // 方块光源收集 + sky 横向扩散种子
    const seedsS = [], seedsB = [];
    for (let y = 0; y < SY; y++) for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      const l = blockInfo(c.blocks[idx(x, y, z)]).light;
      if (l > 0) { c.blk[idx(x, y, z)] = l; seedsB.push([wx0 + x, y, wz0 + z, l]); }
    }
    // sky 横向：所有 >0 且有更暗邻居的进入种子（简化：边界列 + 内部高差）
    for (let y = 0; y < SY; y++) for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      const s = c.sky[idx(x, y, z)];
      if (s > 1 && (x === 0 || x === SX - 1 || z === 0 || z === SZ - 1)) seedsS.push([wx0 + x, y, wz0 + z, s]);
    }
    // 邻界注入（相邻区块已加载的边界光）
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const n = this.getChunk(c.cx + dx, c.cz + dz);
      if (!n) continue;
      for (let y = 0; y < SY; y++) for (let t = 0; t < 16; t++) {
        const nx = dx === 1 ? wx0 + SX : dx === -1 ? wx0 - 1 : wx0 + t;
        const nz = dz === 1 ? wz0 + SZ : dz === -1 ? wz0 - 1 : wz0 + t;
        const ns = n.sky[idx(nx & 15, y, nz & 15)];
        const nb = n.blk[idx(nx & 15, y, nz & 15)];
        if (ns > 1) seedsS.push([nx, y, nz, ns]);
        if (nb > 1) seedsB.push([nx, y, nz, nb]);
      }
    }
    this.bfsSky(seedsS);
    this.bfsBlockLight(seedsB);
    c.dirtyLight = false;
  }

  // ---------------- 地形生成 ----------------
  biomeAt(wx, wz) {
    const t = fbm2(wx * 0.003 + 500, wz * 0.003, this.seed + 1, 3);
    const h = fbm2(wx * 0.004 - 800, wz * 0.004, this.seed + 2, 3);
    if (t > 0.62 && h < 0.42) return 'desert';
    if (t < 0.34) return 'snow';
    if (h > 0.55) return 'forest';
    return 'plains';
  }
  heightAt2(wx, wz) {
    const cont = fbm2(wx * 0.0035, wz * 0.0035, this.seed, 4);
    const hill = fbm2(wx * 0.012, wz * 0.012, this.seed + 9, 3);
    const ridge = ridge2(wx * 0.006, wz * 0.006, this.seed + 21, 4);
    const mount = Math.pow(Math.max(0, fbm2(wx * 0.0028 + 300, wz * 0.0028, this.seed + 33, 3) - 0.52) * 3.2, 1.6);
    let hgt = 26 + cont * 22 + hill * 6 + ridge * mount * 42 + mount * 8;
    return Math.max(3, Math.min(SY - 10, hgt | 0));
  }
  genChunk(c) {
    const wx0 = c.cx * SX, wz0 = c.cz * SZ;
    const rng = makeRng(this.seed ^ (c.cx * 341873128) ^ (c.cz * 132897987));
    const heights = [], biomes = [];
    for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      const wx = wx0 + x, wz = wz0 + z;
      const bio = this.biomeAt(wx, wz);
      const hgt = this.heightAt2(wx, wz);
      heights.push(hgt); biomes.push(bio);
      for (let y = 0; y <= Math.max(hgt, SEA); y++) {
        let id = 0;
        if (y === 0 || (y < 3 && rng() < 0.7)) id = B.BEDROCK;
        else if (y < hgt - 3) id = B.STONE;
        else if (y < hgt) id = bio === 'desert' ? B.SANDSTONE : B.DIRT;
        else if (y === hgt) {
          if (bio === 'desert') id = B.SAND;
          else if (hgt < SEA + 1) id = hgt < SEA - 1 ? B.GRAVEL : B.SAND;
          else if (bio === 'snow') id = B.SNOWY_GRASS;
          else id = hgt > 74 ? (bio === 'snow' ? B.SNOW : B.STONE) : B.GRASS;
          if (hgt > 74 && bio !== 'desert') id = hgt > 80 ? B.SNOW : B.STONE;
        }
        else if (y <= SEA) id = B.WATER;
        if (id) c.blocks[idx(x, y, z)] = id;
      }
      // 洞穴（挖空）
      for (let y = 2; y < Math.min(hgt, 70); y++) {
        const n1 = valueNoise3(wx * 0.045, y * 0.06, wz * 0.045, this.seed + 7);
        const n2 = valueNoise3(wx * 0.05 + 900, y * 0.07, wz * 0.05, this.seed + 17);
        if (Math.abs(n1 - 0.5) < 0.045 && Math.abs(n2 - 0.5) < 0.045) {
          const cur = c.blocks[idx(x, y, z)];
          if (cur !== B.BEDROCK) c.blocks[idx(x, y, z)] = 0;
        }
        const big = valueNoise3(wx * 0.02, y * 0.03, wz * 0.02, this.seed + 27);
        if (big > 0.78 && y < hgt - 6 && y > 4) {
          const cur = c.blocks[idx(x, y, z)];
          if (cur !== B.BEDROCK) c.blocks[idx(x, y, z)] = 0;
        }
      }
      // 矿脉
      for (let y = 1; y < hgt - 2; y++) {
        if (c.blocks[idx(x, y, z)] !== B.STONE) continue;
        const r = rng();
        if (y < 14 && r < 0.0045) c.blocks[idx(x, y, z)] = B.DIAMOND_ORE;
        else if (y < 20 && r < 0.006) c.blocks[idx(x, y, z)] = B.GOLD_ORE;
        else if (y < 40 && r < 0.014) c.blocks[idx(x, y, z)] = B.IRON_ORE;
        else if (r < 0.017) c.blocks[idx(x, y, z)] = B.COAL_ORE;
        else if (r < 0.019) c.blocks[idx(x, y, z)] = B.GRAVEL;
      }
    }
    // 植被/树（避免跨界：树冠简单裁剪在本 chunk 内）
    for (let z = 1; z < SZ - 1; z++) for (let x = 1; x < SX - 1; x++) {
      const wx = wx0 + x, wz = wz0 + z;
      const hgt = heights[z * SX + x], bio = biomes[z * SX + x];
      if (hgt <= SEA) continue;
      const top = c.blocks[idx(x, hgt, z)];
      const r = rng();
      if (top === B.GRASS) {
        const treeP = bio === 'forest' ? 0.045 : 0.006;
        if (r < treeP) { this.placeTree(c, x, hgt + 1, z, rng); continue; }
        if (r < treeP + 0.02) c.blocks[idx(x, hgt + 1, z)] = B.TALL_GRASS;
        else if (r < treeP + 0.026) c.blocks[idx(x, hgt + 1, z)] = rng() < 0.5 ? B.FLOWER_RED : B.FLOWER_YELLOW;
        else if (r < treeP + 0.0272) c.blocks[idx(x, hgt + 1, z)] = B.PUMPKIN;
      } else if (top === B.SNOWY_GRASS) {
        if (r < 0.02) { this.placeSpruce(c, x, hgt + 1, z, rng); continue; }
        if (r < 0.03) c.blocks[idx(x, hgt + 1, z)] = B.SNOW_LAYER;
      } else if (top === B.SAND && bio === 'desert') {
        if (r < 0.006) { // 仙人掌 1-3 高
          const ch = 1 + (rng() * 3 | 0);
          for (let i = 0; i < ch; i++) c.blocks[idx(x, hgt + 1 + i, z)] = B.CACTUS;
        } else if (r < 0.008) c.blocks[idx(x, hgt + 1, z)] = B.DEAD_BUSH;
      }
    }
  }
  placeTree(c, x, y, z, rng) {
    const h = 4 + (rng() * 3 | 0);
    for (let i = 0; i < h; i++) c.blocks[idx(x, y + i, z)] = B.LOG;
    const top = y + h;
    for (let dy = -2; dy <= 1; dy++) {
      const rad = dy <= -1 ? 2 : dy === 0 ? 2 : 1;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && rng() < 0.5) continue;
        const px = x + dx, pz = z + dz, py = top + dy;
        if (px < 0 || px >= SX || pz < 0 || pz >= SZ || py >= SY) continue;
        if (c.blocks[idx(px, py, pz)] === 0) c.blocks[idx(px, py, pz)] = B.LEAVES;
      }
    }
    c.blocks[idx(x, top + 1, z)] = B.LEAVES;
  }
  placeSpruce(c, x, y, z, rng) {
    const h = 6 + (rng() * 3 | 0);
    for (let i = 0; i < h; i++) c.blocks[idx(x, y + i, z)] = B.SPRUCE_LOG;
    let rad = 2;
    for (let dy = h - 1; dy >= 2; dy--) {
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > rad + 0.5) continue;
        const px = x + dx, pz = z + dz;
        if (px < 0 || px >= SX || pz < 0 || pz >= SZ || y + dy >= SY) continue;
        if (c.blocks[idx(px, y + dy, pz)] === 0) c.blocks[idx(px, y + dy, pz)] = B.SPRUCE_LEAVES;
      }
      rad = rad === 2 ? 1 : 2;
    }
    c.blocks[idx(x, y + h, z)] = B.SPRUCE_LEAVES;
  }

  surfaceY(wx, wz) {
    for (let y = SY - 1; y > 0; y--) {
      const id = this.getBlockOr(wx, y, wz, 0);
      if (id !== 0 && id !== B.WATER && blockInfo(id).solid) return y + 1;
    }
    return SEA + 1;
  }

  // ---------------- 随机刻 ----------------
  randomTick(px, pz, n = 24) {
    const cx = px >> 4, cz = pz >> 4;
    for (let k = 0; k < n; k++) {
      const ccx = cx + (this.rand() * 3 | 0) - 1, ccz = cz + (this.rand() * 3 | 0) - 1;
      const c = this.getChunk(ccx, ccz);
      if (!c || c.dirtyLight) continue;
      const x = this.rand() * SX | 0, z = this.rand() * SZ | 0, y = this.rand() * SY | 0;
      const id = c.blocks[idx(x, y, z)];
      const wx = ccx * SX + x, wz = ccz * SZ + z;
      // 作物生长
      if (id >= B.WHEAT0 && id < B.WHEAT7) {
        const wet = this.getBlockOr(wx, y - 1, wz, 0) === B.FARMLAND_WET;
        const lightOk = Math.max(this.getSky(wx, y, wz), this.getBlk(wx, y, wz)) >= 9;
        const p = (wet ? 0.45 : 0.15) * (lightOk ? 1 : 0);
        if (this.rand() < p) this.setBlock(wx, y, wz, id + 1);
      }
      // 农田湿度
      else if (id === B.FARMLAND || id === B.FARMLAND_WET) {
        const hasWater = this.nearWater(wx, y, wz, 4);
        if (hasWater && id === B.FARMLAND) this.setBlock(wx, y, wz, B.FARMLAND_WET);
        else if (!hasWater && id === B.FARMLAND_WET && this.rand() < 0.3) this.setBlock(wx, y, wz, B.FARMLAND);
        else if (!hasWater && id === B.FARMLAND && this.rand() < 0.1) this.setBlock(wx, y, wz, B.DIRT);
      }
      // 草蔓延
      else if (id === B.DIRT) {
        if (this.getSky(wx, y + 1, wz) > 4 && this.rand() < 0.3) {
          // 邻接草方块？
          for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0]]) {
            const n = this.getBlockOr(wx + dx, y + dy, wz + dz, 0);
            if (n === B.GRASS) { this.setBlock(wx, y, wz, B.GRASS); break; }
          }
        }
      }
      // 草退化（被盖）
      else if (id === B.GRASS) {
        const above = this.getBlockOr(wx, y + 1, wz, 0);
        if (isOpaque(above) && this.rand() < 0.5) this.setBlock(wx, y, wz, B.DIRT);
      }
    }
  }
  nearWater(wx, y, wz, r) {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++)
      if (this.getBlockOr(wx + dx, y, wz + dz, 0) === B.WATER) return true;
    return false;
  }

  // 爆炸：球形破坏（跳过基岩/水）
  explode(ex, ey, ez, radius, game) {
    const destroyed = [];
    const r = Math.ceil(radius);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius * (0.75 + this.rand() * 0.4)) continue;
      const x = Math.floor(ex + dx), y = Math.floor(ey + dy), z = Math.floor(ez + dz);
      const id = this.getBlockOr(x, y, z, 0);
      if (id === 0 || id === B.BEDROCK || id === B.WATER) continue;
      const info = blockInfo(id);
      if (info.hard === Infinity) continue;
      this.setBlock(x, y, z, 0);
      destroyed.push([x, y, z, id]);
    }
    return destroyed;
  }
}

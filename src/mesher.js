// 区块网格构建：面剔除 + AO + 烘焙光照（r=天光*shade*ao, g=方块光*shade*ao）
import * as THREE from '../vendor/three.module.js';
import { B, blockInfo, isOpaque } from './blocks.js';
import { SX, SY, SZ, idx } from './world.js';
import { tileUV } from './textures.js';

// 六面定义: [normal, 4 corners(CCW 从外看), corner相邻AO采样点]
// corner 顺序: (u0v0, u1v0, u1v1, u0v1) 相对 face
const FACES = [
  { dir: [1, 0, 0], corners: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]], shade: 0.82 },  // +X
  { dir: [-1,0, 0], corners: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]], shade: 0.82 },  // -X
  { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], shade: 1.0 },   // +Y
  { dir: [0,-1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], shade: 0.55 },  // -Y
  { dir: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], shade: 0.7 },   // +Z
  { dir: [0, 0,-1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], shade: 0.7 },   // -Z
];
// 面与 tile 索引：tiles 数组 [top, bottom, north(-z), south(+z), west(-x), east(+x)] 统一为函数
function tileForFace(info, f) {
  let t = info.tiles;
  if (!t) return 'stone';
  if (typeof t === 'string') return t;
  // [top, bottom, side] 或 [top,bottom,north,south,west,east]
  if (t.length === 3) return f === 2 ? t[0] : f === 3 ? t[1] : t[2];
  if (t.length === 6) return [t[0], t[1], t[2], t[3], t[4], t[5]][f];
  return t[0];
}

function aoLevel(side1, side2, corner) {
  if (side1 && side2) return 0;
  return 3 - (side1 + side2 + corner);
}

export function buildChunkMesh(world, chunk, matOpaque, matCutout, matWater) {
  const opaque = { pos: [], nor: [], uv: [], col: [], idx: [] };
  const cutout = { pos: [], nor: [], uv: [], col: [], idx: [] };
  const water = { pos: [], nor: [], uv: [], col: [], idx: [] };
  const wx0 = chunk.cx * SX, wz0 = chunk.cz * SZ;

  const getB = (x, y, z) => {
    if (x >= 0 && x < SX && z >= 0 && z < SZ) {
      if (y < 0 || y >= SY) return 0;
      return chunk.blocks[idx(x, y, z)];
    }
    return world.getBlockOr(wx0 + x, y, z, B.STONE);
  };
  const getS = (x, y, z) => {
    if (x >= 0 && x < SX && z >= 0 && z < SZ) {
      if (y < 0 || y >= SY) return y >= SY ? 15 : 0;
      return chunk.sky[idx(x, y, z)];
    }
    return world.getSky(wx0 + x, y, z);
  };
  const getL = (x, y, z) => {
    if (x >= 0 && x < SX && z >= 0 && z < SZ) {
      if (y < 0 || y >= SY) return 0;
      return chunk.blk[idx(x, y, z)];
    }
    return world.getBlk(wx0 + x, y, z);
  };

  const pushFace = (buf, x, y, z, f, info, h0 = 0, h1 = 1, uvRot = 0) => {
    const face = FACES[f];
    const [u0, v0, u1, v1] = tileUV(tileForFace(info, f));
    const base = buf.pos.length / 3;
    const shade = face.shade;
    // 每角 AO：取该面法向上一层的三个邻居
    const nx = x + face.dir[0], ny = y + face.dir[1], nz = z + face.dir[2];
    const uvq = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const lightS = [], lightB = [];
    for (let ci = 0; ci < 4; ci++) {
      const c = face.corners[ci];
      // 采样光照：面外侧体素
      lightS.push(getS(nx, ny, nz)); lightB.push(getL(nx, ny, nz));
    }
    for (let ci = 0; ci < 4; ci++) {
      const c = face.corners[ci];
      let vy = c[1] === 1 ? h1 : h0;
      buf.pos.push(x + c[0], y + vy, z + c[2]);
      buf.nor.push(face.dir[0], face.dir[1], face.dir[2]);
      const uv = uvq[(ci + uvRot) % 4];
      buf.uv.push(uv[0], uv[1]);
      // AO
      let ao = 3;
      if (info.opaque && info.shape === 'cube') {
        // 计算角 AO（仅立方体）
        const du = (ci === 1 || ci === 2) ? 1 : -1;
        const dv = (ci >= 2) ? 1 : -1;
        let s1, s2, co;
        if (f === 2 || f === 3) { // Y 面：du->x, dv->z
          s1 = isOpaque(getB(nx + du, ny, nz)); s2 = isOpaque(getB(nx, ny, nz + dv));
          co = isOpaque(getB(nx + du, ny, nz + dv));
        } else if (f === 0 || f === 1) { // X 面：du->z, dv->y
          s1 = isOpaque(getB(nx, ny, nz + du)); s2 = isOpaque(getB(nx, ny + dv, nz));
          co = isOpaque(getB(nx, ny + dv, nz + du));
        } else { // Z 面：du->x, dv->y
          s1 = isOpaque(getB(nx + du, ny, nz)); s2 = isOpaque(getB(nx, ny + dv, nz));
          co = isOpaque(getB(nx + du, ny + dv, nz));
        }
        ao = aoLevel(s1 ? 1 : 0, s2 ? 1 : 0, co ? 1 : 0);
      }
      const aoF = 0.55 + 0.15 * ao;
      const sk = lightS[ci] / 15, bl = lightB[ci] / 15;
      buf.col.push(Math.min(1, sk * shade * aoF), Math.min(1, bl * shade * aoF), aoF);
    }
    buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  const pushCross = (buf, x, y, z, info, scale = 1, dy = 0) => {
    const [u0, v0, u1, v1] = tileUV(typeof info.tiles === 'string' ? info.tiles : 'tall_grass');
    const s = 0.5 * scale, cy = y + dy;
    const lightS = getS(x, y, z), lightB = getL(x, y, z);
    const sh = 0.85;
    const addQuad = (ax, az, bx, bz) => {
      const base = buf.pos.length / 3;
      buf.pos.push(x + ax, cy, z + az, x + bx, cy, z + bz, x + bx, cy + 1 * scale, z + bz, x + ax, cy + 1 * scale, z + az);
      for (let i = 0; i < 4; i++) { buf.nor.push(0, 1, 0); buf.col.push(lightS / 15 * sh, lightB / 15 * sh, 1); }
      buf.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    addQuad(1 - s, 1 - s, s, s);
    addQuad(s, s, 1 - s, 1 - s);
  };

  const pushTorch = (buf, x, y, z) => {
    const info = blockInfo(B.TORCH);
    const [u0, v0, u1, v1] = tileUV('torch');
    const cx = x + 0.5, cz = z + 0.5, r = 1 / 16;
    const lightS = getS(x, y, z), lightB = 14;
    const h = 10 / 16;
    // 两个交叉面（材质双面）
    const quads = [
      [[cx - r, cz - r], [cx + r, cz - r], [cx + r, cz + r], [cx - r, cz + r]],
      [[cx - r, cz + r], [cx - r, cz - r], [cx + r, cz - r], [cx + r, cz + r]],
    ];
    for (const q of quads) {
      const base = buf.pos.length / 3;
      buf.pos.push(q[0][0], y, q[0][1], q[1][0], y, q[1][1], q[1][0], y + h, q[1][1], q[0][0], y + h, q[0][1]);
      for (let i = 0; i < 4; i++) { buf.nor.push(0, 0, 1); buf.col.push(lightS / 15, 1.0, 1.0); }
      const uw = u1 - u0;
      buf.uv.push(u0 + uw * 7 / 16, v0, u0 + uw * 9 / 16, v0, u0 + uw * 9 / 16, v0 + (v1 - v0) * 10 / 16, u0 + uw * 7 / 16, v0 + (v1 - v0) * 10 / 16);
      buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };

  for (let y = 0; y < SY; y++) for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const id = chunk.blocks[idx(x, y, z)];
    if (id === 0) continue;
    const info = blockInfo(id);

    if (info.shape === 'cross' || info.shape === 'crop') {
      pushCross(cutout, x, y, z, info, info.shape === 'crop' ? 0.9 : 1);
      continue;
    }
    if (info.shape === 'torch') { pushTorch(cutout, x, y, z); continue; }
    if (info.shape === 'bed') {
      // 床：底箱 9/16 高
      for (let f = 0; f < 6; f++) {
        const face = FACES[f];
        const n = getB(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
        if (f !== 2 && isOpaque(n)) continue;
        if (id === n && f !== 2) continue;
        pushFace(opaque, x, y, z, f, info, 0, 9 / 16);
      }
      continue;
    }
    if (info.shape === 'farmland' || info.shape === 'snow4') {
      const h = info.shape === 'farmland' ? 15 / 16 : 4 / 16;
      const buf = info.shape === 'snow4' ? cutout : opaque;
      for (let f = 0; f < 6; f++) {
        pushFace(buf, x, y, z, f, info, 0, h);
      }
      continue;
    }
    if (info.liquid) {
      // 水：只出顶面（+侧面靠岸）
      const above = getB(x, y + 1, z);
      const top = above === B.WATER ? 1 : 14 / 16;
      for (let f = 0; f < 6; f++) {
        const face = FACES[f];
        const n = getB(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
        if (n === B.WATER) continue;
        if (isOpaque(n) && f !== 2) continue;
        if (f === 2 && above === B.WATER) continue;
        pushFace(water, x, y, z, f, info, 0, top);
      }
      continue;
    }
    // 立方体/箱形
    const buf = info.cutout ? cutout : opaque;
    for (let f = 0; f < 6; f++) {
      const face = FACES[f];
      const n = getB(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
      if (isOpaque(n)) continue;
      if (n === id && (info.transparent)) continue; // 同类透明相邻（玻璃/树叶拼接省面）
      pushFace(buf, x, y, z, f, info);
    }
  }

  const mk = (buf, mat) => {
    if (!buf.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
    g.setIndex(buf.idx);
    const m = new THREE.Mesh(g, mat);
    m.position.set(wx0, 0, wz0);
    m.frustumCulled = true;
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    return m;
  };
  return { opaque: mk(opaque, matOpaque), cutout: mk(cutout, matCutout), water: mk(water, matWater) };
}

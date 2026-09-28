// AABB 分轴碰撞物理
import { B, blockInfo, isSolid } from './blocks.js';
import { SY } from './world.js';

export function collideAABB(world, px, py, pz, hw, hh) {
  // 检查 box (px-hw..px+hw, py..py+hh, pz-hw..pz+hw) 是否与实心块相交
  const x0 = Math.floor(px - hw), x1 = Math.floor(px + hw);
  const y0 = Math.floor(py), y1 = Math.floor(py + hh - 0.001);
  const z0 = Math.floor(pz - hw), z1 = Math.floor(pz + hw);
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (y < 0) return true;
    if (y >= SY) continue;
    const id = world.getBlockOr(x, y, z, 0);
    if (id === B.WATER) continue;
    if (isSolid(id)) {
      // 雪片等半块简化为实心（放置走特殊逻辑，不影响玩家站立）
      return true;
    }
  }
  return false;
}

// 移动实体：分轴扫描，返回 {x,y,z,vx,vy,vz,onGround,hitWall}
export function moveEntity(world, e, dx, dy, dz, dt) {
  const hw = e.hw, hh = e.hh;
  let x = e.x, y = e.y, z = e.z;
  let vx = e.vx, vy = e.vy, vz = e.vz;
  let onGround = false, hitWall = false;

  // Y 轴
  let ny = y + dy;
  if (collideAABB(world, x, ny, z, hw, hh)) {
    if (dy < 0) { onGround = true; ny = Math.floor(y); vy = 0; }
    else { ny = y; vy = 0; }
  }
  y = ny;
  // X 轴
  let nx2 = x + dx;
  if (collideAABB(world, nx2, y, z, hw, hh)) { nx2 = x; vx = 0; hitWall = true; }
  x = nx2;
  // Z 轴
  let nz = z + dz;
  if (collideAABB(world, x, y, nz, hw, hh)) { nz = z; vz = 0; hitWall = true; }
  z = nz;
  return { x, y, z, vx, vy, vz, onGround, hitWall };
}

export function inWater(world, x, y, z, hw, hh) {
  const y0 = Math.floor(y), y1 = Math.floor(y + hh * 0.7);
  for (let yy = y0; yy <= y1; yy++)
    for (const [ox, oz] of [[0, 0], [hw, 0], [-hw, 0], [0, hw], [0, -hw]]) {
      if (world.getBlockOr(Math.floor(x + ox), yy, Math.floor(z + oz), 0) === B.WATER) return true;
    }
  return false;
}
export function blockBelowIs(world, x, y, z, pred) {
  return pred(world.getBlockOr(Math.floor(x), Math.floor(y - 0.05), Math.floor(z), 0));
}

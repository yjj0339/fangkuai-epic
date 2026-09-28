// 实体：掉落物 / 箭 / TNT / 落沙 / 粒子
import * as THREE from '../vendor/three.module.js';
import { B, blockInfo } from './blocks.js';
import { moveEntity, inWater } from './physics.js';
import { tileUV } from './textures.js';
import { iconOf } from './items.js';
import { makeRng } from './noise.js';

// 游戏确定性随机（粒子/散射用，非加密）
const rng = makeRng(20260928);
const rand = () => rng();
const randSym = (m = 1) => (rng() * 2 - 1) * m;

// 小方块/图标 mesh（掉落物与手持共用）
export function makeItemMesh(id, size = 0.28) {
  if (id < 100) {
    const info = blockInfo(id);
    const geo = new THREE.BoxGeometry(size, size, size);
    const mats = [];
    const tiles = info.tiles;
    const faceTileList = typeof tiles === 'string' ? [tiles, tiles, tiles, tiles, tiles, tiles]
      : tiles.length === 3 ? [tiles[2], tiles[2], tiles[0], tiles[1], tiles[2], tiles[2]]
      : [tiles[4], tiles[5], tiles[0], tiles[1], tiles[3], tiles[2]];
    for (const faceTile of faceTileList) {
      const boxUV = tileUV(faceTile);
      const tex = sharedAtlasTexture().clone();
      tex.needsUpdate = true;
      tex.repeat.set(boxUV[2] - boxUV[0], boxUV[3] - boxUV[1]);
      tex.offset.set(boxUV[0], boxUV[1]);
      mats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: !!info.transparent || !!info.cutout, alphaTest: info.cutout ? 0.4 : 0 }));
    }
    return new THREE.Mesh(geo, mats);
  }
  const iconName = iconOf(id);
  const iconUV = tileUV(iconName || 'i_stick');
  const tex = sharedAtlasTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(iconUV[2] - iconUV[0], iconUV[3] - iconUV[1]);
  tex.offset.set(iconUV[0], iconUV[1]);
  const g = new THREE.PlaneGeometry(size * 1.4, size * 1.4);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }));
}

let _atlas = null;
export function setAtlasTexture(t) { _atlas = t; }
function sharedAtlasTexture() { return _atlas; }

export class Entities {
  constructor(world, scene) {
    this.world = world; this.scene = scene;
    this.list = [];
    this.group = new THREE.Group();
    scene.add(this.group);
  }
  add(e) { this.list.push(e); if (e.mesh) this.group.add(e.mesh); return e; }

  dropItem(x, y, z, id, n = 1, vel = null) {
    const mesh = makeItemMesh(id);
    mesh.position.set(x, y, z);
    return this.add({
      kind: 'item', id, n, x, y, z,
      vx: vel ? vel[0] : randSym(1.2), vy: vel ? vel[1] : 3.2, vz: vel ? vel[2] : randSym(1.2),
      hw: 0.12, hh: 0.24, mesh, age: 0, pickupDelay: 0.5, dead: false, bob: rand() * 6.28,
    });
  }

  addArrow(x, y, z, dx, dy, dz, speed, fromPlayer, dmg) {
    const geo = new THREE.BoxGeometry(0.06, 0.06, 0.5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xd8d0c0 });
    const mesh = new THREE.Mesh(geo, mat);
    return this.add({
      kind: 'arrow', x, y, z,
      vx: dx * speed, vy: dy * speed, vz: dz * speed,
      hw: 0.05, hh: 0.05, mesh, age: 0, dead: false,
      fromPlayer, dmg, stuck: false,
    });
  }

  addLitTnt(x, y, z, fuse = 1.6) {
    const mesh = makeItemMesh(B.TNT, 0.95);
    mesh.position.set(x + 0.5, y, z + 0.5);
    return this.add({
      kind: 'tnt', x: x + 0.5, y, z: z + 0.5,
      vx: randSym(0.5), vy: 2.6, vz: randSym(0.5),
      hw: 0.45, hh: 0.9, mesh, age: 0, fuse, dead: false,
    });
  }

  addFalling(x, y, z, id) {
    const mesh = makeItemMesh(id, 0.98);
    mesh.position.set(x + 0.5, y, z + 0.5);
    return this.add({
      kind: 'fall', id, x: x + 0.5, y, z: z + 0.5,
      vx: 0, vy: -0.1, vz: 0, hw: 0.45, hh: 0.98, mesh, age: 0, dead: false,
    });
  }

  burstParticles(x, y, z, color, n, spread, life) {
    for (let i = 0; i < n; i++) {
      const s = 0.08 + rand() * 0.16;
      const geo = new THREE.BoxGeometry(s, s, s);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x + randSym(spread / 2), y + randSym(spread / 2), z + randSym(spread / 2));
      this.add({
        kind: 'particle', mesh, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
        vx: randSym(1.5), vy: rand() * 3, vz: randSym(1.5),
        hw: 0, hh: 0, age: 0, life: life || 0.6 + rand() * 0.5, dead: false, gravity: true,
        fade: true,
      });
    }
  }
  blockParticles(x, y, z, faceTile, n = 8) {
    const boxUV = tileUV(faceTile);
    for (let i = 0; i < n; i++) {
      const tex = sharedAtlasTexture().clone();
      tex.needsUpdate = true;
      tex.repeat.set((boxUV[2] - boxUV[0]) * 0.25, (boxUV[3] - boxUV[1]) * 0.25);
      tex.offset.set(boxUV[0] + (boxUV[2] - boxUV[0]) * rand() * 0.7, boxUV[1] + (boxUV[3] - boxUV[1]) * rand() * 0.7);
      const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
      mesh.position.set(x + 0.5 + randSym(0.4), y + 0.5 + rand() * 0.6, z + 0.5 + randSym(0.4));
      this.add({
        kind: 'particle', mesh, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
        vx: randSym(1.2), vy: 1 + rand() * 2.5, vz: randSym(1.2),
        hw: 0, hh: 0, age: 0, life: 0.4 + rand() * 0.4, dead: false, gravity: true,
      });
    }
  }

  update(dt, game) {
    const w = this.world;
    for (const e of this.list) {
      if (e.dead) continue;
      e.age += dt;
      if (e.kind === 'item') {
        e.vy -= 22 * dt;
        if (inWater(w, e.x, e.y, e.z, 0.1, 0.2)) { e.vy = Math.min(e.vy + 30 * dt, 1.2); e.vx *= 0.9; e.vz *= 0.9; }
        const r = moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt, dt);
        e.x = r.x; e.y = r.y; e.z = r.z; e.vx = r.vx * 0.92; e.vy = r.vy; e.vz = r.vz * 0.92;
        if (r.onGround) { e.vx *= 0.6; e.vz *= 0.6; }
        e.pickupDelay -= dt;
        if (e.age > 300) e.dead = true;
        if (e.pickupDelay <= 0 && game && game.player && !game.player.dead) {
          const p = game.player;
          const d2 = (p.x - e.x) ** 2 + (p.y + 0.9 - e.y) ** 2 + (p.z - e.z) ** 2;
          if (d2 < 1.9) {
            const left = game.inv.add(e.id, e.n);
            if (left === 0) { e.dead = true; if (game.sound.pop) game.sound.pop(); }
            else e.n = left;
          }
        }
        e.bob += dt * 2.5;
        e.mesh.position.set(e.x, e.y + 0.18 + Math.sin(e.bob) * 0.06, e.z);
        e.mesh.rotation.y += dt * 1.5;
        const skyHere = w.getSky(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)) / 15;
        const blkHere = w.getBlk(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)) / 15;
        tint(e.mesh, Math.min(1, skyHere * game.uDay + blkHere + 0.06));
      }
      else if (e.kind === 'arrow') {
        if (!e.stuck) {
          e.vy -= 14 * dt;
          const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt, nz = e.z + e.vz * dt;
          const id = w.getBlockOr(Math.floor(nx), Math.floor(ny), Math.floor(nz), 0);
          if (id !== 0 && id !== B.WATER) { e.stuck = true; e.age = 0; }
          else { e.x = nx; e.y = ny; e.z = nz; }
          if (game && !e.stuck) {
            const targets = e.fromPlayer ? game.mobs.list : [game.player].concat(game.mobs.list);
            for (const t of targets) {
              if (!t || t.dead) continue;
              if (t === game.player && e.fromPlayer) continue;
              const hw = t.hw + 0.15, hh = t.hh;
              if (Math.abs(t.x - e.x) < hw && Math.abs(t.z - e.z) < hw && e.y > t.y - 0.1 && e.y < t.y + hh + 0.1) {
                const kb = 0.4;
                const len = Math.hypot(e.vx, e.vz) || 1;
                if (t === game.player) game.player.hurt(e.dmg, e.vx / len * kb, e.vz / len * kb);
                else game.mobs.hurt(t, e.dmg, { x: e.vx / len * kb, z: e.vz / len * kb }, game);
                e.dead = true;
                break;
              }
            }
          }
          if (e.age > 8) e.dead = true;
        } else if (e.age > 30) e.dead = true;
        e.mesh.position.set(e.x, e.y, e.z);
        if (!e.stuck) e.mesh.lookAt(e.x + e.vx, e.y + e.vy, e.z + e.vz);
      }
      else if (e.kind === 'tnt') {
        e.vy -= 22 * dt;
        const r = moveEntity(w, e, e.vx * dt, e.vy * dt, e.vz * dt, dt);
        e.x = r.x; e.y = r.y; e.z = r.z;
        e.fuse -= dt;
        const flashing = Math.sin(e.age * 18) > 0;
        e.mesh.position.set(e.x, e.y + 0.45, e.z);
        tint(e.mesh, flashing ? 2.2 : 1);
        if (e.fuse <= 0) {
          e.dead = true;
          if (game) game.explode(e.x, e.y + 0.5, e.z, 4.2);
        }
      }
      else if (e.kind === 'fall') {
        e.vy -= 22 * dt;
        const r = moveEntity(w, e, 0, e.vy * dt, 0, dt);
        if (r.onGround || e.vy === 0) {
          e.dead = true;
          const bx = Math.floor(e.x), by = Math.round(r.y), bz = Math.floor(e.z);
          const cur = w.getBlockOr(bx, by, bz, 0);
          if (cur === 0 || cur === B.WATER || blockInfo(cur).shape === 'cross' || blockInfo(cur).shape === 'crop') {
            w.setBlock(bx, by, bz, e.id);
            if (game && game.sound.place) game.sound.place();
          } else {
            this.dropItem(e.x, by + 0.5, e.z, e.id, 1);
          }
        } else { e.y = r.y; }
        e.mesh.position.set(e.x, e.y + 0.49, e.z);
      }
      else if (e.kind === 'particle') {
        if (e.age > e.life) e.dead = true;
        if (e.gravity) e.vy -= 14 * dt;
        e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
        e.mesh.position.set(e.x, e.y, e.z);
        if (e.fade) {
          const k = 1 - e.age / e.life;
          e.mesh.material.opacity = k;
          e.mesh.material.transparent = true;
          e.mesh.scale.setScalar(Math.max(0.01, k));
        }
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].dead) {
        const e = this.list[i];
        if (e.mesh) { this.group.remove(e.mesh); disposeMesh(e.mesh); }
        this.list.splice(i, 1);
      }
    }
  }
}

export function disposeMesh(m) {
  m.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mm of mats) { if (mm.map && mm.map !== _atlas) mm.map.dispose(); mm.dispose(); }
    }
  });
}

export function tint(mesh, v) {
  const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean);
  for (const m of mats) {
    if (m._baseColor === undefined) m._baseColor = m.color ? m.color.clone() : null;
    if (m.color && m._baseColor) m.color.copy(m._baseColor).multiplyScalar(v);
  }
}

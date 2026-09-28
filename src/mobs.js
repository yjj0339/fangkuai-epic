// 生物：GLB 模型加载 + 部件动画 + AI 状态机 + 生成/掉落/繁殖
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/examples/jsm/loaders/GLTFLoader.js';
import { B } from './blocks.js';
import { moveEntity, inWater, collideAABB } from './physics.js';
import { SY } from './world.js';
import { makeRng } from './noise.js';
import { I } from './items.js';
import { tint, disposeMesh } from './entities.js';

const rng = makeRng(9527);
const rand = () => rng();
const randSym = (m = 1) => (rng() * 2 - 1) * m;

export const MOB_TYPES = {
  zombie:  { hostile: true,  hp: 20, speed: 2.3, dmg: 3, hw: 0.3, hh: 1.9, burns: true,
             drops: () => [[I.ROTTEN, 1 + (rand() * 2 | 0)]], model: 'zombie' },
  skeleton:{ hostile: true,  hp: 20, speed: 2.5, dmg: 3, hw: 0.25, hh: 1.95, burns: true, ranged: true, shootCd: 2.0,
             drops: () => { const d = [[I.BONE, 1 + (rand() * 2 | 0)]]; if (rand() < 0.4) d.push([I.ARROW, 1 + (rand() * 2 | 0)]); return d; }, model: 'skeleton' },
  creeper: { hostile: true,  hp: 20, speed: 2.6, hw: 0.3, hh: 1.6, fuseTime: 1.5, blastR: 3.4,
             drops: () => [[I.GUNPOWDER, 1 + (rand() * 2 | 0)]], model: 'creeper' },
  pig:     { hp: 10, speed: 1.6, hw: 0.42, hh: 0.9, food: I.WHEAT, breedItem: I.WHEAT,
             drops: () => [[I.PORK_RAW, 1 + (rand() * 2 | 0)]], model: 'pig' },
  cow:     { hp: 10, speed: 1.5, hw: 0.45, hh: 1.35, breedItem: I.WHEAT,
             drops: () => { const d = [[I.BEEF_RAW, 1 + (rand() * 2 | 0)]]; if (rand() < 0.7) d.push([I.LEATHER, 1]); return d; }, model: 'cow' },
  sheep:   { hp: 8, speed: 1.5, hw: 0.4, hh: 1.2, breedItem: I.WHEAT,
             drops: () => [[I.MUTTON_RAW, 1 + (rand() * 2 | 0)], [B.WOOL, 1]], model: 'sheep' },
  chicken: { hp: 4, speed: 1.4, hw: 0.25, hh: 0.7, breedItem: I.SEEDS, eggLay: 240,
             drops: () => { const d = [[I.CHICKEN_RAW, 1]]; if (rand() < 0.8) d.push([I.FEATHER, 1 + (rand() * 2 | 0)]); return d; }, model: 'chicken' },
};

export class Mobs {
  constructor(world, scene, entities, sound) {
    this.world = world; this.scene = scene; this.entities = entities; this.sound = sound;
    this.list = [];
    this.models = {};     // type -> THREE.Group 原型
    this.group = new THREE.Group();
    scene.add(this.group);
    this.spawnTimer = 0;
    this.passiveTimer = 0;
    this.loader = new GLTFLoader();
  }
  async loadModels() {
    const uniq = ['zombie', 'steve', 'skeleton', 'creeper', 'pig', 'cow', 'sheep', 'chicken'];
    await Promise.all(uniq.map(m => new Promise((res, rej) => {
      this.loader.load('assets/mobs/' + m + '.glb', gltf => {
        const root = gltf.scene;
        root.traverse(o => { if (o.isMesh) { o.castShadow = false; } });
        this.models[m] = root;
        res();
      }, undefined, rej);
    })));
    return this.models;
  }

  addMob(type, x, y, z, baby = false) {
    const def0 = MOB_TYPES[type];
    const proto = this.models[def0.model];
    if (!proto) return null;
    const mesh = proto.clone(true);
    // 克隆材质（受击红闪/光照 tint 独立）
    mesh.traverse(o => {
      if (o.isMesh) {
        o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
      }
    });
    // 收集部件
    const parts = {};
    mesh.traverse(o => {
      if (o.name && /^(head|body|arm|leg|wing|snout|beak|wattle|face|haircap|horn|bow)/.test(o.name)) {
        parts[o.name] = o;
      }
    });
    const m = {
      type, def: def0, mesh, parts, x, y, z, vx: 0, vy: 0, vz: 0,
      hw: def0.hw * (baby ? 0.6 : 1), hh: def0.hh * (baby ? 0.65 : 1),
      hp: def0.hp, dead: false, deathT: 0, onGround: false,
      yaw: rand() * 6.28, state: 'idle', stateT: rand() * 3, tx: x, tz: z,
      hurtT: 0, atkCd: 0, fuse: -1, burnT: 0, walkPhase: rand() * 6.28,
      baby, growT: baby ? 180 : 0, loveT: 0, loveCd: 0, eggT: def0.eggLay ? rand() * def0.eggLay : 0,
      fallDist: 0,
    };
    this.list.push(m);
    this.group.add(mesh);
    return m;
  }

  hurt(m, dmg, kb, game) {
    if (m.dead || m.hurtT > 0.25) return;
    m.hp -= dmg;
    m.hurtT = 0.4;
    if (kb) { m.vx += kb.x * 7; m.vz += kb.z * 7; m.vy = Math.max(m.vy, 4.2); }
    if (this.sound.hurt) this.sound.hurt(m.type);
    if (m.hp <= 0) {
      m.dead = true; m.deathT = 0;
      for (const [id, n] of m.def.drops()) this.entities.dropItem(m.x, m.y + 0.4, m.z, id, n);
    } else if (!m.def.hostile) {
      m.state = 'flee'; m.stateT = 5;
    } else {
      m.state = 'chase'; // 被打激怒
    }
  }

  feed(m, itemId, game) {
    if (m.baby || m.loveCd > 0 || m.loveT > 0) return false;
    if (m.def.breedItem !== itemId) return false;
    m.loveT = 30;
    if (this.sound.eat) this.sound.eat();
    return true;
  }
  tryBreed(m, game) {
    if (m.loveT <= 0) return;
    const partner = this.list.find(o => o !== m && o.type === m.type && o.loveT > 0 &&
      (o.x - m.x) ** 2 + (o.z - m.z) ** 2 < 4);
    if (partner) {
      m.loveT = 0; partner.loveT = 0;
      m.loveCd = 120; partner.loveCd = 120;
      this.addMob(m.type, m.x, m.y, m.z, true);
      this.entities.burstParticles(m.x, m.y + 0.8, m.z, 0xff5f8a, 10, 0.8, 0.8);
      if (this.sound.pop) this.sound.pop();
    }
  }

  // 自然生成
  naturalSpawn(dt, game) {
    const p = game.player;
    // 敌对：夜晚或黑暗
    this.spawnTimer -= dt;
    const night = game.uDay < 0.45;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.6;
      const hostiles = this.list.filter(m => m.def.hostile).length;
      if (night && hostiles < 14) {
        for (let tries = 0; tries < 6; tries++) {
          const ang = rand() * 6.28, dist = 26 + rand() * 22;
          const x = Math.floor(p.x + Math.cos(ang) * dist), z = Math.floor(p.z + Math.sin(ang) * dist);
          if (!this.world.getChunk(x >> 4, z >> 4)) continue;
          const y = this.world.surfaceY(x, z);
          if (y <= 1 || y >= SY - 2) continue;
          const light = Math.max(this.world.getSky(x, y, z) * game.uDay, this.world.getBlk(x, y, z));
          if (light > 6) continue;
          if (collideAABB(this.world, x + 0.5, y, z + 0.5, 0.4, 1.9)) continue;
          const r = rand();
          const type = r < 0.45 ? 'zombie' : r < 0.75 ? 'skeleton' : 'creeper';
          this.addMob(type, x + 0.5, y, z + 0.5);
          break;
        }
      }
    }
    // 被动补充：白天草地
    this.passiveTimer -= dt;
    if (this.passiveTimer <= 0) {
      this.passiveTimer = 12;
      const passives = this.list.filter(m => !m.def.hostile).length;
      if (passives < 12) {
        const ang = rand() * 6.28, dist = 30 + rand() * 30;
        const x = Math.floor(p.x + Math.cos(ang) * dist), z = Math.floor(p.z + Math.sin(ang) * dist);
        if (this.world.getChunk(x >> 4, z >> 4)) {
          const y = this.world.surfaceY(x, z);
          const ground = this.world.getBlockOr(x, y - 1, z, 0);
          if ((ground === B.GRASS || ground === B.SNOWY_GRASS) && !collideAABB(this.world, x + 0.5, y, z + 0.5, 0.4, 1.3)) {
            const r = rand();
            const type = r < 0.3 ? 'pig' : r < 0.55 ? 'cow' : r < 0.8 ? 'sheep' : 'chicken';
            const n = 1 + (rand() * 3 | 0);
            for (let i = 0; i < n; i++) this.addMob(type, x + 0.5 + randSym(1.5), y, z + 0.5 + randSym(1.5));
          }
        }
      }
    }
  }

  update(dt, game) {
    const w = this.world, p = game.player;
    this.naturalSpawn(dt, game);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i];
      // 死亡动画
      if (m.dead) {
        m.deathT += dt;
        m.mesh.rotation.z = Math.min(1.57, m.deathT * 3.5);
        tintMob(m.mesh, Math.max(0.2, 1 - m.deathT));
        if (m.deathT > 0.9) {
          this.entities.burstParticles(m.x, m.y + 0.5, m.z, 0xcccccc, 8, 0.6, 0.5);
          this.group.remove(m.mesh); disposeMesh(m.mesh);
          this.list.splice(i, 1);
        }
        continue;
      }
      m.stateT -= dt; m.hurtT -= dt; m.atkCd -= dt; m.walkPhase += dt;
      if (m.loveT > 0) { m.loveT -= dt; if (rand() < dt * 2) this.entities.burstParticles(m.x, m.y + m.hh, m.z, 0xff5f8a, 1, 0.4, 0.6); }
      if (m.loveCd > 0) m.loveCd -= dt;
      if (m.baby) { m.growT -= dt; if (m.growT <= 0) { m.baby = false; m.hw = m.def.hw; m.hh = m.def.hh; } }
      if (m.def.eggLay) { m.eggT -= dt; if (m.eggT <= 0) { m.eggT = m.def.eggLay; this.entities.dropItem(m.x, m.y + 0.3, m.z, I.EGG, 1); } }
      this.tryBreed(m, game);

      const distP = Math.hypot(p.x - m.x, p.z - m.z);
      const dyP = p.y - m.y;
      const seeDist = m.def.hostile ? 22 : 10;

      // ---- AI 决策 ----
      if (m.def.hostile && !p.dead && distP < seeDist && Math.abs(dyP) < 12) {
        m.state = 'chase';
      } else if (m.state === 'chase' && (distP > 30 || p.dead)) {
        m.state = 'idle'; m.stateT = 1;
      }
      // 被动：小麦引诱
      if (!m.def.hostile && !p.dead && distP < 8) {
        const held = game.inv.held();
        if (held && held.id === m.def.breedItem) m.state = 'tempt';
        else if (m.state === 'tempt') { m.state = 'idle'; m.stateT = 0.5; }
      }
      if (m.state === 'idle' && m.stateT <= 0) {
        m.state = 'wander'; m.stateT = 2 + rand() * 4;
        const ang = rand() * 6.28, d = 3 + rand() * 8;
        m.tx = m.x + Math.cos(ang) * d; m.tz = m.z + Math.sin(ang) * d;
      } else if (m.state === 'wander' && m.stateT <= 0) {
        m.state = 'idle'; m.stateT = 1.5 + rand() * 3.5;
      } else if (m.state === 'flee' && m.stateT <= 0) {
        m.state = 'idle'; m.stateT = 1;
      }

      // ---- 移动 ----
      let mvx = 0, mvz = 0, speed = m.def.speed;
      let targetX = null, targetZ = null;
      if (m.state === 'chase') { targetX = p.x; targetZ = p.z; speed *= 1.15; }
      else if (m.state === 'tempt') { targetX = p.x; targetZ = p.z; speed *= 0.9; }
      else if (m.state === 'flee') {
        const dx = m.x - p.x, dz = m.z - p.z, len = Math.hypot(dx, dz) || 1;
        targetX = m.x + dx / len * 6; targetZ = m.z + dz / len * 6; speed *= 1.5;
      }
      else if (m.state === 'wander') { targetX = m.tx; targetZ = m.tz; speed *= 0.55; }

      // 骷髅保持射程
      let hold = false;
      if (m.def.ranged && m.state === 'chase') {
        if (distP < 7) hold = true;            // 太近后退
        else if (distP < 15) { mvx = 0; mvz = 0; targetX = null; } // 站定射击
      }
      if (targetX !== null && !hold) {
        const dx = targetX - m.x, dz = targetZ - m.z, len = Math.hypot(dx, dz);
        if (len > (m.state === 'wander' ? 0.8 : 0.4)) {
          mvx = dx / len * speed; mvz = dz / len * speed;
          m.yaw = Math.atan2(mvx, mvz);
        }
      }
      if (hold && m.state === 'chase') {
        const dx = m.x - p.x, dz = m.z - p.z, len = Math.hypot(dx, dz) || 1;
        mvx = dx / len * speed * 0.8; mvz = dz / len * speed * 0.8;
        m.yaw = Math.atan2(p.x - m.x, p.z - m.z);
      }
      if (m.state === 'chase' && !m.def.ranged) m.yaw = Math.atan2(p.x - m.x, p.z - m.z);
      if (m.state === 'tempt') m.yaw = Math.atan2(p.x - m.x, p.z - m.z);

      // 攻击
      if (m.def.hostile && !p.dead) {
        if (m.def.ranged) {
          if (distP < 15 && m.atkCd <= 0 && Math.abs(dyP) < 8) {
            m.atkCd = m.def.shootCd;
            const ox = m.x, oy = m.y + m.hh * 0.85, oz = m.z;
            const tx = p.x + p.vx * distP / 18, ty = p.y + 1.1, tz = p.z + p.vz * distP / 18;
            let dx = tx - ox, dy = ty - oy, dz = tz - oz;
            const len = Math.hypot(dx, dy, dz);
            dx /= len; dy /= len; dz /= len;
            dy += distP * 0.004; // 重力补偿
            this.entities.addArrow(ox, oy, oz, dx, dy, dz, 16, false, 3);
            if (this.sound.bow) this.sound.bow();
          }
        } else if (!m.def.fuseTime && distP < 1.6 && Math.abs(dyP) < 2 && m.atkCd <= 0) {
          m.atkCd = 1.0;
          const kb = 0.35, len = Math.hypot(p.x - m.x, p.z - m.z) || 1;
          p.hurt(m.def.dmg, (p.x - m.x) / len * kb, (p.z - m.z) / len * kb);
        }
        // 苦力怕点燃
        if (m.def.fuseTime) {
          if (distP < 2.8 && Math.abs(dyP) < 2) {
            if (m.fuse < 0) { m.fuse = m.def.fuseTime; if (this.sound.fuse) this.sound.fuse(); }
          } else if (m.fuse > 0 && distP > 5) m.fuse = -1;
          if (m.fuse > 0) {
            m.fuse -= dt;
            const k = 1 + (1 - m.fuse / m.def.fuseTime) * 0.35 + Math.sin(m.fuse * 40) * 0.05;
            m.mesh.scale.setScalar(k * (m.baby ? 0.6 : 1));
            if (m.fuse <= 0) {
              m.dead = true; m.deathT = 99; // 直接进入爆耗
              this.group.remove(m.mesh); disposeMesh(m.mesh); this.list.splice(i, 1);
              game.explode(m.x, m.y + 0.6, m.z, m.def.blastR);
              continue;
            }
          } else { m.mesh.scale.setScalar(m.baby ? 0.6 : 1); }
        }
      }

      // ---- 物理 ----
      const swimming = inWater(w, m.x, m.y, m.z, m.hw, m.hh);
      m.vy -= (swimming ? 6 : 24) * dt;
      if (swimming) { m.vy = Math.max(m.vy, -1.5); if (m.state === 'chase' && p.y > m.y) m.vy = 2.5; else if (rand() < dt * 2) m.vy = 2.2; }
      m.vx += (mvx - m.vx) * Math.min(1, dt * 8);
      m.vz += (mvz - m.vz) * Math.min(1, dt * 8);
      // 跳跃：被墙挡或追击目标更高
      const ahead = w.getBlockOr(Math.floor(m.x + m.vx * 0.4), Math.floor(m.y + 0.2), Math.floor(m.z + m.vz * 0.4), 0);
      const aheadUp = w.getBlockOr(Math.floor(m.x + m.vx * 0.4), Math.floor(m.y + 1.2), Math.floor(m.z + m.vz * 0.4), 0);
      const wantJump = (ahead && ahead !== 0 && ahead !== B.WATER && aheadUp === 0) ||
        (m.state === 'chase' && p.y > m.y + 1 && distP < 6 && (ahead !== 0 && ahead !== B.WATER));
      if (wantJump && m.onGround) m.vy = 8;
      const preY = m.y;
      const r = moveEntity(w, m, m.vx * dt, m.vy * dt, m.vz * dt, dt);
      m.x = r.x; m.y = r.y; m.z = r.z;
      if (r.hitWall && m.state === 'wander') { m.state = 'idle'; m.stateT = 0.3; }
      m.onGround = r.onGround;
      // 掉落伤害
      if (m.vy < 0) m.fallDist += (preY - m.y);
      if (m.onGround) {
        if (m.fallDist > 3.5) this.hurt(m, Math.floor(m.fallDist - 3), null, game);
        m.fallDist = 0;
      }
      // 白天燃烧
      if (m.def.burns && game.uDay > 0.6) {
        const skyHere = w.getSky(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z));
        if (skyHere >= 14) {
          m.burnT += dt;
          if (m.burnT > 1) { m.burnT = 0; this.hurt(m, 1, null, game); }
          if (rand() < dt * 6) this.entities.burstParticles(m.x, m.y + m.hh * rand(), m.z, 0xff7a20, 1, 0.4, 0.5);
        }
      }
      // 仙人掌伤害简化跳过；溺水简化跳过

      // ---- 渲染与动画 ----
      m.mesh.position.set(m.x, m.y, m.z);
      m.mesh.rotation.y = m.yaw;
      const moving = Math.hypot(m.vx, m.vz) > 0.4;
      const swing = moving ? Math.sin(m.walkPhase * 8) * 0.7 : 0;
      this.animate(m, swing, game);

      // 光照 tint + 受击红闪
      const skyHere = w.getSky(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z)) / 15;
      const blkHere = w.getBlk(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z)) / 15;
      let v = Math.min(1, skyHere * game.uDay + blkHere + 0.08);
      if (m.hurtT > 0) v = -1; // 红闪信号
      tintMob(m.mesh, v);

      // 距离过远清除（敌对）
      if (distP > 90) { this.group.remove(m.mesh); disposeMesh(m.mesh); this.list.splice(i, 1); }
    }
  }

  animate(m, swing, game) {
    const P = m.parts;
    const set = (name, rx) => { const o = P[name]; if (o) o.rotation.x = rx; };
    const t = m.type;
    if (t === 'zombie' || t === 'steve') {
      set('armL', -1.45 + swing * 0.12); set('armR', -1.45 - swing * 0.12);
      set('legL', swing); set('legR', -swing);
    } else if (t === 'skeleton') {
      set('armR', -1.5);
      set('armL', -0.3 + swing * 0.5);
      set('legL', swing); set('legR', -swing);
    } else if (t === 'creeper') {
      set('legFL', swing * 0.7); set('legBR', swing * 0.7);
      set('legFR', -swing * 0.7); set('legBL', -swing * 0.7);
    } else if (t === 'chicken') {
      set('legL', swing); set('legR', -swing);
      const flap = m.onGround ? 0 : Math.sin(m.walkPhase * 26) * 0.8;
      if (P.wingL) P.wingL.rotation.z = flap; if (P.wingR) P.wingR.rotation.z = -flap;
    } else {
      set('legFL', swing * 0.8); set('legBR', swing * 0.8);
      set('legFR', -swing * 0.8); set('legBL', -swing * 0.8);
    }
    // 头看玩家（敌对接近时）
    if (m.def.hostile && m.state === 'chase' && m.parts.head) {
      const p = game.player;
      const dy = p.y + 1.5 - (m.y + m.hh);
      const dxz = Math.hypot(p.x - m.x, p.z - m.z);
      m.parts.head.rotation.x = Math.max(-0.6, Math.min(0.6, -Math.atan2(dy, Math.max(0.5, dxz))));
    } else if (m.parts.head) m.parts.head.rotation.x *= 0.9;
  }
}

function tintMob(mesh, v) {
  mesh.traverse(o => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (mat._baseColor === undefined) mat._baseColor = mat.color.clone();
      if (v < 0) { mat.color.setRGB(1, 0.25, 0.25); } // 受击红闪
      else mat.color.copy(mat._baseColor).multiplyScalar(v);
    }
  });
}

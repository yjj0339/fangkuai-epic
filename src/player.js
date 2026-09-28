// 玩家：输入、物理、挖掘/放置/攻击/吃/弓、相机、手持渲染、生存数值
import * as THREE from '../vendor/three.module.js';
import { B, blockInfo, isSolid } from './blocks.js';
import { moveEntity, inWater, collideAABB } from './physics.js';
import { SY } from './world.js';
import { itemInfo } from './items.js';
import { makeItemMesh, setAtlasTexture } from './entities.js';
import { tileUV } from './textures.js';

export class Player {
  constructor(world, camera, scene, game) {
    this.world = world; this.cam = camera; this.scene = scene; this.game = game;
    this.x = 8; this.y = 70; this.z = 8;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0; this.pitch = 0;
    this.hw = 0.3; this.hh = 1.8;
    this.onGround = false;
    this.sneaking = false; this.sprinting = false; this.flying = false;
    this.hp = 20; this.maxHp = 20;
    this.hunger = 20; this.saturation = 5;
    this.air = 10; this.maxAir = 10;
    this.dead = false;
    this.hurtCd = 0; this.eatT = 0; this.bowT = -1;
    this.fallStart = null;
    this.spawn = { x: 8, y: 70, z: 8 };
    this.keys = {};
    this.mouse = { l: false, r: false };
    this.mining = null; // {x,y,z,progress,total}
    this.thirdPerson = 0; // 0 第一 1 第三
    this.bobPhase = 0;
    this.swingT = 0;
    this.regenT = 0; this.hungerT = 0;
    this.exhaust = 0;

    // 挖掘目标线框
    const boxGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(boxGeo);
    this.outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 }));
    scene.add(this.outline);
    // 裂纹 overlay
    this.crackTex = [];
    this.crackMesh = null;
    // 手持物
    this.handGroup = new THREE.Group();
    camera.add(this.handGroup);
    this.heldMesh = null; this.heldId = -2;
    this.buildCrackTextures();
  }

  buildCrackTextures() {
    // 10 阶裂纹：canvas 程序画
    for (let s = 0; s < 10; s++) {
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const g = c.getContext('2d');
      g.strokeStyle = 'rgba(20,15,10,0.85)';
      g.lineWidth = 1;
      const rng = (n) => { const v = Math.sin(n * 127.1 + s * 311.7) * 43758.5; return v - Math.floor(v); };
      const cracks = 2 + s;
      for (let i = 0; i < cracks; i++) {
        g.beginPath();
        let px = rng(i) * 16, py = rng(i + 50) * 16;
        g.moveTo(px, py);
        for (let k = 0; k < 3 + s / 2; k++) {
          px += (rng(i * 7 + k) - 0.5) * 9; py += (rng(i * 13 + k) - 0.5) * 9;
          g.lineTo(px, py);
        }
        g.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
      this.crackTex.push(t);
    }
    this.crackMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, map: null });
    this.crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), this.crackMat);
    this.crackMesh.visible = false;
    this.scene.add(this.crackMesh);
  }

  eyeY() { return this.y + (this.sneaking ? 1.5 : 1.62); }

  hurt(dmg, kbx = 0, kbz = 0) {
    if (this.dead || this.hurtCd > 0) return;
    this.hurtCd = 0.5;
    this.hp -= dmg;
    this.vx += kbx * 8; this.vz += kbz * 8; this.vy = Math.max(this.vy, 4.5);
    this.game.sound.hurt && this.game.sound.hurt('player');
    this.game.ui.flashRed();
    if (this.hp <= 0) { this.hp = 0; this.die(); }
  }

  die() {
    this.dead = true;
    // 掉落全部物品
    for (let i = 0; i < 36; i++) {
      const s = this.game.inv.slots[i];
      if (s) { this.game.entities.dropItem(this.x, this.y + 1, this.z, s.id, s.n); this.game.inv.slots[i] = null; }
    }
    this.game.ui.showDeath();
  }

  respawn() {
    this.dead = false;
    this.hp = this.maxHp; this.hunger = 20; this.saturation = 5; this.air = this.maxAir;
    this.x = this.spawn.x; this.z = this.spawn.z;
    this.y = this.world.surfaceY(Math.floor(this.x), Math.floor(this.z));
    this.vx = this.vy = this.vz = 0;
  }

  updateHeldMesh() {
    const held = this.game.inv.held();
    const id = held ? held.id : -1;
    if (id === this.heldId) return;
    this.heldId = id;
    if (this.heldMesh) { this.handGroup.remove(this.heldMesh); }
    if (id < 0) { this.heldMesh = null; return; }
    this.heldMesh = makeItemMesh(id, id < 100 ? 0.32 : 0.45);
    // 位置：右下角
    this.heldMesh.position.set(0.42, -0.38, -0.62);
    this.heldMesh.rotation.set(0.15, id < 100 ? 0.6 : 0.2, id < 100 ? 0 : -0.4);
    this.handGroup.add(this.heldMesh);
  }

  // 射线：返回 {hit, x,y,z, face, id}（方块 DDA）
  raycastBlock(maxDist = 5) {
    const ox = this.x, oy = this.eyeY(), oz = this.z;
    const dx = -Math.sin(this.yaw) * Math.cos(this.pitch);
    const dy = Math.sin(this.pitch);
    const dz = -Math.cos(this.yaw) * Math.cos(this.pitch);
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tDX = Math.abs(1 / (dx || 1e-9)), tDY = Math.abs(1 / (dy || 1e-9)), tDZ = Math.abs(1 / (dz || 1e-9));
    let tMX = (dx > 0 ? (x + 1 - ox) : (ox - x)) * tDX;
    let tMY = (dy > 0 ? (y + 1 - oy) : (oy - y)) * tDY;
    let tMZ = (dz > 0 ? (z + 1 - oz) : (oz - z)) * tDZ;
    let face = [0, 0, 0], t = 0;
    for (let i = 0; i < 128; i++) {
      const id = this.world.getBlockOr(x, y, z, 0);
      if (id !== 0 && id !== B.WATER && blockInfo(id).hard !== undefined) {
        return { hit: true, x, y, z, id, face, t };
      }
      if (tMX < tMY && tMX < tMZ) { x += stepX; t = tMX; tMX += tDX; face = [-stepX, 0, 0]; }
      else if (tMY < tMZ) { y += stepY; t = tMY; tMY += tDY; face = [0, -stepY, 0]; }
      else { z += stepZ; t = tMZ; tMZ += tDZ; face = [0, 0, -stepZ]; }
      if (t > maxDist) break;
    }
    return { hit: false };
  }
  // 射线打实体
  raycastMob(maxDist = 4) {
    const ox = this.x, oy = this.eyeY(), oz = this.z;
    const dx = -Math.sin(this.yaw) * Math.cos(this.pitch);
    const dy = Math.sin(this.pitch);
    const dz = -Math.cos(this.yaw) * Math.cos(this.pitch);
    let best = null, bestT = maxDist;
    for (const m of this.game.mobs.list) {
      if (m.dead) continue;
      // slab test（盒子中心式：中心 m.y+hh/2，半高 hh/2）
      const hw = m.hw + 0.1;
      let tmin = 0, tmax = bestT, ok = true;
      const center = [m.x, m.y + m.hh / 2, m.z], o = [ox, oy, oz], d = [dx, dy, dz], ext = [hw, m.hh / 2, hw];
      for (let a = 0; a < 3; a++) {
        const lo = center[a] - ext[a], hi = center[a] + ext[a];
        if (Math.abs(d[a]) < 1e-9) { if (o[a] < lo || o[a] > hi) { ok = false; break; } }
        else {
          let t1 = (lo - o[a]) / d[a], t2 = (hi - o[a]) / d[a];
          if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
          tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
          if (tmin > tmax) { ok = false; break; }
        }
      }
      if (ok && tmin < bestT) {
        best = m; bestT = tmin;
      }
    }
    if (best) {
      // 简单遮挡：中点方块
      const mx = ox + dx * bestT, my = oy + dy * bestT, mz = oz + dz * bestT;
      const id = this.world.getBlockOr(Math.floor(mx), Math.floor(my), Math.floor(mz), 0);
      if (id !== 0 && id !== B.WATER) return null;
    }
    return best;
  }

  breakTime(info) {
    const held = this.game.inv.held();
    const it = held ? itemInfo(held.id) : null;
    let speed = 1, canHarvest = info.tier === 0;
    if (it && it.tool && it.tool === info.tool) {
      speed = it.speed;
      canHarvest = it.tier >= info.tier;
    }
    if (!canHarvest) speed = Math.min(speed, 1);
    let t = info.hard * (canHarvest ? 0.45 : 1.5) / speed;
    if (inWater(this.world, this.x, this.y + 1, this.z, 0.2, 0.5)) t *= 3;
    if (!this.onGround && !this.flying) t *= 1.6;
    return Math.max(0.05, t);
  }
  canHarvest(info) {
    const held = this.game.inv.held();
    const it = held ? itemInfo(held.id) : null;
    if (info.tier === 0) return true;
    return !!(it && it.tool === info.tool && it.tier >= info.tier);
  }

  update(dt) {
    if (this.dead) { this.mouse.l = this.mouse.r = false; return; }
    this.hurtCd -= dt; this.swingT -= dt;
    const g = this.game;

    // ---- 输入移动 ----
    const k = this.keys;
    let fwd = (k['KeyW'] ? 1 : 0) - (k['KeyS'] ? 1 : 0);
    let strafe = (k['KeyD'] ? 1 : 0) - (k['KeyA'] ? 1 : 0);
    if (g.touch && g.touch.active) { fwd = g.touch.fwd; strafe = g.touch.strafe; }
    this.sneaking = !!k['ShiftLeft'] && !this.flying;
    this.sprinting = !!k['ControlLeft'] && fwd > 0 && this.hunger > 6;
    const swimming = inWater(this.world, this.x, this.y, this.z, this.hw, 0.6);
    let speed = 4.3;
    if (this.sprinting) speed = 5.8;
    if (this.sneaking) speed = 1.5;
    if (this.flying) speed = this.sprinting ? 16 : 9;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let mvx = (-sin * fwd + cos * strafe) * speed;
    let mvz = (-cos * fwd - sin * strafe) * speed;
    // 冰滑
    const below = this.world.getBlockOr(Math.floor(this.x), Math.floor(this.y - 0.05), Math.floor(this.z), 0);
    const slip = below === B.ICE && this.onGround ? 0.02 : 0.25;
    const accel = this.onGround || this.flying ? slip : 0.06;
    this.vx += (mvx - this.vx) * Math.min(1, dt / (1 / (accel * 60)) * 1);
    this.vz += (mvz - this.vz) * Math.min(1, dt / (1 / (accel * 60)) * 1);

    // 跳跃/游泳/飞行
    if (this.flying) {
      this.vy += ((k['Space'] ? 8 : 0) - (k['ShiftLeft'] ? 8 : 0) - this.vy) * Math.min(1, dt * 10);
    } else if (swimming) {
      if (k['Space']) this.vy = Math.min(this.vy + 30 * dt, 3.4);
      else this.vy = Math.max(this.vy - 8 * dt, -2.2);
      this.vx *= 0.9; this.vz *= 0.9;
    } else {
      this.vy -= 26 * dt;
      if (k['Space'] && this.onGround) { this.vy = 8.2; this.exhaust += 0.05; }
    }
    if (this.vy < -60) this.vy = -60;

    // 潜行防坠：先试走，若将悬空则截断该轴
    let dx = this.vx * dt, dy = this.vy * dt, dz = this.vz * dt;
    if (this.sneaking && this.onGround && !this.flying) {
      const tryMove = (tx, tz) => !collideAABB(this.world, tx, this.y - 0.1, tz, this.hw, 0.05) &&
        collideAABB(this.world, tx, this.y - 0.06, tz, this.hw, 0.05);
      // 检查目标位置脚下是否有地
      if (!this.groundAhead(this.x + dx, this.z)) dx = 0;
      if (!this.groundAhead(this.x, this.z + dz)) dz = 0;
    }
    const preY = this.y;
    const r = moveEntity(this.world, this, dx, dy, dz, dt);
    this.x = r.x; this.y = r.y; this.z = r.z;
    this.vx = r.vx; this.vy = r.vy; this.vz = r.vz;
    this.onGround = r.onGround;
    if (this.onGround) this.flying = this.flying && this.game.creativeFly;

    // 掉落伤害
    if (!this.onGround && !this.flying && !swimming) {
      if (this.vy < 0 && this.fallStart === null) this.fallStart = preY;
      this.fallStart = Math.max(this.fallStart, this.y);
    }
    if (this.onGround && this.fallStart !== null) {
      const fall = this.fallStart - this.y;
      if (fall > 3.5) this.hurt(Math.floor(fall - 3));
      this.fallStart = null;
    }
    if (swimming) this.fallStart = null;

    // 氧气
    const headInWater = this.world.getBlockOr(Math.floor(this.x), Math.floor(this.eyeY()), Math.floor(this.z), 0) === B.WATER;
    if (headInWater) {
      this.air -= dt;
      if (this.air < 0) { this.air = 0; if (this.hurtCd <= 0) this.hurt(2); this.hurtCd = 0.9; }
      if (Math.random() < dt * 4) this.game.entities.burstParticles(this.x, this.eyeY() + 0.2, this.z, 0xbfe8ff, 1, 0.2, 0.8);
    } else this.air = Math.min(this.maxAir, this.air + dt * 3);

    // 仙人掌接触
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const id = this.world.getBlockOr(Math.floor(this.x + ox * 0.4), Math.floor(this.y + 0.5), Math.floor(this.z + oz * 0.4), 0);
      if (id === B.CACTUS) this.hurt(1);
    }

    // 饥饿
    this.exhaust += dt * (this.sprinting ? 0.35 : this.moving() ? 0.06 : 0.01);
    if (this.exhaust >= 4) { this.exhaust = 0; if (this.saturation > 0) this.saturation -= 1; else this.hunger = Math.max(0, this.hunger - 1); }
    if (this.hunger >= 18 && this.hp < this.maxHp) {
      this.regenT += dt;
      if (this.regenT > 3) { this.regenT = 0; this.hp = Math.min(this.maxHp, this.hp + 1); this.exhaust += 1.5; }
    }
    if (this.hunger <= 0) {
      this.hungerT += dt;
      if (this.hungerT > 4) { this.hungerT = 0; if (this.hp > 1) this.hurt(1); }
    }

    // ---- 挖掘 ----
    const aim = this.raycastBlock(5);
    this.outline.visible = aim.hit && !g.ui.anyOpen();
    if (aim.hit) this.outline.position.set(aim.x + 0.5, aim.y + 0.5, aim.z + 0.5);

    if (this.mouse.l && !g.ui.anyOpen()) this.doMine(dt, aim);
    else { this.mining = null; this.crackMesh.visible = false; }

    // 吃食物（按住右键）
    const held = g.inv.held();
    if (this.mouse.r && !g.ui.anyOpen() && held && itemInfo(held.id) && itemInfo(held.id).food && this.hunger < 20) {
      this.eatT += dt;
      if (this.eatT > 1.2) {
        this.eatT = 0;
        const info = itemInfo(held.id);
        this.hunger = Math.min(20, this.hunger + info.food);
        this.saturation = Math.min(this.hunger, this.saturation + info.food * 0.6);
        if (info.poison && Math.random() < info.poison) this.hurt(1);
        held.n--; if (held.n <= 0) g.inv.slots[g.inv.sel] = null;
        g.sound.eat && g.sound.eat();
      }
    } else this.eatT = 0;

    // 弓蓄力
    if (this.mouse.r && held && itemInfo(held.id) && itemInfo(held.id).bow && !g.ui.anyOpen()) {
      if (this.bowT < 0 && g.inv.count(141) > 0) this.bowT = 0;
      if (this.bowT >= 0) this.bowT = Math.min(1.2, this.bowT + dt);
      this.game.ui.setBowPower(this.bowT / 1.2);
    } else if (this.bowT >= 0) {
      // 放箭
      if (this.bowT > 0.25 && g.inv.count(141) > 0) {
        const power = Math.min(1, this.bowT / 1.2);
        const dxv = -Math.sin(this.yaw) * Math.cos(this.pitch), dyv = Math.sin(this.pitch), dzv = -Math.cos(this.yaw) * Math.cos(this.pitch);
        this.game.entities.addArrow(this.x, this.eyeY() - 0.1, this.z, dxv, dyv, dzv, 14 + power * 22, true, 1 + Math.round(power * 8));
        g.inv.consume(141, 1);
        const it = g.inv.held();
        if (it && itemInfo(it.id).bow) { it.dur = (it.dur ?? itemInfo(it.id).dur) - 1; if (it.dur <= 0) g.inv.slots[g.inv.sel] = null; }
        g.sound.bow && g.sound.bow();
      }
      this.bowT = -1;
      this.game.ui.setBowPower(-1);
    }

    // 相机
    this.bobPhase += dt * Math.hypot(this.vx, this.vz) * 1.6;
    const bobY = this.onGround ? Math.sin(this.bobPhase * 2) * 0.045 * Math.min(1, Math.hypot(this.vx, this.vz) / 4) : 0;
    if (this.thirdPerson === 0) {
      this.cam.position.set(this.x, this.eyeY() + bobY, this.z);
    } else {
      const back = this.thirdPerson === 1 ? 4.5 : -0.5;
      const dxv = -Math.sin(this.yaw) * Math.cos(this.pitch), dyv = Math.sin(this.pitch), dzv = -Math.cos(this.yaw) * Math.cos(this.pitch);
      this.cam.position.set(this.x - dxv * back, this.eyeY() - dyv * back, this.z - dzv * back);
    }
    this.cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.updateHeldMesh();
    // 手持动画
    if (this.heldMesh) {
      const sw = this.swingT > 0 ? Math.sin((1 - this.swingT / 0.25) * Math.PI) : 0;
      this.heldMesh.position.set(0.42 - sw * 0.25, -0.38 - sw * 0.18 + Math.sin(this.bobPhase * 2) * 0.012, -0.62 + sw * -0.12);
      this.heldMesh.rotation.z = (this.heldId < 100 ? 0 : -0.4) - sw * 0.9;
      if (this.bowT > 0) {
        this.heldMesh.position.set(0.3, -0.32 - this.bowT * 0.06, -0.55 - this.bowT * 0.1);
        this.heldMesh.rotation.set(0.1, 0.4, -0.2);
      }
      this.handGroup.visible = this.thirdPerson === 0;
    }
  }

  groundAhead(x, z) {
    // 潜行时目标脚下是否有支撑（本格或贴边）
    for (const [ox, oz] of [[0, 0], [Math.sign(this.vx), 0], [0, Math.sign(this.vz)]]) {
      const id = this.world.getBlockOr(Math.floor(x + ox * this.hw), Math.floor(this.y - 0.5), Math.floor(z + oz * this.hw), 0);
      if (isSolid(id)) return true;
    }
    return false;
  }
  moving() { return Math.hypot(this.vx, this.vz) > 0.5; }

  doMine(dt, aim) {
    const g = this.game;
    if (!aim.hit) { this.mining = null; this.crackMesh.visible = false; return; }
    const info = blockInfo(aim.id);
    if (info.hard === Infinity) return;
    if (!this.mining || this.mining.x !== aim.x || this.mining.y !== aim.y || this.mining.z !== aim.z) {
      this.mining = { x: aim.x, y: aim.y, z: aim.z, progress: 0, total: this.breakTime(info), id: aim.id };
      g.sound.dig && g.sound.dig(info.sound);
    }
    this.mining.total = this.breakTime(blockInfo(this.mining.id));
    this.mining.progress += dt;
    this.swingT = 0.25;
    const p = this.mining.progress / this.mining.total;
    // 裂纹
    const stage = Math.min(9, Math.floor(p * 10));
    this.crackMat.map = this.crackTex[stage];
    this.crackMat.needsUpdate = true;
    this.crackMesh.visible = true;
    this.crackMesh.position.set(this.mining.x + 0.5, this.mining.y + 0.5, this.mining.z + 0.5);
    if (Math.random() < dt * 8) {
      const t = info.tiles;
      const tileName = typeof t === 'string' ? t : t[2];
      g.entities.blockParticles(this.mining.x, this.mining.y, this.mining.z, tileName, 2);
    }
    if (this.mining.progress >= this.mining.total) {
      g.breakBlock(this.mining.x, this.mining.y, this.mining.z);
      this.mining = null;
      this.crackMesh.visible = false;
    }
  }

  // 攻击（鼠标左键按下瞬间，由 main 调）
  attack() {
    const g = this.game;
    if (this.swingT > 0.1) return;
    this.swingT = 0.25;
    const m = this.raycastMob(3.5);
    if (m) {
      const held = g.inv.held();
      const it = held ? itemInfo(held.id) : null;
      const dmg = it && it.dmg ? it.dmg : 1;
      const dx = m.x - this.x, dz = m.z - this.z, len = Math.hypot(dx, dz) || 1;
      g.mobs.hurt(m, dmg, { x: dx / len * 0.5, z: dz / len * 0.5 }, g);
      // 喂食（潜行+手持对应食物）
      if (this.sneaking && held && !m.def.hostile) g.mobs.feed(m, held.id, g);
      if (it && it.dur) g.inv.damageHeld(1);
      g.sound.hit && g.sound.hit();
    }
  }

  // 右键交互（放置/使用），由 main 调（带 0.22s 重复）
  interact() {
    const g = this.game;
    const aim = this.raycastBlock(5);
    const held = g.inv.held();
    // 生物喂食优先
    const m = this.raycastMob(3.5);
    if (m && held && !m.def.hostile && g.mobs.feed(m, held.id, g)) {
      held.n--; if (held.n <= 0) g.inv.slots[g.inv.sel] = null;
      return;
    }
    if (!aim.hit) return;
    const info = blockInfo(aim.id);
    // 打开交互方块
    if (info.interact) {
      if (g.ui.openContainer(aim.x, aim.y, aim.z, info.interact)) return;
    }
    // 骨粉
    if (held && itemInfo(held.id) && itemInfo(held.id).bonemeal) {
      const bid = g.world.getBlockOr(aim.x, aim.y, aim.z, 0);
      const bi = blockInfo(bid);
      if (bi.stage !== undefined && bi.stage < 7) {
        const ns = Math.min(7, bi.stage + 2 + (Math.random() * 2 | 0));
        g.world.setBlock(aim.x, aim.y, aim.z, B.WHEAT0 + ns);
        g.entities.burstParticles(aim.x + 0.5, aim.y + 0.5, aim.z + 0.5, 0xe8e4d4, 8, 0.7, 0.5);
        held.n--; if (held.n <= 0) g.inv.slots[g.inv.sel] = null;
        return;
      }
    }
    // 锄地
    if (held && itemInfo(held.id) && itemInfo(held.id).tool === 'hoe') {
      if ((aim.id === B.GRASS || aim.id === B.DIRT) && g.world.getBlockOr(aim.x, aim.y + 1, aim.z, 0) === 0) {
        g.world.setBlock(aim.x, aim.y, aim.z, B.FARMLAND);
        g.inv.damageHeld(1);
        g.sound.dig && g.sound.dig('grass');
        return;
      }
    }
    // 种植
    if (held && itemInfo(held.id) && itemInfo(held.id).plant !== undefined) {
      const farm = g.world.getBlockOr(aim.x, aim.y, aim.z, 0);
      if ((farm === B.FARMLAND || farm === B.FARMLAND_WET) && g.world.getBlockOr(aim.x, aim.y + 1, aim.z, 0) === 0) {
        g.world.setBlock(aim.x, aim.y + 1, aim.z, itemInfo(held.id).plant);
        held.n--; if (held.n <= 0) g.inv.slots[g.inv.sel] = null;
        return;
      }
    }
    // 放置方块
    if (!held || held.id >= 100) return;
    const px = aim.x + aim.face[0], py = aim.y + aim.face[1], pz = aim.z + aim.face[2];
    if (py < 1 || py >= SY - 1) return;
    const cur = g.world.getBlockOr(px, py, pz, 0);
    if (cur !== 0 && cur !== B.WATER && cur !== B.TALL_GRASS) return;
    const pi = blockInfo(held.id);
    // 不能放进自己身体
    if (pi.solid && !g.ui.anyOpen()) {
      const overlap = Math.abs(this.x - (px + 0.5)) < this.hw + 0.5 &&
        Math.abs(this.z - (pz + 0.5)) < this.hw + 0.5 &&
        this.y + this.hh > py && this.y < py + 1;
      if (overlap) return;
    }
    g.world.setBlock(px, py, pz, held.id);
    held.n--; if (held.n <= 0) g.inv.slots[g.inv.sel] = null;
    g.sound.place && g.sound.place(pi.sound);
    this.swingT = 0.2;
  }
}

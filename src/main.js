// 主程序：组装与主循环
import * as THREE from '../vendor/three.module.js';
import { B, blockInfo } from './blocks.js';
import { buildAtlas } from './textures.js';
import { World, SY, SEA, SX, SZ } from './world.js';
import { buildChunkMesh } from './mesher.js';
import { Player } from './player.js';
import { Inventory } from './inv.js';
import { Entities, setAtlasTexture } from './entities.js';
import { Mobs } from './mobs.js';
import { Sky } from './sky.js';
import { Sound } from './sound.js';
import { UI } from './ui.js';
import { itemInfo, SMELT, fuelTime, nameOf } from './items.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { Touch } from './touch.js';

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.08, 500);
    this.scene.add(this.camera);
    this.uDay = 1;
    this.uniDay = { value: 1 };
    this.uniTime = { value: 0 };
    this.renderDist = 4;
    this.creativeFly = true;
    this.paused = false;
    this.started = false;
    this.achievements = new Set();

    // 纹理
    const atlas = buildAtlas();
    setAtlasTexture(atlas);
    this.atlas = atlas;
    this.ui = new UI(this);
    this.ui.setAtlas(atlas.image);
    this.sound = new Sound();
    this.sky = new Sky(this.scene, this.camera);
    this.sky.startRainSound = () => this.sound.startRain();
    this.sky.stopRainSound = () => this.sound.stopRain();

    // 材质
    this.matOpaque = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true });
    this.matOpaque.onBeforeCompile = sh => {
      sh.uniforms.uDay = this.uniDay;
      sh.fragmentShader = 'uniform float uDay;\n' + sh.fragmentShader.replace(
        '#include <color_fragment>',
        'diffuseColor.rgb *= min(vColor.r * uDay + vColor.g, 1.0);');
    };
    this.matCutout = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide });
    this.matCutout.onBeforeCompile = sh => {
      sh.uniforms.uDay = this.uniDay;
      sh.fragmentShader = 'uniform float uDay;\n' + sh.fragmentShader.replace(
        '#include <color_fragment>',
        'diffuseColor.rgb *= min(vColor.r * uDay + vColor.g, 1.0);');
    };
    this.matWater = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false });
    this.matWater.onBeforeCompile = sh => {
      sh.uniforms.uDay = this.uniDay;
      sh.uniforms.uTime = this.uniTime;
      sh.fragmentShader = 'uniform float uDay;\n' + sh.fragmentShader.replace(
        '#include <color_fragment>',
        'diffuseColor.rgb *= min(vColor.r * uDay + vColor.g, 1.0);');
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
         transformed.y += sin(uTime*1.6 + position.x*1.3 + position.z*1.8)*0.04 - 0.03;`);
    };

    this.chunksGroup = new THREE.Group();
    this.scene.add(this.chunksGroup);

    this.inv = new Inventory();
    this.entities = null; this.mobs = null; this.player = null; this.world = null;
    this.touch = new Touch(this);
    this.bindInput();
    this.bindMenus();
    this.showTitle();

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    this.last = performance.now();
    requestAnimationFrame(t => this.loop(t));
    window.__game = this; // 测试钩子
  }

  // ---------- 世界启动 ----------
  async startWorld(seed, saveData) {
    document.getElementById('title').style.display = 'none';
    this.ui.mode = null;
    this.world = new World(seed);
    if (saveData) {
      for (const ck in saveData.chunks) {
        const m = new Map();
        const arr = saveData.chunks[ck];
        for (let i = 0; i < arr.length; i += 2) m.set(arr[i], arr[i + 1]);
        this.world.edits.set(ck, m);
      }
      for (const k in saveData.containers) this.world.containers.set(k, saveData.containers[k]);
      this.sky.time = saveData.time ?? 0.3;
      this.sky.weather = saveData.weather || 'clear';
      this.achievements = new Set(saveData.achievements || []);
    }
    this.entities = new Entities(this.world, this.scene);
    this.mobs = new Mobs(this.world, this.scene, this.entities, this.sound);
    try { await this.mobs.loadModels(); } catch (e) { console.warn('models', e); }

    // 出生点
    const spawnX = saveData ? saveData.player.x : 8.5, spawnZ = saveData ? saveData.player.z : 8.5;
    this.preloadChunks(Math.floor(spawnX), Math.floor(spawnZ));
    this.player = new Player(this.world, this.camera, this.scene, this);
    const sy = saveData ? saveData.player.y : this.world.surfaceY(Math.floor(spawnX), Math.floor(spawnZ));
    this.player.x = spawnX; this.player.z = spawnZ; this.player.y = Math.max(sy, 2);
    if (saveData) {
      const p = saveData.player;
      this.player.yaw = p.yaw || 0; this.player.pitch = p.pitch || 0;
      this.player.hp = p.hp ?? 20; this.player.hunger = p.hunger ?? 20;
      this.player.spawn = p.spawn || { x: spawnX, y: sy, z: spawnZ };
      this.inv.slots = saveData.inv || this.inv.slots;
      this.inv.sel = saveData.sel || 0;
      for (const s of this.inv.slots) if (s && itemInfo(s.id) && itemInfo(s.id).dur && s.dur === undefined) s.dur = itemInfo(s.id).dur;
    } else {
      this.player.spawn = { x: spawnX, y: this.player.y, z: spawnZ };
    }
    this.started = true;
    this.ui.toast(saveData ? '欢迎回来！' : '新世界：种子 ' + seed);
    // 第三人称玩家模型（Steve）
    const steveProto = this.mobs.models.steve;
    if (steveProto) {
      this.steveMesh = steveProto.clone(true);
      this.steveMesh.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); });
      this.steveParts = {};
      this.steveMesh.traverse(o => { if (/^(head|body|arm|leg)/.test(o.name)) this.steveParts[o.name] = o; });
      this.steveMesh.visible = false;
      this.scene.add(this.steveMesh);
    }
    // 初始动物
    setTimeout(() => this.spawnInitialAnimals(), 800);
  }

  preloadChunks(px, pz) {
    const R = this.renderDist;
    for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
      this.world.ensureChunk((px >> 4) + dx, (pz >> 4) + dz);
    }
    // 光照与网格在 chunkLoop 渐进
  }

  spawnInitialAnimals() {
    for (let i = 0; i < 8; i++) {
      const x = this.player.x + (Math.random() - 0.5) * 60, z = this.player.z + (Math.random() - 0.5) * 60;
      const y = this.world.surfaceY(Math.floor(x), Math.floor(z));
      const ground = this.world.getBlockOr(Math.floor(x), y - 1, Math.floor(z), 0);
      if (ground === B.GRASS || ground === B.SNOWY_GRASS || ground === B.SAND) {
        const r = Math.random();
        this.mobs.addMob(r < 0.3 ? 'pig' : r < 0.55 ? 'cow' : r < 0.8 ? 'sheep' : 'chicken', x, y, z);
      }
    }
  }

  // ---------- 区块循环 ----------
  chunkLoop() {
    const p = this.player, w = this.world;
    if (!p) return;
    const pcx = Math.floor(p.x) >> 4, pcz = Math.floor(p.z) >> 4;
    const R = this.renderDist;
    // 加载
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      if ((dx * dx + dz * dz) <= (R + 0.5) * (R + 0.5)) w.ensureChunk(pcx + dx, pcz + dz);
    }
    // 初始光照
    let lit = 0;
    for (const c of w.chunks.values()) {
      if (c.dirtyLight) { w.initChunkLight(c); lit++; if (lit >= 2) break; }
    }
    // 网格重建（每帧 2 个，光照刚完成的优先）
    let built = 0;
    const dirtyList = [];
    for (const [key, c] of w.chunks) {
      if (c.dirty && !c.dirtyLight) dirtyList.push([key, c, (c.cx - pcx) ** 2 + (c.cz - pcz) ** 2]);
    }
    dirtyList.sort((a, b) => a[2] - b[2]);
    for (const [key, c] of dirtyList) {
      if (built >= 2) break;
      this.rebuildChunk(c);
      built++;
    }
    // 卸载
    if (w.chunks.size > (2 * R + 3) ** 2 + 8) {
      for (const [key, c] of w.chunks) {
        const d = Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz));
        if (d > R + 2) {
          this.removeChunkMeshes(c);
          w.chunks.delete(key);
          if (w.chunks.size < (2 * R + 2) ** 2) break;
        }
      }
    }
  }
  rebuildChunk(c) {
    this.removeChunkMeshes(c);
    const meshes = buildChunkMesh(this.world, c, this.matOpaque, this.matCutout, this.matWater);
    for (const k of ['opaque', 'cutout', 'water']) {
      if (meshes[k]) { this.chunksGroup.add(meshes[k]); c['mesh' + k] = meshes[k]; }
    }
    c.dirty = false;
  }
  removeChunkMeshes(c) {
    for (const k of ['Opaque', 'Cutout', 'Water']) {
      const m = c['mesh' + k];
      if (m) { this.chunksGroup.remove(m); m.geometry.dispose(); c['mesh' + k] = null; }
    }
  }

  // ---------- 方块破坏 ----------
  breakBlock(x, y, z) {
    const w = this.world;
    const id = w.getBlockOr(x, y, z, 0);
    if (id === 0) return;
    const info = blockInfo(id);
    const canHarvest = this.player.canHarvest(info);
    // 容器内容掉落
    const key = x + ',' + y + ',' + z;
    const cont = w.containers.get(key);
    if (cont) {
      for (const s of cont.slots) if (s) this.entities.dropItem(x + 0.5, y + 0.5, z + 0.5, s.id, s.n);
      w.containers.delete(key);
    }
    // 掉落
    if (canHarvest) {
      if (id >= B.WHEAT0 && id <= B.WHEAT7) {
        if (info.stage === 7) { this.entities.dropItem(x + 0.5, y + 0.3, z + 0.5, 151, 1); if (Math.random() < 0.6) this.entities.dropItem(x + 0.5, y + 0.3, z + 0.5, 150, 1 + (Math.random() * 2 | 0)); }
        else this.entities.dropItem(x + 0.5, y + 0.3, z + 0.5, 150, 1);
      } else if (id === B.LEAVES || id === B.SPRUCE_LEAVES) {
        const r = Math.random();
        if (r < 0.05) this.entities.dropItem(x + 0.5, y + 0.3, z + 0.5, id === B.LEAVES ? id : id, 1);
        else if (r < 0.08 && id === B.LEAVES) this.entities.dropItem(x + 0.5, y + 0.3, z + 0.5, 153, 1); // 苹果
        else if (r < 0.14) this.entities.dropItem(x + 0.5, y + 0.3, z + 0.5, 100, 1); // 木棍
      } else if (id === B.TALL_GRASS) {
        if (Math.random() < 0.35) this.entities.dropItem(x + 0.5, y + 0.3, z + 0.5, 150, 1);
      } else if (id === B.GRAVEL && Math.random() < 0.15) {
        this.entities.dropItem(x + 0.5, y + 0.3, z + 0.5, B.GRAVEL, 1);
      } else {
        let drop = info.drop !== undefined ? info.drop : id;
        if (info.dropChance && Math.random() > info.dropChance) drop = null;
        if (drop !== null && drop !== undefined) this.entities.dropItem(x + 0.5, y + 0.35, z + 0.5, drop, 1);
      }
    }
    const t = info.tiles;
    this.entities.blockParticles(x, y, z, typeof t === 'string' ? t : t[2], 10);
    this.sound.breakSnd(info.sound);
    w.setBlock(x, y, z, 0);
    // 工具耐久
    this.inv.damageHeld(1);
    // 检查成就
    if (id === B.LOG || id === B.SPRUCE_LOG) this.award('wood', '获得木头！');
    if (id === B.DIAMOND_ORE) this.award('diamond', '钻石！');
    // 上方方块处理：沙/砾落下、植物破坏、作物破坏
    this.checkAbove(x, y, z);
  }
  checkAbove(x, y, z) {
    const w = this.world;
    let yy = y + 1;
    let guard = 0;
    while (guard++ < 12) {
      const id = w.getBlockOr(x, yy, z, 0);
      if (id === 0) break;
      const info = blockInfo(id);
      if (info.gravity) {
        w.setBlock(x, yy, z, 0);
        this.entities.addFalling(x, yy, z, id);
        yy++; continue;
      }
      if (!info.solid && (info.shape === 'cross' || info.shape === 'crop' || info.shape === 'torch')) {
        this.breakBlock(x, yy, z);
        yy++; continue;
      }
      break;
    }
  }

  award(key, msg) {
    if (this.achievements.has(key)) return;
    this.achievements.add(key);
    this.ui.toast('🏆 ' + msg);
    this.sound.levelUp();
  }
  onCraft(id) {
    if (itemInfo(id) && itemInfo(id).tool) this.award('tool', '做出第一件工具！');
    if (id === B.CRAFTING) this.award('table', '工作台！');
  }

  // ---------- 爆炸 ----------
  explode(x, y, z, r) {
    this.sound.explode();
    const destroyed = this.world.explode(x, y, z, r, this);
    for (const [bx, by, bz, id] of destroyed) {
      if (id === B.TNT) { this.entities.addLitTnt(bx, by, bz, 0.3 + Math.random() * 0.6); continue; }
      if (Math.random() < 0.28) {
        const info = blockInfo(id);
        const drop = info.drop !== undefined ? info.drop : id;
        if (drop) this.entities.dropItem(bx + 0.5, by + 0.5, bz + 0.5, drop, 1);
      }
    }
    this.entities.burstParticles(x, y, z, 0xff8830, 30, r * 0.9, 0.9);
    this.entities.burstParticles(x, y, z, 0x555555, 24, r * 0.7, 1.4);
    // 实体伤害+击退
    const hurtEntity = (e, isPlayer) => {
      const d = Math.hypot(e.x - x, e.y + 0.9 - y, e.z - z);
      if (d > r * 2) return;
      const power = 1 - d / (r * 2);
      const dmg = Math.round(power * 16);
      const len = Math.max(0.4, d);
      const kbx = (e.x - x) / len * power * 1.6, kbz = (e.z - z) / len * power * 1.6;
      if (isPlayer) this.player.hurt(dmg, kbx, kbz);
      else this.mobs.hurt(e, dmg, { x: kbx, z: kbz }, this);
    };
    hurtEntity(this.player, true);
    for (const m of this.mobs.list) hurtEntity(m, false);
    // 相机震动
    this.shakeT = 0.5; this.shakeA = Math.min(0.5, 8 / Math.max(2, Math.hypot(this.player.x - x, this.player.z - z)));
  }

  // ---------- 熔炉 ----------
  furnaceTick(dt) {
    for (const [key, c] of this.world.containers) {
      if (c.type !== 'furnace') continue;
      const [x, y, z] = key.split(',').map(Number);
      const inp = c.slots[0], fuelSlot = c.slots[1], out = c.slots[2];
      const recipe = inp ? SMELT[inp.id] : null;
      const canOut = recipe && (!out || (out.id === recipe.out && out.n < ((itemInfo(recipe.out) || { stack: 64 }).stack)));
      // 燃料
      if (c.fuel <= 0 && canOut && fuelSlot && fuelTime(fuelSlot.id) > 0) {
        c.fuel = fuelTime(fuelSlot.id); c.fuelMax = c.fuel;
        fuelSlot.n--; if (fuelSlot.n <= 0) c.slots[1] = null;
      }
      if (c.fuel > 0) {
        c.fuel -= dt;
        if (canOut) {
          c.cook += dt;
          if (c.cook >= 10) {
            c.cook = 0;
            inp.n--; if (inp.n <= 0) c.slots[0] = null;
            if (c.slots[2]) c.slots[2].n++;
            else c.slots[2] = { id: recipe.out, n: 1 };
          }
        } else c.cook = Math.max(0, c.cook - dt);
      } else c.cook = Math.max(0, c.cook - dt * 2);
      // 外观切换
      const cur = this.world.getBlockOr(x, y, z, 0);
      const want = c.fuel > 0 ? B.FURNACE_LIT : B.FURNACE;
      if ((cur === B.FURNACE || cur === B.FURNACE_LIT) && cur !== want) this.world.setBlock(x, y, z, want);
      // 界面刷新
      if (this.ui.mode === 'furnace' && this.ui.container === c) this.ui.renderScreen();
    }
  }

  bindMenus() {
    const $ = id => document.getElementById(id);
    $('btn-resume').onclick = () => { this.ui.closeScreen(); this.resume(); };
    $('btn-save').onclick = () => { const n = saveGame(this); this.ui.toast(n > 0 ? '已保存 (' + (n / 1024 | 0) + 'KB)' : '保存失败'); this.ui.closeScreen(); this.resume(); };
    $('btn-set').onclick = () => { $('pause').style.display = 'none'; $('settings').style.display = 'flex'; this.ui.mode = 'settings'; };
    $('btn-set-back').onclick = () => { $('settings').style.display = 'none'; $('pause').style.display = 'flex'; this.ui.mode = 'pause'; };
    $('btn-quit').onclick = () => { saveGame(this); location.reload(); };
    $('btn-respawn').onclick = () => { this.ui.hideDeath(); this.ui.mode = null; this.player.respawn(); };
    $('btn-wake').onclick = () => this.ui.wakeUp(false);
    $('set-dist').oninput = e => { this.renderDist = +e.target.value; $('set-dist-v').textContent = e.target.value; };
    $('set-vol').oninput = e => this.sound.setVolume(e.target.value / 100);
    $('set-music').onchange = e => this.sound.musicOn = e.target.checked;
    $('set-fly').onchange = e => this.creativeFly = e.target.checked;
  }

  // ---------- 输入 ----------
  bindInput() {
    const canvas = this.renderer.domElement;
    document.addEventListener('keydown', e => {
      if (e.code === 'F3') { e.preventDefault(); this.f3on = !this.f3on; document.getElementById('f3').style.display = this.f3on ? 'block' : 'none'; }
      if (!this.started) return;
      const p = this.player;
      if (e.code === 'Escape') {
        if (this.ui.mode === 'pause' || this.ui.mode === 'settings') { this.ui.closeScreen(); this.resume(); }
        else if (this.ui.mode === 'inv' || this.ui.mode === 'crafting' || this.ui.mode === 'furnace' || this.ui.mode === 'chest') this.ui.closeScreen();
        else if (this.ui.mode === null) this.openPause();
        return;
      }
      if (this.ui.mode === 'death') return;
      if (e.code === 'KeyE') {
        e.preventDefault();
        if (this.ui.mode === 'inv' || this.ui.mode === 'crafting' || this.ui.mode === 'furnace' || this.ui.mode === 'chest') this.ui.closeScreen();
        else if (this.ui.mode === null) this.ui.openInv();
        return;
      }
      if (this.ui.mode !== null) return;
      p.keys[e.code] = true;
      if (e.code.startsWith('Digit')) {
        const d = +e.code.slice(5);
        if (d >= 1 && d <= 9) { this.inv.sel = d - 1; this.sound.click(); }
      }
      if (e.code === 'KeyQ') {
        const s = this.inv.held();
        if (s) {
          const dx = -Math.sin(p.yaw) * Math.cos(p.pitch), dz = -Math.cos(p.yaw) * Math.cos(p.pitch);
          this.entities.dropItem(p.x + dx, p.eyeY() - 0.3, p.z + dz, s.id, 1, [dx * 6, 1.5, dz * 6]);
          s.n--; if (s.n <= 0) this.inv.slots[this.inv.sel] = null;
        }
      }
      if (e.code === 'KeyF' && this.creativeFly) { p.flying = !p.flying; this.ui.toast(p.flying ? '飞行开启' : '飞行关闭'); }
      if (e.code === 'F5') { e.preventDefault(); p.thirdPerson = (p.thirdPerson + 1) % 2; }
    });
    document.addEventListener('keyup', e => { if (this.player) this.player.keys[e.code] = false; });
    canvas.addEventListener('mousedown', e => {
      if (!this.started || this.ui.mode !== null) return;
      if (document.pointerLockElement !== canvas) { canvas.requestPointerLock(); return; }
      this.sound.ensure();
      if (e.button === 0) { this.player.mouse.l = true; this.player.attack(); }
      if (e.button === 2) {
        this.player.mouse.r = true;
        this.rightAction();
        this._repR = setInterval(() => this.rightAction(), 240);
      }
    });
    document.addEventListener('mouseup', e => {
      if (!this.player) return;
      if (e.button === 0) this.player.mouse.l = false;
      if (e.button === 2) { this.player.mouse.r = false; clearInterval(this._repR); }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousemove', e => {
      if (!this.started || this.ui.mode !== null || document.pointerLockElement !== canvas) return;
      const p = this.player;
      const sens = 0.0024;
      p.yaw -= e.movementX * sens;
      p.pitch += e.movementY * sens; // 正=抬头
      p.pitch = Math.max(-1.55, Math.min(1.55, p.pitch));
    });
    document.addEventListener('wheel', e => {
      if (!this.started || this.ui.mode !== null) return;
      this.inv.sel = (this.inv.sel + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
    }, { passive: true });
    // 指针锁意外丢失 -> 不自动弹暂停（测试友好），仅当用户按 Esc 处理
  }
  rightAction() {
    const p = this.player;
    if (!p || p.dead) return;
    // TNT 点燃（左键也可，这里右键）
    const aim = p.raycastBlock(5);
    if (aim.hit && aim.id === B.TNT) {
      this.world.setBlock(aim.x, aim.y, aim.z, 0);
      this.entities.addLitTnt(aim.x, aim.y, aim.z);
      this.sound.fuse();
      return;
    }
    p.interact();
  }
  openPause() {
    this.ui.mode = 'pause';
    const el = document.getElementById('pause');
    el.style.display = 'flex';
    document.exitPointerLock && document.exitPointerLock();
  }
  resume() {
    document.getElementById('pause').style.display = 'none';
    document.getElementById('settings').style.display = 'none';
    this.ui.mode = null;
  }

  showTitle() {
    this.ui.mode = 'title';
    const t = document.getElementById('title');
    t.style.display = 'flex';
    const has = hasSave();
    document.getElementById('btn-continue').style.display = has ? 'block' : 'none';
    document.getElementById('btn-new').onclick = () => {
      const seedStr = document.getElementById('seed-input').value.trim();
      let seed = 0;
      if (seedStr) { for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0; }
      else seed = (Math.random() * 0xffffffff) >>> 0;
      this.startWorld(seed, null);
    };
    document.getElementById('btn-continue').onclick = () => {
      const d = loadGame();
      if (d) this.startWorld(d.seed, d);
    };
  }

  // ---------- 主循环 ----------
  loop(t) {
    requestAnimationFrame(tt => this.loop(tt));
    let dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.uniTime.value = t / 1000;
    if (!this.started) { this.renderTitleBg(dt); return; }
    const p = this.player;
    // 睡觉：快进
    if (this.ui.mode === 'sleep') {
      this.sky.time = (this.sky.time + dt * 0.12) % 1;
      if (this.sky.time > 0.26 && this.sky.time < 0.5) this.ui.wakeUp(true);
    } else {
      this.sky.update(dt, p, this.camera);
    }
    this.uDay = this.sky.uDay;
    this.uniDay.value = this.uDay;

    if (!this.paused) {
      p.update(dt);
      this.mobs.update(dt, this);
      this.entities.update(dt, this);
      this.world.randomTick(p.x, p.z);
      this.furnaceTick(dt);
      this.chunkLoop();
      this.sound.updateMusic(dt);
      // 第三人称 Steve 模型同步
      if (this.steveMesh) {
        this.steveMesh.visible = p.thirdPerson !== 0 && !p.dead;
        if (this.steveMesh.visible) {
          this.steveMesh.position.set(p.x, p.y, p.z);
          this.steveMesh.rotation.y = p.yaw;
          const swing = p.moving() && p.onGround ? Math.sin(p.bobPhase * 2) * 0.7 : 0;
          const P = this.steveParts;
          if (P.armL) P.armL.rotation.x = -swing + (p.mouse.l ? -1.2 : 0);
          if (P.armR) P.armR.rotation.x = swing;
          if (P.legL) P.legL.rotation.x = swing;
          if (P.legR) P.legR.rotation.x = -swing;
          if (P.head) P.head.rotation.x = p.pitch * 0.8;
          const skyHere = this.world.getSky(Math.floor(p.x), Math.floor(p.y + 1), Math.floor(p.z)) / 15;
          const blkHere = this.world.getBlk(Math.floor(p.x), Math.floor(p.y + 1), Math.floor(p.z)) / 15;
          const v = Math.min(1, skyHere * this.uDay + blkHere + 0.08);
          this.steveMesh.traverse(o => {
            if (!o.isMesh) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const mat of mats) {
              if (mat._bc === undefined) mat._bc = mat.color.clone();
              mat.color.copy(mat._bc).multiplyScalar(v);
            }
          });
        }
      }
      // 脚步声
      this._stepT = (this._stepT || 0) + dt * Math.hypot(p.vx, p.vz);
      if (p.onGround && this._stepT > 2.2) {
        this._stepT = 0;
        const below = this.world.getBlockOr(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z), 0);
        if (below) this.sound.step(blockInfo(below).sound);
      }
    }
    // 相机震动
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.camera.position.x += (Math.random() - 0.5) * this.shakeA * this.shakeT;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeA * this.shakeT;
    }
    this.ui.updateHUD();
    this.ui.updateToast(dt);
    // 自动保存
    this._saveT = (this._saveT || 0) + dt;
    if (this._saveT > 45) { this._saveT = 0; saveGame(this); }
    // F3
    if (this.f3on) {
      document.getElementById('f3').textContent =
        `XYZ: ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}\n生物群系: ${this.world.biomeAt(Math.floor(p.x), Math.floor(p.z))}\n时间: ${(this.sky.time * 24).toFixed(1)}h 天气: ${this.sky.weather}\n实体: ${this.entities.list.length} 生物: ${this.mobs.list.length}\nFPS: ${Math.round(1 / Math.max(dt, 1e-4))} 区块: ${this.world.chunks.size}`;
    }
    this.renderer.render(this.scene, this.camera);
  }
  renderTitleBg(dt) {
    // 标题背景：缓转天空
    this.sky.time = 0.35;
    this.sky.update(dt * 0.2, { x: 0, y: 60, z: 0 }, this.camera);
    this.uDay = this.sky.uDay; this.uniDay.value = this.uDay;
    this.camera.position.set(0, 60, 0);
    this.camera.rotation.y += dt * 0.05;
    this.renderer.render(this.scene, this.camera);
  }
}

addEventListener('DOMContentLoaded', () => { new Game(); });

// UI：HUD + 背包/合成/熔炉/箱子 + 菜单/标题/死亡 + toast
import { blockInfo } from './blocks.js';
import { itemInfo, iconOf, nameOf } from './items.js';
import { tileUV } from './textures.js';
import { matchRecipe } from './inv.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.mode = null;          // null|'inv'|'crafting'|'furnace'|'chest'|'pause'|'settings'|'death'|'title'|'sleep'
    this.cursor = null;        // 手上拿着的物品 {id,n,dur}
    this.craftGrid = null;     // 3x3 或 2x2 的 {id,n} 数组
    this.craftSize = 2;
    this.container = null;     // {type, pos, slots}
    this.toastQ = [];
    this.atlasCanvas = null;
    this.iconCache = new Map();
    this.el = {};
    for (const id of ['hud', 'hotbar', 'hearts', 'hunger', 'air', 'crosshair', 'inv-screen', 'toast', 'death', 'pause', 'title', 'settings', 'bowpower', 'f3', 'sleep', 'redflash'])
      this.el[id] = document.getElementById(id);
    this.buildHotbar();
    this.bindDrag();
  }
  setAtlas(canvas) { this.atlasCanvas = canvas; }

  anyOpen() { return this.mode !== null; }
  playing() { return this.mode === null || this.mode === 'sleep'; }

  // ---------- 图标 ----------
  iconURL(id, size = 40) {
    const key = id + ':' + size;
    if (this.iconCache.has(key)) return this.iconCache.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (id >= 100) {
      const nm = iconOf(id) || 'i_stick';
      const [u0, v0, u1, v1] = tileUV(nm);
      const sx = u0 * this.atlasCanvas.width, sy = (1 - v1) * this.atlasCanvas.height;
      const sw = (u1 - u0) * this.atlasCanvas.width, sh = (v1 - v0) * this.atlasCanvas.height;
      g.drawImage(this.atlasCanvas, sx, sy, sw, sh, size * 0.05, size * 0.05, size * 0.9, size * 0.9);
    } else {
      const info = blockInfo(id);
      const t = info.tiles;
      const top = typeof t === 'string' ? t : t[0];
      const side = typeof t === 'string' ? t : (t[2] || t[0]);
      const [u0t, v0t, u1t, v1t] = tileUV(top);
      const [u0s, v0s, u1s, v1s] = tileUV(side);
      // 伪 3D：顶面 + 两侧
      const s = size;
      const sh = s * 0.42;
      g.save();
      g.translate(s * 0.5, s * 0.06);
      g.transform(1, 0.5, -1, 0.5, 0, 0);
      g.drawImage(this.atlasCanvas, u0t * this.atlasCanvas.width, (1 - v1t) * this.atlasCanvas.height,
        (u1t - u0t) * this.atlasCanvas.width, (v1t - v0t) * this.atlasCanvas.height, 0, 0, sh, sh);
      g.restore();
      g.save();
      g.translate(s * 0.08, s * 0.3);
      g.transform(1, 0.42, 0, 1, 0, 0);
      g.drawImage(this.atlasCanvas, u0s * this.atlasCanvas.width, (1 - v1s) * this.atlasCanvas.height,
        (u1s - u0s) * this.atlasCanvas.width, (v1s - v0s) * this.atlasCanvas.height, 0, 0, sh, sh * 1.1);
      g.restore();
      g.save();
      g.translate(s * 0.5, s * 0.52);
      g.transform(1, -0.42, 0, 1, 0, 0);
      g.filter = 'brightness(0.8)';
      g.drawImage(this.atlasCanvas, u0s * this.atlasCanvas.width, (1 - v1s) * this.atlasCanvas.height,
        (u1s - u0s) * this.atlasCanvas.width, (v1s - v0s) * this.atlasCanvas.height, 0, 0, sh, sh * 1.1);
      g.restore();
    }
    const url = c.toDataURL();
    this.iconCache.set(key, url);
    return url;
  }

  slotHTML(s, cls = '') {
    if (!s) return `<div class="slot ${cls}"></div>`;
    const info = itemInfo(s.id);
    let durBar = '';
    if (info && info.dur && s.dur !== undefined && s.dur < info.dur) {
      const p = s.dur / info.dur;
      durBar = `<div class="durbar"><div style="width:${p * 100}%;background:${p > 0.5 ? '#5ae05a' : p > 0.25 ? '#e0c040' : '#e05040'}"></div></div>`;
    }
    return `<div class="slot ${cls}" data-id="${s.id}">
      <img draggable="false" src="${this.iconURL(s.id)}">
      ${s.n > 1 ? `<span class="cnt">${s.n}</span>` : ''}${durBar}</div>`;
  }

  buildHotbar() {
    this.el.hotbar.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const d = document.createElement('div');
      d.className = 'hbslot';
      d.innerHTML = `<div class="hbnum">${i + 1}</div>`;
      this.el.hotbar.appendChild(d);
    }
  }
  updateHUD() {
    const g = this.game, p = g.player, inv = g.inv;
    // 快捷栏
    for (let i = 0; i < 9; i++) {
      const d = this.el.hotbar.children[i];
      const s = inv.slots[i];
      d.className = 'hbslot' + (i === inv.sel ? ' sel' : '');
      const inner = s ? `<div class="hbicon"><img draggable="false" src="${this.iconURL(s.id)}">${s.n > 1 ? `<span class="cnt">${s.n}</span>` : ''}${this.durHTML(s)}</div>` : '';
      if (d._inner !== inner) { d.innerHTML = `<div class="hbnum">${i + 1}</div>` + inner; d._inner = inner; }
    }
    // 心/饥饿/氧气
    let h = '';
    for (let i = 0; i < 10; i++) {
      const v = p.hp - i * 2;
      h += `<span class="heart ${v >= 2 ? 'full' : v >= 1 ? 'half' : 'empty'}">❤</span>`;
    }
    this.el.hearts.innerHTML = h;
    let f = '';
    for (let i = 0; i < 10; i++) {
      const v = p.hunger - i * 2;
      f += `<span class="food ${v >= 2 ? 'full' : v >= 1 ? 'half' : 'empty'}">🍗</span>`;
    }
    this.el.hunger.innerHTML = f;
    let a = '';
    if (p.air < p.maxAir) {
      const bubbles = Math.ceil(p.air / p.maxAir * 10);
      for (let i = 0; i < bubbles; i++) a += '<span class="air">●</span>';
    }
    this.el.air.innerHTML = a;
  }
  durHTML(s) {
    const info = itemInfo(s.id);
    if (!info || !info.dur || s.dur === undefined || s.dur >= info.dur) return '';
    const p = s.dur / info.dur;
    return `<div class="durbar"><div style="width:${p * 100}%;background:${p > 0.5 ? '#5ae05a' : p > 0.25 ? '#e0c040' : '#e05040'}"></div></div>`;
  }
  setBowPower(p) {
    if (p < 0) { this.el.bowpower.style.display = 'none'; return; }
    this.el.bowpower.style.display = 'block';
    this.el.bowpower.style.setProperty('--p', p);
  }
  flashRed() {
    const f = this.el.redflash;
    f.style.transition = 'none'; f.style.opacity = 0.45;
    requestAnimationFrame(() => { f.style.transition = 'opacity 0.5s'; f.style.opacity = 0; });
  }
  toast(msg) {
    this.toastQ.push(msg);
  }
  updateToast(dt) {
    const el = this.el.toast;
    if (this._toastT > 0) {
      this._toastT -= dt;
      if (this._toastT <= 0) el.className = '';
    }
    if (this.toastQ.length && this._toastT <= 0) {
      el.textContent = this.toastQ.shift();
      el.className = 'show';
      this._toastT = 2.4;
    }
  }
  showDeath() {
    this.mode = 'death';
    this.el.death.style.display = 'flex';
  }
  hideDeath() {
    this.el.death.style.display = 'none';
  }

  // ---------- 打开界面 ----------
  openInv() { this.openCraft(2); }
  openCraft(size) {
    this.craftSize = size;
    this.craftGrid = new Array(size * size).fill(null);
    this.craftOut = null;
    this.mode = size === 3 ? 'crafting' : 'inv';
    this.renderScreen();
  }
  openContainer(x, y, z, type) {
    const w = this.game.world;
    const key = x + ',' + y + ',' + z;
    let c = w.containers.get(key);
    if (!c) {
      if (type === 'chest') c = { type, slots: new Array(27).fill(null) };
      else if (type === 'furnace') {
        const id = w.getBlockOr(x, y, z, 0);
        c = { type: 'furnace', slots: [null, null, null], fuel: 0, fuelMax: 0, prog: 0, cook: 0 };
      } else if (type === 'crafting') { this.openCraft(3); return true; }
      else if (type === 'bed') { this.trySleep(); return true; }
      else if (type === 'tnt') { return false; }
      if (c) w.containers.set(key, c);
    }
    if (!c) return false;
    this.container = c; this.containerPos = [x, y, z];
    this.mode = c.type === 'furnace' ? 'furnace' : 'chest';
    this.renderScreen();
    return true;
  }
  trySleep() {
    const g = this.game;
    if (g.sky.uDay > 0.5) { this.toast('只能在夜晚睡觉'); return; }
    g.player.spawn = { x: g.player.x, y: g.player.y, z: g.player.z };
    this.mode = 'sleep';
    this.el.sleep.style.display = 'flex';
  }
  wakeUp(skipNight) {
    this.el.sleep.style.display = 'none';
    this.mode = null;
    if (skipNight) {
      const g = this.game;
      g.sky.time = 0.27;
      g.player.hp = Math.min(g.player.maxHp, g.player.hp + 4);
      this.toast('已度过夜晚，重生点已设置');
    }
  }

  closeScreen() {
    if (this.mode === 'inv' || this.mode === 'crafting') {
      // 合成格退回背包
      if (this.craftGrid) for (let i = 0; i < this.craftGrid.length; i++) {
        const s = this.craftGrid[i];
        if (s) { const left = this.game.inv.add(s.id, s.n, s.dur); if (left > 0) this.game.entities.dropItem(this.game.player.x, this.game.player.y + 1, this.game.player.z, s.id, left); }
        this.craftGrid[i] = null;
      }
      if (this.cursor) {
        const left = this.game.inv.add(this.cursor.id, this.cursor.n, this.cursor.dur);
        if (left > 0) this.game.entities.dropItem(this.game.player.x, this.game.player.y + 1, this.game.player.z, this.cursor.id, left);
        this.cursor = null;
      }
    }
    if (this.container) {
      // 容器里光标物品掉出
      if (this.cursor) {
        const [x, y, z] = this.containerPos;
        this.game.entities.dropItem(x + 0.5, y + 1, z + 0.5, this.cursor.id, this.cursor.n);
        this.cursor = null;
      }
      this.container = null;
    }
    this.mode = null;
    this.el['inv-screen'].style.display = 'none';
  }

  // ---------- 渲染界面 ----------
  renderScreen() {
    const g = this.game, scr = this.el['inv-screen'];
    scr.style.display = 'flex';
    let html = '';
    const title = this.mode === 'furnace' ? '熔炉' : this.mode === 'chest' ? '箱子' : this.craftSize === 3 ? '工作台' : '背包与合成';
    html += `<div class="win"><div class="wtitle">${title}<span class="wx" id="win-close">✕</span></div>`;

    if (this.mode === 'furnace') {
      const c = this.container;
      html += `<div class="furnace-area">
        <div class="fslot" data-c="0">${this.slotHTML(c.slots[0])}</div>
        <div class="fflame"><div class="fire" style="height:${c.fuelMax > 0 ? (c.fuel / c.fuelMax * 100) : 0}%"></div></div>
        <div class="fslot" data-c="1">${this.slotHTML(c.slots[1])}</div>
        <div class="farrow"><div class="prog" style="width:${(c.cook / 10 * 100) || 0}%"></div></div>
        <div class="fslot big" data-c="2">${this.slotHTML(c.slots[2])}</div>
      </div>`;
    } else if (this.mode === 'chest') {
      html += `<div class="chest-area">`;
      for (let i = 0; i < 27; i++) html += this.slotHTML(this.container.slots[i], 'cinv').replace('class="slot', `data-c="${i}" class="slot`);
      html += `</div>`;
    }
    // 合成
    if (this.mode === 'inv' || this.mode === 'crafting') {
      const size = this.craftSize;
      html += `<div class="craft-area"><div class="cgrid" style="grid-template-columns:repeat(${size},46px)">`;
      for (let i = 0; i < size * size; i++) {
        html += this.slotHTML(this.craftGrid[i]).replace('class="slot', `data-k="${i}" class="slot`);
      }
      html += `</div><div class="carrow">➜</div><div id="craft-out">${this.slotHTML(this.craftOut, 'out')}</div></div>`;
    }
    // 背包（27）+快捷栏（9）
    html += `<div class="bag-area">`;
    for (let i = 9; i < 36; i++) html += this.slotHTML(g.inv.slots[i]).replace('class="slot', `data-b="${i}" class="slot`);
    html += `</div><div class="hotbar-area">`;
    for (let i = 0; i < 9; i++) html += this.slotHTML(g.inv.slots[i]).replace('class="slot', `data-b="${i}" class="slot`);
    html += `</div>`;
    // 配方提示（可合成列表）
    html += `</div>`;
    scr.innerHTML = html;
    document.getElementById('win-close').onclick = () => this.closeScreen();
    this.refreshCraftOut();
  }

  refreshCraftOut() {
    const size = this.craftSize;
    const grid = [];
    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) row.push(this.craftGrid[y * size + x] ? this.craftGrid[y * size + x].id : null);
      grid.push(row);
    }
    const r = matchRecipe(grid, size);
    this.craftOut = r ? { id: r.out, n: r.n, dur: (itemInfo(r.out) || {}).dur } : null;
    const el = document.getElementById('craft-out');
    if (el) el.innerHTML = this.slotHTML(this.craftOut, 'out');
  }

  takeCraftAll(toAll = false) {
    if (!this.craftOut) return;
    const size = this.craftSize;
    // 材料各 -1
    for (let i = 0; i < size * size; i++) {
      const s = this.craftGrid[i];
      if (s) { s.n--; if (s.n <= 0) this.craftGrid[i] = null; }
    }
    const out = this.craftOut;
    const inv = this.game.inv;
    if (toAll || !this.cursor) {
      // 直接进背包（按住 shift）
      if (this.cursor && this.cursor.id === out.id) {
        const max = (itemInfo(out.id) || { stack: 64 }).stack;
        const take = Math.min(out.n, max - this.cursor.n);
        this.cursor.n += take;
        if (take < out.n) { const left = inv.add(out.id, out.n - take, out.dur); if (left) this.game.entities.dropItem(this.game.player.x, this.game.player.y + 1, this.game.player.z, out.id, left); }
      } else if (!this.cursor) {
        this.cursor = { id: out.id, n: out.n, dur: out.dur };
      } else {
        const left = inv.add(out.id, out.n, out.dur);
        if (left) this.game.entities.dropItem(this.game.player.x, this.game.player.y + 1, this.game.player.z, out.id, left);
      }
    }
    this.game.sound.click();
    this.game.onCraft(out.id);
    this.refreshCraftOut();
    this.renderCursor();
    this.renderScreen();
  }

  // ---------- 拖拽逻辑 ----------
  bindDrag() {
    const scr = this.el['inv-screen'];
    scr.addEventListener('mousedown', e => {
      const slotEl = e.target.closest('.slot');
      if (!slotEl) return;
      e.preventDefault();
      const b = slotEl.dataset.b, k = slotEl.dataset.k, c = slotEl.dataset.c, isOut = slotEl.classList.contains('out');
      const g = this.game, inv = g.inv;
      const shift = e.shiftKey, rightBtn = e.button === 2;

      if (isOut) { this.takeCraftAll(shift); return; }

      let get, set;
      if (b !== undefined) { const i = +b; get = () => inv.slots[i]; set = v => inv.slots[i] = v; }
      else if (k !== undefined) { const i = +k; get = () => this.craftGrid[i]; set = v => this.craftGrid[i] = v; }
      else if (c !== undefined) {
        const i = +c;
        if (this.mode === 'furnace') {
          get = () => this.container.slots[i];
          set = v => {
            // 燃料格限制
            this.container.slots[i] = v;
          };
        } else {
          get = () => this.container.slots[i]; set = v => this.container.slots[i] = v;
        }
      } else return;

      const cur = get();
      if (shift && cur) {
        // 快移：背包<->容器 / 背包<->快捷栏
        if (c !== undefined) {
          const left = inv.add(cur.id, cur.n, cur.dur);
          set(left > 0 ? { ...cur, n: left } : null);
        } else if (this.container && b !== undefined) {
          const slots = this.container.slots;
          const max = (itemInfo(cur.id) || { stack: 64 }).stack;
          let n = cur.n;
          for (let i = 0; i < slots.length && n > 0; i++) {
            const s = slots[i];
            if (s && s.id === cur.id && s.n < max) { const t = Math.min(n, max - s.n); s.n += t; n -= t; }
          }
          for (let i = 0; i < slots.length && n > 0; i++) {
            if (!slots[i]) { const t = Math.min(n, max); slots[i] = { id: cur.id, n: t, dur: cur.dur }; n -= t; }
          }
          set(n > 0 ? { ...cur, n } : null);
        } else if (b !== undefined) {
          const i = +b;
          const range = i < 9 ? [9, 36] : [0, 9];
          const max = (itemInfo(cur.id) || { stack: 64 }).stack;
          let n = cur.n;
          for (let j = range[0]; j < range[1] && n > 0; j++) {
            const s = inv.slots[j];
            if (s && s.id === cur.id && s.n < max) { const t = Math.min(n, max - s.n); s.n += t; n -= t; }
          }
          for (let j = range[0]; j < range[1] && n > 0; j++) {
            if (!inv.slots[j]) { inv.slots[j] = { id: cur.id, n, dur: cur.dur }; n = 0; }
          }
          set(n > 0 ? { ...cur, n } : null);
        }
      } else if (rightBtn) {
        // 右键：拿一半 / 放一个
        if (this.cursor) {
          if (!cur) { set({ id: this.cursor.id, n: 1, dur: this.cursor.dur }); this.cursor.n--; }
          else if (cur.id === this.cursor.id && cur.n < (itemInfo(cur.id) || { stack: 64 }).stack) { cur.n++; this.cursor.n--; }
          if (this.cursor.n <= 0) this.cursor = null;
        } else if (cur) {
          const half = Math.ceil(cur.n / 2);
          this.cursor = { id: cur.id, n: half, dur: cur.dur };
          cur.n -= half;
          if (cur.n <= 0) set(null);
        }
      } else {
        // 左键：交换/放下/合并
        if (this.cursor && cur && cur.id === this.cursor.id && !itemInfo(cur.id).dur) {
          const max = (itemInfo(cur.id) || { stack: 64 }).stack;
          const t = Math.min(this.cursor.n, max - cur.n);
          cur.n += t; this.cursor.n -= t;
          if (this.cursor.n <= 0) this.cursor = null;
        } else {
          const tmp = this.cursor;
          this.cursor = cur || null;
          set(tmp || null);
        }
      }
      if (this.mode === 'inv' || this.mode === 'crafting') this.refreshCraftOut();
      g.sound.click();
      this.renderScreen();
      this.renderCursor();
    });
    scr.addEventListener('contextmenu', e => e.preventDefault());
  }
  renderCursor() {
    let el = document.getElementById('cursor-item');
    if (!this.cursor) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'cursor-item';
      document.body.appendChild(el);
      document.addEventListener('mousemove', e => {
        el.style.left = e.clientX + 6 + 'px'; el.style.top = e.clientY + 4 + 'px';
      });
    }
    el.innerHTML = `<img draggable="false" src="${this.iconURL(this.cursor.id)}">${this.cursor.n > 1 ? `<span>${this.cursor.n}</span>` : ''}`;
  }
}

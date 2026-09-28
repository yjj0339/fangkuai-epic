// 触屏支持：虚拟摇杆 + 视角滑动 + 按钮组
export class Touch {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.fwd = 0; this.strafe = 0;
    this.jumpHeld = false; this.sneakHeld = false;
    this.detect();
    if (!this.active) return;
    this.buildUI();
  }
  detect() {
    this.active = matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window;
  }
  buildUI() {
    document.body.classList.add('touching');
    const root = document.createElement('div');
    root.id = 'touch-ui';
    root.innerHTML = `
      <div id="joy-zone"><div id="joy-base"><div id="joy-knob"></div></div></div>
      <div id="look-zone"></div>
      <div id="t-btns">
        <div class="tbtn" id="t-jump">跳</div>
        <div class="tbtn" id="t-mine">挖</div>
        <div class="tbtn" id="t-place">放</div>
        <div class="tbtn small" id="t-sneak">蹲</div>
        <div class="tbtn small" id="t-inv">包</div>
      </div>`;
    document.body.appendChild(root);

    // 摇杆
    const zone = root.querySelector('#joy-zone'), base = root.querySelector('#joy-base'), knob = root.querySelector('#joy-knob');
    let jid = null, cx = 0, cy = 0;
    zone.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      jid = t.identifier; cx = t.clientX; cy = t.clientY;
      base.style.display = 'block';
      base.style.left = (cx - 60) + 'px'; base.style.top = (cy - 60) + 'px';
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === jid) {
          let dx = t.clientX - cx, dy = t.clientY - cy;
          const len = Math.hypot(dx, dy), max = 52;
          if (len > max) { dx *= max / len; dy *= max / len; }
          knob.style.transform = `translate(${dx}px,${dy}px)`;
          this.strafe = dx / max;
          this.fwd = -dy / max;
        }
        if (t.identifier === lid) {
          const dx = t.clientX - lx, dy = t.clientY - ly;
          lx = t.clientX; ly = t.clientY;
          const p = this.game.player;
          if (p && this.game.ui.mode === null) {
            p.yaw -= dx * 0.006;
            p.pitch = Math.max(-1.55, Math.min(1.55, p.pitch + dy * 0.006));
          }
        }
      }
    }, { passive: false });
    document.addEventListener('touchend', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === jid) { jid = null; this.fwd = this.strafe = 0; knob.style.transform = ''; base.style.display = 'none'; }
        if (t.identifier === lid) lid = null;
      }
    });

    // 视角
    const look = root.querySelector('#look-zone');
    let lid = null, lx = 0, ly = 0;
    look.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      lid = t.identifier; lx = t.clientX; ly = t.clientY;
    }, { passive: true });

    // 按钮
    const p = () => this.game.player;
    const jump = root.querySelector('#t-jump');
    jump.addEventListener('touchstart', e => { this.jumpHeld = true; if (p()) p().keys['Space'] = true; e.preventDefault(); }, { passive: false });
    jump.addEventListener('touchend', () => { this.jumpHeld = false; if (p()) p().keys['Space'] = false; });
    const sneak = root.querySelector('#t-sneak');
    sneak.addEventListener('touchstart', e => { this.sneakHeld = !this.sneakHeld; if (p()) p().keys['ShiftLeft'] = this.sneakHeld; e.preventDefault(); }, { passive: false });
    const mine = root.querySelector('#t-mine');
    mine.addEventListener('touchstart', e => { if (p()) { p().mouse.l = true; p().attack(); } e.preventDefault(); }, { passive: false });
    mine.addEventListener('touchend', () => { if (p()) p().mouse.l = false; });
    const place = root.querySelector('#t-place');
    place.addEventListener('touchstart', e => { this.game.rightAction(); e.preventDefault(); }, { passive: false });
    const invBtn = root.querySelector('#t-inv');
    invBtn.addEventListener('touchstart', e => {
      const ui = this.game.ui;
      if (ui.mode === 'inv' || ui.mode === 'crafting' || ui.mode === 'furnace' || ui.mode === 'chest') ui.closeScreen();
      else if (ui.mode === null) ui.openInv();
      e.preventDefault();
    }, { passive: false });

    // 快捷栏点选
    document.getElementById('hotbar').addEventListener('touchstart', e => {
      const slots = [...document.getElementById('hotbar').children];
      const ix = slots.indexOf(e.target.closest('.hbslot'));
      if (ix >= 0) this.game.inv.sel = ix;
    }, { passive: true });
  }
}

// WebAudio 程序化音效
export class Sound {
  constructor() {
    this.ctx = null;
    this.volume = 0.5;
    this.musicOn = true;
    this.musicTimer = 0;
    this.rainNode = null;
  }
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  noise(dur, freq, gain = 0.3, type = 'lowpass') {
    const ctx = this.ensure(); if (!ctx) return;
    const len = Math.max(1, ctx.sampleRate * dur | 0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
  }
  tone(freq, dur, gain = 0.2, type = 'square', slide = 0) {
    const ctx = this.ensure(); if (!ctx) return;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  dig(mat) {
    if (mat === 'wood') this.noise(0.08, 900, 0.25);
    else if (mat === 'grass' || mat === 'wool') this.noise(0.09, 1600, 0.2, 'highpass');
    else if (mat === 'sand' || mat === 'snow') this.noise(0.1, 2600, 0.18, 'highpass');
    else this.noise(0.07, 500, 0.3);
  }
  breakSnd(mat) { this.dig(mat); this.noise(0.15, mat === 'stone' ? 420 : 1200, 0.25); }
  place(mat) { this.dig(mat); this.tone(160, 0.06, 0.1, 'triangle', -40); }
  step(mat) {
    const f = mat === 'stone' ? 700 : mat === 'wood' ? 550 : 1900;
    this.noise(0.045, f, 0.07, mat === 'grass' ? 'highpass' : 'lowpass');
  }
  pop() { this.tone(600, 0.08, 0.15, 'sine', 500); }
  hurt(who) {
    if (who === 'player') { this.tone(220, 0.18, 0.3, 'sawtooth', -120); }
    else if (who === 'zombie') this.tone(120, 0.3, 0.22, 'sawtooth', -50);
    else if (who === 'skeleton') this.noise(0.15, 2400, 0.2, 'highpass');
    else this.tone(380, 0.16, 0.22, 'square', -160);
  }
  hit() { this.noise(0.08, 300, 0.3); this.tone(140, 0.1, 0.18, 'square', -60); }
  explode() {
    this.noise(0.9, 120, 0.8);
    this.tone(60, 0.7, 0.5, 'sawtooth', -30);
  }
  fuse() { this.noise(1.4, 3800, 0.12, 'highpass'); }
  bow() { this.tone(300, 0.12, 0.2, 'sine', 400); this.noise(0.06, 2200, 0.12, 'highpass'); }
  eat() { this.noise(0.12, 800, 0.2); this.tone(280, 0.1, 0.1, 'triangle', 60); setTimeout(() => this.noise(0.12, 700, 0.2), 140); }
  splash() { this.noise(0.35, 1200, 0.3); }
  levelUp() { this.tone(520, 0.12, 0.2, 'sine', 200); setTimeout(() => this.tone(780, 0.2, 0.2, 'sine', 100), 110); }
  click() { this.tone(700, 0.03, 0.12, 'square'); }
  door() { this.noise(0.1, 600, 0.3); }

  // 雨声（循环白噪）
  startRain() {
    const ctx = this.ensure(); if (!ctx || this.rainNode) return;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0.12;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
    this.rainNode = { src, g };
  }
  stopRain() {
    if (this.rainNode) { try { this.rainNode.src.stop(); } catch (e) {} this.rainNode = null; }
  }

  // 环境音乐：五声音阶随机长音
  updateMusic(dt) {
    if (!this.musicOn || !this.ctx) return;
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.musicTimer = 2.5 + Math.random() * 4;
      const scale = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];
      const f = scale[Math.random() * scale.length | 0] * (Math.random() < 0.3 ? 0.5 : 1);
      const ctx = this.ctx;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.003;
      const g = ctx.createGain();
      const dur = 3 + Math.random() * 3;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.045, ctx.currentTime + dur * 0.3);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      o.connect(g); o2.connect(g); g.connect(this.master);
      o.start(); o2.start(); o.stop(ctx.currentTime + dur); o2.stop(ctx.currentTime + dur);
    }
  }
}

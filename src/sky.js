// 天空：渐变穹顶、太阳/月亮、星星、云、天气（雨/雪）
import * as THREE from '../vendor/three.module.js';

export class Sky {
  constructor(scene, camera) {
    this.scene = scene;
    this.time = 0.32; // 0..1 一天（0=午夜 0.25=日出 0.5=正午 0.75=日落）
    this.dayLength = 600; // 秒
    this.weather = 'clear'; // clear | rain
    this.weatherT = 200 + Math.random() * 300;
    this.uDay = 1;

    // 渐变穹顶（大球背面，顶点色）
    const skyGeo = new THREE.SphereGeometry(400, 16, 12);
    const cols = [];
    const pos = skyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 400;
      const t = Math.max(0, y);
      cols.push(0, 0, 0);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
    this.dome = new THREE.Mesh(skyGeo, this.skyMat);
    scene.add(this.dome);

    // 太阳/月亮
    this.sun = new THREE.Mesh(new THREE.PlaneGeometry(42, 42),
      new THREE.MeshBasicMaterial({ color: 0xfff1b0, fog: false, transparent: true }));
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(30, 30),
      new THREE.MeshBasicMaterial({ color: 0xe8ecf5, fog: false, transparent: true }));
    scene.add(this.sun, this.moon);

    // 星星
    const starGeo = new THREE.BufferGeometry();
    const sp = [];
    for (let i = 0; i < 420; i++) {
      const t = Math.random() * Math.PI * 2, p = Math.acos(Math.random() * 0.98);
      const r = 380;
      sp.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false }));
    scene.add(this.stars);

    // 云（大方块群）
    this.clouds = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, fog: false });
    for (let i = 0; i < 26; i++) {
      const w = 14 + Math.random() * 30, d = 12 + Math.random() * 26;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3.5, d), cloudMat);
      m.position.set((Math.random() - 0.5) * 420, 108 + Math.random() * 6, (Math.random() - 0.5) * 420);
      this.clouds.add(m);
    }
    scene.add(this.clouds);

    // 雨/雪粒子
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 900;
    const rp = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rp[i * 3] = (Math.random() - 0.5) * 40;
      rp[i * 3 + 1] = Math.random() * 30;
      rp[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rainMat = new THREE.PointsMaterial({ color: 0x9db8d8, size: 0.14, transparent: true, opacity: 0.7 });
    this.rain = new THREE.Points(rainGeo, this.rainMat);
    this.rain.visible = false;
    this.rainVel = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i++) this.rainVel[i] = 18 + Math.random() * 8;
    scene.add(this.rain);
    this.rainIsSnow = false;

    this.scene.fog = new THREE.Fog(0x9fc4ec, 60, 140);
  }

  update(dt, player, camera) {
    this.time = (this.time + dt / this.dayLength) % 1;
    const t = this.time;
    // uDay：太阳高度
    const sunAngle = (t - 0.25) * Math.PI * 2; // 0.25 日出 -> 0.5 正午
    const sunY = Math.sin(sunAngle);
    const daylight = Math.max(0, Math.min(1, sunY * 2.2 + 0.5));
    this.uDay = 0.22 + 0.78 * daylight;
    const duskGlow = Math.max(0, 1 - Math.abs(sunY) * 4);

    // 天色
    const cTop = new THREE.Color(), cHor = new THREE.Color();
    const dayTop = new THREE.Color(0x4a90d9), dayHor = new THREE.Color(0xbcd8f0);
    const nightTop = new THREE.Color(0x04070f), nightHor = new THREE.Color(0x0a1224);
    const duskTop = new THREE.Color(0x35476e), duskHor = new THREE.Color(0xe8804a);
    const k = daylight;
    cTop.copy(nightTop).lerp(dayTop, k);
    cHor.copy(nightHor).lerp(dayHor, k);
    cHor.lerp(duskHor, duskGlow * 0.65 * (k > 0.05 ? 1 : 0.2));
    cTop.lerp(duskTop, duskGlow * 0.4);
    if (this.weather === 'rain') { cTop.multiplyScalar(0.55); cHor.multiplyScalar(0.55); }

    // 穹顶顶点色
    const colAttr = this.dome.geometry.attributes.color;
    const posAttr = this.dome.geometry.attributes.position;
    const cMid = cHor.clone().lerp(cTop, 0.5);
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i) / 400;
      const c = y > 0 ? cHor.clone().lerp(cTop, Math.pow(y, 0.7)) : cHor.clone().lerp(cMid, -y * 0.5);
      colAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colAttr.needsUpdate = true;
    this.dome.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    this.stars.material.opacity = Math.max(0, 1 - daylight * 1.8);
    this.stars.rotation.y += dt * 0.005;

    // 太阳月亮位置
    const R = 340;
    const sx = Math.cos(sunAngle) * R * 0.4, sy = Math.sin(sunAngle) * R, sz = -Math.cos(sunAngle) * R * 0.6;
    this.sun.position.set(camera.position.x + sx, camera.position.y + sy, camera.position.z + sz);
    this.sun.lookAt(camera.position);
    this.sun.material.opacity = Math.max(0, Math.min(1, sunY * 3 + 0.4));
    this.moon.position.set(camera.position.x - sx, camera.position.y - sy, camera.position.z - sz);
    this.moon.lookAt(camera.position);
    this.moon.material.opacity = Math.max(0, Math.min(1, -sunY * 3 + 0.4));

    // 云漂移
    this.clouds.position.set(Math.floor(camera.position.x / 420) * 420, 0, Math.floor(camera.position.z / 420) * 420);
    this.clouds.children.forEach((c, i) => { c.position.x += dt * (1.2 + i * 0.03); if (c.position.x > 240) c.position.x = -240; });
    const cloudOp = this.weather === 'rain' ? 0.85 : 0.55;
    this.clouds.children[0].material.opacity = cloudOp;

    // 雾
    this.scene.fog.color.copy(cHor);
    const fogNear = this.weather === 'rain' ? 30 : 60;
    const fogFar = this.weather === 'rain' ? 90 : 150;
    this.scene.fog.near = fogNear; this.scene.fog.far = fogFar;

    // 天气机
    this.weatherT -= dt;
    if (this.weatherT <= 0) {
      if (this.weather === 'clear') { this.weather = 'rain'; this.weatherT = 60 + Math.random() * 90; }
      else { this.weather = 'clear'; this.weatherT = 240 + Math.random() * 360; }
    }
    // 雨/雪
    const wantRain = this.weather === 'rain';
    if (wantRain && !this.rain.visible) { this.rain.visible = true; this.startRainSound && this.startRainSound(); }
    if (!wantRain && this.rain.visible) { this.rain.visible = false; this.stopRainSound && this.stopRainSound(); }
    if (this.rain.visible) {
      this.rainIsSnow = false;
      // 群系判断雪：玩家所在biome（简化用温度）
      const p = this.rain.geometry.attributes.position;
      const arr = p.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= this.rainVel[i / 3] * dt;
        if (arr[i + 1] < -12) {
          arr[i + 1] = 26 + Math.random() * 8;
          arr[i] = (Math.random() - 0.5) * 40;
          arr[i + 2] = (Math.random() - 0.5) * 40;
        }
      }
      p.needsUpdate = true;
      this.rain.position.set(player.x, player.y, player.z);
    }
  }

  get isNight() { return this.uDay < 0.45; }
}

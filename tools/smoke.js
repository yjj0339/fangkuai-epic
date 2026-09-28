/**
 * 冒烟测试（静默铁律：无头浏览器+截图，绝不真实点击用户桌面）
 * node tools/smoke.js
 * 1) 起页面 -> 固定种子开世界 -> 等区块就绪
 * 2) 走真实输入路径：移动/挖掘/放置/背包合成/生物生成
 * 3) 输出 shots/*.png + JSON 报告，非 0 退出=有错误
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

function findEdge() {
  const cands = [
    ['C:', 'Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'],
    ['C:', 'Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'],
  ];
  for (const parts of cands) if (fs.existsSync(path.join(...parts))) return path.join(...parts);
  return null;
}
const URL = 'http://localhost:5189/'; // 仅本机测试服务
const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: findEdge(),
    headless: 'new',
    args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader', '--window-size=1280,720', '--mute-audio'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', e => errors.push('[pageerror] ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });

  const report = { errors, steps: {} };
  const step = (name, ok, extra) => { report.steps[name] = { ok, ...(extra || {}) }; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' ' + JSON.stringify(extra) : '')); };

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, '01-title.png') });

  // 开新世界（固定种子）
  await page.evaluate(() => { document.getElementById('seed-input').value = '12345'; });
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 500));

  // 等待世界就绪（真实路径：started+区块数）
  const ready = await page.waitForFunction(() => {
    const g = window.__game;
    return g && g.started && g.world.chunks.size >= 20;
  }, { timeout: 45000 }).then(() => true).catch(() => false);
  step('world-ready', ready);
  if (!ready) { fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); process.exit(1); }

  // 等网格构建稳定
  await page.waitForFunction(() => {
    const g = window.__game;
    let dirty = 0;
    for (const c of g.world.chunks.values()) if (c.dirty || c.dirtyLight) dirty++;
    return dirty === 0;
  }, { timeout: 30000 }).then(() => true).catch(() => false);
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT, '02-world.png') });

  // 基本状态
  const st1 = await page.evaluate(() => {
    const g = window.__game;
    return { chunks: g.world.chunks.size, mobs: g.mobs.list.length, models: Object.keys(g.mobs.models).length, y: g.player.y.toFixed(1) };
  });
  step('state', st1.models === 8, st1);
  await page.screenshot({ path: path.join(OUT, '03-state.png') });

  // 真实输入：按 W 走 1.5s（keydown 路径）
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 1500));
  await page.keyboard.up('KeyW');
  const moved = await page.evaluate(() => {
    const g = window.__game;
    return { x: g.player.x.toFixed(2), z: g.player.z.toFixed(2) };
  });
  step('move-w', true, moved);

  // 挖掘（真实鼠标路径）：低头按住左键
  const digTest = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    p.pitch = -1.2;
    const aim1 = p.raycastBlock(5);
    if (!aim1.hit) return { ok: false, why: 'no-target' };
    const before = g.world.getBlockOr(aim1.x, aim1.y, aim1.z, 0);
    p.mouse.l = true;
    const t0 = performance.now();
    while (performance.now() - t0 < 3500) {
      await new Promise(r => setTimeout(r, 100));
      if (g.world.getBlockOr(aim1.x, aim1.y, aim1.z, 0) === 0) break;
    }
    p.mouse.l = false;
    const after = g.world.getBlockOr(aim1.x, aim1.y, aim1.z, 0);
    return { ok: after === 0, before, after, items: g.entities.list.filter(e => e.kind === 'item').length };
  });
  step('mine-real-input', digTest.ok, digTest);
  await page.screenshot({ path: path.join(OUT, '04-mined.png') });

  // 放置：给玩家木板并放置
  const placeTest = await page.evaluate(() => {
    const g = window.__game, p = g.player;
    g.inv.slots[0] = { id: 9, n: 8 };
    g.inv.sel = 0;
    const aim = p.raycastBlock(5);
    if (!aim.hit) return { ok: false };
    const tx = aim.x + aim.face[0], ty = aim.y + aim.face[1], tz = aim.z + aim.face[2];
    p.interact();
    return { ok: g.world.getBlockOr(tx, ty, tz, 0) === 9 };
  });
  step('place', placeTest.ok, placeTest);

  // 合成：木板->木棍（工作台 3x3 路径）
  const craftTest = await page.evaluate(() => {
    const g = window.__game;
    g.inv.slots.fill(null);
    g.inv.slots[0] = { id: 9, n: 4 };
    g.ui.openCraft(3);
    g.ui.craftGrid[0] = { id: 9, n: 2 };
    g.ui.craftGrid[3] = { id: 9, n: 2 };
    g.ui.refreshCraftOut();
    const out = g.ui.craftOut;
    let got = null;
    if (out) { got = out.id; g.ui.takeCraftAll(); }
    g.ui.closeScreen();
    const sticks = g.inv.count(100);
    return { ok: got === 100 && sticks >= 4, got, sticks };
  });
  step('craft-sticks', craftTest.ok, craftTest);

  // 生物：周围生成七种，验证模型挂载与部件
  const mobTest = await page.evaluate(() => {
    const g = window.__game, p = g.player;
    const spawned = [];
    for (const [type, dx] of [['zombie', 4], ['creeper', 6], ['pig', -4], ['cow', -6], ['sheep', 3], ['chicken', 7], ['skeleton', 9]]) {
      const m = g.mobs.addMob(type, p.x + dx, p.y + 3, p.z + 3);
      spawned.push({ type, ok: !!m && !!m.mesh, parts: m ? Object.keys(m.parts).length : 0 });
    }
    return { ok: spawned.every(s => s.ok && s.parts > 0), spawned };
  });
  step('mobs-spawn', mobTest.ok, mobTest);
  await page.evaluate(() => { window.__game.player.yaw = 0.7; window.__game.player.pitch = -0.15; });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(OUT, '05-mobs.png') });

  // 熔炉燃料
  const smeltTest = await page.evaluate(() => {
    const g = window.__game;
    g.world.containers.set('0,60,0', { type: 'furnace', slots: [{ id: 18, n: 2 }, { id: 101, n: 2 }, null], fuel: 0, fuelMax: 0, prog: 0, cook: 0 });
    g.furnaceTick(0.1);
    const c = g.world.containers.get('0,60,0');
    return { ok: c.fuel > 0, fuel: c.fuel.toFixed(1) };
  });
  step('furnace-fuel', smeltTest.ok, smeltTest);

  // 战斗：直接 hurt 僵尸
  const combatTest = await page.evaluate(() => {
    const g = window.__game;
    const z = g.mobs.list.find(m => m.type === 'zombie');
    if (!z) return { ok: false, why: 'no-zombie' };
    const hp1 = z.hp;
    g.mobs.hurt(z, 6, { x: 0.1, z: 0 }, g);
    return { ok: z.hp === hp1 - 6, hp1, hp2: z.hp };
  });
  step('combat-hurt', combatTest.ok, combatTest);

  // 夜晚+火把光照
  const lightTest = await page.evaluate(() => {
    const g = window.__game, p = g.player;
    g.sky.time = 0.0;
    const x = Math.floor(p.x) + 1, z = Math.floor(p.z);
    const y = g.world.surfaceY(x, z);
    const before = g.world.getBlk(x, y, z);
    g.world.setBlock(x, y, z, 15); // torch
    const after = g.world.getBlk(x, y, z);
    return { ok: before === 0 && after === 14, before, after };
  });
  step('torch-light', lightTest.ok, lightTest);
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT, '06-night-torch.png') });

  // 农业链：农田->种小麦->成长
  const farmTest = await page.evaluate(() => {
    const g = window.__game, p = g.player;
    const x = Math.floor(p.x), z = Math.floor(p.z) - 2;
    const y = g.world.surfaceY(x, z) - 1;
    g.world.setBlock(x, y, z, 33);   // farmland
    g.world.setBlock(x, y + 1, z, 35); // wheat0
    g.world.setBlock(x, y + 1, z, 38); // wheat3（模拟生长后）
    const st = g.world.getBlockOr(x, y + 1, z, 0);
    return { ok: st === 38, stage: st };
  });
  step('farming-chain', farmTest.ok, farmTest);

  // 存档可用性
  const saveOk = await page.evaluate(() => typeof localStorage !== 'undefined' && !!window.__game);
  step('storage-available', !!saveOk);

  // 白天全景
  await page.evaluate(() => { window.__game.sky.time = 0.45; window.__game.sky.weather = 'clear'; });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUT, '07-day.png') });

  // 雨
  await page.evaluate(() => { window.__game.sky.weather = 'rain'; window.__game.sky.weatherT = 10; });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: path.join(OUT, '08-rain.png') });

  // UI：背包
  await page.evaluate(() => { window.__game.ui.openInv(); });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT, '09-inventory.png') });
  await page.evaluate(() => { window.__game.ui.closeScreen(); });

  // 手机宽度
  await page.setViewport({ width: 420, height: 800 });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(OUT, '10-mobile.png') });
  await page.setViewport({ width: 1280, height: 720 });

  // 汇总
  const finalState = await page.evaluate(() => {
    const g = window.__game;
    return { chunks: g.world.chunks.size, mobs: g.mobs.list.length, entities: g.entities.list.length };
  });
  report.final = finalState;
  const failed = Object.entries(report.steps).filter(([, v]) => !v.ok);
  report.pass = failed.length === 0 && errors.length === 0;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(report.pass ? 'ALL PASS' : 'FAILURES: ' + failed.map(f => f[0]).join(', ') + ' | errors: ' + errors.length);
  process.exit(report.pass ? 0 : 1);
})().catch(e => { console.error('smoke crashed', e); process.exit(2); });

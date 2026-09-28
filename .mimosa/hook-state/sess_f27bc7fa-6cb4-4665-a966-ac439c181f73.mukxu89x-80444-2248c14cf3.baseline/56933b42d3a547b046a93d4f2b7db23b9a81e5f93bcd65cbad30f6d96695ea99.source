// 程序生成 MC 风格 16x16 像素纹理图集（Canvas 2D）
// tiles 注册名字 -> 绘制函数；最终一张 atlas + UV 查询表（含物品图标）
const T = 16, COLS = 16, ROWS = 16; // 256 格 16px -> 256x256

let ctx, atlas, tileIndex = {}, rngState = 1;
function rnd() { // 确定性随机
  rngState ^= rngState << 13; rngState >>>= 0;
  rngState ^= rngState >> 17; rngState ^= rngState << 5; rngState >>>= 0;
  return rngState / 4294967296;
}
function px(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= T || y >= T) return;
  ctx.fillStyle = `rgba(${r|0},${g|0},${b|0},${a/255})`;
  ctx.fillRect(x, y, 1, 1);
}
function fill(c, amp = 10, seed = 1) {
  rngState = seed >>> 0 || 1;
  const [r, g, b] = c;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const d = (rnd() - 0.5) * 2 * amp + (rnd() - 0.5) * amp * 0.5;
    px(x, y, r + d, g + d, b + d);
  }
}
function shade(x, y, r, g, b, amp = 10, seed = 1) {
  rngState = seed >>> 0 || 1;
  const d = (rnd() - 0.5) * 2 * amp;
  px(x, y, r + d, g + d, b + d);
}
function speckle(c, n, seed, size = 1) {
  rngState = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    const x = (rnd() * T) | 0, y = (rnd() * T) | 0;
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
      const d = (rnd() - 0.5) * 20;
      px(x + dx, y + dy, c[0] + d, c[1] + d, c[2] + d);
    }
  }
}

// 每个名字一个绘制函数
const painters = {
  grass_top() { fill([106, 170, 64], 14, 11); speckle([88, 152, 52], 22, 12); speckle([125, 190, 80], 14, 13); },
  dirt() { fill([134, 96, 67], 13, 21); speckle([110, 78, 52], 18, 22); },
  grass_side() { painters.dirt(); rngState = 31;
    for (let x = 0; x < T; x++) { const h = 2 + (rnd() * 2.5 | 0);
      for (let y = 0; y < h; y++) shade(x, y, 106, 170, 64, 12, 41 + x); } },
  snowy_side() { painters.dirt(); rngState = 37;
    for (let x = 0; x < T; x++) { const h = 2 + (rnd() * 2.5 | 0);
      for (let y = 0; y < h; y++) shade(x, y, 238, 244, 248, 6, 51 + x); } },
  stone() { fill([127, 127, 127], 9, 41); speckle([105, 105, 105], 16, 42); speckle([145, 145, 145], 10, 43); },
  cobble() { fill([110, 110, 110], 8, 51);
    rngState = 52;
    for (let i = 0; i < 7; i++) { const x = rnd()*13|0, y = rnd()*13|0, w = 2+(rnd()*3|0), h = 2+(rnd()*3|0), v = 100 + rnd()*55;
      for (let yy = y; yy < y+h; yy++) for (let xx = x; xx < x+w; xx++) if (xx<T&&yy<T) { const d=(rnd()-0.5)*14; px(xx,yy,v+d,v+d,v+d); } } },
  mossy() { painters.cobble(); speckle([90, 120, 60], 26, 61, 2); },
  stone_bricks() { fill([122, 122, 122], 6, 71);
    ctx.fillStyle = 'rgba(78,78,78,0.9)';
    ctx.fillRect(0,0,T,1); ctx.fillRect(0,8,T,1); ctx.fillRect(7,0,1,8); ctx.fillRect(3,8,1,8); ctx.fillRect(11,8,1,8);
    speckle([100,100,100], 8, 72); },
  sand() { fill([219, 207, 163], 8, 81); speckle([200, 188, 140], 20, 82); },
  sandstone() { fill([216, 203, 155], 6, 83); speckle([196, 182, 132], 14, 84);
    ctx.fillStyle = 'rgba(180,166,116,0.6)'; ctx.fillRect(0, 12, T, 1); ctx.fillRect(0, 5, T, 1); },
  sandstone_top() { fill([222, 209, 160], 5, 85); },
  gravel() { fill([131, 127, 126], 16, 91); speckle([100, 96, 95], 18, 92, 2); speckle([160, 155, 152], 12, 93, 2); },
  log() { for (let x = 0; x < T; x++) { const col = 108 + Math.sin(x * 1.8) * 12 + (x % 4 === 0 ? -22 : 0);
    for (let y = 0; y < T; y++) shade(x, y, col + 14, col * 0.72, col * 0.42, 7, 101 + x * 7); } },
  log_top() { fill([104, 82, 50], 5, 111);
    ctx.strokeStyle = 'rgba(140,112,70,0.9)';
    for (let r = 2; r < 8; r += 2) { ctx.beginPath(); ctx.arc(8, 8, r, 0, 7); ctx.stroke(); }
    px(8, 8, 190, 160, 105); px(7, 8, 190, 160, 105); px(8, 7, 178, 148, 95); },
  spruce_log() { for (let x = 0; x < T; x++) { const col = 72 + Math.sin(x * 2.1) * 10 + (x % 4 === 0 ? -16 : 0);
    for (let y = 0; y < T; y++) shade(x, y, col + 8, col * 0.62, col * 0.36, 6, 121 + x * 7); } },
  spruce_top() { fill([70, 56, 34], 5, 131);
    ctx.strokeStyle = 'rgba(100,80,48,0.9)';
    for (let r = 2; r < 8; r += 2) { ctx.beginPath(); ctx.arc(8, 8, r, 0, 7); ctx.stroke(); } },
  leaves() { rngState = 141;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (rnd() < 0.12) { px(x, y, 0, 0, 0, 0); continue; }
      const v = rnd();
      if (v < 0.3) shade(x, y, 42, 96, 24, 10, 143 + x * 3 + y);
      else if (v < 0.7) shade(x, y, 58, 128, 32, 12, 147);
      else shade(x, y, 74, 152, 42, 12, 151); } },
  spruce_leaves() { rngState = 161;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (rnd() < 0.12) { px(x, y, 0, 0, 0, 0); continue; }
      const v = rnd();
      if (v < 0.4) shade(x, y, 34, 78, 46, 10, 163);
      else shade(x, y, 46, 100, 58, 12, 167); } },
  planks() { fill([162, 131, 79], 7, 171);
    ctx.fillStyle = 'rgba(120,94,52,0.85)';
    ctx.fillRect(0, 3, T, 1); ctx.fillRect(0, 7, T, 1); ctx.fillRect(0, 11, T, 1); ctx.fillRect(0, 15, T, 1);
    rngState = 172; px(3 + (rnd()*3|0), 0, 120, 94, 52); px(10 + (rnd()*3|0), 4, 120, 94, 52); px(5, 8, 120, 94, 52); px(12, 12, 120, 94, 52); },
  crafting_top() { painters.planks();
    ctx.fillStyle = 'rgba(70,52,28,0.95)';
    ctx.fillRect(0,0,T,2); ctx.fillRect(0,14,T,2); ctx.fillRect(0,0,2,T); ctx.fillRect(14,0,2,T);
    ctx.fillRect(7,2,2,12); ctx.fillRect(2,7,12,2); },
  crafting_side() { painters.planks();
    ctx.fillStyle = 'rgba(80,60,34,0.9)'; ctx.fillRect(2,2,5,5); ctx.fillRect(9,2,5,5);
    ctx.fillStyle = 'rgba(150,150,150,0.8)'; ctx.fillRect(3,3,3,3); ctx.fillRect(10,3,3,3); },
  furnace_top() { fill([118, 118, 118], 8, 181); speckle([95, 95, 95], 12, 182); },
  furnace_side() { fill([116, 116, 116], 7, 183);
    ctx.fillStyle = 'rgba(80,80,80,0.9)'; ctx.fillRect(0,0,T,1); ctx.fillRect(0,15,T,1); ctx.fillRect(0,0,1,T); ctx.fillRect(15,0,1,T);
    speckle([100,100,100], 10, 184); },
  furnace_front() { painters.furnace_side();
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(4, 8, 8, 6);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(4, 6, 8, 2); },
  furnace_front_lit() { painters.furnace_side();
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(4, 8, 8, 6);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(4, 6, 8, 2);
    rngState = 186;
    for (let x = 5; x < 11; x++) for (let y = 10; y < 13; y++) {
      const v = rnd(); if (v < 0.7) px(x, y, 255, 140 + v * 60, 30); } },
  chest_top() { fill([168, 112, 44], 7, 191);
    ctx.fillStyle = 'rgba(90,58,20,0.9)'; ctx.fillRect(0,0,T,1); ctx.fillRect(0,15,T,1); ctx.fillRect(0,0,1,T); ctx.fillRect(15,0,1,T); },
  chest_side() { painters.chest_top();
    ctx.fillStyle = 'rgba(100,66,24,0.9)'; ctx.fillRect(0, 5, T, 1); },
  chest_front() { painters.chest_side();
    ctx.fillStyle = '#8a8a8a'; ctx.fillRect(7, 5, 2, 3);
    ctx.fillStyle = '#c8c8c8'; ctx.fillRect(7, 5, 2, 1); },
  bed_top() { rngState = 201;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (y < 5) { // 枕头
        if (x >= 1 && x <= 6) shade(x, y, 235, 235, 235, 6, 203);
        else if (x >= 9 && x <= 14) shade(x, y, 235, 235, 235, 6, 207);
        else shade(x, y, 700 - 100 + 178, 34, 44, 8, 211); // (r 荒谬值修正如下)
      } else shade(x, y, 178, 34, 44, 10, 211 + y); }
    // 修正枕头区误色
    rngState = 202;
    for (const x0 of [1, 9]) for (let y = 1; y < 5; y++) for (let x = x0; x < x0 + 6; x++) shade(x, y, 238, 238, 238, 5, 213 + x + y); },
  bed_side() { fill([178, 34, 44], 8, 221);
    ctx.fillStyle = '#a02832'; ctx.fillRect(0, 11, T, 5);
    ctx.fillStyle = '#6b5030'; ctx.fillRect(0, 14, 2, 2); ctx.fillRect(14, 14, 2, 2); },
  torch() { ctx.clearRect(0, 0, T, T);
    for (let y = 6; y < 16; y++) for (let x = 7; x < 9; x++) shade(x, y, 110, 88, 50, 6, 231);
    px(7, 5, 255, 220, 80); px(8, 5, 255, 220, 80); px(7, 4, 255, 180, 40); px(8, 4, 255, 240, 130);
    px(7, 6, 200, 100, 30); px(8, 6, 200, 100, 30); },
  water() { rngState = 241;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const w = Math.sin((x + y * 2.2) * 0.9) * 10 + Math.sin(y * 1.7) * 6;
      px(x, y, 38 + w, 92 + w, 197 + w, 178); } },
  ice() { rngState = 251;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const w = Math.sin((x * 1.3 + y)) * 8;
      px(x, y, 160 + w, 190 + w, 245 + w, 225); } },
  coal_ore() { painters.stone(); oreBlobs([28, 28, 30], 4, 261); },
  iron_ore() { painters.stone(); oreBlobs([216, 175, 147], 4, 271); },
  gold_ore() { painters.stone(); oreBlobs([252, 238, 105], 4, 281); },
  diamond_ore() { painters.stone(); oreBlobs([93, 236, 245], 4, 291); },
  glass() { ctx.clearRect(0, 0, T, T);
    ctx.fillStyle = 'rgba(210,235,240,0.35)'; ctx.fillRect(0, 0, T, T);
    ctx.fillStyle = 'rgba(230,250,255,0.95)';
    ctx.fillRect(0, 0, T, 1); ctx.fillRect(0, 15, T, 1); ctx.fillRect(0, 0, 1, T); ctx.fillRect(15, 0, 1, T);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(11, 2, 1, 3); ctx.fillRect(12, 3, 1, 3); ctx.fillRect(2, 10, 1, 3); ctx.fillRect(3, 11, 1, 3); },
  brick() { fill([150, 97, 83], 6, 301);
    ctx.fillStyle = '#c8c8c8';
    for (let y = 0; y < T; y += 4) { ctx.fillRect(0, y, T, 1);
      for (let x = (y % 8 === 0 ? 3 : 11); x < T; x += 8) ctx.fillRect(x, y, 1, 4); } },
  bookshelf() { painters.planks();
    rngState = 311;
    const cols = [[168, 60, 50], [60, 90, 170], [80, 150, 70], [200, 170, 60], [140, 80, 160]];
    for (const y0 of [2, 9]) { let x = 1;
      while (x < 15) { const w = 1 + (rnd() * 2 | 0), c = cols[rnd() * cols.length | 0];
        for (let xx = x; xx < Math.min(x + w, 15); xx++) for (let y = y0; y < y0 + 6; y++) px(xx, y, c[0] + rnd() * 20, c[1] + rnd() * 20, c[2]);
        x += w + 1; } } },
  tnt_side() { rngState = 321;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (y >= 5 && y <= 10) { px(x, y, y === 7 || y === 8 ? 240 : 228, 228, 228); continue; }
      const d = (rnd() - 0.5) * 24; px(x, y, 190 + d, 48 + d, 40 + d); }
    ctx.fillStyle = '#333';
    ctx.font = 'bold 6px monospace';
    ctx.fillText('TNT', 2, 10); },
  tnt_top() { fill([190, 48, 40], 16, 331);
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = '#333'; ctx.fillRect(7, 0, 2, 4); ctx.fillRect(7, 3, 2, 2); },
  tnt_bottom() { fill([160, 40, 34], 16, 341); },
  snow() { fill([240, 246, 250], 5, 351); speckle([228, 236, 244], 10, 352); },
  cactus_top() { fill([98, 160, 62], 8, 361); ctx.fillStyle = '#6f9c48'; ctx.fillRect(3,3,10,10); },
  cactus_side() { fill([72, 130, 44], 8, 371);
    ctx.fillStyle = 'rgba(50,100,30,0.8)';
    for (let y = 1; y < T; y += 4) { px(1, y, 40, 80, 24); px(14, y + 2, 40, 80, 24); px(5, y, 40, 80, 24); px(10, y + 2, 40, 80, 24); }
    ctx.fillStyle = 'rgba(36,72,20,0.7)'; ctx.fillRect(0, 0, 1, T); ctx.fillRect(15, 0, 1, T); },
  flower_red() { ctx.clearRect(0, 0, T, T);
    for (let y = 8; y < 15; y++) px(8, y, 45, 110, 30);
    px(6, 11, 45, 110, 30); px(7, 10, 45, 110, 30); px(10, 12, 45, 110, 30); px(9, 11, 45, 110, 30);
    ctx.fillStyle = '#d43a2f';
    ctx.fillRect(6, 3, 5, 4); ctx.fillRect(7, 2, 3, 6);
    px(8, 4, 250, 220, 90); px(8, 5, 250, 220, 90); },
  flower_yellow() { ctx.clearRect(0, 0, T, T);
    for (let y = 7; y < 14; y++) px(8, y, 45, 110, 30);
    px(6, 10, 45, 110, 30); px(7, 9, 45, 110, 30); px(10, 11, 45, 110, 30);
    ctx.fillStyle = '#f5d93a';
    ctx.fillRect(6, 3, 5, 4); ctx.fillRect(7, 2, 3, 6);
    px(8, 4, 200, 150, 30); px(8, 5, 200, 150, 30); },
  tall_grass() { ctx.clearRect(0, 0, T, T); rngState = 391;
    for (let i = 0; i < 9; i++) { const x = 2 + (rnd() * 12 | 0), h = 5 + (rnd() * 9 | 0), lean = rnd() < 0.5 ? -1 : 1;
      for (let y = 15; y > 15 - h; y--) { const xx = x + ((15 - y) > h / 2 ? lean : 0);
        shade(Math.max(0, Math.min(15, xx)), y, 96, 160, 60, 18, 393 + i * 7 + y); } } },
  dead_bush() { ctx.clearRect(0, 0, T, T); rngState = 401;
    for (let i = 0; i < 7; i++) { const x = 3 + (rnd() * 10 | 0), h = 4 + (rnd() * 8 | 0), lean = rnd() < 0.5 ? -1 : 1;
      for (let y = 15; y > 15 - h; y--) { const xx = x + ((15 - y) > h / 2 ? lean : 0);
        shade(Math.max(0, Math.min(15, xx)), y, 150, 110, 60, 16, 403 + i * 5 + y); } } },
  farmland() { fill([134, 96, 67], 10, 411);
    ctx.fillStyle = 'rgba(90,60,38,0.9)';
    for (let x = 1; x < T; x += 4) ctx.fillRect(x, 0, 2, T); },
  farmland_wet() { fill([96, 65, 46], 10, 421);
    ctx.fillStyle = 'rgba(60,40,26,0.95)';
    for (let x = 1; x < T; x += 4) ctx.fillRect(x, 0, 2, T); },
  wool() { rngState = 431;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = rnd(); shade(x, y, 235, 235, 232, 9, 433 + ((x / 2 | 0) + (y / 2 | 0)) * 3 + (v > 0.8 ? 20 : 0)); } },
  bedrock() { fill([70, 70, 70], 22, 441); speckle([40, 40, 40], 14, 442, 2); speckle([100, 100, 100], 10, 443, 2); },
  pumpkin_top() { fill([196, 122, 34], 8, 451);
    ctx.fillStyle = '#a8762c'; ctx.fillRect(6, 6, 4, 4); ctx.fillStyle = '#c49438'; ctx.fillRect(7, 7, 2, 2); },
  pumpkin_side() { fill([200, 126, 36], 7, 453);
    ctx.fillStyle = 'rgba(160,94,24,0.8)';
    for (let x = 2; x < T; x += 4) ctx.fillRect(x, 0, 1, T); },
  pumpkin_face() { painters.pumpkin_side();
    ctx.fillStyle = '#40250a';
    ctx.fillRect(3, 4, 3, 3); ctx.fillRect(10, 4, 3, 3);       // 三角眼
    ctx.fillRect(4, 5, 1, 1); ctx.fillRect(11, 5, 1, 1);
    ctx.fillRect(5, 9, 6, 3); ctx.fillRect(4, 10, 1, 1); ctx.fillRect(11, 10, 1, 1);
    ctx.fillStyle = '#f8e058'; ctx.fillRect(6, 10, 1, 1); ctx.fillRect(9, 10, 1, 1); },
  melon_top() { fill([108, 150, 38], 8, 461);
    ctx.fillStyle = 'rgba(80,120,28,0.8)'; for (let r = 2; r < 9; r += 3) { ctx.beginPath(); ctx.arc(8, 8, r, 0, 7); ctx.stroke(); } },
  melon_side() { fill([108, 150, 38], 9, 463);
    ctx.fillStyle = 'rgba(70,110,24,0.85)';
    for (let x = 1; x < T; x += 5) ctx.fillRect(x, 0, 2, T); },
  coal_block() { fill([35, 35, 38], 8, 471); speckle([15, 15, 18], 12, 472); speckle([60, 60, 64], 6, 473); },
  iron_block() { fill([220, 220, 220], 5, 481);
    ctx.fillStyle = 'rgba(190,190,190,0.8)'; ctx.fillRect(0,0,T,1); ctx.fillRect(0,15,T,1); ctx.fillRect(0,0,1,T); ctx.fillRect(15,0,1,T); },
  gold_block() { fill([250, 238, 105], 6, 491);
    ctx.fillStyle = 'rgba(220,200,80,0.8)'; ctx.fillRect(0,0,T,1); ctx.fillRect(0,15,T,1); ctx.fillRect(0,0,1,T); ctx.fillRect(15,0,1,T); },
  diamond_block() { fill([98, 230, 238], 6, 501);
    ctx.fillStyle = 'rgba(70,200,210,0.8)'; ctx.fillRect(0,0,T,1); ctx.fillRect(0,15,T,1); ctx.fillRect(0,0,1,T); ctx.fillRect(15,0,1,T);
    speckle([200, 255, 255], 5, 502); },
  hay_top() { fill([196, 176, 74], 8, 511);
    ctx.fillStyle = 'rgba(160,142,54,0.9)'; ctx.fillRect(0,0,T,1); ctx.fillRect(0,15,T,1);
    ctx.strokeStyle = 'rgba(160,142,54,0.9)'; ctx.beginPath(); ctx.arc(8, 8, 4, 0, 7); ctx.stroke(); },
  hay_side() { fill([188, 168, 66], 8, 521);
    ctx.fillStyle = 'rgba(150,132,48,0.85)';
    for (let y = 2; y < T; y += 5) ctx.fillRect(0, y, T, 1); },
  // ---- 小麦 8 阶段 ----
  ...(() => { const w = {};
    for (let s = 0; s <= 7; s++) w['wheat' + s] = () => {
      ctx.clearRect(0, 0, T, T); rngState = 531 + s;
      const h = Math.max(2, Math.round((s + 1) / 8 * 14));
      const cols = s < 6 ? [90, 165, 60] : s === 6 ? [170, 170, 70] : [214, 187, 90];
      for (let i = 0; i < 5; i++) { const x = 2 + i * 3, lean = (rnd() - 0.5) * 1.2;
        for (let y = 0; y < h; y++) {
          const xx = x + lean * (y / h);
          shade(xx | 0, 15 - y, cols[0], cols[1], cols[2], 14, 533 + i * 11 + y); }
        if (s >= 6) { // 麦穗
          const top = 15 - h, xx = (x + lean) | 0;
          px(xx, top, 230, 200, 100); px(xx + 1, top, 230, 200, 100); px(xx, top - 1, 240, 210, 110); } } };
    return w; })(),
};

function oreBlobs(c, n, seed) {
  rngState = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    const x = 1 + rnd() * 12 | 0, y = 1 + rnd() * 12 | 0;
    const w = 2 + (rnd() * 2 | 0), h = 2 + (rnd() * 2 | 0);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const d = (rnd() - 0.5) * 30;
      px(xx, yy, c[0] + d, c[1] + d, c[2] + d); } }
}

// ---------------- 物品图标（画在同一 atlas，供 UI/手持使用）----------------
function toolIcon(kind, headC, handleC = '#9a7b4f') {
  return () => {
    ctx.clearRect(0, 0, T, T);
    ctx.strokeStyle = handleC; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(11, 2); ctx.lineTo(4, 13); ctx.stroke(); // 柄
    ctx.fillStyle = headC;
    if (kind === 'pickaxe') { ctx.fillRect(2, 2, 12, 2); ctx.fillRect(2, 4, 2, 2); ctx.fillRect(12, 4, 2, 2); ctx.fillRect(4, 3, 2, 2); }
    if (kind === 'axe') { ctx.fillRect(6, 2, 5, 2); ctx.fillRect(4, 3, 4, 4); ctx.fillRect(8, 2, 3, 5); }
    if (kind === 'shovel') { ctx.fillRect(10, 1, 4, 4); ctx.fillRect(11, 5, 2, 2); }
    if (kind === 'hoe') { ctx.fillRect(6, 2, 6, 2); ctx.fillRect(6, 4, 2, 2); }
    if (kind === 'sword') { ctx.clearRect(0, 0, T, T);
      ctx.strokeStyle = headC; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(12, 3); ctx.lineTo(5, 10); ctx.stroke();
      ctx.strokeStyle = handleC;
      ctx.beginPath(); ctx.moveTo(3, 8); ctx.lineTo(8, 13); ctx.stroke();
      ctx.fillStyle = handleC; ctx.fillRect(4, 10, 3, 3); }
  };
}
const itemPainters = {
  stick() { ctx.clearRect(0, 0, T, T); ctx.strokeStyle = '#9a7b4f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(11, 3); ctx.lineTo(4, 13); ctx.stroke(); },
  coal() { ctx.clearRect(0, 0, T, T); rngState = 601;
    ctx.fillStyle = '#2e2e30';
    for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) if (rnd() > 0.25) { const d = (rnd() - 0.5) * 30; px(x, y, 46 + d, 46 + d, 50 + d); } },
  iron_ingot() { ingot('#d8d8d8', '#b0b0b0'); },
  gold_ingot() { ingot('#f8dc58', '#d8b830'); },
  diamond() { ctx.clearRect(0, 0, T, T);
    ctx.fillStyle = '#5de4ec';
    ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(13, 7); ctx.lineTo(8, 14); ctx.lineTo(3, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#aef4f8'; ctx.fillRect(6, 4, 2, 3); },
  bow() { ctx.clearRect(0, 0, T, T);
    ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(5, 8, 6, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(8, 14); ctx.stroke(); },
  arrow() { ctx.clearRect(0, 0, T, T);
    ctx.strokeStyle = '#9a7b4f'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(12, 4); ctx.lineTo(4, 12); ctx.stroke();
    ctx.fillStyle = '#ccc'; ctx.fillRect(11, 2, 3, 3);
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(2, 12, 3, 1); ctx.fillRect(3, 11, 1, 3); },
  seeds() { ctx.clearRect(0, 0, T, T); rngState = 611;
    ctx.fillStyle = '#a8c848';
    for (let i = 0; i < 7; i++) { const x = 4 + rnd() * 8, y = 5 + rnd() * 7;
      ctx.fillRect(x | 0, y | 0, 2, 1); } },
  wheat() { ctx.clearRect(0, 0, T, T);
    for (let i = 0; i < 4; i++) { const x = 3 + i * 3;
      ctx.fillStyle = '#d8b455'; ctx.fillRect(x, 3, 1, 10);
      ctx.fillStyle = '#e8cc78'; ctx.fillRect(x - 1, 2, 3, 4); }
    ctx.fillStyle = '#b89a40'; ctx.fillRect(2, 13, 12, 1); },
  bread() { ctx.clearRect(0, 0, T, T);
    ctx.fillStyle = '#c89838'; ctx.beginPath(); ctx.ellipse(8, 8, 6, 4, -0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8bc60'; ctx.fillRect(4, 5, 3, 2); ctx.fillRect(8, 7, 3, 2); ctx.fillRect(6, 9, 3, 2); },
  apple() { ctx.clearRect(0, 0, T, T);
    ctx.fillStyle = '#d43a2f'; ctx.beginPath(); ctx.arc(8, 9, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#f06a60'; ctx.fillRect(6, 6, 2, 2);
    ctx.fillStyle = '#6b4a24'; ctx.fillRect(8, 2, 1, 3);
    ctx.fillStyle = '#4a8c2c'; ctx.fillRect(9, 3, 3, 2); },
  pork_raw() { meat('#f0a0a8', '#e87880'); },
  pork_cooked() { meat('#c88850', '#a86030'); },
  beef_raw() { meat('#c85860', '#a83848'); },
  beef_cooked() { meat('#8a5430', '#6a3a20'); },
  mutton_raw() { meat('#e89090', '#d06868'); },
  mutton_cooked() { meat('#b87840', '#905028'); },
  chicken_raw() { meat('#f0c8b0', '#e0a888'); },
  chicken_cooked() { meat('#d09858', '#b07838'); },
  rotten_flesh() { ctx.clearRect(0, 0, T, T); rngState = 621;
    ctx.fillStyle = '#8a5838';
    for (let i = 0; i < 6; i++) { const x = 3 + rnd() * 7, y = 4 + rnd() * 7;
      ctx.fillRect(x | 0, y | 0, 3 + (rnd() * 3 | 0), 3); }
    ctx.fillStyle = '#5a9c48'; ctx.fillRect(6, 8, 2, 2); ctx.fillRect(10, 6, 2, 2); },
  leather() { ctx.clearRect(0, 0, T, T);
    ctx.fillStyle = '#9a6a3a'; ctx.beginPath();
    ctx.moveTo(3, 4); ctx.lineTo(13, 3); ctx.lineTo(14, 12); ctx.lineTo(4, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a5028'; ctx.fillRect(5, 6, 3, 1); ctx.fillRect(9, 9, 3, 1); },
  feather() { ctx.clearRect(0, 0, T, T);
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(12, 3); ctx.lineTo(4, 13); ctx.stroke();
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath(); ctx.ellipse(8, 6, 2, 4, -0.7, 0, 7); ctx.fill(); },
  bone() { ctx.clearRect(0, 0, T, T);
    ctx.strokeStyle = '#ece8d8'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(11, 4); ctx.lineTo(5, 11); ctx.stroke();
    ctx.fillStyle = '#ece8d8';
    ctx.fillRect(10, 2, 3, 3); ctx.fillRect(3, 10, 3, 3); },
  bonemeal() { ctx.clearRect(0, 0, T, T); rngState = 631;
    ctx.fillStyle = '#e8e4d4';
    for (let i = 0; i < 9; i++) { const x = 3 + rnd() * 9, y = 3 + rnd() * 9;
      ctx.fillRect(x | 0, y | 0, 2, 2); } },
  gunpowder() { ctx.clearRect(0, 0, T, T); rngState = 641;
    ctx.fillStyle = '#5a5a5e';
    for (let i = 0; i < 12; i++) { const x = 3 + rnd() * 9, y = 3 + rnd() * 9;
      ctx.fillRect(x | 0, y | 0, 2, 2); } },
  string() { ctx.clearRect(0, 0, T, T);
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(4, 2);
    ctx.bezierCurveTo(12, 5, 3, 10, 11, 14); ctx.stroke(); },
  egg() { ctx.clearRect(0, 0, T, T);
    ctx.fillStyle = '#ece8d8'; ctx.beginPath(); ctx.ellipse(8, 9, 4, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f8f4e8'; ctx.fillRect(6, 5, 2, 2); },
  charcoal() { rngState = 601;
    ctx.fillStyle = '#2e2e30';
    for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) if (rnd() > 0.25) { const d = (rnd() - 0.5) * 30; px(x, y, 46 + d, 46 + d, 50 + d); } },
};
function ingot(a, b) {
  ctx.clearRect(0, 0, T, T);
  ctx.fillStyle = b; ctx.beginPath();
  ctx.moveTo(3, 10); ctx.lineTo(5, 6); ctx.lineTo(13, 6); ctx.lineTo(15, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = a; ctx.beginPath();
  ctx.moveTo(4, 9); ctx.lineTo(6, 6); ctx.lineTo(12, 6); ctx.lineTo(14, 9); ctx.closePath(); ctx.fill();
}
function meat(a, b) {
  ctx.clearRect(0, 0, T, T);
  ctx.fillStyle = b; ctx.beginPath();
  ctx.moveTo(3, 5); ctx.lineTo(13, 4); ctx.lineTo(14, 11); ctx.lineTo(5, 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = a; ctx.beginPath();
  ctx.moveTo(4, 6); ctx.lineTo(12, 5); ctx.lineTo(13, 10); ctx.lineTo(6, 11); ctx.closePath(); ctx.fill();
}

// 工具五档
const tiers = [
  ['wood', '#a8834f'], ['stone', '#8a8a8a'], ['iron', '#d8d8d8'], ['gold', '#f8dc58'], ['diamond', '#5de4ec'],
];
for (const [tn, tc] of tiers) for (const kind of ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']) {
  itemPainters[tn + '_' + kind] = toolIcon(kind, tc);
}

// ---------------- 构建图集 ----------------
import * as THREE from '../vendor/three.module.js';

let atlasTex = null, uvMap = {};

export function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * T; canvas.height = ROWS * T;
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let idx = 0;
  const paint = (name, fn) => {
    const cx = (idx % COLS) * T, cy = ((idx / COLS) | 0) * T;
    ctx.save(); ctx.translate(cx, cy);
    // 每个瓦片先透明清底
    ctx.clearRect(-0, -0, T, T);
    fn();
    ctx.restore();
    // UV（含半像素内缩防渗色）——flipY=true 常规纹理坐标
    const u0 = (cx + 0.02) / canvas.width, u1 = (cx + T - 0.02) / canvas.width;
    const v1 = 1 - (cy + 0.02) / canvas.height, v0 = 1 - (cy + T - 0.02) / canvas.height;
    uvMap[name] = [u0, v0, u1, v1];
    idx++;
  };
  for (const [name, fn] of Object.entries(painters)) paint(name, fn);
  for (const [name, fn] of Object.entries(itemPainters)) paint('i_' + name, fn);

  atlasTex = new THREE.CanvasTexture(canvas);
  atlasTex.magFilter = THREE.NearestFilter;
  atlasTex.minFilter = THREE.NearestFilter;
  atlasTex.generateMipmaps = false;
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  return atlasTex;
}

// 获取瓦片 UV（块面用），返回 [u0,v0,u1,v1]
export function tileUV(name) {
  if (!uvMap[name]) name = 'stone';
  return uvMap[name];
}
export function hasTile(name) { return !!uvMap[name]; }
export { itemPainters };

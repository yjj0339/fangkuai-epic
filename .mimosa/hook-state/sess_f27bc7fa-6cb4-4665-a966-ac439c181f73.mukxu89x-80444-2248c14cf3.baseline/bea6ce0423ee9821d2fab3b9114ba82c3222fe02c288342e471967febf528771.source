// 存档：localStorage，RLE+稀疏差异
const KEY = 'fke_save_v1';

export function saveGame(game) {
  try {
    const w = game.world, p = game.player;
    const chunks = {};
    for (const [ck, ed] of w.edits) {
      if (!ed.size) continue;
      const arr = [];
      for (const [i, id] of ed) arr.push(i, id);
      chunks[ck] = arr;
    }
    const containers = {};
    for (const [k, c] of w.containers) {
      containers[k] = { type: c.type, slots: c.slots, fuel: c.fuel, fuelMax: c.fuelMax, prog: c.prog, cook: c.cook };
    }
    const data = {
      v: 1, seed: w.seed, time: game.sky.time, weather: game.sky.weather,
      player: { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, hp: p.hp, hunger: p.hunger, air: p.air, spawn: p.spawn },
      inv: game.inv.slots, sel: game.inv.sel,
      chunks, containers,
      achievements: game.achievements || [],
    };
    const json = JSON.stringify(data);
    localStorage.setItem(KEY, json);
    return json.length;
  } catch (e) {
    console.warn('save failed', e);
    return -1;
  }
}

export function loadGame() {
  try {
    const json = localStorage.getItem(KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) { return null; }
}
export function clearSave() { localStorage.removeItem(KEY); }
export function hasSave() { return !!localStorage.getItem(KEY); }

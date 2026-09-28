// 物品 >=100 与合成/熔炼配方
import { B } from './blocks.js';

export const I = {
  STICK: 100, COAL: 101, IRON_INGOT: 102, GOLD_INGOT: 103, DIAMOND: 104,
  CHARCOAL: 105,
  W_PICK: 110, S_PICK: 111, I_PICK: 112, G_PICK: 113, D_PICK: 114,
  W_AXE: 115, S_AXE: 116, I_AXE: 117, G_AXE: 118, D_AXE: 119,
  W_SHOVEL: 120, S_SHOVEL: 121, I_SHOVEL: 122, G_SHOVEL: 123, D_SHOVEL: 124,
  W_HOE: 125, S_HOE: 126, I_HOE: 127, G_HOE: 128, D_HOE: 129,
  W_SWORD: 130, S_SWORD: 131, I_SWORD: 132, G_SWORD: 133, D_SWORD: 134,
  BOW: 140, ARROW: 141, STRING: 142,
  SEEDS: 150, WHEAT: 151, BREAD: 152, APPLE: 153,
  PORK_RAW: 154, PORK_COOKED: 155, BEEF_RAW: 156, BEEF_COOKED: 157,
  MUTTON_RAW: 158, MUTTON_COOKED: 159, CHICKEN_RAW: 160, CHICKEN_COOKED: 161,
  ROTTEN: 162, LEATHER: 163, FEATHER: 164, BONE: 165, BONEMEAL: 166,
  GUNPOWDER: 167, EGG: 168,
};

// name/icon/tier(0木1石2铁3金4钻)/tool 类型/dur 耐久/speed 挖掘倍率/dmg 攻击
const ITEMS = {};
const item = (id, name, o = {}) => ITEMS[id] = Object.assign({ id, name, stack: 64, food: 0 }, o);
const tool = (id, name, toolType, tier, dur, speed, dmg) =>
  item(id, name, { tool: toolType, tier, dur, speed, dmg, stack: 1 });

item(I.STICK, '木棍');
item(I.COAL, '煤炭', { fuel: 80 });
item(I.IRON_INGOT, '铁锭');
item(I.GOLD_INGOT, '金锭');
item(I.DIAMOND, '钻石');
item(I.CHARCOAL, '木炭', { fuel: 80 });

tool(I.W_PICK, '木镐', 'pickaxe', 1, 60, 2, 2);
tool(I.S_PICK, '石镐', 'pickaxe', 2, 132, 4, 3);
tool(I.I_PICK, '铁镐', 'pickaxe', 3, 251, 6, 4);
tool(I.G_PICK, '金镐', 'pickaxe', 1, 33, 10, 2);
tool(I.D_PICK, '钻石镐', 'pickaxe', 4, 1562, 8, 5);
tool(I.W_AXE, '木斧', 'axe', 1, 60, 2, 3);
tool(I.S_AXE, '石斧', 'axe', 2, 132, 4, 4);
tool(I.I_AXE, '铁斧', 'axe', 3, 251, 6, 5);
tool(I.G_AXE, '金斧', 'axe', 1, 33, 10, 3);
tool(I.D_AXE, '钻石斧', 'axe', 4, 1562, 8, 6);
tool(I.W_SHOVEL, '木锹', 'shovel', 1, 60, 2, 1);
tool(I.S_SHOVEL, '石锹', 'shovel', 2, 132, 4, 2);
tool(I.I_SHOVEL, '铁锹', 'shovel', 3, 251, 6, 3);
tool(I.G_SHOVEL, '金锹', 'shovel', 1, 33, 10, 1);
tool(I.D_SHOVEL, '钻石锹', 'shovel', 4, 1562, 8, 4);
tool(I.W_HOE, '木锄', 'hoe', 1, 60, 1, 1);
tool(I.S_HOE, '石锄', 'hoe', 2, 132, 1, 1);
tool(I.I_HOE, '铁锄', 'hoe', 3, 251, 1, 1);
tool(I.G_HOE, '金锄', 'hoe', 1, 33, 1, 1);
tool(I.D_HOE, '钻石锄', 'hoe', 4, 1562, 1, 1);
tool(I.W_SWORD, '木剑', 'sword', 1, 60, 1, 4);
tool(I.S_SWORD, '石剑', 'sword', 2, 132, 1, 5);
tool(I.I_SWORD, '铁剑', 'sword', 3, 251, 1, 6);
tool(I.G_SWORD, '金剑', 'sword', 1, 33, 1, 4);
tool(I.D_SWORD, '钻石剑', 'sword', 4, 1562, 1, 7);

item(I.BOW, '弓', { stack: 1, dur: 385, bow: true });
item(I.ARROW, '箭');
item(I.STRING, '线');
item(I.SEEDS, '小麦种子', { plant: B.WHEAT0 });
item(I.WHEAT, '小麦');
item(I.BREAD, '面包', { food: 5 });
item(I.APPLE, '苹果', { food: 4 });
item(I.PORK_RAW, '生猪排', { food: 3 });
item(I.PORK_COOKED, '熟猪排', { food: 8 });
item(I.BEEF_RAW, '生牛肉', { food: 3 });
item(I.BEEF_COOKED, '牛排', { food: 8 });
item(I.MUTTON_RAW, '生羊肉', { food: 2 });
item(I.MUTTON_COOKED, '熟羊肉', { food: 6 });
item(I.CHICKEN_RAW, '生鸡肉', { food: 2 });
item(I.CHICKEN_COOKED, '烤鸡', { food: 6 });
item(I.ROTTEN, '腐肉', { food: 4, poison: 0.5 });
item(I.LEATHER, '皮革');
item(I.FEATHER, '羽毛');
item(I.BONE, '骨头');
item(I.BONEMEAL, '骨粉', { bonemeal: true });
item(I.GUNPOWDER, '火药');
item(I.EGG, '鸡蛋');

export function itemInfo(id) { return ITEMS[id] || null; }
export const allItems = ITEMS;

// 木/石/铁/金/钻 材质 -> 物品 id 映射
const TIER_ITEM = {
  wood: { mat: B.PLANKS, pick: I.W_PICK, axe: I.W_AXE, shovel: I.W_SHOVEL, hoe: I.W_HOE, sword: I.W_SWORD },
  stone: { mat: B.COBBLE, pick: I.S_PICK, axe: I.S_AXE, shovel: I.S_SHOVEL, hoe: I.S_HOE, sword: I.S_SWORD },
  iron: { mat: I.IRON_INGOT, pick: I.I_PICK, axe: I.I_AXE, shovel: I.I_SHOVEL, hoe: I.I_HOE, sword: I.I_SWORD },
  gold: { mat: I.GOLD_INGOT, pick: I.G_PICK, axe: I.G_AXE, shovel: I.G_SHOVEL, hoe: I.G_HOE, sword: I.G_SWORD },
  diamond: { mat: I.DIAMOND, pick: I.D_PICK, axe: I.D_AXE, shovel: I.D_SHOVEL, hoe: I.D_HOE, sword: I.D_SWORD },
};

// 合成配方：out, n, shape(行字符串数组，' ' 空) 或 shapeless(物品列表)
export const RECIPES = [];
const R = (out, n, shape) => RECIPES.push({ out, n, shape });
const RS = (out, n, items) => RECIPES.push({ out, n, shapeless: items });

RS(B.PLANKS, 4, [B.LOG]);
RS(B.PLANKS, 4, [B.SPRUCE_LOG]);
RS(I.STICK, 4, [B.PLANKS, B.PLANKS]);
RS(B.CRAFTING, 1, [B.PLANKS, B.PLANKS, B.PLANKS, B.PLANKS]);
R(B.TORCH, 4, ['C', 'S']); RS(B.TORCH, 4, [I.CHARCOAL, I.STICK]);
R(B.CHEST, 1, ['PPP', 'P P', 'PPP']);
R(B.FURNACE, 1, ['CCC', 'C C', 'CCC']);
R(B.BED, 1, ['WWW', 'PPP']);
R(B.TNT, 1, ['GSG', 'SGS', 'GSG']);
R(I.BREAD, 1, ['WWW']);
R(B.STONE_BRICKS, 4, ['SS', 'SS']);
R(B.BRICK, 1, ['SS', 'SS']);
R(B.SANDSTONE, 1, ['SS', 'SS']);
R(B.BOOKSHELF, 1, ['PPP', 'WWW', 'PPP']); // 简化：木板+羊毛
R(B.HAY, 1, ['WWW']); // 9 麦简化 3 麦
R(B.COAL_BLOCK, 1, ['CCC', 'CCC', 'CCC']);
R(B.IRON_BLOCK, 1, ['III', 'III', 'III']);
R(B.GOLD_BLOCK, 1, ['GGG', 'GGG', 'GGG']);
R(B.DIAMOND_BLOCK, 1, ['DDD', 'DDD', 'DDD']);
R(I.ARROW, 4, ['Q', 'S', 'F']);
R(I.BOW, 1, [' SI', 'S I', ' SI']);
RS(I.BONEMEAL, 3, [I.BONE]);
R(B.WOOL, 1, ['SS', 'SS']); // 4 线 -> 羊毛
R(B.LADDERLESS, 0, []);

// 符号表（每个配方生成时绑定）
const KEY = { C: I.COAL, S: I.STICK, P: B.PLANKS, W: I.WHEAT, G: I.GUNPOWDER, I: null, Q: B.GRAVEL, F: I.FEATHER, D: I.DIAMOND };
// 上面部分配方用 W/G/Q/S 等符号，逐个补映射
RECIPES.find(r => r.out === B.TNT).key = { G: I.GUNPOWDER, S: B.SAND };
RECIPES.find(r => r.out === I.BREAD).key = { W: I.WHEAT };
RECIPES.find(r => r.out === B.HAY).key = { W: I.WHEAT };
RECIPES.find(r => r.out === I.ARROW).key = { Q: B.GRAVEL, S: I.STICK, F: I.FEATHER };
RECIPES.find(r => r.out === I.BOW).key = { S: I.STICK, I: I.STRING };
RECIPES.find(r => r.out === B.BED).key = { W: B.WOOL, P: B.PLANKS };
RECIPES.find(r => r.out === B.CHEST).key = { P: B.PLANKS };
RECIPES.find(r => r.out === B.FURNACE).key = { C: B.COBBLE };
RECIPES.find(r => r.out === B.STONE_BRICKS).key = { S: B.STONE };
RECIPES.find(r => r.out === B.BRICK).key = { S: B.SAND };   // 简化：4 沙=砖块
RECIPES.find(r => r.out === B.SANDSTONE).key = { S: B.SAND };
RECIPES.find(r => r.out === B.BOOKSHELF).key = { P: B.PLANKS, W: B.WOOL };
RECIPES.find(r => r.out === B.COAL_BLOCK).key = { C: I.COAL };
RECIPES.find(r => r.out === B.IRON_BLOCK).key = { I: I.IRON_INGOT };
RECIPES.find(r => r.out === B.GOLD_BLOCK).key = { G: I.GOLD_INGOT };
RECIPES.find(r => r.out === B.DIAMOND_BLOCK).key = { D: I.DIAMOND };
RECIPES.find(r => r.out === B.WOOL).key = { S: I.STRING };
RECIPES.find(r => r.out === B.TORCH && r.shape).key = { C: I.COAL, S: I.STICK };
// 删除占位
RECIPES.splice(RECIPES.findIndex(r => r.out === B.LADDERLESS && r.n === 0), 1);

// 工具配方（key 按材质）
for (const t of Object.values(TIER_ITEM)) {
  RECIPES.push({ out: t.pick, n: 1, shape: ['MMM', ' S ', ' S '], key: { M: t.mat, S: I.STICK } });
  RECIPES.push({ out: t.axe, n: 1, shape: ['MM', 'MS', ' S'], key: { M: t.mat, S: I.STICK } });
  RECIPES.push({ out: t.shovel, n: 1, shape: ['M', 'S', 'S'], key: { M: t.mat, S: I.STICK } });
  RECIPES.push({ out: t.hoe, n: 1, shape: ['MM', ' S', ' S'], key: { M: t.mat, S: I.STICK } });
  RECIPES.push({ out: t.sword, n: 1, shape: ['M', 'M', 'S'], key: { M: t.mat, S: I.STICK } });
}

// 熔炼：原料 -> 产物（秒数默认 10）
export const SMELT = {
  [B.IRON_ORE]: { out: I.IRON_INGOT },
  [B.GOLD_ORE]: { out: I.GOLD_INGOT },
  [B.SAND]: { out: B.GLASS },
  [B.COBBLE]: { out: B.STONE },
  [I.PORK_RAW]: { out: I.PORK_COOKED },
  [I.BEEF_RAW]: { out: I.BEEF_COOKED },
  [I.MUTTON_RAW]: { out: I.MUTTON_COOKED },
  [I.CHICKEN_RAW]: { out: I.CHICKEN_COOKED },
  [B.LOG]: { out: I.CHARCOAL },
  [B.SPRUCE_LOG]: { out: I.CHARCOAL },
};
export function fuelTime(id) {
  const it = ITEMS[id];
  if (it && it.fuel) return it.fuel;
  if (id === B.PLANKS || id === B.LOG || id === B.SPRUCE_LOG || id === B.CRAFTING) return 15;
  if (id === I.STICK) return 5;
  return 0;
}

// 图标名（atlas 里 item 图标 tile 名）
export function iconOf(id) {
  if (id >= 100) {
    const it = ITEMS[id];
    const map = { [I.STICK]: 'stick', [I.COAL]: 'coal', [I.IRON_INGOT]: 'iron_ingot', [I.GOLD_INGOT]: 'gold_ingot', [I.DIAMOND]: 'diamond', [I.CHARCOAL]: 'charcoal',
      [I.BOW]: 'bow', [I.ARROW]: 'arrow', [I.STRING]: 'string', [I.SEEDS]: 'seeds', [I.WHEAT]: 'wheat', [I.BREAD]: 'bread', [I.APPLE]: 'apple',
      [I.PORK_RAW]: 'pork_raw', [I.PORK_COOKED]: 'pork_cooked', [I.BEEF_RAW]: 'beef_raw', [I.BEEF_COOKED]: 'beef_cooked',
      [I.MUTTON_RAW]: 'mutton_raw', [I.MUTTON_COOKED]: 'mutton_cooked', [I.CHICKEN_RAW]: 'chicken_raw', [I.CHICKEN_COOKED]: 'chicken_cooked',
      [I.ROTTEN]: 'rotten_flesh', [I.LEATHER]: 'leather', [I.FEATHER]: 'feather', [I.BONE]: 'bone', [I.BONEMEAL]: 'bonemeal',
      [I.GUNPOWDER]: 'gunpowder', [I.EGG]: 'egg' };
    if (map[id]) return 'i_' + map[id];
    if (it && it.tool) {
      const tn = ['wood', 'stone', 'iron', 'gold', 'diamond'][it.tier - 1] || 'wood';
      return 'i_' + tn + '_' + it.tool;
    }
    return 'i_stick';
  }
  return null; // 方块用自身 tiles
}
export function nameOf(id) {
  if (id >= 100) return ITEMS[id] ? ITEMS[id].name : '???';
  const b = BLOCKS_NAME[id];
  return b || '???';
}
import { BLOCKS as BLOCKS_NAME } from './blocks.js';

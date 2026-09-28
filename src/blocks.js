// 方块注册表。id: 1..99 方块（0=空气）；物品 >=100 见 items.js
// tiles: [top, bottom, side] 或单值或 [top,bottom,north,south,west,east]
// tool: 最快工具; tier: 需要的最低挖掘等级(0手 1木 2石 3铁 4钻); hard: 秒基准
// drop: 掉落物品id(默认自身) 或函数; light: 发光等级; solid: 参与碰撞

export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, SAND: 5, GRAVEL: 6,
  LOG: 7, LEAVES: 8, PLANKS: 9, CRAFTING: 10, FURNACE: 11, FURNACE_LIT: 12,
  CHEST: 13, BED: 14, TORCH: 15, WATER: 16, COAL_ORE: 17, IRON_ORE: 18,
  GOLD_ORE: 19, DIAMOND_ORE: 20, GLASS: 21, BRICK: 22, BOOKSHELF: 23,
  TNT: 24, SNOW: 25, SNOWY_GRASS: 26, CACTUS: 27, SPRUCE_LOG: 28,
  SPRUCE_LEAVES: 29, FLOWER_RED: 30, FLOWER_YELLOW: 31, TALL_GRASS: 32,
  FARMLAND: 33, FARMLAND_WET: 34,
  WHEAT0: 35, WHEAT1: 36, WHEAT2: 37, WHEAT3: 38, WHEAT4: 39, WHEAT5: 40, WHEAT6: 41, WHEAT7: 42,
  SANDSTONE: 43, WOOL: 44, BEDROCK: 45, ICE: 46, STONE_BRICKS: 47,
  MOSSY_COBBLE: 48, SNOW_LAYER: 49, DEAD_BUSH: 50, PUMPKIN: 51, MELON: 52,
  COAL_BLOCK: 53, IRON_BLOCK: 54, GOLD_BLOCK: 55, DIAMOND_BLOCK: 56, HAY: 57,
};

// 形状: 'cube' 整块 | 'cross' 交叉面(植物) | 'torch' 火把 | 'slab8' 半高 | 'bed'
const def = (id, name, o) => Object.assign(
  { id, name, tiles: null, hard: 1, tool: null, tier: 0, light: 0,
    solid: true, opaque: true, shape: 'cube', drop: undefined, transparent: false,
    sound: 'stone' }, o);

export const BLOCKS = {};
const reg = d => BLOCKS[d.id] = d;

// 空气：id 0 也要有完整定义（blockInfo 兜底依赖它）。
// 注意 transparent 必须为 false：initChunkLight 的列灌注把"transparent 且非 cutout"视为挡光（如冰/水），空气绝不能减光
reg(def(B.AIR, '空气', { tiles: null, hard: 0, solid: false, opaque: false, transparent: false, drop: null }));

reg(def(B.GRASS, '草方块', { tiles: ['grass_top', 'dirt', 'grass_side'], hard: 0.6, tool: 'shovel', drop: B.DIRT, sound: 'grass' }));
reg(def(B.DIRT, '泥土', { tiles: 'dirt', hard: 0.5, tool: 'shovel', sound: 'grass' }));
reg(def(B.STONE, '石头', { tiles: 'stone', hard: 1.5, tool: 'pickaxe', tier: 1, drop: B.COBBLE }));
reg(def(B.COBBLE, '圆石', { tiles: 'cobble', hard: 2.0, tool: 'pickaxe', tier: 1 }));
reg(def(B.SAND, '沙子', { tiles: 'sand', hard: 0.5, tool: 'shovel', gravity: true, sound: 'sand' }));
reg(def(B.GRAVEL, '沙砾', { tiles: 'gravel', hard: 0.6, tool: 'shovel', gravity: true, sound: 'sand' }));
reg(def(B.LOG, '橡木原木', { tiles: ['log_top', 'log_top', 'log'], hard: 2.0, tool: 'axe', flammable: true, sound: 'wood' }));
reg(def(B.LEAVES, '橡树树叶', { tiles: 'leaves', hard: 0.2, opaque: false, transparent: true, drop: null, sound: 'grass', cutout: true, chanceDrop: { id: B.LEAVES, p: 0.05 }, appleDrop: 0.03 }));
reg(def(B.PLANKS, '橡木木板', { tiles: 'planks', hard: 2.0, tool: 'axe', flammable: true, sound: 'wood' }));
reg(def(B.CRAFTING, '工作台', { tiles: ['crafting_top', 'planks', 'crafting_side'], hard: 2.5, tool: 'axe', interact: 'crafting', sound: 'wood' }));
reg(def(B.FURNACE, '熔炉', { tiles: ['furnace_top', 'furnace_top', 'furnace_side', 'furnace_side', 'furnace_front', 'furnace_side'], hard: 3.5, tool: 'pickaxe', tier: 1, interact: 'furnace', drop: B.FURNACE }));
reg(def(B.FURNACE_LIT, '燃烧的熔炉', { tiles: ['furnace_top', 'furnace_top', 'furnace_side', 'furnace_side', 'furnace_front_lit', 'furnace_side'], hard: 3.5, tool: 'pickaxe', tier: 1, interact: 'furnace', drop: B.FURNACE, light: 13 }));
reg(def(B.CHEST, '箱子', { tiles: ['chest_top', 'chest_top', 'chest_side', 'chest_side', 'chest_front', 'chest_side'], hard: 2.5, tool: 'axe', interact: 'chest', sound: 'wood' }));
reg(def(B.BED, '床', { tiles: ['bed_top', 'planks', 'bed_side'], hard: 0.2, shape: 'bed', solid: true, opaque: false, transparent: false, interact: 'bed', sound: 'wood' }));
reg(def(B.TORCH, '火把', { tiles: 'torch', hard: 0.05, shape: 'torch', solid: false, opaque: false, transparent: true, light: 14, cutout: true, sound: 'wood' }));
reg(def(B.WATER, '水', { tiles: 'water', hard: 999, solid: false, opaque: false, transparent: true, liquid: true, drop: null }));
reg(def(B.COAL_ORE, '煤矿石', { tiles: 'coal_ore', hard: 3.0, tool: 'pickaxe', tier: 1, drop: 101, xp: 1 }));
reg(def(B.IRON_ORE, '铁矿石', { tiles: 'iron_ore', hard: 3.0, tool: 'pickaxe', tier: 2 }));
reg(def(B.GOLD_ORE, '金矿石', { tiles: 'gold_ore', hard: 3.0, tool: 'pickaxe', tier: 3 }));
reg(def(B.DIAMOND_ORE, '钻石矿石', { tiles: 'diamond_ore', hard: 3.0, tool: 'pickaxe', tier: 3, drop: 104, xp: 4 }));
reg(def(B.GLASS, '玻璃', { tiles: 'glass', hard: 0.3, opaque: false, transparent: true, drop: null, cutout: true }));
reg(def(B.BRICK, '砖块', { tiles: 'brick', hard: 2.0, tool: 'pickaxe', tier: 1 }));
reg(def(B.BOOKSHELF, '书架', { tiles: ['bookshelf_top', 'bookshelf_top', 'bookshelf'], hard: 1.5, tool: 'axe', flammable: true, sound: 'wood' }));
reg(def(B.TNT, 'TNT', { tiles: ['tnt_top', 'tnt_bottom', 'tnt_side'], hard: 0.05, interact: 'tnt', sound: 'grass' }));
reg(def(B.SNOW, '雪块', { tiles: 'snow', hard: 0.2, tool: 'shovel', sound: 'snow' }));
reg(def(B.SNOWY_GRASS, '积雪草方块', { tiles: ['snow', 'dirt', 'snowy_side'], hard: 0.6, tool: 'shovel', drop: B.DIRT, sound: 'snow' }));
reg(def(B.CACTUS, '仙人掌', { tiles: ['cactus_top', 'cactus_top', 'cactus_side'], hard: 0.4, opaque: false, transparent: true, cutout: true, damage: 1, sound: 'wood' }));
reg(def(B.SPRUCE_LOG, '云杉原木', { tiles: ['spruce_top', 'spruce_top', 'spruce_log'], hard: 2.0, tool: 'axe', sound: 'wood' }));
reg(def(B.SPRUCE_LEAVES, '云杉树叶', { tiles: 'spruce_leaves', hard: 0.2, opaque: false, transparent: true, drop: null, cutout: true, sound: 'grass', chanceDrop: { id: B.SPRUCE_LEAVES, p: 0.05 } }));
reg(def(B.FLOWER_RED, '虞美人', { tiles: 'flower_red', hard: 0.05, shape: 'cross', solid: false, opaque: false, transparent: true, cutout: true, sound: 'grass' }));
reg(def(B.FLOWER_YELLOW, '蒲公英', { tiles: 'flower_yellow', hard: 0.05, shape: 'cross', solid: false, opaque: false, transparent: true, cutout: true, sound: 'grass' }));
reg(def(B.TALL_GRASS, '草丛', { tiles: 'tall_grass', hard: 0.05, shape: 'cross', solid: false, opaque: false, transparent: true, cutout: true, drop: 129, dropChance: 0.4, sound: 'grass' }));
reg(def(B.FARMLAND, '农田', { tiles: ['farmland', 'dirt', 'dirt'], hard: 0.6, tool: 'shovel', drop: B.DIRT, shape: 'farmland', opaque: true, sound: 'grass' }));
reg(def(B.FARMLAND_WET, '湿润农田', { tiles: ['farmland_wet', 'dirt', 'dirt'], hard: 0.6, tool: 'shovel', drop: B.DIRT, shape: 'farmland', opaque: true, sound: 'grass' }));
for (let i = 0; i <= 7; i++) {
  reg(def(B.WHEAT0 + i, '小麦' + (i + 1) + '/8', { tiles: 'wheat' + i, hard: 0.05, shape: 'crop', solid: false, opaque: false, transparent: true, cutout: true, stage: i, sound: 'grass' }));
}
reg(def(B.SANDSTONE, '砂岩', { tiles: ['sandstone_top', 'sandstone_top', 'sandstone'], hard: 0.8, tool: 'pickaxe', tier: 1 }));
reg(def(B.WOOL, '羊毛', { tiles: 'wool', hard: 0.8, flammable: true, sound: 'wool' }));
reg(def(B.BEDROCK, '基岩', { tiles: 'bedrock', hard: Infinity }));
reg(def(B.ICE, '冰', { tiles: 'ice', hard: 0.5, tool: 'pickaxe', opaque: false, transparent: true, slippery: true, drop: null }));
reg(def(B.STONE_BRICKS, '石砖', { tiles: 'stone_bricks', hard: 1.5, tool: 'pickaxe', tier: 1 }));
reg(def(B.MOSSY_COBBLE, '苔石', { tiles: 'mossy', hard: 2.0, tool: 'pickaxe', tier: 1 }));
reg(def(B.SNOW_LAYER, '雪片', { tiles: 'snow', hard: 0.1, tool: 'shovel', shape: 'snow4', opaque: false, transparent: false, drop: B.SNOW, cutout: false, sound: 'snow' }));
reg(def(B.DEAD_BUSH, '枯灌木', { tiles: 'dead_bush', hard: 0.05, shape: 'cross', solid: false, opaque: false, transparent: true, cutout: true, drop: 100, sound: 'grass' }));
reg(def(B.PUMPKIN, '南瓜', { tiles: ['pumpkin_top', 'pumpkin_top', 'pumpkin_side', 'pumpkin_side', 'pumpkin_face', 'pumpkin_side'], hard: 1.0, tool: 'axe', sound: 'wood' }));
reg(def(B.MELON, '西瓜', { tiles: ['melon_top', 'melon_top', 'melon_side'], hard: 1.0, tool: 'axe', sound: 'wood' }));
reg(def(B.COAL_BLOCK, '煤炭块', { tiles: 'coal_block', hard: 5, tool: 'pickaxe', tier: 1 }));
reg(def(B.IRON_BLOCK, '铁块', { tiles: 'iron_block', hard: 5, tool: 'pickaxe', tier: 2 }));
reg(def(B.GOLD_BLOCK, '金块', { tiles: 'gold_block', hard: 3, tool: 'pickaxe', tier: 3 }));
reg(def(B.DIAMOND_BLOCK, '钻石块', { tiles: 'diamond_block', hard: 5, tool: 'pickaxe', tier: 3 }));
reg(def(B.HAY, '干草块', { tiles: ['hay_top', 'hay_top', 'hay_side'], hard: 0.5, flammable: true, sound: 'grass' }));

export function blockInfo(id) { return BLOCKS[id] || BLOCKS[0]; }
export function isOpaque(id) { const b = BLOCKS[id]; return b ? b.opaque : false; }
export function isSolid(id) { const b = BLOCKS[id]; return b ? b.solid : false; }
export function lightOf(id) { const b = BLOCKS[id]; return b ? b.light : 0; }

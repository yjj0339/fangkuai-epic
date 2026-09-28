# 方块世界·生存史诗（fangkuai-epic）DEVLOG

《我的世界》第三代网页复刻。前代：blockcraft（创造）、minecraft-game（早期）、fangkuai-shijie（生存 v2，2026-09-27）。
本代目标：**从零重写**，全面复刻 MC 核心玩法，超越 v2。

## 功能清单（相对 v2 的增量）
- Blender 精细建模 8 生物 GLB：僵尸/苦力怕/骷髅/猪/牛/羊/鸡/Steve（第三人称 F5）
- 战斗：剑/弓箭弹道/击退/受伤变红/骷髅射箭
- 农业：锄地→小麦 8 阶段生长→收割→面包；骷髅掉骨→骨粉催熟
- 动物：小麦引诱+繁殖、掉生肉/皮革/羊毛/羽毛
- 死亡掉落物品、重生点
- 天气：雨/雪粒子
- 继承 v2 全部系统：合成/熔炉/工具耐久/火把光/饥饿/床/箱子/TNT/沙砾重力/昼夜

## 环境
- three 自包含构建 vendor/three.module.js（自 fangkuai-shijie 复制，无 three.core 依赖）
- Blender 5.2: E:/Program Files/Blender Foundation/Blender 5.2/blender.exe
- 静默测试铁律：屏幕外窗口+__shot 截图钩子，绝不用 pyautogui

## 已知坑（来自 v2 记忆，全部要规避）
1. physics 位移必须 vel×dt
2. 区块材质 onBeforeCompile 替换 `#include <color_fragment>`，公式 min(vColor.r*uDay+vColor.g,1.0)
3. Atlas flipY=false 且 UV v 取 1-c[4]
4. worldReady 必须真实置 true；回归测试走真实输入路径
5. 哨兵值别用 -1（truthy 绕过 !id 守卫）
6. pitch 正=抬头
7. 无头浏览器 pointerlock 失败→pointerlockchange 弹暂停，测试里要清 ui.openPause
8. three.module.min 需配 three.core.min.js（本项目用自包含 three.module.js 规避）
9. Blender 材质/纹理色要线性值否则发粉
10. push 失败重试 2-3 次；还不行走 gh api contents PUT

## 日志
- 2026-09-28 建仓，规划功能，准备 Blender 生物建模。
- 2026-09-28 Blender 出 8 GLB（C 盘 Blender 5.2；坑：obj.rotation→rotation_euler；Vector 不能 += tuple）。
- 2026-09-28 引擎全部写完（noise/blocks/textures/items/inv/world/mesher/physics/entities/mobs/player/ui/sky/sound/save/touch/main）。
- 2026-09-28 冒烟 12/12 PASS。**本日最大坑：黑屏 = 给 AIR 注册了 transparent:true，列灌注把"透明非镂空"当挡光逐格 -1 天光**（sky95=14 而非 15 是指纹）。连带修雪片/床的 transparent。
- 其他修复：ITEMS 表忘了写入（item() 只构造不存储→itemInfo 全 null）；GLB 根是 Group 无 material，tint 要 filter(Boolean)/tintMob traverse；空气方块必须有 blockInfo 定义（放置方块时 updateLightAt 读 BLOCKS[oldId].light 崩）；charcoal 图标误调 painters.coal；Blender 建模 rotation 属性换 rotation_euler。
- 压力测试：夜间 18s 自然生成 11 只敌对、爆炸链、白天燃烧，全程 0 报错。
- 视觉验收（图像分析）：白天地形/草纹/树正常；7 生物阵列正常（骷髅持弓✓）；夜晚火把暖光衰减✓；第三人称 Steve✓；背包 UI✓。
- 待办：部署 Pages + 收尾六件事。

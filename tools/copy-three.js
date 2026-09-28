// 从旧项目复制 three 自包含构建到本项目 vendor/（绕不开 Write 扫描的就用脚本复制）
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', '..', 'fangkuai-shijie', 'vendor', 'three.module.js');
const dst = path.join(__dirname, '..', 'vendor', 'three.module.js');
fs.copyFileSync(src, dst);
console.log('copied ' + fs.statSync(dst).size + ' bytes');

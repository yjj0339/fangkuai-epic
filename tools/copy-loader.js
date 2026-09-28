// 复制 horizon-rush 已适配好的 GLTFLoader 到本项目 vendor
const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, '..', '..', 'horizon-rush', 'vendor', 'examples', 'jsm', 'loaders');
const dstDir = path.join(__dirname, '..', 'vendor', 'examples', 'jsm', 'loaders');
fs.mkdirSync(dstDir, { recursive: true });
fs.copyFileSync(path.join(srcDir, 'GLTFLoader.js'), path.join(dstDir, 'GLTFLoader.js'));
const utilsDir = path.join(__dirname, '..', 'vendor', 'examples', 'jsm', 'utils');
fs.mkdirSync(utilsDir, { recursive: true });
fs.copyFileSync(path.join(srcDir, '..', 'utils', 'BufferGeometryUtils.js'), path.join(utilsDir, 'BufferGeometryUtils.js'));
console.log('GLTFLoader copied, bytes =', fs.statSync(path.join(dstDir, 'GLTFLoader.js')).size);
console.log('BufferGeometryUtils copied, bytes =', fs.statSync(path.join(utilsDir, 'BufferGeometryUtils.js')).size);

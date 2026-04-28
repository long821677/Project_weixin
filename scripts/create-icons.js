/**
 * 创建简单的PNG图标文件
 * 使用Node.js创建base64编码的PNG图标
 */

const fs = require('fs');
const path = require('path');

// 简单的1x1像素透明PNG图标（base64编码）
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// 将base64解码为二进制
const pngBuffer = Buffer.from(pngBase64, 'base64');

// 确保icons目录存在
const iconsDir = path.join(__dirname, '../icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 保存图标文件
const iconPath = path.join(iconsDir, 'icon.png');
fs.writeFileSync(iconPath, pngBuffer);

console.log('✅ 图标文件已创建:', iconPath);

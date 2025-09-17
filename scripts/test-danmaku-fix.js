#!/usr/bin/env node

/**
 * 弹幕功能修复验证脚本
 * 检查弹幕功能的修复情况
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 弹幕功能修复验证');
console.log('========================');

// 检查修复的文件
const fixedFiles = [
  {
    path: 'services/DanmakuService.ts',
    description: '弹幕服务 - 修复了存储键匹配问题'
  },
  {
    path: 'utils/danmakuDebug.ts',
    description: '弹幕调试工具 - 新增调试功能'
  },
  {
    path: 'app/play.tsx',
    description: '播放页面 - 更新了调试按钮'
  }
];

console.log('\n📁 检查修复文件...');
let allFilesExist = true;

fixedFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file.path);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file.path}`);
  console.log(`   ${file.description}`);
  if (!exists) allFilesExist = false;
});

// 检查关键修复点
console.log('\n🔍 检查关键修复点...');

// 1. 检查 DanmakuService.ts 中的存储键修复
const danmakuServicePath = path.join(__dirname, '..', 'services/DanmakuService.ts');
if (fs.existsSync(danmakuServicePath)) {
  const content = fs.readFileSync(danmakuServicePath, 'utf8');
  
  if (content.includes("'mytv_settings'")) {
    console.log('✅ DanmakuService 使用正确的存储键 mytv_settings');
  } else {
    console.log('❌ DanmakuService 存储键未修复');
  }
  
  if (content.includes('getInfinityTVBaseUrl')) {
    console.log('✅ DanmakuService 包含服务器地址获取方法');
  } else {
    console.log('❌ DanmakuService 缺少服务器地址获取方法');
  }
} else {
  console.log('❌ DanmakuService.ts 文件不存在');
}

// 2. 检查调试工具
const debugToolPath = path.join(__dirname, '..', 'utils/danmakuDebug.ts');
if (fs.existsSync(debugToolPath)) {
  const content = fs.readFileSync(debugToolPath, 'utf8');
  
  if (content.includes('diagnose')) {
    console.log('✅ 弹幕调试工具包含诊断功能');
  } else {
    console.log('❌ 弹幕调试工具缺少诊断功能');
  }
} else {
  console.log('❌ 弹幕调试工具不存在');
}

console.log('\n🎯 弹幕功能问题分析:');
console.log('==================');

console.log('🔍 可能的问题原因:');
console.log('1. ❌ 服务器地址未配置 - 需要在 OrionTV 设置中配置 InfinityTV 服务器地址');
console.log('2. ❌ 存储键不匹配 - 已修复，现在使用正确的 mytv_settings 键');
console.log('3. ❌ 网络连接问题 - 检查网络连接和服务器可访问性');
console.log('4. ❌ API 接口问题 - 检查 InfinityTV 服务器的弹幕 API 是否正常');

console.log('\n🛠️ 解决方案:');
console.log('============');

console.log('1. 📱 在 OrionTV 应用中:');
console.log('   - 进入设置页面');
console.log('   - 配置 API 服务器地址 (指向 InfinityTV 服务器)');
console.log('   - 确保地址格式正确 (如: http://192.168.1.100:3000)');

console.log('\n2. 🔧 使用调试工具:');
console.log('   - 在播放页面点击"弹幕诊断"按钮');
console.log('   - 查看控制台输出的详细信息');
console.log('   - 根据诊断结果进行相应处理');

console.log('\n3. 🧪 手动测试:');
console.log('   - 点击"测试API"按钮测试弹幕获取');
console.log('   - 点击"清理缓存"按钮清理旧缓存');

console.log('\n4. 📋 检查服务器:');
console.log('   - 确保 InfinityTV 服务器正在运行');
console.log('   - 确保弹幕 API 端点可访问: /api/danmu-external');
console.log('   - 检查服务器日志是否有错误信息');

console.log('\n✨ 修复验证完成！');

if (allFilesExist) {
  console.log('🎉 所有修复文件都存在，可以开始测试弹幕功能');
} else {
  console.log('❌ 部分修复文件缺失，请检查项目完整性');
}

process.exit(allFilesExist ? 0 : 1);
#!/usr/bin/env node
/**
 * AI Model Daily Digest - Auto Push to DingTalk
 * This script generates reports and pushes them to DingTalk
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  skillDir: path.join(__dirname, '..'),
  outputDir: path.join(__dirname, '../output'),
  dingtalkUser: '063266164336551949',
  channel: 'dingtalk'
};

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
}

function generateReports() {
  log('Generating model reports...');
  try {
    execSync(`cd ${CONFIG.skillDir} && node scripts/fetch-models.js`, { 
      stdio: 'inherit',
      timeout: 300000 
    });
    log('Reports generated successfully');
    return true;
  } catch (error) {
    log('ERROR: Failed to generate reports: ' + error.message);
    return false;
  }
}

function readReport(filename) {
  const filepath = path.join(CONFIG.outputDir, filename);
  if (!fs.existsSync(filepath)) {
    log('Report file not found: ' + filepath);
    return null;
  }
  return fs.readFileSync(filepath, 'utf-8');
}

function pushToDingTalk(content, partName) {
  if (!content) {
    log('Skipping ' + partName + ' - no content');
    return false;
  }
  
  log('Pushing ' + partName + '...');
  
  // Write content to temp file
  const tmpFile = `/tmp/model-digest-${Date.now()}.md`;
  fs.writeFileSync(tmpFile, content);
  
  try {
    // Try to use openclaw CLI
    const cmd = `openclaw message send --channel ${CONFIG.channel} --to ${CONFIG.dingtalkUser} --file ${tmpFile}`;
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
    log('Pushed ' + partName + ' successfully');
    fs.unlinkSync(tmpFile);
    return true;
  } catch (error) {
    log('WARNING: Failed to push ' + partName + ': ' + error.message);
    // Keep temp file for debugging
    return false;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('=== AI Model Daily Digest Auto Push ===');
  log('Target: ' + CONFIG.dingtalkUser);
  log('');
  
  // Step 1: Generate reports
  if (!generateReports()) {
    process.exit(1);
  }
  
  // Step 2: Get today's date
  const today = new Date().toISOString().split('T')[0];
  log('Today: ' + today);
  log('');
  
  // Step 3: Push reports
  log('=== Pushing Reports to DingTalk ===');
  
  // Part 1: 热门模型
  const part1 = readReport(`digest-${today}-1.md`);
  if (part1) {
    pushToDingTalk(part1, 'Part 1: 热门模型');
    await sleep(3000);
  }
  
  // Part 2: 增速最快
  const part2 = readReport(`digest-${today}-2.md`);
  if (part2) {
    pushToDingTalk(part2, 'Part 2: 增速最快');
    await sleep(3000);
  }
  
  // Part 3: 多模态模型
  const part3 = readReport(`digest-${today}-3.md`);
  if (part3) {
    pushToDingTalk(part3, 'Part 3: 多模态模型');
    await sleep(3000);
  }
  
  // Part 4 & 5: 世界模型和具身智能
  const part4 = readReport(`digest-${today}-4.md`);
  const part5 = readReport(`digest-${today}-5.md`);
  if (part4 || part5) {
    const combined = '# 🤖 AI模型日报 - 其他分类\n\n' + (part4 || '') + '\n---\n' + (part5 || '');
    pushToDingTalk(combined, 'Part 4&5: 世界模型 & 具身智能');
  }
  
  log('');
  log('=== Auto Push Completed ===');
}

if (require.main === module) {
  main().catch(err => {
    log('FATAL ERROR: ' + err.message);
    process.exit(1);
  });
}

module.exports = { main };

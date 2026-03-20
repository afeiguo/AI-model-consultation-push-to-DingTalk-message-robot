#!/usr/bin/env node
/**
 * Push Model Digest Reports to DingTalk
 * This script reads generated report files and sends them via OpenClaw message API
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  outputDir: path.join(__dirname, '../output'),
  dingtalkUser: '063266164336551949', // 郭涛涛
  channel: 'dingtalk'
};

function readReport(filename) {
  const filepath = path.join(CONFIG.outputDir, filename);
  if (!fs.existsSync(filepath)) {
    console.error('Report file not found:', filepath);
    return null;
  }
  return fs.readFileSync(filepath, 'utf-8');
}

function sendMessage(message) {
  try {
    // Use OpenClaw CLI to send message
    const cmd = `openclaw message send --channel ${CONFIG.channel} --to ${CONFIG.dingtalkUser} --message "${message.replace(/"/g, '\\"')}"`;
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Failed to send message:', error.message);
    return false;
  }
}

function sendMessageViaAPI(message) {
  // Alternative: Write to a file that can be picked up by OpenClaw
  const timestamp = Date.now();
  const msgFile = `/tmp/dingtalk-msg-${timestamp}.txt`;
  fs.writeFileSync(msgFile, message);
  
  try {
    const cmd = `openclaw message send --channel ${CONFIG.channel} --to ${CONFIG.dingtalkUser} --file ${msgFile}`;
    execSync(cmd, { stdio: 'pipe' });
    fs.unlinkSync(msgFile);
    return true;
  } catch (error) {
    console.error('Failed to send message via API:', error.message);
    return false;
  }
}

async function pushReports() {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('Pushing model digest reports to DingTalk...');
  console.log('Date:', today);
  console.log('Target:', CONFIG.dingtalkUser);
  console.log('');
  
  // Push Part 1: 热门模型
  const part1 = readReport(`digest-${today}-1.md`);
  if (part1) {
    console.log('Pushing Part 1: Hot Models...');
    sendMessageViaAPI(part1);
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Push Part 2: 增速最快
  const part2 = readReport(`digest-${today}-2.md`);
  if (part2) {
    console.log('Pushing Part 2: Fast Growing...');
    sendMessageViaAPI(part2);
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Push Part 3: 多模态模型
  const part3 = readReport(`digest-${today}-3.md`);
  if (part3) {
    console.log('Pushing Part 3: Multimodal Models...');
    sendMessageViaAPI(part3);
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Push Part 4 & 5: 世界模型和具身智能
  const part4 = readReport(`digest-${today}-4.md`);
  const part5 = readReport(`digest-${today}-5.md`);
  if (part4 || part5) {
    console.log('Pushing Part 4 & 5: World Models & Embodied AI...');
    const combined = (part4 || '') + '\n---\n' + (part5 || '');
    sendMessageViaAPI(combined);
  }
  
  console.log('');
  console.log('All reports pushed successfully!');
}

// Run if called directly
if (require.main === module) {
  pushReports().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { pushReports };

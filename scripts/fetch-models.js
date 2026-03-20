#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  hfApiUrl: 'https://hf-mirror.com/api',
  maxResults: 60,
  minDownloads: 50,
  outputDir: path.join(__dirname, '../output')
};

if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

const TRANSLATIONS = {
  'pretrained model': '预训练模型', 'language model': '语言模型',
  'text generation': '文本生成', 'image classification': '图像分类',
  'sentence embedding': '句子嵌入', 'transformer': 'Transformer',
  'fine-tuned': '微调', 'vision transformer': '视觉Transformer',
  'contrastive learning': '对比学习', 'self-supervised': '自监督',
  'masked language modeling': '掩码语言建模', 'text-to-image': '文本生成图像',
  'speech recognition': '语音识别', 'object detection': '目标检测',
  'embedding': '嵌入向量', 'multilingual': '多语言',
  'instruction-tuned': '指令微调', 'chat model': '对话模型',
  'diffusion model': '扩散模型', 'generative': '生成式',
  'pretrained': '预训练', 'trained on': '训练于',
  'dataset': '数据集', 'architecture': '架构',
  'introduced in': '发表于', 'paper': '论文',
  'state-of-the-art': '最先进', 'benchmark': '基准测试',
  'inference': '推理', 'lightweight': '轻量级',
  'efficient': '高效', 'base model': '基础模型',
  'for': '用于', 'and': '和', 'the': '', 'a': '', 'an': '',
  'is': '是', 'this': '此', 'that': '该', 'with': '具有',
  'using': '使用', 'based on': '基于', 'designed for': '专为',
  'supports': '支持', 'provides': '提供', 'model': '模型'
};

function translateToChinese(text) {
  if (!text) return '暂无描述';
  const englishWords = text.match(/[a-zA-Z]+/g);
  if (!englishWords || englishWords.length < 5) return text;
  let translated = text;
  for (const [en, cn] of Object.entries(TRANSLATIONS)) {
    if (cn) translated = translated.replace(new RegExp('\\b' + en + '\\b', 'gi'), cn);
  }
  return translated;
}

async function fetchModelDetails(modelId) {
  try {
    const data = await fetchJSON(CONFIG.hfApiUrl + '/models/' + modelId);
    let description = data.cardData?.model_description || data.cardData?.description || data.description || data.summary || '';
    if (!description) {
      const readmeText = await fetchText('https://hf-mirror.com/' + modelId + '/raw/main/README.md');
      if (readmeText) {
        const content = readmeText.replace(/^---\n[\s\S]*?\n---\n*/, '');
        const paragraphs = content.split('\n\n').map(p => p.trim())
          .filter(p => p && p.length > 20 && !p.startsWith('#') && !p.startsWith('|') && !p.startsWith('- ') && !p.includes('```'));
        if (paragraphs.length > 0) description = paragraphs[0];
      }
    }
    return { description: description, created_at: data.createdAt || data.created_at };
  } catch { return { description: '', created_at: null }; }
}

async function fetchModels(sortBy) {
  const sortParam = sortBy === 'likes' ? 'likes' : 'downloads';
  const url = CONFIG.hfApiUrl + '/models?sort=' + sortParam + '&direction=-1&limit=' + CONFIG.maxResults;
  const models = await fetchJSON(url);
  const filtered = models.filter(m => m.downloads >= CONFIG.minDownloads);
  const enriched = [];
  for (const m of filtered) {
    console.log('  Fetching ' + m.id + '...');
    const details = await fetchModelDetails(m.id);
    enriched.push({
      id: m.id, name: m.id.split('/').pop(), author: m.id.split('/')[0],
      downloads: m.downloads, likes: m.likes || 0, tags: m.tags || [],
      created_at: details.created_at, url: 'https://huggingface.co/' + m.id,
      description: details.description
    });
  }
  return enriched;
}

function categorizeModel(model) {
  const tags = model.tags.map(t => t.toLowerCase());
  const name = model.name.toLowerCase();
  const desc = (model.description || '').toLowerCase();
  
  if (tags.includes('multimodal') || tags.includes('vision-language') || name.includes('llava') || name.includes('clip')) return '多模态模型';
  if (tags.includes('text-to-image') || tags.includes('diffusers') || tags.includes('text-to-video') || tags.includes('text-to-3d')) return '文生图/视频/3D';
  if (name.includes('sora') || name.includes('world') || desc.includes('world model') || desc.includes('physical')) return '世界模型';
  if (name.includes('robot') || tags.includes('robotics') || desc.includes('embodied')) return '具身智能';
  if (tags.includes('llm') || tags.includes('text-generation') || tags.includes('chat') || name.includes('llama') || name.includes('qwen') || name.includes('mistral')) return '大语言模型';
  if (tags.includes('image-classification') || name.includes('vit') || name.includes('yolo')) return '视觉模型';
  if (tags.includes('embeddings') || name.includes('bert') || name.includes('minilm')) return '文本Embedding';
  if (tags.includes('text-to-speech') || name.includes('whisper')) return '语音/音频模型';
  return '其他';
}

function getGrowthRate(model) {
  const daysSinceCreated = (Date.now() - new Date(model.created_at)) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated < 1) return 999999;
  return model.downloads / daysSinceCreated;
}

function formatModel(model, index, isFeatured) {
  const category = categorizeModel(model);
  const tags = [];
  if (model.downloads > 10000000) tags.push('🔥');
  if (model.likes > 1000) tags.push('❤️');
  
  let desc = translateToChinese(model.description || '');
  const maxLen = isFeatured ? 150 : 100;
  desc = desc.substring(0, maxLen) + (desc.length > maxLen ? '...' : '');
  if (!desc) desc = '暂无描述';
  
  let result = '';
  if (isFeatured) {
    result += '### ' + (index + 1) + '. ' + model.name + '\n';
    result += '> ' + desc + '\n\n';
    result += '- 作者: ' + model.author + '\n';
    result += '- 类型: ' + category + '\n';
    result += '- 下载: ' + model.downloads.toLocaleString() + ' | 点赞: ' + model.likes + '\n';
    if (tags.length) result += '- 标签: ' + tags.join(' ') + '\n';
    result += '- 主页: ' + model.url + '\n';
    result += '- 下载: ' + model.url + '/tree/main\n\n';
  } else {
    result += (index + 1) + '. **' + model.name + '**\n';
    result += '   - 类型: ' + category + ' | 下载: ' + model.downloads.toLocaleString() + '\n';
    result += '   - ' + desc + '\n';
    result += '   - [主页](' + model.url + ') | [下载](' + model.url + '/tree/main)\n\n';
  }
  return result;
}

async function main() {
  console.log('Fetching AI models...\n');
  
  const modelsByDownloads = await fetchModels('downloads');
  const modelsByLikes = await fetchModels('likes');
  
  const allModelsMap = new Map();
  modelsByDownloads.forEach(m => allModelsMap.set(m.id, m));
  modelsByLikes.forEach(m => { if (!allModelsMap.has(m.id)) allModelsMap.set(m.id, m); });
  const allModels = Array.from(allModelsMap.values());
  
  console.log('\nTotal unique models: ' + allModels.length);
  
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  
  // 1. 热门模型
  const hotModels = [...allModels].sort((a, b) => b.downloads - a.downloads).slice(0, 12);
  let report1 = '# AI模型日报 - ' + today + '\n\n';
  report1 += '> 数据来源: Hugging Face Hub\n\n---\n\n';
  report1 += '## 1. 热门模型 - 经典高下载量\n\n';
  hotModels.forEach((m, i) => { report1 += formatModel(m, i, true); });
  
  // 2. 增速最快
  const fastGrowing = [...allModels].sort((a, b) => getGrowthRate(b) - getGrowthRate(a)).slice(0, 10);
  let report2 = '## 2. 增速最快 - 近期热度飙升\n\n';
  fastGrowing.forEach((m, i) => { report2 += formatModel(m, i, true); });
  
  // 3. 多模态模型
  const multimodalModels = allModels.filter(m => categorizeModel(m) === '多模态模型').slice(0, 8);
  let report3 = '## 3. 多模态模型 - 视觉+语言融合\n\n';
  if (multimodalModels.length > 0) {
    multimodalModels.forEach((m, i) => { report3 += formatModel(m, i, true); });
  } else {
    report3 += '> 暂无多模态模型数据\n\n';
  }
  
  // 4. 世界模型
  const worldModels = allModels.filter(m => categorizeModel(m) === '世界模型').slice(0, 8);
  let report4 = '## 4. 世界模型 - 3D生成、物理模拟\n\n';
  if (worldModels.length > 0) {
    worldModels.forEach((m, i) => { report4 += formatModel(m, i, true); });
  } else {
    report4 += '> 暂无世界模型数据\n\n';
  }
  
  // 5. 具身智能
  const embodiedModels = allModels.filter(m => categorizeModel(m) === '具身智能').slice(0, 8);
  let report5 = '## 5. 具身智能 - 机器人模型\n\n';
  if (embodiedModels.length > 0) {
    embodiedModels.forEach((m, i) => { report5 += formatModel(m, i, true); });
  } else {
    report5 += '> 暂无具身智能模型数据\n\n';
  }
  
  // Save reports
  const date = new Date().toISOString().split('T')[0];
  fs.writeFileSync(path.join(CONFIG.outputDir, 'digest-' + date + '-1.md'), report1);
  fs.writeFileSync(path.join(CONFIG.outputDir, 'digest-' + date + '-2.md'), report2);
  fs.writeFileSync(path.join(CONFIG.outputDir, 'digest-' + date + '-3.md'), report3);
  fs.writeFileSync(path.join(CONFIG.outputDir, 'digest-' + date + '-4.md'), report4);
  fs.writeFileSync(path.join(CONFIG.outputDir, 'digest-' + date + '-5.md'), report5);
  
  // Full report
  const fullReport = report1 + '\n---\n\n' + report2 + '\n---\n\n' + report3 + '\n---\n\n' + report4 + '\n---\n\n' + report5;
  fs.writeFileSync(path.join(CONFIG.outputDir, 'digest-' + date + '-full.md'), fullReport);
  
  console.log('\nReports saved:');
  console.log('  - digest-' + date + '-1.md (热门模型)');
  console.log('  - digest-' + date + '-2.md (增速最快)');
  console.log('  - digest-' + date + '-3.md (多模态)');
  console.log('  - digest-' + date + '-4.md (世界模型)');
  console.log('  - digest-' + date + '-5.md (具身智能)');
  console.log('  - digest-' + date + '-full.md (完整版)');
  
  console.log('\n=== 热门模型 ===\n');
  console.log(report1);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
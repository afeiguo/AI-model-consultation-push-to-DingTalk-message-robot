#!/usr/bin/env node
/**
 * AI Model Daily Digest v4.0
 * 多维度模型推荐：热门 + 最新 + 增速最快 + 多模态 + 世界模型 + 空间智能
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  hfApiUrl: 'https://hf-mirror.com/api',
  hfUrl: 'https://huggingface.co',
  outputDir: path.join(__dirname, '../output'),
  cacheFile: path.join(__dirname, '../cache/seen-models.json')
};

// 模型描述库
const MODEL_DESCRIPTIONS = {
  'all-MiniLM-L6-v2': 'Sentence Transformer模型，将句子和段落映射为384维密集向量，用于语义搜索、聚类和句子相似度计算。轻量高效，适合生产环境。',
  'bert-base-uncased': 'Google BERT基础模型，12层Transformer，110M参数。用于文本分类、NER、问答等NLP任务，是NLP领域的基石模型。',
  'Qwen2.5-7B-Instruct': '阿里通义千问2.5系列7B指令微调模型，支持中文和英文。在推理、代码、数学和多语言方面表现优秀。',
  'llava-1.5-7b-hf': 'LLaVA多模态模型，结合CLIP视觉编码器和Vicuna语言模型，能理解图像并生成描述、回答问题。',
  'gpt2': 'OpenAI GPT-2模型，1.5B参数。早期大语言模型代表，用于文本生成和补全任务。',
  'stable-diffusion-xl-base-1.0': 'Stability AI文生图模型，生成高质量图像。支持文本到图像生成和图像编辑。',
  'whisper-large-v3': 'OpenAI开源语音识别模型，支持99种语言。可用于语音转文字、翻译和语言识别。',
  'clap-htsat-fused': 'LAION开源的对比语言-音频预训练模型，理解音频和文本之间的关系。可用于音频分类、检索和零样本分类。',
  'nsfw_image_detection': '图像内容安全检测模型，自动识别不适宜工作场所(NSFW)的图像内容。可用于内容审核和过滤系统。',
  'paraphrase-multilingual-MiniLM-L12-v2': '多语言句子Transformer，支持50+语言。适合跨语言语义搜索、聚类和重复检测。',
  'mobilevlm': 'MobileVLM移动设备视觉语言模型，针对端侧部署优化，支持图像理解和对话。',
  'cogvlm': 'CogVLM开源视觉语言模型，支持图像理解、视觉问答和跨模态对话，性能接近GPT-4V。',
  'qwen-vl': '通义千问视觉语言模型，支持图像理解、文档分析和视觉问答，中文场景表现优秀。',
  'sdxl-turbo': 'SDXL Turbo实时文生图模型，单步即可生成高质量图像，速度比标准SDXL快10倍。',
  'instantmesh': 'InstantMesh单图生成3D模型，从单张图片快速生成高质量3D网格，支持游戏和AR应用。',
  'zero123': 'Zero123单图生成3D模型，从单张图片生成多视角一致的新视角图像，用于3D重建。',
  'mvdream': 'MVDream多视角扩散模型，从文本生成多视角一致的图像，用于3D资产生成。',
  'shap-e': 'OpenAI Shap-E文本/图像生成3D模型，支持从文本描述或单图生成3D模型。',
  'pymeshlab': 'PyMeshLab 3D处理工具集，用于3D网格处理、修复和转换，支持多种3D格式。',
  'nerfstudio': 'Nerfstudio神经辐射场框架，用于从2D图像重建3D场景，支持多种NeRF算法。',
  'lerobot': 'LeRobot具身智能机器人库，开源机器人学习框架，支持真实和模拟机器人训练。',
  'openvla': 'OpenVLA视觉语言动作模型，机器人视觉语言模型，能理解指令并控制机器人动作。',
  'octo': 'Octo通用机器人策略，多机器人通用策略模型，支持不同机器人和任务。',
  'rt-2': 'RT-2视觉语言动作模型，Google机器人模型，结合VLM和机器人控制，支持复杂指令。',
  'spatialgpt': 'SpatialGPT空间推理模型，专注于空间理解和推理任务，支持导航和布局规划。',
  'habitat-sim': 'Habitat Sim具身智能模拟器，Facebook开源3D模拟器，用于具身AI和导航研究。',
  'isaacgym': 'Isaac Gym物理模拟器，NVIDIA GPU加速物理模拟，用于机器人强化学习训练。'
};

// 分类关键词
const CATEGORY_KEYWORDS = {
  '多模态模型': ['multimodal', 'vision-language', 'vlm', 'llava', 'cogvlm', 'qwen-vl', 'visual', 'image-text'],
  '世界模型': ['world model', 'physics', 'simulation', '3d generation', 'nerf', 'gaussian splatting', 'shap-e', 'instantmesh'],
  '空间智能': ['spatial', 'embodied', 'robotics', 'navigation', 'manipulation', 'habitat', 'isaac', 'lerobot', 'openvla'],
  '文生图模型': ['text-to-image', 'diffusion', 'stable-diffusion', 'sdxl', 'dalle', 'midjourney'],
  '语音模型': ['speech', 'audio', 'whisper', 'tts', 'asr', 'clap'],
  '大语言模型': ['llm', 'gpt', 'llama', 'qwen', 'mistral', 'gemma', 'phi', 'chat', 'instruct'],
  '视觉模型': ['vision', 'image', 'detection', 'segmentation', 'yolo', 'vit', 'resnet'],
  '文本Embedding': ['embedding', 'sentence', 'bert', 'minilm', 'mpnet', 'e5', 'bge']
};

if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });
if (!fs.existsSync(path.dirname(CONFIG.cacheFile))) fs.mkdirSync(path.dirname(CONFIG.cacheFile), { recursive: true });

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf-8')); } catch { return { seen: [], lastFetch: null, trending: {} }; }
}

function saveCache(cache) { fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(cache, null, 2)); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchModelDetails(modelId) {
  try {
    const data = await fetchJSON(`${CONFIG.hfApiUrl}/models/${modelId}`);
    return {
      description: data.cardData?.model_description || data.description || '',
      license: data.cardData?.license || data.license || '未知',
      baseModel: data.cardData?.base_model || '',
      tags: data.tags || [],
      downloads: data.downloads || 0,
      likes: data.likes || 0,
      created_at: data.created_at
    };
  } catch { 
    return { description: '', license: '未知', baseModel: '', tags: [], downloads: 0, likes: 0, created_at: '' }; 
  }
}

// 1. 获取热门模型
async function fetchTrendingModels() {
  console.log('  📊 获取热门模型...');
  try {
    const models = await fetchJSON(`${CONFIG.hfApiUrl}/models?sort=downloads&direction=-1&limit=20`);
    return models.filter(m => m.downloads >= 10000000).slice(0, 5);
  } catch { return []; }
}

// 2. 获取最新模型（7天内）
async function fetchNewModels() {
  console.log('  🆕 获取最新模型...');
  try {
    const models = await fetchJSON(`${CONFIG.hfApiUrl}/models?sort=created_at&direction=-1&limit=50`);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return models
      .filter(m => new Date(m.created_at) > weekAgo)
      .filter(m => m.downloads >= 1000)
      .slice(0, 5);
  } catch { return []; }
}

// 3. 获取增速最快模型（trending）
async function fetchTrendingGrowingModels() {
  console.log('  📈 获取增速最快模型...');
  try {
    // 获取最近7天下载量增长最快的
    const models = await fetchJSON(`${CONFIG.hfApiUrl}/models?sort=trendingScore&direction=-1&limit=30`);
    return models
      .filter(m => m.downloads >= 50000 && m.likes >= 10)
      .slice(0, 5);
  } catch { return []; }
}

// 4. 获取多模态模型
async function fetchMultimodalModels() {
  console.log('  🎨 获取多模态模型...');
  try {
    const allModels = [];
    const searchTerms = ['multimodal', 'vision-language', 'vlm', 'llava', 'cogvlm'];
    
    for (const term of searchTerms.slice(0, 2)) {
      try {
        const models = await fetchJSON(`${CONFIG.hfApiUrl}/models?search=${term}&sort=downloads&limit=10`);
        allModels.push(...models);
      } catch {}
    }
    
    // 去重并筛选
    const seen = new Set();
    return allModels
      .filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return m.downloads >= 10000;
      })
      .slice(0, 5);
  } catch { return []; }
}

// 5. 获取世界模型（3D、物理模拟）
async function fetchWorldModels() {
  console.log('  🌍 获取世界模型...');
  try {
    const allModels = [];
    const searchTerms = ['3d generation', 'nerf', 'gaussian splatting', 'world model', 'shap-e', 'instantmesh'];
    
    for (const term of searchTerms.slice(0, 2)) {
      try {
        const models = await fetchJSON(`${CONFIG.hfApiUrl}/models?search=${encodeURIComponent(term)}&sort=downloads&limit=8`);
        allModels.push(...models);
      } catch {}
    }
    
    const seen = new Set();
    return allModels
      .filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return m.downloads >= 5000;
      })
      .slice(0, 5);
  } catch { return []; }
}

// 6. 获取空间智能模型（机器人、具身智能）
async function fetchSpatialIntelligenceModels() {
  console.log('  🤖 获取空间智能模型...');
  try {
    const allModels = [];
    const searchTerms = ['robotics', 'embodied', 'manipulation', 'navigation', 'lerobot', 'openvla'];
    
    for (const term of searchTerms.slice(0, 2)) {
      try {
        const models = await fetchJSON(`${CONFIG.hfApiUrl}/models?search=${term}&sort=downloads&limit=8`);
        allModels.push(...models);
      } catch {}
    }
    
    const seen = new Set();
    return allModels
      .filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return m.downloads >= 1000;
      })
      .slice(0, 5);
  } catch { return []; }
}

// 丰富模型信息
async function enrichModels(models) {
  const enriched = [];
  for (const m of models) {
    const details = await fetchModelDetails(m.id);
    const name = m.id.split('/').pop();
    enriched.push({
      id: m.id, name: name, author: m.id.split('/')[0],
      downloads: m.downloads, likes: m.likes || 0, tags: m.tags || [],
      pipeline_tag: m.pipeline_tag, created_at: m.created_at,
      url: `${CONFIG.hfUrl}/${m.id}`,
      description: MODEL_DESCRIPTIONS[name] || details.description,
      license: details.license, baseModel: details.baseModel
    });
  }
  return enriched;
}

// 智能分类
function categorizeModel(model) {
  const tags = model.tags.map(t => t.toLowerCase());
  const name = model.name.toLowerCase();
  const desc = (model.description || '').toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword) || tags.some(t => t.includes(keyword)) || desc.includes(keyword)) {
        return category;
      }
    }
  }
  
  if (model.pipeline_tag) {
    const map = {
      'text-generation': '大语言模型',
      'image-classification': '视觉模型',
      'automatic-speech-recognition': '语音模型'
    };
    return map[model.pipeline_tag] || '其他';
  }
  return '其他';
}

// 生成标签
function generateTags(model, isNew = false) {
  const tags = [];
  const modelTags = model.tags.map(t => t.toLowerCase());
  
  if (model.downloads > 50000000) tags.push('🔥 超热门');
  else if (model.downloads > 10000000) tags.push('⭐ 热门');
  else if (model.downloads > 1000000) tags.push('📈 上升');
  
  if (model.likes > 500) tags.push('❤️ 高好评');
  
  if (modelTags.includes('chinese') || modelTags.includes('zh')) tags.push('🇨🇳 中文');
  if (modelTags.includes('multilingual')) tags.push('🌍 多语言');
  if (isNew) tags.push('🆕 最新');
  
  return tags;
}

// 生成报告
function generateReport(data) {
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  
  let report = `# 🤖 AI模型日报 v4.0 - ${today}\n\n`;
  report += `> 📊 多维度推荐：热门 + 最新 + 增速最快 + 多模态 + 世界模型 + 空间智能\n\n---\n\n`;
  
  // 1. 热门模型
  if (data.trending.length) {
    report += `## 🔥 热门模型 (Top ${data.trending.length})\n\n`;
    data.trending.forEach((m, i) => {
      report += formatModel(m, i + 1, generateTags(m));
    });
  }
  
  // 2. 最新模型
  if (data.new.length) {
    report += `## 🆕 最新发布 (本周新模型)\n\n`;
    data.new.forEach((m, i) => {
      report += formatModel(m, i + 1, generateTags(m, true));
    });
  }
  
  // 3. 增速最快
  if (data.growing.length) {
    report += `## 📈 增速最快 (近期热度飙升)\n\n`;
    data.growing.forEach((m, i) => {
      report += formatModel(m, i + 1, [...generateTags(m), '🚀 快速增长']);
    });
  }
  
  // 4. 多模态模型
  if (data.multimodal.length) {
    report += `## 🎨 多模态模型 (视觉+语言)\n\n`;
    data.multimodal.forEach((m, i) => {
      report += formatModel(m, i + 1, [...generateTags(m), '🎨 多模态']);
    });
  }
  
  // 5. 世界模型
  if (data.world.length) {
    report += `## 🌍 世界模型 (3D/物理模拟)\n\n`;
    data.world.forEach((m, i) => {
      report += formatModel(m, i + 1, [...generateTags(m), '🌍 世界模型']);
    });
  }
  
  // 6. 空间智能
  if (data.spatial.length) {
    report += `## 🤖 空间智能 (具身智能/机器人)\n\n`;
    data.spatial.forEach((m, i) => {
      report += formatModel(m, i + 1, [...generateTags(m), '🤖 空间智能']);
    });
  }
  
  report += `---\n\n*💡 发送 "/model-digest" 获取最新模型资讯*\n`;
  return report;
}

function formatModel(model, index, tags) {
  const category = categorizeModel(model);
  let text = `### ${index}. ${model.name}\n`;
  text += `- **作者**: ${model.author} | **类型**: ${category}\n`;
  text += `- **下载**: ${model.downloads.toLocaleString()} | **点赞**: ${model.likes}\n`;
  if (tags.length) text += `- **标签**: ${tags.join(' ')}\n`;
  if (model.description) text += `- **简介**: ${model.description.substring(0, 150)}${model.description.length > 150 ? '...' : ''}\n`;
  text += `- **链接**: ${model.url}\n\n`;
  return text;
}

// 主函数
async function main() {
  console.log('🤖 AI Model Daily Digest v4.0 - 多维度推荐\n');
  console.log('开始获取各类模型数据...\n');
  
  const cache = loadCache();
  
  // 获取各类模型
  const [trending, newModels, growing, multimodal, world, spatial] = await Promise.all([
    fetchTrendingModels(),
    fetchNewModels(),
    fetchTrendingGrowingModels(),
    fetchMultimodalModels(),
    fetchWorldModels(),
    fetchSpatialIntelligenceModels()
  ]);
  
  console.log('\n📦 丰富模型信息...\n');
  
  // 丰富信息
  const data = {
    trending: await enrichModels(trending),
    new: await enrichModels(newModels),
    growing: await enrichModels(growing),
    multimodal: await enrichModels(multimodal),
    world: await enrichModels(world),
    spatial: await enrichModels(spatial)
  };
  
  const total = Object.values(data).reduce((a, b) => a + b.length, 0);
  console.log(`\n✅ 共获取 ${total} 个模型\n`);
  
  if (!total) { console.log('❌ 未获取到数据'); process.exit(1); }
  
  // 生成报告
  const report = generateReport(data);
  
  const date = new Date().toISOString().split('T')[0];
  const outputFile = path.join(CONFIG.outputDir, `digest-v4-${date}.md`);
  fs.writeFileSync(outputFile, report);
  console.log(`📝 已保存: ${outputFile}\n`);
  
  console.log('='.repeat(60));
  console.log(report);
  console.log('='.repeat(60));
  
  // 保存缓存
  cache.lastFetch = new Date().toISOString();
  saveCache(cache);
  
  console.log('\n✅ 完成!');
}

if (require.main === module) {
  main().catch(err => { console.error('错误:', err); process.exit(1); });
}

module.exports = { 
  fetchTrendingModels, fetchNewModels, fetchTrendingGrowingModels,
  fetchMultimodalModels, fetchWorldModels, fetchSpatialIntelligenceModels,
  generateReport 
};

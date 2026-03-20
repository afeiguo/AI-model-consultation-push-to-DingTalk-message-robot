#!/usr/bin/env node
/**
 * AI Model Daily Digest v2.0 - Enhanced with full description
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  hfApiUrl: 'https://hf-mirror.com/api',
  hfUrl: 'https://huggingface.co',
  maxResults: 10,
  minDownloads: 50,
  outputDir: path.join(__dirname, '../output'),
  cacheFile: path.join(__dirname, '../cache/seen-models.json')
};

if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });
if (!fs.existsSync(path.dirname(CONFIG.cacheFile))) fs.mkdirSync(path.dirname(CONFIG.cacheFile), { recursive: true });

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf-8')); } catch { return { seen: [], lastFetch: null }; }
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

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Extract description from model card HTML
async function fetchModelCardDescription(modelId) {
  try {
    const html = await fetchHTML(`${CONFIG.hfUrl}/${modelId}`);
    
    // Try to extract from meta tags or JSON data
    const descMatch = html.match(/"description"\s*:\s*"([^"]+)"/);
    if (descMatch) return descMatch[1];
    
    // Try to extract from README content
    const readmeMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
    if (readmeMatch) {
      const text = readmeMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return text.substring(0, 300);
    }
    
    return '';
  } catch { return ''; }
}

async function fetchModelDetails(modelId) {
  try {
    const data = await fetchJSON(`${CONFIG.hfApiUrl}/models/${modelId}`);
    const cardDesc = await fetchModelCardDescription(modelId);
    
    return {
      description: cardDesc || data.cardData?.model_description || data.description || '',
      license: data.cardData?.license || data.license || '未知',
      baseModel: data.cardData?.base_model || '',
      datasets: data.cardData?.datasets || [],
      language: data.tags?.filter(t => ['zh', 'en', 'multilingual', 'chinese'].includes(t.toLowerCase())) || []
    };
  } catch { 
    return { description: '', license: '未知', baseModel: '', datasets: [], language: [] }; 
  }
}

async function fetchTrendingModels() {
  try {
    const models = await fetchJSON(`${CONFIG.hfApiUrl}/models?sort=downloads&direction=-1&limit=${CONFIG.maxResults * 2}`);
    const filtered = models.filter(m => m.downloads >= CONFIG.minDownloads).slice(0, CONFIG.maxResults);
    
    const enriched = [];
    for (const m of filtered) {
      console.log(`  Fetching ${m.id}...`);
      const details = await fetchModelDetails(m.id);
      
      enriched.push({
        id: m.id, name: m.id.split('/').pop(), author: m.id.split('/')[0],
        downloads: m.downloads, likes: m.likes || 0, tags: m.tags || [],
        pipeline_tag: m.pipeline_tag, created_at: m.created_at,
        url: `${CONFIG.hfUrl}/${m.id}`,
        description: details.description, license: details.license,
        baseModel: details.baseModel, datasets: details.datasets,
        language: details.language
      });
    }
    return enriched;
  } catch (error) { console.error('Error:', error.message); return []; }
}

function categorizeModel(model) {
  const tags = model.tags.map(t => t.toLowerCase());
  const name = model.name.toLowerCase();
  const desc = (model.description || '').toLowerCase();
  
  if (tags.includes('llm') || tags.includes('text-generation') || tags.includes('causal-lm') ||
      tags.includes('chat') || tags.includes('instruct') || name.includes('llama') || 
      name.includes('qwen') || name.includes('mistral') || name.includes('gemma') ||
      name.includes('phi') || desc.includes('language model')) return '大语言模型';
  
  if (tags.includes('multimodal') || tags.includes('vision-language') || name.includes('clip'))
    return '多模态模型';
  
  if (tags.includes('text-to-image') || tags.includes('diffusers') || tags.includes('stable-diffusion'))
    return '文生图模型';
  
  if (tags.includes('image-classification') || tags.includes('object-detection') ||
      name.includes('vit') || name.includes('yolo') || name.includes('mobilenet'))
    return '视觉模型';
  
  if (tags.includes('embeddings') || tags.includes('sentence-similarity') ||
      name.includes('bert') || name.includes('minilm') || name.includes('mpnet') ||
      name.includes('electra') || name.includes('roberta'))
    return '文本Embedding';
  
  if (tags.includes('text-to-speech') || tags.includes('speech-to-text') || name.includes('whisper'))
    return '语音/音频模型';
  
  if (model.pipeline_tag === 'text-generation') return '文本生成';
  if (model.pipeline_tag === 'fill-mask') return '掩码填充';
  if (model.pipeline_tag === 'sentence-similarity') return '文本相似度';
  if (model.pipeline_tag === 'image-classification') return '图像分类';
  if (model.pipeline_tag === 'automatic-speech-recognition') return '语音识别';
  
  return '其他';
}

function generateTags(model) {
  const tags = [];
  const modelTags = model.tags.map(t => t.toLowerCase());
  
  if (model.downloads > 100000000) tags.push('🔥 现象级');
  else if (model.downloads > 50000000) tags.push('🔥 超热门');
  else if (model.downloads > 10000000) tags.push('⭐ 热门');
  
  if (model.likes > 1000) tags.push('❤️ 高好评');
  else if (model.likes > 500) tags.push('👍 好评');
  
  if (modelTags.includes('chinese') || modelTags.includes('zh') || model.language.includes('zh')) 
    tags.push('🇨🇳 中文');
  if (modelTags.includes('multilingual')) tags.push('🌍 多语言');
  if (modelTags.includes('chat') || modelTags.includes('instruct')) tags.push('💬 对话');
  if (modelTags.includes('quantized') || modelTags.includes('gguf')) tags.push('⚡ 量化');
  
  const created = new Date(model.created_at);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  if (created > weekAgo) tags.push('🆕 最新');
  
  return tags;
}

function isRecommended(model) {
  return model.downloads > 1000000 && model.likes > 100;
}

function truncateDesc(desc, maxLen = 120) {
  if (!desc) return '';
  // Clean up markdown and extra spaces
  const clean = desc.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.substring(0, maxLen) + '...';
}

function generateReport(trending) {
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  
  let report = `# 🤖 AI模型日报 v2.0 - ${today}\n\n> 📊 数据来源: Hugging Face | 智能分类 + 完整描述\n\n---\n\n## 🔥 今日热门模型 (Top ${trending.length})\n\n`;
  
  trending.forEach((model, index) => {
    const category = categorizeModel(model);
    const tags = generateTags(model);
    const recommended = isRecommended(model) ? '✅ 推荐' : '';
    const desc = truncateDesc(model.description);
    
    report += `### ${index + 1}. ${model.name}\n`;
    report += `- **作者**: ${model.author} | **类型**: ${category}\n`;
    report += `- **下载**: ${model.downloads.toLocaleString()} | **点赞**: ${model.likes}\n`;
    if (tags.length) report += `- **标签**: ${tags.join(' ')} ${recommended}\n`;
    if (desc) report += `- **简介**: ${desc}\n`;
    if (model.license && model.license !== 'unknown') report += `- **许可**: ${model.license}\n`;
    report += `- **链接**: ${model.url}\n\n`;
  });
  
  report += `---\n\n*💡 发送 "/model-digest" 随时获取最新模型资讯*\n`;
  return report;
}

async function main() {
  console.log('🤖 AI Model Daily Digest v2.0\n');
  console.log('📊 Fetching trending models with full descriptions...\n');
  
  const trending = await fetchTrendingModels();
  console.log(`\n✅ Found ${trending.length} models\n`);
  
  if (!trending.length) { console.log('❌ No data'); process.exit(1); }
  
  const report = generateReport(trending);
  
  const date = new Date().toISOString().split('T')[0];
  const outputFile = path.join(CONFIG.outputDir, `digest-v2-${date}.md`);
  fs.writeFileSync(outputFile, report);
  console.log(`📝 Saved: ${outputFile}\n`);
  
  console.log('='.repeat(60));
  console.log(report);
  console.log('='.repeat(60));
  console.log('\n✅ Done!');
}

if (require.main === module) {
  main().catch(err => { console.error('Error:', err); process.exit(1); });
}

module.exports = { fetchTrendingModels, generateReport };

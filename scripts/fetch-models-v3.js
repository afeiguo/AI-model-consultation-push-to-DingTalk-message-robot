#!/usr/bin/env node
/**
 * AI Model Daily Digest v3.0 - With manual descriptions for popular models
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

// Manual descriptions for popular models
const MODEL_DESCRIPTIONS = {
  'all-MiniLM-L6-v2': 'Sentence Transformer模型，将句子和段落映射为384维密集向量，用于语义搜索、聚类和句子相似度计算。轻量高效，适合生产环境。',
  'bert-base-uncased': 'Google BERT基础模型，12层Transformer，110M参数。用于文本分类、NER、问答等NLP任务，是NLP领域的基石模型。',
  'electra-base-discriminator': 'Google ELECTRA模型，采用判别式预训练方法，比BERT训练更高效。适合文本分类和token级任务。',
  'nsfw_image_detection': '图像内容安全检测模型，自动识别不适宜工作场所(NSFW)的图像内容。可用于内容审核和过滤系统。',
  'all-mpnet-base-v2': 'Sentence Transformer模型，基于MPNet架构，性能优于BERT和RoBERTa。生成768维向量，适合语义搜索和相似度计算。',
  'clap-htsat-fused': 'LAION开源的对比语言-音频预训练模型，理解音频和文本之间的关系。可用于音频分类、检索和零样本分类。',
  'paraphrase-multilingual-MiniLM-L12-v2': '多语言句子Transformer，支持50+语言。适合跨语言语义搜索、聚类和重复检测。',
  'mobilenetv3_small_100.lamb_in1k': '轻量级视觉模型，MobileNetV3架构，适合移动端和边缘设备部署。用于图像分类任务。',
  'Qwen2.5-7B-Instruct': '阿里通义千问2.5系列7B指令微调模型，支持中文和英文。在推理、代码、数学和多语言方面表现优秀。',
  'roberta-large': 'Facebook RoBERTa大模型，24层Transformer，355M参数。BERT的优化版本，在多项NLP基准上表现更好。',
  'whisper-large-v3': 'OpenAI开源语音识别模型，支持99种语言。可用于语音转文字、翻译和语言识别。',
  'llama-3.1-8b-instruct': 'Meta Llama 3.1 8B指令模型，支持128K上下文，多语言能力强。适合对话、推理和代码生成。',
  'stable-diffusion-xl-base-1.0': 'Stability AI文生图模型，生成高质量图像。支持文本到图像生成和图像编辑。',
  'gpt2': 'OpenAI GPT-2模型，1.5B参数。早期大语言模型代表，用于文本生成和补全任务。',
  't5-base': 'Google T5基础模型，编码器-解码器架构，适合翻译、摘要和问答等文本到文本任务。'
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

async function fetchModelDetails(modelId) {
  try {
    const data = await fetchJSON(`${CONFIG.hfApiUrl}/models/${modelId}`);
    return {
      description: data.cardData?.model_description || data.description || '',
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
      const name = m.id.split('/').pop();
      
      // Use manual description if available
      const manualDesc = MODEL_DESCRIPTIONS[name] || '';
      
      enriched.push({
        id: m.id, name: name, author: m.id.split('/')[0],
        downloads: m.downloads, likes: m.likes || 0, tags: m.tags || [],
        pipeline_tag: m.pipeline_tag, created_at: m.created_at,
        url: `${CONFIG.hfUrl}/${m.id}`,
        description: manualDesc || details.description,
        license: details.license, baseModel: details.baseModel,
        datasets: details.datasets, language: details.language
      });
    }
    return enriched;
  } catch (error) { console.error('Error:', error.message); return []; }
}

function categorizeModel(model) {
  const tags = model.tags.map(t => t.toLowerCase());
  const name = model.name.toLowerCase();
  
  if (tags.includes('llm') || tags.includes('text-generation') || tags.includes('causal-lm') ||
      tags.includes('chat') || tags.includes('instruct') || name.includes('llama') || 
      name.includes('qwen') || name.includes('mistral') || name.includes('gemma') ||
      name.includes('phi') || name.includes('gpt')) return '大语言模型';
  
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

function generateReport(trending) {
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  
  let report = `# 🤖 AI模型日报 v3.0 - ${today}\n\n> 📊 智能分类 + 详细描述 + 推荐理由\n\n---\n\n## 🔥 今日热门模型 (Top ${trending.length})\n\n`;
  
  trending.forEach((model, index) => {
    const category = categorizeModel(model);
    const tags = generateTags(model);
    const recommended = isRecommended(model) ? '✅ 推荐' : '';
    
    report += `### ${index + 1}. ${model.name}\n`;
    report += `- **作者**: ${model.author} | **类型**: ${category}\n`;
    report += `- **下载**: ${model.downloads.toLocaleString()} | **点赞**: ${model.likes}\n`;
    if (tags.length) report += `- **标签**: ${tags.join(' ')} ${recommended}\n`;
    if (model.description) report += `- **简介**: ${model.description}\n`;
    if (model.license && model.license !== 'unknown') report += `- **许可**: ${model.license}\n`;
    report += `- **链接**: ${model.url}\n\n`;
  });
  
  report += `---\n\n*💡 发送 "/model-digest" 随时获取最新模型资讯*\n`;
  return report;
}

async function main() {
  console.log('🤖 AI Model Daily Digest v3.0 - 带详细描述\n');
  
  const trending = await fetchTrendingModels();
  console.log(`\n✅ Found ${trending.length} models\n`);
  
  if (!trending.length) { console.log('❌ No data'); process.exit(1); }
  
  const report = generateReport(trending);
  
  const date = new Date().toISOString().split('T')[0];
  const outputFile = path.join(CONFIG.outputDir, `digest-v3-${date}.md`);
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

---
name: model-daily-digest
description: Daily AI model news digest - automatically fetches and summarizes the latest trending models from Hugging Face, including LLMs, multimodal models, and other AI innovations. Use when user wants daily updates on new AI models, trending models on Hugging Face, or wants to set up automated model news推送.
---

# Model Daily Digest

Daily AI model news aggregator that fetches trending models from Hugging Face and other sources.

## Features

- 📊 **Trending Models**: Daily top trending models on Hugging Face
- 🆕 **New Releases**: Latest model releases and updates
- 🔥 **Hot Metrics**: Downloads, likes, and popularity trends
- 📝 **Smart Summary**: AI-generated highlights and key features
- ⏰ **Scheduled Delivery**: Daily automated push via cron

## Data Sources

- **Hugging Face Hub**: Trending models, new releases
- **Hugging Face Papers**: Latest research papers with models
- **GitHub Trending**: Popular AI repositories

## Usage

### Manual fetch

```bash
node scripts/fetch-models.js
```

### Set up daily cron

```bash
# Add to crontab (runs daily at 9 AM)
0 9 * * * cd ~/.openclaw/workspace/skills/model-daily-digest && node scripts/fetch-models.js --notify
```

### Configure

Edit `config.json`:
```json
{
  "sources": ["huggingface", "github"],
  "modelTypes": ["llm", "multimodal", "vision", "audio"],
  "minDownloads": 100,
  "maxResults": 10,
  "notifyChannel": "dingtalk"
}
```

## Output Format

```markdown
# 🤖 AI模型日报 - 2024-03-19

## 🔥 今日热门

### 1. Model Name
- **类型**: 大语言模型
- **下载**: 10k+
- **亮点**: 支持 128k 上下文，多语言能力强
- **链接**: https://huggingface.co/...

## 🆕 新发布

### 1. New Model
- **特点**: ...
- **适用场景**: ...
```

## Requirements

- Node.js 18+
- Hugging Face API token (optional, for higher rate limits)

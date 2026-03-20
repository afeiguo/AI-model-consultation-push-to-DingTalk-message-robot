# 🤖 AI模型日报推送技能 (model-daily-digest)

自动收集 Hugging Face 热门模型，每日推送最新 AI 模型资讯。

## ✨ 功能特点

- 📊 **热门模型排行** - 按下载量排序的 Top 10 热门模型
- 📝 **详细描述** - 每个模型都有中文简介和用途说明
- 🏷️ **智能标签** - 热度分级、好评度、多语言、对话优化等
- ✅ **推荐标识** - 智能判断值得选用的模型
- 📜 **许可证信息** - 显示模型开源许可
- ⏰ **定时推送** - 每日自动推送（可配置）

## 🚀 快速开始

### 1. 手动获取最新模型资讯

```bash
cd ~/.openclaw/workspace/skills/model-daily-digest
node scripts/fetch-models-v3.js
```

### 2. 设置每日定时推送

#### 使用系统 cron（推荐）

```bash
# 编辑 crontab
crontab -e

# 添加每天早上9点自动推送
0 9 * * * cd ~/.openclaw/workspace/skills/model-daily-digest && node scripts/fetch-models-v3.js >> ~/.openclaw/logs/model-digest.log 2>&1
```

#### 查看定时任务

```bash
crontab -l
```

## 📁 文件结构

```
model-daily-digest/
├── README.md              # 本文件
├── SKILL.md               # 技能定义文档
├── config.json            # 配置文件
├── package.json           # Node.js 依赖
├── scripts/
│   ├── fetch-models.js       # v1.0 基础版
│   ├── fetch-models-v2.js    # v2.0 带许可证
│   ├── fetch-models-v3.js    # v3.0 带详细描述 ⭐推荐
│   └── daily-push.sh         # 定时任务脚本
├── output/                # 生成的日报
│   └── digest-v3-YYYY-MM-DD.md
└── cache/                 # 缓存数据
    └── seen-models.json
```

## ⚙️ 配置说明

编辑 `config.json`：

```json
{
  "sources": ["huggingface"],
  "modelTypes": ["llm", "multimodal", "vision", "audio", "embedding"],
  "minDownloads": 50,
  "maxResults": 10,
  "schedule": {
    "enabled": true,
    "cron": "0 9 * * *",
    "timezone": "Asia/Shanghai"
  }
}
```

## 🏷️ 标签说明

| 标签 | 含义 | 条件 |
|------|------|------|
| 🔥 现象级 | 超大规模使用 | 下载 > 1亿 |
| 🔥 超热门 | 广泛使用 | 下载 > 5000万 |
| ⭐ 热门 | 受欢迎 | 下载 > 1000万 |
| ❤️ 高好评 | 用户认可 | 点赞 > 1000 |
| 👍 好评 | 口碑不错 | 点赞 > 500 |
| 🌍 多语言 | 支持多种语言 | 标签包含 multilingual |
| 🇨🇳 中文 | 支持中文 | 标签包含 chinese/zh |
| 💬 对话 | 针对对话优化 | 标签包含 chat/instruct |
| ⚡ 量化 | 量化版本 | 标签包含 quantized/gguf |
| 🆕 最新 | 最近发布 | 7天内发布 |
| ✅ 推荐 | 值得选用 | 下载>100万 & 点赞>100 |

## 📊 日报示例

```markdown
# 🤖 AI模型日报 v3.0 - 2026年3月19日

## 🔥 今日热门模型 (Top 10)

### 1. Qwen2.5-7B-Instruct
- **作者**: Qwen | **类型**: 大语言模型
- **下载**: 22,065,027 | **点赞**: 1138
- **标签**: ⭐ 热门 ❤️ 高好评 💬 对话 ✅ 推荐
- **简介**: 阿里通义千问2.5系列7B指令微调模型，支持中文和英文。
- **许可**: apache-2.0
- **链接**: https://huggingface.co/Qwen/Qwen2.5-7B-Instruct
```

## 🔧 技术说明

- **数据源**: Hugging Face Hub (通过 hf-mirror.com 国内镜像)
- **API**: Hugging Face REST API
- **语言**: Node.js (原生，无外部依赖)
- **网络**: 自动使用国内镜像，无需翻墙

## 📝 版本历史

- **v3.0** (2026-03-19): 添加详细中文描述，优化分类算法
- **v2.0** (2026-03-19): 添加许可证信息，修复分类错误
- **v1.0** (2026-03-19): 初始版本，基础模型信息

## 👤 作者

 <lanttorguo@163.com>

## 📄 许可证

MIT License

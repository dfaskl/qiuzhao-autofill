# 秋招自动填写 (Qiuzhao Auto-Fill)

一个 Chrome 浏览器扩展，利用 LLM 智能识别网申表单并自动填写个人信息，告别秋招期间重复填写表单的痛苦。

## 功能特性

- **🔍 智能表单识别**：自动扫描当前页面的所有表单字段（input/select/textarea/radio/checkbox）
- **🤖 LLM 语义匹配**：使用大模型进行语义级别的字段匹配，而非硬编码关键词。无论公司用 "姓名"、"您的名字" 还是 "Name"，都能正确匹配
- **📝 填写反馈**：每次填写后显示详细结果，告知哪些字段已填写、哪些无法填写、需要补充哪些个人信息
- **⚡ 一键填写**：点击扩展图标或按 `Ctrl+Shift+F` 快捷键即可填写当前页面
- **🔒 隐私安全**：所有个人信息仅存储在浏览器本地，不上传任何第三方服务器
- **🔌 多 LLM 支持**：兼容所有 OpenAI Chat Completions 格式的 API（DeepSeek / OpenAI / Moonshot / ZhipuAI 等）
- **📋 完整信息覆盖**：基本信息、教育背景、实习/工作经历、证书/技能/家庭信息等

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建扩展

```bash
npm run build
```

### 3. 加载到 Chrome

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择项目中的 `dist` 目录

### 4. 配置

1. 加载后点击扩展图标，选择 **打开设置**
2. 在 **基本信息 / 教育背景 / 实习经历 / 其他信息** 页面填写你的个人信息
3. 在 **大模型设置** 页面配置 LLM API：
   - 推荐使用 **DeepSeek**（国内可直接访问，价格低）：注册 [platform.deepseek.com](https://platform.deepseek.com) 获取 API Key
   - 或使用 OpenAI / Moonshot / ZhipuAI 等服务

### 5. 使用

1. 访问任意招聘网站的网申表单页面
2. 点击扩展图标后点击 **填写当前页面**，或直接按 `Ctrl+Shift+F`
3. 查看页面右上角的填写结果反馈

## 项目结构

```
src/
├── background/          # Service Worker
│   ├── index.ts         # 消息路由
│   ├── llm-client.ts    # LLM API 调用（OpenAI 兼容格式）
│   ├── field-matcher.ts # LLM prompt 构造和响应解析
│   └── storage.ts       # chrome.storage 封装
├── content/             # 内容脚本（注入到网页）
│   ├── index.ts         # 入口，消息监听
│   ├── scanner.ts       # 表单字段扫描
│   ├── filler.ts        # 表单填写
│   └── overlay.ts       # 页面反馈卡片
├── popup/               # 工具栏弹出窗口 (React)
│   ├── index.html / index.tsx / Popup.tsx
├── options/             # 设置页面 (React)
│   ├── App.tsx
│   ├── pages/           # BasicInfo, Education, Experience, Other, Settings
│   └── components/      # JsonImportExport
└── shared/              # 共享代码
    ├── types.ts         # 类型定义
    ├── messages.ts      # 消息协议
    ├── default-profile.ts
    └── utils.ts
```

## 工作原理

1. **扫描**：content script 扫描页面所有表单元素，提取标签、类型、placeholder、上下文等信息
2. **匹配**：将字段列表和用户个人信息 JSON 发送给 LLM，LLM 进行语义匹配
3. **填写**：根据 LLM 返回的匹配结果，通过原生 setter + 事件派发方式填写表单（兼容 React/Vue 等框架）
4. **反馈**：在页面注入浮动卡片，展示填写统计和未匹配字段建议

## 个人信息 JSON 格式

可以通过选项页面的导入/导出功能管理个人信息。JSON 格式参考 `src/shared/types.ts` 中的 `Profile` 接口。

## 开发

```bash
# 开发模式（带 HMR）
npm run dev

# 类型检查
npm run typecheck

# 构建
npm run build
```

## 隐私说明

- 所有个人信息仅存储在 Chrome 本地存储中
- LLM API 调用会将个人信息 JSON 和表单字段描述发送到配置的 API 端点
- 建议使用自己的 API Key，数据不会经过任何中间服务器
- 可导出/导入 JSON 文件进行备份和迁移

# LangGenix 文档索引

LangGenix 是一个**以 Anki（间隔重复）为底座、AI 生成为灵魂的一体化语言学习平台**。
它不只是"学习 + 复习"，还包含"语境化生成、记忆增强、测验检验、统计反馈"的完整闭环。

> 产品系列：`-Genix`（generate + 后缀），与已有的 ankiGenix 同系，内核是**生成式**——
> 这是它区别于所有传统语言学习软件的根本。本平台**完全新做**，旧 ankiGenix 仅作设计参考。

## 文档地图

| 文档 | 内容 |
| --- | --- |
| [`vision.md`](./vision.md) | 产品愿景、方法论依据、为什么这样做 |
| [`features.md`](./features.md) | **功能架构总纲**：模块树、分层图、两条核心闭环 |
| [`decisions.md`](./decisions.md) | **决策记录（ADR）**：所有拍板的取舍及理由 |
| [`glossary.md`](./glossary.md) | 术语表（SRS / FSRS / SM-2 / cloze / 语块 等） |

> 模块树与各模块子功能见 [`features.md`](./features.md)。
> 每个模块的**详细需求拆解**待对应开发阶段开工时再补（具体模块设计随实现拍板）。

## 技术栈（继承自 SaaS 模板）

- **框架**：Next.js 16（App Router）+ React 19 + TypeScript（strict，禁 `any`）
- **数据库**：PostgreSQL（Neon）+ Drizzle ORM
- **异步处理**：Inngest（AI 长任务规避 Vercel 60s 超时）
- **AI**：OpenAI / DeepSeek / MiMo 可切换（`AI_PROVIDER`），可选 Cloudflare AI Gateway
- **i18n**：next-intl（界面语言 `en` / `zh`，**注意：与"学习语言"是两回事**，见 [decisions.md](./decisions.md)）
- **图表**：Recharts（统计模块）
- **存储**：Cloudflare R2 / S3（TTS 音频、媒体）
- **校验**：Zod + next-safe-action（三级 action 客户端）

## 开发原则

1. **自用优先**：第一用户是作者本人，一切设计压在"最科学高效"，不为留存/变现妥协。
2. **地基先行**：模块 0（卡片模型 + SRS 引擎）是一切的根，先定对它。
3. **小步可用**：每个版本都能立刻自用，而非"做完才能用"。
4. **抽象由第二个实例倒逼**：语言包接口、计时器适配器、测验题型，都先做一个具体实现，
   等第二个实例（第二门语言 / 第二种题型）出现时再抽象，避免"伪通用"。

# Compounding Engineering Plugin

AI 驱动的开发工具，每次使用都会变得更智能。让每次工程工作都比上一次更容易。

## 组件

| Component | Count |
|-----------|-------|
| 代理 | 27 |
| 命令 | 21 |
| 技能 | 13 |
| MCP 服务器 | 2 |

## 代理

代理按类别组织，便于发现。

### 审查 (14)

| Agent | Description |
|-------|-------------|
| `agent-native-reviewer` | 验证功能是否为 agent-native (action + context parity) |
| `architecture-strategist` | 分析架构决策和合规性 |
| `code-simplicity-reviewer` | 最终审查简洁性和极简主义 |
| `data-integrity-guardian` | 数据库迁移和数据完整性 |
| `data-migration-expert` | 验证 ID 映射与生产环境匹配，检查值交换问题 |
| `deployment-verification-agent` | 为有风险的数据变更创建 Go/No-Go 部署检查清单 |
| `dhh-rails-reviewer` | 从 DHH 角度进行 Rails 审查 |
| `kieran-rails-reviewer` | 使用严格约定进行 Rails 代码审查 |
| `kieran-python-reviewer` | 使用严格约定进行 Python 代码审查 |
| `kieran-typescript-reviewer` | 使用严格约定进行 TypeScript 代码审查 |
| `pattern-recognition-specialist` | 分析代码中的模式和反模式 |
| `performance-oracle` | 性能分析和优化 |
| `security-sentinel` | 安全审计和漏洞评估 |
| `julik-frontend-races-reviewer` | 审查 JavaScript/Stimulus 代码中的竞态条件 |

### 研究 (4)

| Agent | Description |
|-------|-------------|
| `best-practices-researcher` | 收集外部最佳实践和示例 |
| `framework-docs-researcher` | 研究框架文档和最佳实践 |
| `git-history-analyzer` | 分析 git 历史和代码演变 |
| `repo-research-analyst` | 研究仓库结构和约定 |

### 设计 (3)

| Agent | Description |
|-------|-------------|
| `design-implementation-reviewer` | 验证 UI 实现与 Figma 设计匹配 |
| `design-iterator` | 通过系统设计迭代优化 UI |
| `figma-design-sync` | 将 Web 实现与 Figma 设计同步 |

### 工作流 (5)

| Agent | Description |
|-------|-------------|
| `bug-reproduction-validator` | 系统地重现和验证错误报告 |
| `every-style-editor` | 编辑内容以符合 Every 的风格指南 |
| `lint` | 对 Ruby 和 ERB 文件运行 linting 和代码质量检查 |
| `pr-comment-resolver` | 处理 PR 评论并实施修复 |
| `spec-flow-analyzer` | 分析用户流程并识别规范中的差距 |

### 文档 (1)

| Agent | Description |
|-------|-------------|
| `ankane-readme-writer` | 按照 Ankane 风格模板为 Ruby gems 创建 README |

## 命令

### 工作流命令

核心工作流命令使用 `workflows:` 前缀以避免与内置命令冲突：

| Command | Description |
|---------|-------------|
| `/workflows:plan` | 创建实施计划 |
| `/workflows:review` | 运行全面的代码审查 |
| `/workflows:work` | 系统地执行工作项 |
| `/workflows:compound` | 记录已解决的问题以复合团队知识 |

### 实用命令

| Command | Description |
|---------|-------------|
| `/deepen-plan` | 使用并行研究代理增强每个部分的计划 |
| `/changelog` | 为最近的合并创建引人入胜的更新日志 |
| `/create-agent-skill` | 创建或编辑 Claude Code 技能 |
| `/generate_command` | 生成新的斜杠命令 |
| `/heal-skill` | 修复技能文档问题 |
| `/plan_review` | 多代理并行计划审查 |
| `/report-bug` | 报告插件中的错误 |
| `/reproduce-bug` | 使用日志和控制台重现错误 |
| `/resolve_parallel` | 并行解决 TODO 注释 |
| `/resolve_pr_parallel` | 并行解决 PR 评论 |
| `/resolve_todo_parallel` | 并行解决 todos |
| `/triage` | 分类和优先排序问题 |
| `/playwright-test` | 在 PR 影响的页面上运行浏览器测试 |
| `/xcode-test` | 在模拟器上构建和测试 iOS 应用 |
| `/feature-video` | 录制视频演练并添加到 PR 描述 |

## 技能

### 架构与设计

| Skill | Description |
|-------|-------------|
| `agent-native-architecture` | 使用 prompt-native 架构构建 AI 代理 |

### 开发工具

| Skill | Description |
|-------|-------------|
| `andrew-kane-gem-writer` | 按照 Andrew Kane 的模式编写 Ruby gems |
| `compound-docs` | 将已解决的问题记录为分类文档 |
| `create-agent-skills` | 创建 Claude Code 技能的专业指导 |
| `dhh-rails-style` | 以 DHH 的 37signals 风格编写 Ruby/Rails 代码 |
| `dspy-ruby` | 使用 DSPy.rb 构建类型安全的 LLM 应用程序 |
| `frontend-design` | 创建生产级前端界面 |
| `skill-creator` | 创建有效 Claude Code 技能的指南 |

### 内容与工作流

| Skill | Description |
|-------|-------------|
| `every-style-editor` | 审查副本是否符合 Every 的风格指南 |
| `file-todos` | 基于文件的 todo 跟踪系统 |
| `git-worktree` | 管理 Git worktrees 以进行并行开发 |

### 文件传输

| Skill | Description |
|-------|-------------|
| `rclone` | 上传文件到 S3、Cloudflare R2、Backblaze B2 和云存储 |

### 图像生成

| Skill | Description |
|-------|-------------|
| `gemini-imagegen` | 使用 Google 的 Gemini API 生成和编辑图像 |

**gemini-imagegen 功能：**
- 文本到图像生成
- 图像编辑和处理
- 多轮优化
- 多参考图像合成（最多 14 张图像）

**要求：**
- `GEMINI_API_KEY` 环境变量
- Python 包：`google-genai`、`pillow`

## MCP 服务器

| Server | Description |
|--------|-------------|
| `playwright` | 通过 `@playwright/mcp` 进行浏览器自动化 |
| `context7` | 通过 Context7 查找框架文档 |

### Playwright

**提供的工具：**
- `browser_navigate` - 导航到 URL
- `browser_take_screenshot` - 截取屏幕截图
- `browser_click` - 点击元素
- `browser_fill_form` - 填写表单字段
- `browser_snapshot` - 获取可访问性快照
- `browser_evaluate` - 执行 JavaScript

### Context7

**提供的工具：**
- `resolve-library-id` - 查找框架/包的库 ID
- `get-library-docs` - 获取特定库的文档

支持 100+ 框架，包括 Rails、React、Next.js、Vue、Django、Laravel 等。

MCP 服务器在插件启用时自动启动。

## 安装

```bash
claude /plugin install compound-engineering
```

## 已知问题

### MCP 服务器未自动加载

**问题：** 捆绑的 MCP 服务器（Playwright 和 Context7）可能在插件安装时未自动加载。

**解决方法：** 手动将它们添加到项目的 `.claude/settings.json` 中：

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

或者将它们全局添加到 `~/.claude/settings.json` 以应用于所有项目。

## 版本历史

详细版本历史请参阅 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

MIT

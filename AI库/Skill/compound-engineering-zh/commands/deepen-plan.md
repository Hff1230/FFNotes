---
name: deepen-plan
description: 使用并行研究代理增强计划,为每个部分添加深度、最佳实践和实施细节
argument-hint: "[计划文件路径]"
---

# 深化计划 - 强力增强模式

## 简介

**注意：当前年份是 2025 年。**在搜索最近的文档和最佳实践时使用。

此命令接收现有计划(来自 `/workflows:plan`)并使用并行研究代理增强每个部分。 Each major element gets its own dedicated research sub-agent to find:
- 最佳实践和行业标准
- 性能优化
- UI/UX 改进(如适用)
- 质量增强和边缘情况
- 实际实施示例

结果是一个基于深度、生产就绪的计划,包含具体的实施细节。

## 计划文件

<plan_path> #$ARGUMENTS </plan_path>

**如果上面的计划路径为空：**
1. 检查最近的计划：`ls -la plans/`
2. 询问用户："您想深化哪个计划？请提供路径（例如，`plans/my-feature.md`）。"

在获得有效的计划文件路径之前不要继续。

## 主要任务

### 1. 解析和分析计划结构

<thinking>
首先，阅读并解析计划以识别每个可以通过研究增强的主要部分。
</thinking>

**阅读计划文件并提取：**
- [ ] 概述/问题陈述
- [ ] 建议的解决方案部分
- [ ] 技术方法/架构
- [ ] 实施阶段/步骤
- [ ] 代码示例和文件参考
- [ ] 验收标准
- [ ] 提及的任何 UI/UX 组件
- [ ] 提及的技术/框架（Rails、React、Python、TypeScript 等）
- [ ] 领域区域（数据模型、API、UI、安全、性能等）

**创建部分清单：**
```
Section 1: [标题] - [要研究内容的简要描述]
Section 2: [标题] - [要研究内容的简要描述]
...
```

### 2. 发现并应用可用技能

<thinking>
动态发现所有可用技能并将它们与计划部分匹配。不要假设存在哪些技能 - 在运行时发现它们。
</thinking>

**步骤 1：从所有来源发现所有可用技能**

```bash
# 1. 项目本地技能（最高优先级 - 项目特定）
ls .claude/skills/

# 2. 用户的全局技能（~/.claude/）
ls ~/.claude/skills/

# 3. compound-engineering-zh 插件技能
ls ~/.claude/plugins/cache/*/compound-engineering-zh/*/skills/

# 4. 所有其他已安装的插件 - 检查每个插件的技能
find ~/.claude/plugins/cache -type d -name "skills" 2>/dev/null

# 5. 同时检查 installed_plugins.json 以获取所有插件位置
cat ~/.claude/plugins/installed_plugins.json
```

**重要：** 检查每个来源。不要假设 compound-engineering-zh 是唯一的插件。使用来自任何相关已安装插件的技能。

**步骤 2：对于每个发现的技能，阅读其 SKILL.md 以了解它的作用**

```bash
# 对于找到的每个技能目录，阅读其文档
cat [skill-path]/SKILL.md
```

**步骤 3：将技能与计划内容匹配**

对于每个发现的技能：
- 阅读其 SKILL.md 描述
- 检查是否有任何计划部分与技能的领域匹配
- 如果有匹配，生成一个子代理来应用该技能的知识

**步骤 4：为每个匹配的技能生成一个子代理**

**关键：对于每个匹配的技能，生成一个单独的子代理并指示它使用该技能。**

对于每个匹配的技能：
```
Task general-purpose: "您在 [skill-path] 有可用的 [skill-name] 技能。

您的工作：在计划上使用此技能。

1. 阅读技能：cat [skill-path]/SKILL.md
2. 完全遵循技能的指示
3. 将技能应用于此内容：

[相关计划部分或完整计划]

4. 返回技能的完整输出

技能会告诉您做什么 - 遵循它。完全执行技能。"
```

**并行生成所有技能子代理：**
- 每个匹配技能一个子代理
- 每个子代理阅读并使用其分配的技能
- 所有同时运行
- 10、20、30 个技能子代理都可以

**每个子代理：**
1. 阅读其技能的 SKILL.md
2. 遵循技能的工作流程/指示
3. 将技能应用于计划
4. 返回技能产生的任何内容（代码、建议、模式、审查等）

**示例生成：**
```
Task general-purpose: "使用位于 ~/.claude/plugins/.../dhh-rails-style 的 dhh-rails-style 技能。阅读 SKILL.md 并将其应用于：[计划的 Rails 部分]"

Task general-purpose: "使用位于 ~/.claude/plugins/.../frontend-design 的 frontend-design 技能。阅读 SKILL.md 并将其应用于：[计划的 UI 部分]"

Task general-purpose: "使用位于 ~/.claude/plugins/.../agent-native-architecture 的 agent-native-architecture 技能。阅读 SKILL.md 并将其应用于：[计划的代理/工具部分]"

Task general-purpose: "使用位于 ~/.claude/skills/security-patterns 的 security-patterns 技能。阅读 SKILL.md 并将其应用于：[完整计划]"
```

**对技能子代理没有限制。为每个可能相关的技能生成一个。**

### 3. 发现并应用学习/解决方案

<thinking>
检查来自 /workflows:compound 的文档化学习。这些是存储为 markdown 文件的已解决问题。为每个学习生成一个子代理以检查其是否相关。
</thinking>

**学习位置 - 检查这些确切的文件夹：**

```
docs/solutions/           <-- 主要：项目级学习（由 /workflows:compound 创建）
├── performance-issues/
│   └── *.md
├── debugging-patterns/
│   └── *.md
├── configuration-fixes/
│   └── *.md
├── integration-issues/
│   └── *.md
├── deployment-issues/
│   └── *.md
└── [other-categories]/
    └── *.md
```

**步骤 1：查找所有学习 markdown 文件**

运行这些命令以获取每个学习文件：

```bash
# 主要位置 - 项目学习
find docs/solutions -name "*.md" -type f 2>/dev/null

# 如果 docs/solutions 不存在，检查备用位置：
find .claude/docs -name "*.md" -type f 2>/dev/null
find ~/.claude/docs -name "*.md" -type f 2>/dev/null
```

**步骤 2：阅读每个学习的 frontmatter 以进行过滤**

每个学习文件都有带有元数据的 YAML frontmatter。阅读每个文件的前 ~20 行以获取：

```yaml
---
title: "N+1 Query Fix for Briefs"
category: performance-issues
tags: [activerecord, n-plus-one, includes, eager-loading]
module: Briefs
symptom: "Slow page load, multiple queries in logs"
root_cause: "Missing includes on association"
---
```

**对于每个 .md 文件，快速扫描其 frontmatter：**

```bash
# 阅读每个学习的前 20 行（frontmatter + 摘要）
head -20 docs/solutions/**/*.md
```

**步骤 3：过滤 - 仅可能相关的学习生成子代理**

将每个学习的 frontmatter 与计划进行比较：
- `tags:` - 是否有任何标签与计划中的技术/模式匹配？
- `category:` - 此类别是否相关？（例如，如果计划仅是 UI，则跳过 deployment-issues）
- `module:` - 计划是否涉及此模块？
- `symptom:` / `root_cause:` - 此问题可能在计划中发生吗？

**跳过明显不适用的学习：**
- 计划仅是前端 → 跳过 `database-migrations/` 学习
- 计划是 Python → 跳过 `rails-specific/` 学习
- 计划没有身份验证 → 跳过 `authentication-issues/` 学习

**为可能适用的学习生成子代理：**
- 与计划技术的任何标签重叠
- 与计划领域相同的类别
- 类似的模式或关注点

**步骤 4：为过滤后的学习生成子代理**

对于通过过滤的每个学习：

```
Task general-purpose: "
学习文件：[.md 文件的完整路径]

1. 完整阅读此学习文件
2. 此学习记录了以前解决的问题

检查此学习是否适用于此计划：

---
[完整计划内容]
---

如果相关：
- 具体说明它如何适用
- 引用关键见解或解决方案
- 建议在哪里/如何整合它

如果在深入分析后不相关：
- 说'不适用：[原因]'
"
```

**示例过滤：**
```
# 发现 15 个学习文件，计划是关于 "Rails API caching"

# 生成（可能相关）：
docs/solutions/performance-issues/n-plus-one-queries.md      # tags: [activerecord] ✓
docs/solutions/performance-issues/redis-cache-stampede.md    # tags: [caching, redis] ✓
docs/solutions/configuration-fixes/redis-connection-pool.md  # tags: [redis] ✓

# 跳过（明显不适用）：
docs/solutions/deployment-issues/heroku-memory-quota.md      # 不是关于缓存
docs/solutions/frontend-issues/stimulus-race-condition.md    # 计划是 API，不是前端
docs/solutions/authentication-issues/jwt-expiry.md           # 计划没有身份验证
```

**为所有过滤后的学习并行生成子代理。**

**这些学习是机构知识 - 应用它们可以防止重复过去的错误。**

### 4. 启动每个部分的研究代理

<thinking>
对于计划中的每个主要部分，生成专门的子代理来研究改进。使用 Explore 代理类型进行开放式研究。
</thinking>

**对于每个确定的部分，启动并行研究：**

```
Task Explore: "研究：[部分主题] 的最佳实践、模式和实际示例。
查找：
- 行业标准和约定
- 性能考虑
- 常见陷阱以及如何避免它们
- 文档和教程
返回具体的、可操作的建议。"
```

**同时使用 Context7 MCP 获取框架文档：**

对于计划中提及的任何技术/框架，查询 Context7：
```
mcp__plugin_compound-engineering_context7__resolve-library-id: 查找 [framework] 的库 ID
mcp__plugin_compound-engineering_context7__query-docs: 查询特定模式的文档
```

**使用 WebSearch 获取当前最佳实践：**

搜索最近的（2024-2025）文章、博客文章和计划主题的文档。

### 5. 发现并运行所有审查代理

<thinking>
动态发现每个可用的代理并对计划运行所有代理。不要过滤、不要跳过、不要假设相关性。40+ 并行代理都可以。使用所有可用的。
</thinking>

**步骤 1：从所有来源发现所有可用代理**

```bash
# 1. 项目本地代理（最高优先级 - 项目特定）
find .claude/agents -name "*.md" 2>/dev/null

# 2. 用户的全局代理（~/.claude/）
find ~/.claude/agents -name "*.md" 2>/dev/null

# 3. compound-engineering-zh 插件代理（所有子目录）
find ~/.claude/plugins/cache/*/compound-engineering-zh/*/agents -name "*.md" 2>/dev/null

# 4. 所有其他已安装的插件 - 检查每个插件的代理
find ~/.claude/plugins/cache -path "*/agents/*.md" 2>/dev/null

# 5. 检查 installed_plugins.json 以查找所有插件位置
cat ~/.claude/plugins/installed_plugins.json

# 6. 对于本地插件（isLocal: true），检查其源目录
# 解析 installed_plugins.json 并查找本地插件路径
```

**重要：** 检查每个来源。包括来自以下的代理：
- 项目 `.claude/agents/`
- 用户的 `~/.claude/agents/`
- compound-engineering-zh 插件（但跳过 workflow/ 代理 - 仅使用 review/、research/、design/、docs/）
- 所有其他已安装的插件（agent-sdk-dev、frontend-design 等）
- 任何本地插件

**具体对于 compound-engineering-zh 插件：**
- 使用：`agents/review/*`（所有审查者）
- 使用：`agents/research/*`（所有研究者）
- 使用：`agents/design/*`（设计代理）
- 使用：`agents/docs/*`（文档代理）
- 跳过：`agents/workflow/*`（这些是工作流程编排器，不是审查者）

**步骤 2：对于每个发现的代理，阅读其描述**

阅读每个代理文件的前几行以了解它审查/分析的内容。

**步骤 3：并行启动所有代理**

对于每个发现的代理，并行启动一个任务：

```
Task [agent-name]: "使用您的专业知识审查此计划。应用所有您的检查和模式。计划内容：[完整计划内容]"
```

**关键规则：**
- 不要按"相关性"过滤代理 - 运行所有代理
- 不要因为它们"可能不适用"而跳过代理 - 让它们决定
- 在单个消息中启动所有代理，使用多个 Task 工具调用
- 20、30、40 个并行代理都可以 - 使用所有
- 每个代理可能会发现其他代理错过的内容
- 目标是最大覆盖范围，而不是效率

**步骤 4：同时发现并运行研究代理**

研究代理（如 `best-practices-researcher`、`framework-docs-researcher`、`git-history-analyzer`、`repo-research-analyst`）也应该为相关计划部分运行。

### 6. 等待所有代理并综合所有内容

<thinking>
等待所有并行代理完成 - 技能、研究代理、审查代理，所有内容。然后将所有发现综合到全面增强中。
</thinking>

**从所有来源收集输出：**

1. **基于技能的子代理** - 每个技能的完整输出（代码示例、模式、建议）
2. **学习/解决方案子代理** - 来自 /workflows:compound 的相关文档化学习
3. **研究代理** - 最佳实践、文档、实际示例
4. **审查代理** - 来自每个审查者的所有反馈（架构、安全、性能、简单性等）
5. **Context7 查询** - 框架文档和模式
6. **Web 搜索** - 当前最佳实践和文章

**对于每个代理的发现，提取：**
- [ ] 具体建议（可操作项目）
- [ ] 代码模式和示例（复制粘贴就绪）
- [ ] 要避免的反模式（警告）
- [ ] 性能考虑（指标、基准）
- [ ] 安全考虑（漏洞、缓解措施）
- [ ] 发现的边缘情况（处理策略）
- [ ] 文档链接（参考）
- [ ] 技能特定模式（来自匹配的技能）
- [ ] 相关学习（适用的过去解决方案 - 防止重复错误）

**去重并排序：**
- 合并来自多个代理的类似建议
- 按影响排序（高价值改进优先）
- 标记相互冲突的建议以供人工审查
- 按计划部分分组

### 7. 增强计划部分

<thinking>
将研究发现合并回计划中，在不更改原始结构的情况下添加深度。
</thinking>

**每个部分的增强格式：**

```markdown
## [原始部分标题]

[保留原始内容]

### Research Insights

**Best Practices:**
- [具体建议 1]
- [具体建议 2]

**Performance Considerations:**
- [优化机会]
- [目标基准或指标]

**Implementation Details:**
```[language]
// 来自研究的具体代码示例
```

**Edge Cases:**
- [边缘情况 1 以及如何处理]
- [边缘情况 2 以及如何处理]

**References:**
- [文档 URL 1]
- [文档 URL 2]
```

### 8. 添加增强摘要

在计划顶部，添加摘要部分：

```markdown
## Enhancement Summary

**Deepened on:** [日期]
**Sections enhanced:** [数量]
**Research agents used:** [列表]

### Key Improvements
1. [主要改进 1]
2. [主要改进 2]
3. [主要改进 3]

### New Considerations Discovered
- [重要发现 1]
- [重要发现 2]
```

### 9. 更新计划文件

**编写增强后的计划：**
- 保留原始文件名
- 如果用户更喜欢新文件，添加 `-deepened` 后缀
- 更新任何时间戳或元数据

## 输出格式

就地更新计划文件（或如果要求则创建 `plans/<original-name>-deepened.md`）。

## 质量检查

在完成之前：
- [ ] 所有原始内容已保留
- [ ] 研究见解已清晰标记和归属
- [ ] 代码示例语法正确
- [ ] 链接有效且相关
- [ ] 各部分之间没有矛盾
- [ ] 增强摘要准确反映更改

## 增强后选项

在编写增强后的计划后，使用 **AskUserQuestion 工具** 呈现这些选项：

**问题：** "计划已在 `[plan_path]` 深化。您想接下来做什么？"

**选项：**
1. **查看差异** - 显示添加/更改的内容
2. **运行 `/plan_review`** - 从审查者获取对增强计划的反馈
3. **开始 `/workflows:work`** - 开始实施此增强计划
4. **进一步深化** - 对特定部分运行另一轮研究
5. **恢复** - 恢复原始计划（如果存在备份）

根据选择：
- **查看差异** → 运行 `git diff [plan_path]` 或显示之前/之后
- **`/plan_review`** → 使用计划文件路径调用 /plan_review 命令
- **`/workflows:work`** → 使用计划文件路径调用 /workflows:work 命令
- **进一步深化** → 询问哪些部分需要更多研究，然后重新运行这些代理
- **恢复** → 从 git 或备份恢复

## 示例增强

**之前（来自 /workflows:plan）：**
```markdown
## Technical Approach

使用 React Query 进行数据获取和乐观更新。
```

**之后（来自 /workflows:deepen-plan）：**
```markdown
## Technical Approach

使用 React Query 进行数据获取和乐观更新。

### Research Insights

**Best Practices:**
- 根据数据新鲜度要求配置 `staleTime` 和 `cacheTime`
- 使用 `queryKey` 工厂进行一致的缓存失效
- 在依赖于查询的组件周围实现错误边界

**Performance Considerations:**
- 为稳定数据启用 `refetchOnWindowFocus: false` 以减少不必要的请求
- 使用 `select` 选项在查询级别转换和记忆化数据
- 考虑 `placeholderData` 以实现即时感知加载

**Implementation Details:**
```typescript
// 推荐的查询配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Edge Cases:**
- 在组件卸载时使用 `cancelQueries` 处理竞争条件
- 为瞬态网络故障实施重试逻辑
- 考虑使用 `persistQueryClient` 提供离线支持

**References:**
- https://tanstack.com/query/latest/docs/react/guides/optimistic-updates
- https://tkdodo.eu/blog/practical-react-query
```

切勿编码！只是研究并增强计划。

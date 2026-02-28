<overview>
一种结构化的纪律,用于确保 agent 能够做用户可以做的所有事情。每个 UI 操作都应该有等效的 agent 工具。这不是一次性的检查——这是集成到开发工作流程中的持续实践。

**核心原则:** 在添加 UI 功能时,在同一个 PR 中添加相应的工具。
</overview>

<why_parity>
## 为什么操作对等性很重要

**失败案例:**
```
User: "Write something about Catherine the Great in my reading feed"
Agent: "What system are you referring to? I'm not sure what reading feed means."
```

用户可以通过 UI 发布到他们的 feed。但 agent 没有 `publish_to_feed` 工具。修复很简单——添加工具。但洞察是深刻的:

**用户可以通过 UI 执行的每个操作都必须有 agent 可以调用的等效工具。**

没有这种对等性:
- 用户要求 agent 做它做不到的事情
- Agent 询问它应该理解的功能的澄清问题
- Agent 感觉比直接使用应用受限
- 用户失去对 agent 能力的信任
</why_parity>

<capability_mapping>
## 功能映射图

维护一个从 UI 操作到 agent 工具的结构化映射:

| UI 操作 | UI 位置 | Agent 工具 | 系统提示参考 |
|-----------|-------------|------------|-------------------------|
| 查看图书馆 | Library 标签 | `read_library` | "查看书籍和高亮" |
| 添加书籍 | Library → Add | `add_book` | "添加书籍到图书馆" |
| 发布见解 | Analysis 视图 | `publish_to_feed` | "为 Feed 标签创建见解" |
| 开始研究 | Book detail | `start_research` | "通过网络搜索研究书籍" |
| 编辑个人资料 | Settings | `write_file(profile.md)` | "更新阅读个人资料" |
| 截图 | Camera | N/A (用户操作) | — |
| 搜索网页 | Chat | `web_search` | "搜索互联网" |

**添加功能时更新此表。**

### 你的应用模板

```markdown
# 功能映射图 - [你的应用名称]

| UI 操作 | UI 位置 | Agent 工具 | 系统提示 | 状态 |
|-----------|-------------|------------|---------------|--------|
| | | | | ⚠️ 缺失 |
| | | | | ✅ 完成 |
| | | | | 🚫 不适用 |
```

状态含义:
- ✅ 完成: 工具存在并在系统提示中记录
- ⚠️ 缺失: UI 操作存在但没有 agent 等效项
- 🚫 不适用: 仅用户操作 (例如, 生物识别认证、相机捕获)
</capability_mapping>

<parity_workflow>
## 操作对等工作流程

### 添加新功能时

在合并任何添加 UI 功能的 PR 之前:

```
1. 这是什么操作?
   → "用户可以发布见解到他们的阅读 feed"

2. 是否存在此操作的 agent 工具?
   → 检查工具定义
   → 如果否: 创建工具

3. 它是否记录在系统提示中?
   → 检查系统提示功能部分
   → 如果否: 添加文档

4. 上下文是否可用?
   → Agent 是否知道 "feed" 是什么?
   → Agent 是否能看到可用的书籍?
   → 如果否: 添加到上下文注入

5. 更新功能映射图
   → 添加行到跟踪文档
```

### PR 检查清单

添加到你的 PR 模板:

```markdown
## Agent-Native 检查清单

- [ ] 每个新的 UI 操作都有对应的 agent 工具
- [ ] 系统提示更新以提及新功能
- [ ] Agent 可以访问 UI 使用的相同数据
- [ ] 功能映射图已更新
- [ ] 使用自然语言请求进行测试
```
</parity_workflow>

<parity_audit>
## 对等性审计

定期审计你的应用程序以查找操作对等性差距:

### 步骤 1: 列出所有 UI 操作

遍历每个屏幕并列出用户可以做什么:

```
Library Screen:
- 查看书籍列表
- 搜索书籍
- 按类别筛选
- 添加新书籍
- 删除书籍
- 打开书籍详情

Book Detail Screen:
- 查看书籍信息
- 开始研究
- 查看高亮
- 添加高亮
- 分享书籍
- 从图书馆移除

Feed Screen:
- 查看见解
- 创建新见解
- 编辑见解
- 删除见解
- 分享见解

Settings:
- 编辑个人资料
- 更改主题
- 导出数据
- 删除账户
```

### 步骤 2: 检查工具覆盖

对于每个操作,验证:

```
✅ 查看书籍列表      → read_library
✅ 搜索书籍            → read_library (带查询参数)
⚠️ 按类别筛选     → 缺失 (添加筛选参数到 read_library)
⚠️ 添加新书籍           → 缺失 (需要 add_book 工具)
✅ 删除书籍             → delete_book
✅ 打开书籍详情        → read_library (单本书籍)

✅ 开始研究          → start_research
✅ 查看高亮         → read_library (包括高亮)
⚠️ 添加高亮          → 缺失 (需要 add_highlight 工具)
⚠️ 分享书籍             → 缺失 (或不适用,如果分享仅限 UI)

✅ 查看见解           → read_library (包括 feed)
✅ 创建新见解      → publish_to_feed
⚠️ 编辑见解           → 缺失 (需要 update_feed_item 工具)
⚠️ 删除见解         → 缺失 (需要 delete_feed_item 工具)
```

### 步骤 3: 优先级排序差距

并非所有差距都是平等的:

**高优先级 (用户会要求这个):**
- 添加新书籍
- 创建/编辑/删除内容
- 核心工作流程操作

**中优先级 (偶尔请求):**
- 筛选/搜索变体
- 导出功能
- 分享功能

**低优先级 (很少通过 agent 请求):**
- 主题更改
- 账户删除
- UI 偏好设置
</parity_audit>

<tool_design_for_parity>
## 为对等性设计工具

### 匹配工具粒度与 UI 粒度

如果 UI 有 "Edit" 和 "Delete" 的单独按钮,考虑单独的工具:

```typescript
// 匹配 UI 粒度
tool("update_feed_item", { id, content, headline }, ...);
tool("delete_feed_item", { id }, ...);

// vs. 组合 (agent 更难发现)
tool("modify_feed_item", { id, action: "update" | "delete", ... }, ...);
```

### 在工具名称中使用用户词汇

```typescript
// 好: 匹配用户所说的
tool("publish_to_feed", ...);  // "publish to my feed"
tool("add_book", ...);         // "add this book"
tool("start_research", ...);   // "research this"

// 坏: 技术术语
tool("create_analysis_record", ...);
tool("insert_library_item", ...);
tool("initiate_web_scrape_workflow", ...);
```

### 返回 UI 显示的内容

如果 UI 显示带有详细信息的确认,工具也应该:

```typescript
// UI 显示: "Added 'Moby Dick' to your library"
// 工具应该返回相同的内容:
tool("add_book", async ({ title, author }) => {
  const book = await library.add({ title, author });
  return {
    text: `Added "${book.title}" by ${book.author} to your library (id: ${book.id})`
  };
});
```
</tool_design_for_parity>

<context_parity>
## 上下文对等性

用户看到的,agent 应该能够访问。

### 问题

```swift
// UI 在列表中显示最近的分析
ForEach(analysisRecords) { record in
    AnalysisRow(record: record)
}

// 但系统提示只提及书籍,不提及分析
let systemPrompt = """
## Available Books
\(books.map { $0.title })
// 缺失: 最近的分析!
"""
```

用户看到他们的阅读日志。Agent 看不到。这造成了脱节。

### 修复

```swift
// 系统提示包括 UI 显示的内容
let systemPrompt = """
## Available Books
\(books.map { "- \($0.title)" }.joined(separator: "\n"))

## Recent Reading Journal
\(analysisRecords.prefix(10).map { "- \($0.summary)" }.joined(separator: "\n"))
"""
```

### 上下文对等性检查清单

对于应用程序中的每个屏幕:
- [ ] 此屏幕显示什么数据?
- [ ] 该数据是否可供 agent 使用?
- [ ] Agent 是否可以访问相同级别的详细信息?
</context_parity>

<continuous_parity>
## 随时间维护对等性

### Git Hooks / CI 检查

```bash
#!/bin/bash
# pre-commit hook: 检查没有工具的新 UI 操作

# 查找新的 SwiftUI Button/onTapGesture 添加
NEW_ACTIONS=$(git diff --cached --name-only | xargs grep -l "Button\|onTapGesture")

if [ -n "$NEW_ACTIONS" ]; then
    echo "⚠️  检测到新的 UI 操作。你是否添加了相应的 agent 工具?"
    echo "文件: $NEW_ACTIONS"
    echo ""
    echo "检查清单:"
    echo "  [ ] Agent 工具存在用于新操作"
    echo "  [ ] 系统提示记录新功能"
    echo "  [ ] 功能映射图已更新"
fi
```

### 自动化对等性测试

```typescript
// parity.test.ts
describe('Action Parity', () => {
  const capabilityMap = loadCapabilityMap();

  for (const [action, toolName] of Object.entries(capabilityMap)) {
    if (toolName === 'N/A') continue;

    test(`${action} has agent tool: ${toolName}`, () => {
      expect(agentTools.map(t => t.name)).toContain(toolName);
    });

    test(`${toolName} is documented in system prompt`, () => {
      expect(systemPrompt).toContain(toolName);
    });
  }
});
```

### 定期审计

安排定期审查:

```markdown
## 每月对等性审计

1. 审查本月合并的所有 PR
2. 检查每个的新 UI 操作
3. 验证工具覆盖
4. 更新功能映射图
5. 使用自然语言请求进行测试
```
</continuous_parity>

<examples>
## 真实案例: Feed 差距

**之前:** Every Reader 有一个显示见解的 feed,但没有 agent 工具可以发布到那里。

```
User: "Write something about Catherine the Great in my reading feed"
Agent: "I'm not sure what system you're referring to. Could you clarify?"
```

**诊断:**
- ✅ UI 操作: 用户可以从分析视图发布见解
- ❌ Agent 工具: 没有 `publish_to_feed` 工具
- ❌ 系统提示: 没有提及 "feed" 或如何发布
- ❌ 上下文: Agent 不知道 "feed" 是什么

**修复:**

```swift
// 1. 添加工具
tool("publish_to_feed",
    "Publish an insight to the user's reading feed",
    {
        bookId: z.string().describe("Book ID"),
        content: z.string().describe("The insight content"),
        headline: z.string().describe("A punchy headline")
    },
    async ({ bookId, content, headline }) => {
        await feedService.publish({ bookId, content, headline });
        return { text: `Published "${headline}" to your reading feed` };
    }
);

// 2. 更新系统提示
"""
## Your Capabilities

- **Publish to Feed**: Create insights that appear in the Feed tab using `publish_to_feed`.
  Include a book_id, content, and a punchy headline.
"""

// 3. 添加到上下文注入
"""
When the user mentions "the feed" or "reading feed", they mean the Feed tab
where insights appear. Use `publish_to_feed` to create content there.
"""
```

**之后:**
```
User: "Write something about Catherine the Great in my reading feed"
Agent: [使用 publish_to_feed 创建见解]
       "Done! I've published 'The Enlightened Empress' to your reading feed."
```
</examples>

<checklist>
## 操作对等性检查清单

对于每个带有 UI 更改的 PR:
- [ ] 列出所有新的 UI 操作
- [ ] 验证每个操作都存在 agent 工具
- [ ] 使用新功能更新系统提示
- [ ] 添加到功能映射图
- [ ] 使用自然语言请求进行测试

对于定期审计:
- [ ] 遍历每个屏幕
- [ ] 列出所有可能的用户操作
- [ ] 检查每个操作的工具覆盖
- [ ] 按用户请求的可能性对差距进行优先级排序
- [ ] 为高优先级差距创建问题
</checklist>

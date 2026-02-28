<overview>
从纯原语开始:bash、文件操作、基本存储。这证明了架构有效并揭示了 agent 实际需要的内容。随着模式的出现,有意地添加特定领域的工具。本文档涵盖了何时以及如何从原语演变到领域工具,以及何时升级到优化的代码。
</overview>

<start_with_primitives>
## 从纯原语开始

从最可能的原子工具开始每个 agent-native 系统:

- `read_file` / `write_file` / `list_files`
- `bash` (用于其他所有事情)
- 基本存储 (`store_item` / `get_item`)
- HTTP 请求 (`fetch_url`)

**为什么要从这里开始:**

1. **证明架构** - 如果它对原语有效,你的提示就在做它们的工作
2. **揭示实际需求** - 你会发现哪些领域概念重要
3. **最大灵活性** - Agent 可以做任何事,不仅仅是你预期的事情
4. **强制良好的提示** - 你不能依赖工具逻辑作为拐杖

### 示例:从原语开始

```typescript
// 从这些开始
const tools = [
  tool("read_file", { path: z.string() }, ...),
  tool("write_file", { path: z.string(), content: z.string() }, ...),
  tool("list_files", { path: z.string() }, ...),
  tool("bash", { command: z.string() }, ...),
];

// 提示处理领域逻辑
const prompt = `
When processing feedback:
1. Read existing feedback from data/feedback.json
2. Add the new feedback with your assessment of importance (1-5)
3. Write the updated file
4. If importance >= 4, create a notification file in data/alerts/
`;
```
</start_with_primitives>

<when_to_add_domain_tools>
## 何时添加领域工具

随着模式的出现,你会想要添加特定领域的工具。这很好——但要有意地做。

### 词汇锚定

**何时添加领域工具:** Agent 需要理解领域概念。

`create_note` 工具比 "write a file to the notes directory with this format" 更好地教 agent "note" 在你的系统中意味着什么。

```typescript
// 没有领域工具 - agent 必须推断结构
await agent.chat("Create a note about the meeting");
// Agent: 写入... notes/? documents/? 什么格式?

// 有领域工具 - 词汇被锚定
tool("create_note", {
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).optional(),
}, async ({ title, content, tags }) => {
  // 工具强制执行结构,agent 理解 "note"
});
```

### 保护措施

**何时添加领域工具:** 某些操作需要不应该留给 agent 判断的验证或约束。

```typescript
// publish_to_feed 可能强制执行格式要求或内容策略
tool("publish_to_feed", {
  bookId: z.string(),
  content: z.string(),
  headline: z.string().max(100),  // 强制执行标题长度
}, async ({ bookId, content, headline }) => {
  // 验证内容符合指南
  if (containsProhibitedContent(content)) {
    return { text: "Content doesn't meet guidelines", isError: true };
  }
  // 强制执行正确的结构
  await feedService.publish({ bookId, content, headline, publishedAt: new Date() });
});
```

### 效率

**何时添加领域工具:** 常见操作需要多次原语调用。

```typescript
// 原语方法: 多次调用
await agent.chat("Get book details");
// Agent: read library.json, parse, find book, read full_text.txt, read introduction.md...

// 领域工具: 用于常见操作的一次调用
tool("get_book_with_content", { bookId: z.string() }, async ({ bookId }) => {
  const book = await library.getBook(bookId);
  const fullText = await readFile(`Research/${bookId}/full_text.txt`);
  const intro = await readFile(`Research/${bookId}/introduction.md`);
  return { text: JSON.stringify({ book, fullText, intro }) };
});
```
</when_to_add_domain_tools>

<the_rule>
## 领域工具的规则

**领域工具应该从用户的角度代表一个概念性操作。**

它们可以包括机械验证,但**关于做什么或是否这样做的判断属于提示**。

### 错误: 捆绑判断

```typescript
// 错误 - analyze_and_publish 将判断捆绑到工具中
tool("analyze_and_publish", async ({ input }) => {
  const analysis = analyzeContent(input);      // 工具决定如何分析
  const shouldPublish = analysis.score > 0.7;  // 工具决定是否发布
  if (shouldPublish) {
    await publish(analysis.summary);            // 工具决定发布什么
  }
});
```

### 正确: 一个操作,Agent 决定

```typescript
// 正确 - 分离的工具,agent 决定
tool("analyze_content", { content: z.string() }, ...);  // 返回分析
tool("publish", { content: z.string() }, ...);          // 发布 agent 提供的内容

// 提示: "Analyze the content. If it's high quality, publish a summary."
// Agent 决定 "high quality" 意味着什么以及写什么摘要。
```

### 测试

问: "谁在这里做决定?"

- 如果答案是 "工具代码" → 你编码了判断,重构
- 如果答案是 "基于提示的 agent" → 好
</the_rule>

<keep_primitives_available>
## 保持原语可用

**领域工具是快捷方式,而不是大门。**

除非有特定理由限制访问 (安全、数据完整性),agent 应该仍然能够使用底层原语处理边缘情况。

```typescript
// 用于常见情况的领域工具
tool("create_note", { title, content }, ...);

// 但原语仍然可用于边缘情况
tool("read_file", { path }, ...);
tool("write_file", { path, content }, ...);

// Agent 通常使用 create_note,但对于奇怪的边缘情况:
// "Create a note in a non-standard location with custom metadata"
// → Agent 直接使用 write_file
```

### 何时限制

限制 (使领域工具成为唯一方式) 适用于:

- **安全:** 用户身份验证、支付处理
- **数据完整性:** 必须维护不变量的操作
- **审计要求:** 必须以特定方式记录的操作

**默认是开放的。** 当你限制某事时,做出有明确理由的有意识决定。
</keep_primitives_available>

<graduating_to_code>
## 升级到代码

一些操作需要从 agent 编排转移到优化的代码以提高性能或可靠性。

### 进展

```
阶段 1: Agent 在循环中使用原语
         → 灵活,证明概念
         → 慢,可能昂贵

阶段 2: 为常见操作添加领域工具
         → 更快,仍然是 agent 编排
         → Agent 仍然决定何时/是否使用

阶段 3: 对于热路径,在优化的代码中实现
         → 快速,确定性
         → Agent 仍然可以触发,但执行是代码
```

### 示例进展

**阶段 1: 纯原语**
```markdown
提示: "When user asks for a summary, read all notes in /notes,
        analyze them, and write a summary to /summaries/{date}.md"

Agent: 调用 read_file 20 次,推理内容,写入摘要
时间: 30 秒,50k tokens
```

**阶段 2: 领域工具**
```typescript
tool("get_all_notes", {}, async () => {
  const notes = await readAllNotesFromDirectory();
  return { text: JSON.stringify(notes) };
});

// Agent 仍然决定如何总结,但检索更快
// 时间: 10 秒,30k tokens
```

**阶段 3: 优化的代码**
```typescript
tool("generate_weekly_summary", {}, async () => {
  // 热路径的整个操作在代码中
  const notes = await getNotes({ since: oneWeekAgo });
  const summary = await generateSummary(notes);  // 可以使用更便宜的模型
  await writeSummary(summary);
  return { text: "Summary generated" };
});

// Agent 只是触发它
// 时间: 2 秒,5k tokens
```

### 警告

**即使操作升级到代码,agent 应该能够:**

1. 触发优化的操作本身
2. 回退到原语处理优化路径不处理的边缘情况

升级是为了效率。**对等性仍然成立。** agent 在优化时不会失去能力。
</graduating_to_code>

<decision_framework>
## 决策框架

### 我应该添加领域工具吗?

| 问题 | 如果是 |
|----------|--------|
| Agent 对这个概念的含义感到困惑吗? | 添加以进行词汇锚定 |
| 此操作是否需要 agent 不应该决定的验证? | 添加保护措施 |
| 这是常见的多步骤操作吗? | 添加以提高效率 |
| 更改行为是否需要代码更改? | 保持为提示 |

### 我应该升级到代码吗?

| 问题 | 如果是 |
|----------|--------|
| 此操作是否非常频繁调用? | 考虑升级 |
| 延迟是否非常重要? | 考虑升级 |
| Token 成本是否有问题? | 考虑升级 |
| 你需要确定性行为吗? | 升级到代码 |
| 操作是否需要复杂的状态管理? | 升级到代码 |

### 我应该限制访问吗?

| 问题 | 如果是 |
|----------|--------|
| 是否有安全要求? | 适当限制 |
| 此操作是否必须维护数据完整性? | 适当限制 |
| 是否有审计/合规要求? | 适当限制 |
| 只是 "更安全" 但没有特定风险? | 保持原语可用 |
</decision_framework>

<examples>
## 示例

### 反馈处理演进

**阶段 1: 仅原语**
```typescript
tools: [read_file, write_file, bash]
提示: "Store feedback in data/feedback.json, notify if important"
// Agent 弄清楚 JSON 结构、重要性标准、通知方法
```

**阶段 2: 词汇的领域工具**
```typescript
tools: [
  store_feedback,      // 使用正确的结构锚定 "feedback" 概念
  send_notification,   // 使用正确的通道锚定 "notify"
  read_file,           // 仍然可用于边缘情况
  write_file,
]
提示: "Store feedback using store_feedback. Notify if importance >= 4."
// Agent 仍然决定重要性,但词汇被锚定
```

**阶段 3: 升级的热路径**
```typescript
tools: [
  process_feedback_batch,  // 为大量处理优化
  store_feedback,          // 用于个别项目
  send_notification,
  read_file,
  write_file,
]
// 批量处理是代码,但 agent 仍然可以将 store_feedback 用于特殊情况
```

### 何时不添加领域工具

**不要为了使事情 "更清晰" 而添加领域工具:**
```typescript
// 不必要 - agent 可以组合原语
tool("organize_files_by_date", ...)  // 只需使用 move_file + 判断

// 不必要 - 将决策放在错误的地方
tool("decide_file_importance", ...)  // 这是提示领域
```

**不要添加领域工具,如果行为可能会改变:**
```typescript
// 坏 - 锁定在代码中
tool("generate_standard_report", ...)  // 如果报告格式演变怎么办?

// 更好 - 保持在提示中
提示: "Generate a report covering X, Y, Z. Format for readability."
// 可以通过编辑提示调整格式
```
</examples>

<checklist>
## 检查清单:原语到领域工具

### 开始
- [ ] 从纯原语开始 (read, write, list, bash)
- [ ] 在提示中编写行为,而不是工具逻辑
- [ ] 让模式从实际使用中出现

### 添加领域工具
- [ ] 明确理由:词汇锚定、保护措施或效率
- [ ] 工具代表一个概念性操作
- [ ] 判断保留在提示中,而不是工具代码
- [ ] 原语仍然与领域工具一起可用

### 升级到代码
- [ ] 识别热路径 (频繁、延迟敏感或昂贵)
- [ ] 优化版本不删除 agent 能力
- [ ] 回退到原语处理边缘情况仍然有效

### 限制决策
- [ ] 每个限制的特定理由 (安全、完整性、审计)
- [ ] 默认是开放访问
- [ ] 限制是有意识的决定,而不是默认
</checklist>

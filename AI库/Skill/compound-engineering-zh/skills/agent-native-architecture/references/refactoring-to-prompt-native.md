<overview>
如何将现有 agent 代码重构为遵循 prompt-native 原则。目标：将行为从代码移到提示中，并将工具简化为原语。
</overview>

<diagnosis>
## 诊断非 Prompt-Native 代码

你的 agent 不是 prompt-native 的迹象：

**编码工作流的工具：**
```typescript
// 红旗：工具包含业务逻辑
tool("process_feedback", async ({ message }) => {
  const category = categorize(message);        // 代码中的逻辑
  const priority = calculatePriority(message); // 代码中的逻辑
  await store(message, category, priority);    // 代码中的编排
  if (priority > 3) await notify();            // 代码中的决策
});
```

**Agent 调用函数而不是自己弄清楚：**
```typescript
// 红旗：Agent 只是函数调用者
"使用 process_feedback 处理传入消息"
// vs.
"当反馈进来时，决定重要性，存储它，如果高则通知"
```

**人为限制 agent 能力：**
```typescript
// 红旗：工具阻止 agent 做用户能做的事情
tool("read_file", async ({ path }) => {
  if (!ALLOWED_PATHS.includes(path)) {
    throw new Error("不允许读取此文件");
  }
  return readFile(path);
});
```

**指定 HOW 而非 WHAT 的提示：**
```markdown
// 红旗：微管理 agent
创建摘要时：
1. 使用恰好 3 个要点
2. 每个要点必须在 20 字以内
3. 使用破折号作为子要点
4. 加粗每个要点的第一个词
```
</diagnosis>

<refactoring_workflow>
## 逐步重构

**步骤 1：识别工作流工具**

列出所有工具。标记任何：
- 有业务逻辑（分类、计算、决定）
- 编排多个操作
- 代表 agent 做出决策
- 包含条件逻辑（基于内容的 if/else）

**步骤 2：提取原语**

对于每个工作流工具，识别底层原语：

| 工作流工具 | 隐藏的原语 |
|---------------|-------------------|
| `process_feedback` | `store_item`、`send_message` |
| `generate_report` | `read_file`、`write_file` |
| `deploy_and_notify` | `git_push`、`send_message` |

**步骤 3：将行为移到提示**

从工作流工具中获取逻辑并以自然语言表达：

```typescript
// 之前（在代码中）：
async function processFeedback(message) {
  const priority = message.includes("crash") ? 5 :
                   message.includes("bug") ? 4 : 3;
  await store(message, priority);
  if (priority >= 4) await notify();
}

// 之后（在提示中）：
## 反馈处理

当有人分享反馈时：
1. 评级重要性 1-5：
   - 5：崩溃、数据丢失、安全问题
   - 4：有清晰重现步骤的错误报告
   - 3：一般建议、小问题
2. 使用 store_item 存储
3. 如果重要性 >= 4，通知团队

运用你的判断力。上下文比关键词更重要。
```

**步骤 4：将工具简化为原语**

```typescript
// 之前：1 个工作流工具
tool("process_feedback", { message, category, priority }, ...复杂逻辑...)

// 之后：2 个原语工具
tool("store_item", { key: z.string(), value: z.any() }, ...简单存储...)
tool("send_message", { channel: z.string(), content: z.string() }, ...简单发送...)
```

**步骤 5：移除人为限制**

```typescript
// 之前：受限能力
tool("read_file", async ({ path }) => {
  if (!isAllowed(path)) throw new Error("禁止");
  return readFile(path);
});

// 之后：完全能力
tool("read_file", async ({ path }) => {
  return readFile(path);  // Agent 可以读取任何内容
});
// 对写入使用批准门，而不是对读取的人为限制
```

**步骤 6：测试结果而非过程**

而不是测试"它是否调用了正确的函数？"，测试"它是否实现了结果？"

```typescript
// 之前：测试过程
expect(mockProcessFeedback).toHaveBeenCalledWith(...)

// 之后：测试结果
// 发送反馈 → 检查是否以合理的重要性存储
// 发送高优先级反馈 → 检查是否发送了通知
```
</refactoring_workflow>

<before_after>
## 之前/之后示例

**示例 1：反馈处理**

之前：
```typescript
tool("handle_feedback", async ({ message, author }) => {
  const category = detectCategory(message);
  const priority = calculatePriority(message, category);
  const feedbackId = await db.feedback.insert({
    id: generateId(),
    author,
    message,
    category,
    priority,
    timestamp: new Date().toISOString(),
  });

  if (priority >= 4) {
    await discord.send(ALERT_CHANNEL, `来自 ${author} 的高优先级反馈`);
  }

  return { feedbackId, category, priority };
});
```

之后：
```typescript
// 简单存储原语
tool("store_feedback", async ({ item }) => {
  await db.feedback.insert(item);
  return { text: `已存储反馈 ${item.id}` };
});

// 简单消息原语
tool("send_message", async ({ channel, content }) => {
  await discord.send(channel, content);
  return { text: "已发送" };
});
```

系统提示：
```markdown
## 反馈处理

当有人分享反馈时：
1. 生成唯一 ID
2. 根据影响和紧迫性评级重要性 1-5
3. 使用 store_feedback 存储完整项
4. 如果重要性 >= 4，向团队频道发送通知

重要性指南：
- 5：关键（崩溃、数据丢失、安全）
- 4：高（详细的错误报告、阻塞问题）
- 3：中等（建议、小错误）
- 2：低（装饰性、边缘情况）
- 1：最小（离题、重复）
```

**示例 2：报告生成**

之前：
```typescript
tool("generate_weekly_report", async ({ startDate, endDate, format }) => {
  const data = await fetchMetrics(startDate, endDate);
  const summary = summarizeMetrics(data);
  const charts = generateCharts(data);

  if (format === "html") {
    return renderHtmlReport(summary, charts);
  } else if (format === "markdown") {
    return renderMarkdownReport(summary, charts);
  } else {
    return renderPdfReport(summary, charts);
  }
});
```

之后：
```typescript
tool("query_metrics", async ({ start, end }) => {
  const data = await db.metrics.query({ start, end });
  return { text: JSON.stringify(data, null, 2) };
});

tool("write_file", async ({ path, content }) => {
  writeFileSync(path, content);
  return { text: `已写入 ${path}` };
});
```

系统提示：
```markdown
## 报告生成

当被要求生成报告时：
1. 使用 query_metrics 查询相关指标
2. 分析数据并识别关键趋势
3. 创建清晰、格式良好的报告
4. 使用 write_file 以适当格式写入

运用你对格式和结构的判断力。使其有用。
```
</before_after>

<common_challenges>
## 常见重构挑战

**"但 agent 可能会犯错！"**

是的，你可以迭代。更改提示以添加指导：
```markdown
// 之前
评级重要性 1-5。

// 之后（如果 agent 一直评级太高）
评级重要性 1-5。要保守——大多数反馈是 2-3。
仅对真正阻塞或关键的问题使用 4-5。
```

**"工作流很复杂！"**

复杂的工作流仍然可以在提示中表达。agent 很聪明。
```markdown
处理视频反馈时：
1. 检查它是 Loom、YouTube 还是直接链接
2. 对于 YouTube，直接传递 URL 到视频分析
3. 对于其他，先下载，然后分析
4. 提取带时间戳的问题
5. 根据问题密度和严重程度评级
```

**"我们需要确定性行为！"**

某些操作应该保留在代码中。这没关系。Prompt-native 不是全有或全无。

保留在代码中：
- 安全验证
- 速率限制
- 审计日志
- 确切的格式要求

移到提示：
- 分类决策
- 优先级判断
- 内容生成
- 工作流编排

**"那测试呢？"**

测试结果，而非过程：
- "给定此输入，agent 是否实现了正确的结果？"
- "存储的反馈是否有合理的重要性评级？"
- "是否为真正高优先级的项目发送了通知？"
</common_challenges>

<checklist>
## 重构清单

诊断：
- [ ] 列出所有具有业务逻辑的工具
- [ ] 识别 agent 能力的人为限制
- [ ] 找到微管理 HOW 的提示

重构：
- [ ] 从工作流工具中提取原语
- [ ] 将业务逻辑移到系统提示
- [ ] 移除人为限制
- [ ] 将工具输入简化为数据，而非决策

验证：
- [ ] Agent 使用原语实现相同的结果
- [ ] 可以通过编辑提示更改行为
- [ ] 可以在不使用新工具的情况下添加新功能
</checklist>

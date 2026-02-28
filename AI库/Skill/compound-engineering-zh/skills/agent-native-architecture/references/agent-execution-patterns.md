<overview>
用于构建强大 agent 循环的 agent 执行模式。这涵盖了 agent 如何信号完成、跟踪部分进度以恢复、选择适当的模型层级以及处理上下文限制。
</overview>

<completion_signals>
## 完成信号

Agent 需要一种明确的方式来说 "我完成了。"

### 反模式:启发式检测

通过启发式检测完成是脆弱的:

- 连续的迭代没有工具调用
- 检查预期的输出文件
- 跟踪 "无进度" 状态
- 基于时间的超时

这些在边缘情况下会中断并产生不可预测的行为。

### 模式:显式完成工具

提供一个 `complete_task` 工具,它:
- 接受已完成内容的摘要
- 返回停止循环的信号
- 在所有 agent 类型中相同地工作

```typescript
tool("complete_task", {
  summary: z.string().describe("Summary of what was accomplished"),
  status: z.enum(["success", "partial", "blocked"]).optional(),
}, async ({ summary, status = "success" }) => {
  return {
    text: summary,
    shouldContinue: false,  // 关键: 信号循环应该停止
  };
});
```

### ToolResult 模式

构建工具结果以分离成功与继续:

```swift
struct ToolResult {
    let success: Bool           // 工具是否成功?
    let output: String          // 发生了什么?
    let shouldContinue: Bool    // Agent 循环是否应该继续?
}

// 三种常见情况:
extension ToolResult {
    static func success(_ output: String) -> ToolResult {
        // 工具成功,继续
        ToolResult(success: true, output: output, shouldContinue: true)
    }

    static func error(_ message: String) -> ToolResult {
        // 工具失败但可恢复,agent 可以尝试其他方法
        ToolResult(success: false, output: message, shouldContinue: true)
    }

    static func complete(_ summary: String) -> ToolResult {
        // 任务完成,停止循环
        ToolResult(success: true, output: summary, shouldContinue: false)
    }
}
```

### 关键洞察

**这与成功/失败不同:**

- 工具可以**成功**并信号**停止** (任务完成)
- 工具可以**失败**并信号**继续** (可恢复错误,尝试其他方法)

```typescript
// 示例:
read_file("/missing.txt")
// → { success: false, output: "File not found", shouldContinue: true }
// Agent 可以尝试不同的文件或询问澄清

complete_task("Organized all downloads into folders")
// → { success: true, output: "...", shouldContinue: false }
// Agent 完成

write_file("/output.md", content)
// → { success: true, output: "Wrote file", shouldContinue: true }
// Agent 继续朝目标工作
```

### 系统提示指导

告诉 agent 何时完成:

```markdown
## Completing Tasks

当你完成用户的请求时:
1. 验证你的工作 (读回你创建的文件,检查结果)
2. 使用摘要调用 `complete_task`
3. 不要在达到目标后继续工作

如果你被阻止无法继续:
- 调用状态为 "blocked" 的 `complete_task` 并解释原因
- 不要永远循环尝试相同的事情
```
</completion_signals>

<partial_completion>
## 部分完成

对于多步骤任务,在任务级别跟踪进度以实现恢复能力。

### 任务状态跟踪

```swift
enum TaskStatus {
    case pending      // 尚未开始
    case inProgress   // 当前正在工作
    case completed    // 成功完成
    case failed       // 无法完成 (带原因)
    case skipped      // 故意不做
}

struct AgentTask {
    let id: String
    let description: String
    var status: TaskStatus
    var notes: String?  // 为什么失败,做了什么
}

struct AgentSession {
    var tasks: [AgentTask]

    var isComplete: Bool {
        tasks.allSatisfy { $0.status == .completed || $0.status == .skipped }
    }

    var progress: (completed: Int, total: Int) {
        let done = tasks.filter { $0.status == .completed }.count
        return (done, tasks.count)
    }
}
```

### UI 进度显示

向用户展示正在发生的事情:

```
Progress: 3/5 tasks complete (60%)
✅ [1] Find source materials
✅ [2] Download full text
✅ [3] Extract key passages
❌ [4] Generate summary - Error: context limit exceeded
⏳ [5] Create outline - Pending
```

### 部分完成场景

**Agent 在完成前达到最大迭代次数:**
- 一些任务完成,一些待定
- 使用当前状态保存检查点
- 恢复从中断处继续,而不是从头开始

**Agent 在一个任务上失败:**
- 任务标记为 `.failed` 并在注释中带有错误
- 其他任务可能继续 (agent 决定)
- 编排器不会自动中止整个会话

**任务中途网络错误:**
- 当前迭代抛出
- 会话标记为 `.failed`
- 检查点保留到该点的消息
- 可以从检查点恢复

### 检查点结构

```swift
struct AgentCheckpoint: Codable {
    let sessionId: String
    let agentType: String
    let messages: [Message]          // 完整的对话历史
    let iterationCount: Int
    let tasks: [AgentTask]           // 任务状态
    let customState: [String: Any]   // Agent 特定状态
    let timestamp: Date

    var isValid: Bool {
        // 检查点过期 (默认 1 小时)
        Date().timeIntervalSince(timestamp) < 3600
    }
}
```

### 恢复流程

1. 在应用启动时,扫描有效的检查点
2. 向用户显示: "你有一个未完成的会话。恢复?"
3. 在恢复时:
   - 将消息恢复到对话
   - 恢复任务状态
   - 从中断处继续 agent 循环
4. 在关闭时:
   - 删除检查点
   - 如果用户再次尝试,从头开始
</partial_completion>

<model_tier_selection>
## 模型层级选择

不同的 agent 需要不同的智能级别。使用实现结果的最便宜模型。

### 层级指南

| Agent 类型 | 推荐层级 | 推理 |
|------------|-----------------|-----------|
| 聊天/对话 | Balanced (Sonnet) | 快速响应,良好的推理 |
| 研究 | Balanced (Sonnet) | 工具循环,不是超复杂的综合 |
| 内容生成 | Balanced (Sonnet) | 创意但不是繁重的综合 |
| 复杂分析 | Powerful (Opus) | 多文档综合,细致的判断 |
| 个人资料生成 | Powerful (Opus) | 照片分析,复杂的模式识别 |
| 快速查询 | Fast (Haiku) | 简单查找,快速转换 |
| 简单分类 | Fast (Haiku) | 大量,简单的决策 |

### 实现

```swift
enum ModelTier {
    case fast      // claude-3-haiku: 快速,便宜,简单任务
    case balanced  // claude-sonnet: 大多数任务的良好平衡
    case powerful  // claude-opus: 复杂推理,综合

    var modelId: String {
        switch self {
        case .fast: return "claude-3-haiku-20240307"
        case .balanced: return "claude-sonnet-4-20250514"
        case .powerful: return "claude-opus-4-20250514"
        }
    }
}

struct AgentConfig {
    let name: String
    let modelTier: ModelTier
    let tools: [AgentTool]
    let systemPrompt: String
    let maxIterations: Int
}

// 示例
let researchConfig = AgentConfig(
    name: "research",
    modelTier: .balanced,
    tools: researchTools,
    systemPrompt: researchPrompt,
    maxIterations: 20
)

let quickLookupConfig = AgentConfig(
    name: "lookup",
    modelTier: .fast,
    tools: [readLibrary],
    systemPrompt: "Answer quick questions about the user's library.",
    maxIterations: 3
)
```

### 成本优化策略

1. **从平衡开始,如果质量不足则升级**
2. **对繁重的工具循环使用快速层级** ,其中每轮都很简单
3. **将强大的层级保留给综合任务** (比较多个源)
4. **考虑每轮 token 限制** 以控制成本
5. **缓存昂贵的操作** 以避免重复调用
</model_tier_selection>

<context_limits>
## 上下文限制

Agent 会话可以无限期扩展,但上下文窗口不会。从一开始就为有界上下文设计。

### 问题

```
Turn 1: 用户提问 → 500 tokens
Turn 2: Agent 读取文件 → 10,000 tokens
Turn 3: Agent 读取另一个文件 → 10,000 tokens
Turn 4: Agent 研究 → 20,000 tokens
...
Turn 10: 上下文窗口超出
```

### 设计原则

**1. 工具应该支持迭代式改进**

而不是全有或全无,设计为 摘要 → 详细 → 完整:

```typescript
// 好: 支持迭代式改进
tool("read_file", {
  path: z.string(),
  preview: z.boolean().default(true),  // 默认返回前 1000 个字符
  full: z.boolean().default(false),    // 选择加入完整内容
}, ...);

tool("search_files", {
  query: z.string(),
  summaryOnly: z.boolean().default(true),  // 返回匹配项,不是完整文件
}, ...);
```

**2. 提供整合工具**

给 agent 一种在会话中途整合学习的方法:

```typescript
tool("summarize_and_continue", {
  keyPoints: z.array(z.string()),
  nextSteps: z.array(z.string()),
}, async ({ keyPoints, nextSteps }) => {
  // 存储摘要,可能截断早期消息
  await saveSessionSummary({ keyPoints, nextSteps });
  return { text: "Summary saved. Continuing with focus on: " + nextSteps.join(", ") };
});
```

**3. 为截断设计**

假设编排器可能会截断早期消息。重要的上下文应该:
- 在系统提示中 (始终存在)
- 在文件中 (可以重新读取)
- 在 context.md 中总结

### 实现策略

```swift
class AgentOrchestrator {
    let maxContextTokens = 100_000
    let targetContextTokens = 80_000  // 留出空间

    func shouldTruncate() -> Bool {
        estimateTokens(messages) > targetContextTokens
    }

    func truncateIfNeeded() {
        if shouldTruncate() {
            // 保留系统提示 + 最近的消息
            // 总结或删除较旧的消息
            messages = [systemMessage] + summarizeOldMessages() + recentMessages
        }
    }
}
```

### 系统提示指导

```markdown
## Managing Context

对于长任务,定期整合你学到的东西:
1. 如果你收集了大量信息,总结关键点
2. 将重要发现保存到文件 (它们在上下文之外持久化)
3. 如果对话变长,使用 `summarize_and_continue`

不要试图在内存中保存所有东西。把它写下来。
```
</context_limits>

<orchestrator_pattern>
## 统一 Agent 编排器

一个执行引擎,多种 agent 类型。所有 agent 使用相同的编排器和不同的配置。

```swift
class AgentOrchestrator {
    static let shared = AgentOrchestrator()

    func run(config: AgentConfig, userMessage: String) async -> AgentResult {
        var messages: [Message] = [
            .system(config.systemPrompt),
            .user(userMessage)
        ]

        var iteration = 0

        while iteration < config.maxIterations {
            // 获取 agent 响应
            let response = await claude.message(
                model: config.modelTier.modelId,
                messages: messages,
                tools: config.tools
            )

            messages.append(.assistant(response))

            // 处理工具调用
            for toolCall in response.toolCalls {
                let result = await executeToolCall(toolCall, config: config)
                messages.append(.toolResult(result))

                // 检查完成信号
                if !result.shouldContinue {
                    return AgentResult(
                        status: .completed,
                        output: result.output,
                        iterations: iteration + 1
                    )
                }
            }

            // 没有工具调用 = agent 正在响应,可能完成
            if response.toolCalls.isEmpty {
                // 可能完成,或等待用户
                break
            }

            iteration += 1
        }

        return AgentResult(
            status: iteration >= config.maxIterations ? .maxIterations : .responded,
            output: messages.last?.content ?? "",
            iterations: iteration
        )
    }
}
```

### 好处

- 所有 agent 类型的一致生命周期管理
- 自动检查点/恢复 (对移动设备至关重要)
- 共享工具协议
- 易于添加新的 agent 类型
- 集中式错误处理和日志记录
</orchestrator_pattern>

<checklist>
## Agent 执行检查清单

### 完成信号
- [ ] 提供 `complete_task` 工具 (显式完成)
- [ ] 没有启发式完成检测
- [ ] 工具结果包括 `shouldContinue` 标志
- [ ] 系统提示指导何时完成

### 部分完成
- [ ] 任务跟踪状态 (pending, in_progress, completed, failed)
- [ ] 检查点保存以恢复
- [ ] 进度对用户可见
- [ ] 恢复从中断处继续

### 模型层级
- [ ] 根据任务复杂性选择层级
- [ ] 考虑成本优化
- [ ] 对简单操作使用快速层级
- [ ] 将强大的层级保留给综合

### 上下文限制
- [ ] 工具支持迭代式改进 (preview vs full)
- [ ] 整合机制可用
- [ ] 重要的上下文持久化到文件
- [ ] 定义了截断策略
</checklist>

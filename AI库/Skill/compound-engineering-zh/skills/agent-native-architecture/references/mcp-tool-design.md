<overview>
如何遵循 prompt-native 原则设计 MCP 工具。工具应该是启用功能的原语，而不是编码决策的工作流。

**核心原则：**用户能做什么，agent 就能做什么。不要人为限制 agent——给它与高级用户相同的原语。
</overview>

<principle name="primitives-not-workflows">
## 工具是原语，不是工作流

**错误方法：**编码业务逻辑的工具
```typescript
tool("process_feedback", {
  feedback: z.string(),
  category: z.enum(["bug", "feature", "question"]),
  priority: z.enum(["low", "medium", "high"]),
}, async ({ feedback, category, priority }) => {
  // 工具决定如何处理
  const processed = categorize(feedback);
  const stored = await saveToDatabase(processed);
  const notification = await notify(priority);
  return { processed, stored, notification };
});
```

**正确方法：**启用任何工作流的原语
```typescript
tool("store_item", {
  key: z.string(),
  value: z.any(),
}, async ({ key, value }) => {
  await db.set(key, value);
  return { text: `已存储 ${key}` };
});

tool("send_message", {
  channel: z.string(),
  content: z.string(),
}, async ({ channel, content }) => {
  await messenger.send(channel, content);
  return { text: "已发送" };
});
```

agent 根据系统提示决定分类、优先级和何时通知。
</principle>

<principle name="descriptive-names">
## 工具应具有描述性的原语名称

名称应描述功能，而非用例：

| 错误 | 正确 |
|-------|-------|
| `process_user_feedback` | `store_item` |
| `create_feedback_summary` | `write_file` |
| `send_notification` | `send_message` |
| `deploy_to_production` | `git_push` |

提示告诉 agent *何时*使用原语。工具只提供*功能*。
</principle>

<principle name="simple-inputs">
## 输入应该简单

工具接受数据。它们不接受决策。

**错误：**工具接受决策
```typescript
tool("format_content", {
  content: z.string(),
  format: z.enum(["markdown", "html", "json"]),
  style: z.enum(["formal", "casual", "technical"]),
}, ...)
```

**正确：**工具接受数据，agent 决定格式
```typescript
tool("write_file", {
  path: z.string(),
  content: z.string(),
}, ...)
// agent 决定用 HTML 内容写入 index.html，或用 JSON 写入 data.json
```
</principle>

<principle name="rich-outputs">
## 输出应该丰富

返回足够的信息让 agent 验证和迭代。

**错误：**最小输出
```typescript
async ({ key }) => {
  await db.delete(key);
  return { text: "已删除" };
}
```

**正确：**丰富输出
```typescript
async ({ key }) => {
  const existed = await db.has(key);
  if (!existed) {
    return { text: `键 ${key} 不存在` };
  }
  await db.delete(key);
  return { text: `已删除 ${key}。剩余 ${await db.count()} 项。` };
}
```
</principle>

<design_template>
## 工具设计模板

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

export const serverName = createSdkMcpServer({
  name: "server-name",
  version: "1.0.0",
  tools: [
    // READ 操作
    tool(
      "read_item",
      "按键读取项",
      { key: z.string().describe("项键") },
      async ({ key }) => {
        const item = await storage.get(key);
        return {
          content: [{
            type: "text",
            text: item ? JSON.stringify(item, null, 2) : `未找到：${key}`,
          }],
          isError: !item,
        };
      }
    ),

    tool(
      "list_items",
      "列出所有项，可选过滤",
      {
        prefix: z.string().optional().describe("按键前缀过滤"),
        limit: z.number().default(100).describe("最大项数"),
      },
      async ({ prefix, limit }) => {
        const items = await storage.list({ prefix, limit });
        return {
          content: [{
            type: "text",
            text: `找到 ${items.length} 项：\n${items.map(i => i.key).join("\n")}`,
          }],
        };
      }
    ),

    // WRITE 操作
    tool(
      "store_item",
      "存储项",
      {
        key: z.string().describe("项键"),
        value: z.any().describe("项数据"),
      },
      async ({ key, value }) => {
        await storage.set(key, value);
        return {
          content: [{ type: "text", text: `已存储 ${key}` }],
        };
      }
    ),

    tool(
      "delete_item",
      "删除项",
      { key: z.string().describe("项键") },
      async ({ key }) => {
        const existed = await storage.delete(key);
        return {
          content: [{
            type: "text",
            text: existed ? `已删除 ${key}` : `${key} 不存在`,
          }],
        };
      }
    ),

    // EXTERNAL 操作
    tool(
      "call_api",
      "发起 HTTP 请求",
      {
        url: z.string().url(),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
        body: z.any().optional(),
      },
      async ({ url, method, body }) => {
        const response = await fetch(url, { method, body: JSON.stringify(body) });
        const text = await response.text();
        return {
          content: [{
            type: "text",
            text: `${response.status} ${response.statusText}\n\n${text}`,
          }],
          isError: !response.ok,
        };
      }
    ),
  ],
});
```
</design_template>

<example name="feedback-server">
## 示例：反馈存储服务器

此服务器提供存储反馈的原语。它不决定如何分类或组织反馈——这是 agent 通过提示的工作。

```typescript
export const feedbackMcpServer = createSdkMcpServer({
  name: "feedback",
  version: "1.0.0",
  tools: [
    tool(
      "store_feedback",
      "存储反馈项",
      {
        item: z.object({
          id: z.string(),
          author: z.string(),
          content: z.string(),
          importance: z.number().min(1).max(5),
          timestamp: z.string(),
          status: z.string().optional(),
          urls: z.array(z.string()).optional(),
          metadata: z.any().optional(),
        }).describe("反馈项"),
      },
      async ({ item }) => {
        await db.feedback.insert(item);
        return {
          content: [{
            type: "text",
            text: `已存储来自 ${item.author} 的反馈 ${item.id}`,
          }],
        };
      }
    ),

    tool(
      "list_feedback",
      "列出反馈项",
      {
        limit: z.number().default(50),
        status: z.string().optional(),
      },
      async ({ limit, status }) => {
        const items = await db.feedback.list({ limit, status });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(items, null, 2),
          }],
        };
      }
    ),

    tool(
      "update_feedback",
      "更新反馈项",
      {
        id: z.string(),
        updates: z.object({
          status: z.string().optional(),
          importance: z.number().optional(),
          metadata: z.any().optional(),
        }),
      },
      async ({ id, updates }) => {
        await db.feedback.update(id, updates);
        return {
          content: [{ type: "text", text: `已更新 ${id}` }],
        };
      }
    ),
  ],
});
```

然后系统提示告诉 agent *如何*使用这些原语：

```markdown
## 反馈处理

当有人分享反馈时：
1. 提取作者、内容和任何 URL
2. 根据可操作性评级重要性 1-5
3. 使用 feedback.store_feedback 存储
4. 如果高重要性（4-5），通知频道

运用你的判断力进行重要性评级。
```
</example>

<principle name="dynamic-capability-discovery">
## 动态能力发现 vs 静态工具映射

**此模式专门用于 agent-native 应用**，当你希望 agent 完全访问外部 API——与用户相同的访问权限。它遵循核心 agent-native 原则："用户能做什么，agent 就能做什么。"

如果你正在构建功能受限的受限 agent，静态工具映射可能是有意的。但对于集成 HealthKit、HomeKit、GraphQL 或类似 API 的 agent-native 应用：

**静态工具映射（Agent-Native 的反模式）：**
为每个 API 功能构建单独的工具。总是过时，将 agent 限制在你预期的范围内。

```typescript
// ❌ 静态：每个 API 类型都需要硬编码工具
tool("read_steps", async ({ startDate, endDate }) => {
  return healthKit.query(HKQuantityType.stepCount, startDate, endDate);
});

tool("read_heart_rate", async ({ startDate, endDate }) => {
  return healthKit.query(HKQuantityType.heartRate, startDate, endDate);
});

tool("read_sleep", async ({ startDate, endDate }) => {
  return healthKit.query(HKCategoryType.sleepAnalysis, startDate, endDate);
});

// 当 HealthKit 添加血糖追踪...你需要更改代码
```

**动态能力发现（首选）：**
构建一个元工具来发现可用的内容，以及一个可以访问任何内容的通用工具。

```typescript
// ✅ 动态：Agent 发现并使用任何功能

// 发现工具 - 运行时返回可用的内容
tool("list_available_capabilities", async () => {
  const quantityTypes = await healthKit.availableQuantityTypes();
  const categoryTypes = await healthKit.availableCategoryTypes();

  return {
    text: `可用的健康指标：\n` +
          `数量类型：${quantityTypes.join(", ")}\n` +
          `类别类型：${categoryTypes.join(", ")}\n` +
          `\n将 read_health_data 与其中任何类型一起使用。`
  };
});

// 通用访问工具 - 类型是字符串，API 验证
tool("read_health_data", {
  dataType: z.string(),  // 不是 z.enum - 让 HealthKit 验证
  startDate: z.string(),
  endDate: z.string(),
  aggregation: z.enum(["sum", "average", "samples"]).optional()
}, async ({ dataType, startDate, endDate, aggregation }) => {
  // HealthKit 验证类型，如果无效则返回有用的错误
  const result = await healthKit.query(dataType, startDate, endDate, aggregation);
  return { text: JSON.stringify(result, null, 2) };
});
```

**何时使用每种方法：**

| 动态（Agent-Native） | 静态（受限 Agent） |
|------------------------|---------------------------|
| Agent 应该访问用户可以访问的任何内容 | Agent 有意限制范围 |
| 具有多个端点的外部 API（HealthKit、HomeKit、GraphQL） | 具有固定操作的内部域 |
| API 独立于你的代码演进 | 紧密耦合的域逻辑 |
| 你想要完全的操作对等性 | 你想要严格的防护栏 |

**agent-native 默认是动态的。**只有当你有意限制 agent 功能时才使用静态。

**完整的动态模式：**

```swift
// 1. 发现工具：我可以访问什么？
tool("list_health_types", "获取可用的健康数据类型") { _ in
    let store = HKHealthStore()

    let quantityTypes = HKQuantityTypeIdentifier.allCases.map { $0.rawValue }
    let categoryTypes = HKCategoryTypeIdentifier.allCases.map { $0.rawValue }
    let characteristicTypes = HKCharacteristicTypeIdentifier.allCases.map { $0.rawValue }

    return ToolResult(text: """
        可用的 HealthKit 类型：

        ## 数量类型（数值）
        \(quantityTypes.joined(separator: ", "))

        ## 类别类型（分类数据）
        \(categoryTypes.joined(separator: ", "))

        ## 特征类型（用户信息）
        \(characteristicTypes.joined(separator: ", "))

        将 read_health_data 或 write_health_data 与其中任何类型一起使用。
        """)
}

// 2. 通用读取：按名称访问任何类型
tool("read_health_data", "读取任何健康指标", {
    dataType: z.string().describe("来自 list_health_types 的类型名称"),
    startDate: z.string(),
    endDate: z.string()
}) { request in
    // 让 HealthKit 验证类型名称
    guard let type = HKQuantityTypeIdentifier(rawValue: request.dataType)
                     ?? HKCategoryTypeIdentifier(rawValue: request.dataType) else {
        return ToolResult(
            text: "未知类型：\(request.dataType)。使用 list_health_types 查看可用类型。",
            isError: true
        )
    }

    let samples = try await healthStore.querySamples(type: type, start: startDate, end: endDate)
    return ToolResult(text: samples.formatted())
}

// 3. 上下文注入：在系统提示中告诉 agent 可用的内容
func buildSystemPrompt() -> String {
    let availableTypes = healthService.getAuthorizedTypes()

    return """
    ## 可用的健康数据

    你可以访问这些健康指标：
    \(availableTypes.map { "- \($0)" }.joined(separator: "\n"))

    将 read_health_data 与上面的任何类型一起使用。对于未列出的新类型，
    使用 list_health_types 发现可用的内容。
    """
}
```

**优势：**
- Agent 可以使用任何 API 功能，包括你代码发布后添加的功能
- API 是验证器，而不是你的枚举定义
- 更小的工具表面（2-3 个工具 vs N 个工具）
- Agent 通过询问自然发现功能
- 适用于任何具有内省功能的 API（HealthKit、GraphQL、OpenAPI）
</principle>

<principle name="crud-completeness">
## CRUD 完整性

agent 可以创建的每种数据类型，它都应该能够读取、更新和删除。不完整的 CRUD = 操作对等性被破坏。

**反模式：仅创建工具**
```typescript
// ❌ 可以创建但不能修改或删除
tool("create_experiment", { hypothesis, variable, metric })
tool("write_journal_entry", { content, author, tags })
// 用户："删除那个实验" → Agent："我不能那样做"
```

**正确：每个实体的完整 CRUD**
```typescript
// ✅ 完整 CRUD
tool("create_experiment", { hypothesis, variable, metric })
tool("read_experiment", { id })
tool("update_experiment", { id, updates: { hypothesis?, status?, endDate? } })
tool("delete_experiment", { id })

tool("create_journal_entry", { content, author, tags })
tool("read_journal", { query?, dateRange?, author? })
tool("update_journal_entry", { id, content, tags? })
tool("delete_journal_entry", { id })
```

**CRUD 审计：**
对于应用中的每个实体类型，验证：
- [ ] 创建：Agent 可以创建新实例
- [ ] 读取：Agent 可以查询/搜索/列出实例
- [ ] 更新：Agent 可以修改现有实例
- [ ] 删除：Agent 可以删除实例

如果缺少任何操作，用户最终会要求它，agent 将失败。
</principle>

<checklist>
## MCP 工具设计清单

**基础：**
- [ ] 工具名称描述功能，而非用例
- [ ] 输入是数据，而非决策
- [ ] 输出丰富（足够 agent 验证）
- [ ] CRUD 操作是单独的工具（不是一个巨型工具）
- [ ] 工具实现中没有业务逻辑
- [ ] 通过 `isError` 清楚传达错误状态
- [ ] 描述解释工具的作用，而非何时使用

**动态能力发现（对于 agent-native 应用）：**
- [ ] 对于 agent 应该完全访问的外部 API，使用动态发现
- [ ] 为每个 API 表面包含 `list_*` 或 `discover_*` 工具
- [ ] 当 API 验证时使用字符串输入（而非枚举）
- [ ] 在运行时将可用功能注入系统提示
- [ ] 如果有意限制 agent 范围，仅使用静态工具映射

**CRUD 完整性：**
- [ ] 每个实体都有创建、读取、更新、删除操作
- [ ] 每个 UI 操作都有对应的 agent 工具
- [ ] 测试："agent 可以撤销它刚刚做的吗？"
</checklist>

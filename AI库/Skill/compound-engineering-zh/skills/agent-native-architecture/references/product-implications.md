<overview>
Agent-native 架构不仅影响产品的构建方式，还影响产品的感觉。本文档涵盖复杂度的渐进式披露、通过 agent 使用发现潜在需求，以及设计与风险和可逆性相匹配的批准流程。
</overview>

<progressive_disclosure>
## 复杂度的渐进式披露

最好的 agent-native 应用易于开始但功能强大。

### Excel 类比

Excel 是典型示例：你可以用它来列购物清单，也可以构建复杂的财务模型。相同的工具，使用深度的差异巨大。

Claude Code 具有这种品质：修复拼写错误，或重构整个代码库。接口相同——自然语言——但功能随请求而扩展。

### 模式

Agent-native 应用应该以此为目标：

**简单入口：**基本请求立即可用，无需学习曲线
```
用户："整理我的下载"
Agent:[立即完成，无需配置]
```

**可发现的深度：**用户在探索时发现可以做得更多
```
用户："按项目整理我的下载"
Agent:[适应偏好]

用户："每周一，回顾上周的下载"
Agent:[设置定期工作流]
```

**无上限：**高级用户可以以你未曾预料的方式推动系统
```
用户："将我的下载与日历交叉引用，并标记
       我在会议期间下载但尚未
       跟进的任何内容"
Agent:[组合功能来完成此任务]
```

### 如何实现

这不是你直接设计的东西。它**自然地从架构中浮现**：

1. 当功能是提示且工具可组合时...
2. 用户可以从简单开始（"整理我的下载"）...
3. 并逐渐发现复杂性（"每周一，回顾上周的..."）...
4. 无需你明确构建每个级别

Agent 在用户所在的地方满足用户。

### 设计影响

- **不要强制预先配置** - 让用户立即开始
- **不要隐藏功能** - 通过使用使它们可发现
- **不要限制复杂性** - 如果 agent 能做到，让用户要求它
- **提供提示** - 帮助用户发现可能的功能
</progressive_disclosure>

<latent_demand_discovery>
## 潜在需求发现

传统产品开发：想象用户想要什么，构建它，看看你是否正确。

Agent-native 产品开发：构建有能力的 foundation，观察用户要求 agent 做什么，将浮现的模式形式化。

### 转变

**传统方法：**
```
1. 想象用户可能想要的功能
2. 构建它们
3. 发布
4. 希望你猜对了
5. 如果错了，重建
```

**Agent-native 方法：**
```
1. 构建有能力的 foundation（原子工具、对等性）
2. 发布
3. 用户要求 agent 做事
4. 观察他们要求什么
5. 模式浮现
6. 将模式形式化为域工具或提示
7. 重复
```

### 飞轮

```
使用原子工具和对等性构建
           ↓
用户要求你未曾预料的事情
           ↓
Agent 组合工具来完成它们
（或失败，揭示能力差距）
           ↓
你观察到被请求内容的模式
           ↓
添加域工具或提示以优化常见模式
           ↓
（重复）
```

### 你学到了什么

**当用户要求且 agent 成功时：**
- 这是真正的需求
- 你的架构支持它
- 如果常见，考虑用域工具优化

**当用户要求且 agent 失败时：**
- 这是真正的需求
- 你有能力差距
- 修复差距：添加工具、修复对等性、改进上下文

**当用户不要求某事时：**
- 也许他们不需要它
- 或者也许他们不知道这是可能的（功能隐藏）

### 实现

**记录 agent 请求：**
```typescript
async function handleAgentRequest(request: string) {
  // 记录用户要求的内容
  await analytics.log({
    type: 'agent_request',
    request: request,
    timestamp: Date.now(),
  });

  // 处理请求...
}
```

**跟踪成功/失败：**
```typescript
async function completeAgentSession(session: AgentSession) {
  await analytics.log({
    type: 'agent_session',
    request: session.initialRequest,
    succeeded: session.status === 'completed',
    toolsUsed: session.toolCalls.map(t => t.name),
    iterations: session.iterationCount,
  });
}
```

**审查模式：**
- 用户最常要求什么？
- 什么失败了？为什么？
- 什么会从域工具中受益？
- 什么需要更好的上下文注入？

### 示例：发现"每周回顾"

```
第 1 周：用户开始要求"总结我本周的活动"
        Agent: 组合 list_files + read_file，有效但缓慢

第 2 周：更多用户要求类似的事情
        模式浮现：每周回顾很常见

第 3 周：为每周回顾添加提示部分
        更快、更一致、仍然灵活

第 4 周：如果仍然常见且性能很重要
        添加域工具：generate_weekly_summary
```

你不必猜测每周回顾会受欢迎。你发现了它。
</latent_demand_discovery>

<approval_and_agency>
## 批准和用户自主性

当 agent 采取主动行动——自己做事情而不是响应明确请求时——你需要决定授予多少自主权。

> **注意：**此框架适用于主动的 agent 操作。如果用户明确要求 agent 做某事（"发送那封邮件"），那已经是批准——agent 只管做。

### 风险/可逆性矩阵

考虑两个维度：
- **风险：**如果出错有多大关系？
- **可逆性：**撤回有多容易？

| 风险 | 可逆性 | 模式 | 示例 |
|--------|---------------|---------|---------|
| 低 | 容易 | **自动应用** | 整理文件 |
| 低 | 困难 | **快速确认** | 发布到私有源 |
| 高 | 容易 | **建议 + 应用** | 带撤销的代码更改 |
| 高 | 困难 | **明确批准** | 发送邮件、付款 |

### 详细模式

**自动应用（低风险、容易撤销）：**
```
Agent:[将文件整理到文件夹中]
Agent:"我已按类型将你的下载整理到文件夹中。
        你可以使用 Cmd+Z 撤销或移回它们。"
```
用户不需要批准——它很容易撤回且不太重要。

**快速确认（低风险、难以撤销）：**
```
Agent:"我已起草了一篇关于你的阅读见解的帖子：
        发布到你的源？"
        [发布] [先编辑] [取消]
```
一键确认，因为风险低，但难以取消发布。

**建议 + 应用（高风险、容易撤销）：**
```
Agent:"我建议这些代码更改来修复错误：
        [显示差异]
        应用？更改可以通过 git 撤销。"
        [应用] [修改] [取消]
```
显示将要发生的事情，使撤销清晰。

**明确批准（高风险、难以撤销）：**
```
Agent:"我已起草这封关于截止日期更改的团队邮件：
        [显示完整邮件]
        这将立即发送且无法撤回。
        输入 'send' 确认。"
```
需要明确的操作，使后果清晰。

### 实现

```swift
enum ApprovalLevel {
    case autoApply       // 直接做
    case quickConfirm    // 一键批准
    case suggestApply    // 显示预览，请求应用
    case explicitApproval // 需要明确确认
}

func approvalLevelFor(action: AgentAction) -> ApprovalLevel {
    let stakes = assessStakes(action)
    let reversibility = assessReversibility(action)

    switch (stakes, reversibility) {
    case (.low, .easy): return .autoApply
    case (.low, .hard): return .quickConfirm
    case (.high, .easy): return .suggestApply
    case (.high, .hard): return .explicitApproval
    }
}

func assessStakes(_ action: AgentAction) -> Stakes {
    switch action {
    case .organizeFiles: return .low
    case .publishToFeed: return .low
    case .modifyCode: return .high
    case .sendEmail: return .high
    case .makePayment: return .high
    }
}

func assessReversibility(_ action: AgentAction) -> Reversibility {
    switch action {
    case .organizeFiles: return .easy  // 可以移回
    case .publishToFeed: return .hard  // 人们可能看到
    case .modifyCode: return .easy     // Git 撤销
    case .sendEmail: return .hard      // 无法撤回
    case .makePayment: return .hard    // 资金已移动
    }
}
```

### 自修改考虑

当 agent 可以修改自己的行为——更改提示、更新偏好、调整工作流时，目标是：

1. **可见性：**用户可以看到更改了什么
2. **理解：**用户理解效果
3. **回滚：**用户可以撤销更改

批准流程是实现此目的的一种方法。带有易于回滚的审计日志可能是另一种。**原则是：使其清晰。**

```swift
// 当 agent 修改自己的提示时
func agentSelfModify(change: PromptChange) async {
    // 记录更改
    await auditLog.record(change)

    // 为回滚创建检查点
    await createCheckpoint(currentState)

    // 通知用户（可以是异步/批处理）
    await notifyUser("我已调整我的方法：\(change.summary)")

    // 应用更改
    await applyChange(change)
}
```
</approval_and_agency>

<capability_visibility>
## 功能可见性

用户需要发现 agent 能做什么。隐藏的功能导致利用不足。

### 问题

```
用户："帮助我的阅读"
Agent:"你想要什么帮助？"
// Agent 没有提到它可以发布到源、研究书籍、
// 生成介绍、分析主题...
```

agent 可以做这些事情，但用户不知道。

### 解决方案

**入门提示：**
```
Agent:"我可以通过几种方式帮助你阅读：
        - 研究任何书籍（网络搜索 + 保存发现）
        - 生成个性化介绍
        - 将见解发布到你的阅读源
        - 分析整个图书馆的主题
        你感兴趣的是什么？"
```

**上下文建议：**
```
用户："我刚读完《1984》"
Agent:"很好的选择！你想让我：
        - 研究历史背景？
        - 将其与你图书馆中的其他书籍进行比较？
        - 发布关于它的见解到你的源？"
```

**渐进式揭示：**
```
// 用户使用基本功能后
Agent:"顺便说一句，你也可以让我设置
        定期任务，比如'每周一，回顾我的
        阅读进度。'只要告诉我！"
```

### 平衡

- **不要用所有功能压倒**用户
- **通过使用自然揭示**功能
- **不要假设**用户会自己发现事情
- **在相关时使**功能可见
</capability_visibility>

<designing_for_trust>
## 信任设计

Agent-native 应用需要信任。用户正在给 AI 重要的能力。通过以下方式建立信任：

### 透明度

- 显示 agent 正在做什么（工具调用、进度）
- 在重要时解释推理
- 使所有 agent 工作可检查（文件、日志）

### 可预测性

- 对于类似请求的一致行为
- 需要批准时的清晰模式
- agent 可以访问的内容没有惊喜

### 可逆性

- agent 操作的容易撤销
- 重大更改前的检查点
- 清晰的回滚路径

### 控制

- 用户可以随时停止 agent
- 用户可以调整 agent 行为（提示、偏好）
- 用户可以限制功能（如果需要）

### 实现

```swift
struct AgentTransparency {
    // 显示正在发生的事情
    func onToolCall(_ tool: ToolCall) {
        showInUI("正在使用 \(tool.name)...")
    }

    // 解释推理
    func onDecision(_ decision: AgentDecision) {
        if decision.needsExplanation {
            showInUI("我选择这个是因为：\(decision.reasoning)")
        }
    }

    // 使工作可检查
    func onOutput(_ output: AgentOutput) {
        // 所有输出都在用户可以看到的文件中
        // 或在可见的 UI 状态中
    }
}
```
</designing_for_trust>

<checklist>
## 产品设计清单

### 渐进式披露
- [ ] 基本请求立即可用（无需配置）
- [ ] 通过使用可发现的深度
- [ ] 复杂性没有人为上限
- [ ] 提供功能提示

### 潜在需求发现
- [ ] agent 请求已记录
- [ ] 成功/失败已跟踪
- [ ] 定期审查模式
- [ ] 常见模式已形式化为工具/提示

### 批准和自主性
- [ ] 为每个操作类型评估风险
- [ ] 为每个操作类型评估可逆性
- [ ] 批准模式匹配风险/可逆性
- [ ] 自修改是清晰的（可见、可理解、可逆）

### 功能可见性
- [ ] 入门揭示关键功能
- [ ] 提供上下文建议
- [ ] 不期望用户猜测可能的事情

### 信任
- [ ] agent 操作是透明的
- [ ] 行为是可预测的
- [ ] 操作是可逆的
- [ ] 用户有控制权
</checklist>

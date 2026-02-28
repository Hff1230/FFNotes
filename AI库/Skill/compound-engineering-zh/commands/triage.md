---
name: triage
description: 为 CLI 待办事项系统分类和分类发现
argument-hint: "[发现列表或来源类型]"
---

- 首先将 /model 设置为 Haiku
- 然后读取 todos/ 目录中的所有待办事项

逐一呈现所有发现、决策或问题进行分类。目标是逐个检查每个项目并决定是否将其添加到 CLI 待办事项系统。

**重要：在分类期间不要编写任何代码！**

此命令用于：

- 分类代码审查发现
- 处理安全审计结果
- 审查性能分析
- 处理任何其他需要跟踪的分类发现

## 工作流

### 步骤 1：呈现每个发现

对于每个发现，按以下格式呈现：

```
---
问题 #X：[简短标题]

严重性：🔴 P1（关键）/ 🟡 P2（重要）/ 🔵 P3（锦上添花）

类别：[安全/性能/架构/错误/功能等]

描述：
[问题或改进的详细说明]

位置：[file_path:line_number]

问题场景：
[逐步说明错误之处或可能发生的情况]

拟议解决方案：
[如何修复]

预估工作量：[小（< 2 小时）/ 中（2-8 小时）/ 大（> 8 小时）]

---
您想将此添加到待办事项列表吗？
1. yes - 创建待办文件
2. next - 跳过此项
3. custom - 创建前修改
```

### 步骤 2：处理用户决策

**当用户说"yes"时：**

1. **更新现有待办文件**（如果存在）或**创建新文件名：**

   如果待办事项已存在（来自代码审查）：

   - 将文件从 `{id}-pending-{priority}-{desc}.md` 重命名为 `{id}-ready-{priority}-{desc}.md`
   - 更新 YAML frontmatter：`status: pending` → `status: ready`
   - 保持 issue_id、priority 和 description 不变

   如果创建新待办事项：

   ```
   {next_id}-ready-{priority}-{brief-description}.md
   ```

   优先级映射：

   - 🔴 P1（关键）→ `p1`
   - 🟡 P2（重要）→ `p2`
   - 🔵 P3（锦上添花）→ `p3`

   示例：`042-ready-p1-transaction-boundaries.md`

2. **更新 YAML frontmatter：**

   ```yaml
   ---
   status: ready # 重要：从 "pending" 更改为 "ready"
   priority: p1 # 或 p2、p3，基于严重性
   issue_id: "042"
   tags: [category, relevant-tags]
   dependencies: []
   ---
   ```

3. **填充或更新文件：**

   ```yaml
   # [问题标题]

   ## 问题陈述
   [来自发现的描述]

   ## 发现
   - [关键发现]
   - 位置：[file_path:line_number]
   - [场景详细信息]

   ## 拟议解决方案

   ### 选项 1：[主要解决方案]
   - **优点**：[好处]
   - **缺点**：[缺点（如果有）]
   - **工作量**：[小/中/大]
   - **风险**：[低/中/高]

   ## 建议行动
   [分类期间填写 - 具体行动计划]

   ## 技术详细信息
   - **受影响的文件**：[列出文件]
   - **相关组件**：[受影响的组件]
   - **数据库更改**：[是/否 - 如果是则描述]

   ## 资源
   - 原始发现：[此问题的来源]
   - 相关问题：[如果有]

   ## 验收标准
   - [ ] [具体成功标准]
   - [ ] 测试通过
   - [ ] 代码已审查

   ## 工作日志

   ### {date} - 批准工作
   **作者：** Claude 分类系统
   **行动：**
   - 在分类会议期间批准问题
   - 状态从 pending 更改为 ready
   - 准备被选取和处理

   **学习：**
   - [上下文和见解]

   ## 备注
   来源：{date} 的分类会议
   ```

4. **确认批准：** "✅ 已批准：`{new_filename}`（问题 #{issue_id}）- 状态：**ready** → 准备处理"

**当用户说"next"时：**

- **删除待办文件** - 从 todos/ 目录中删除，因为它不相关
- 跳到下一个项目
- 跟踪跳过的项目以供总结

**当用户说"custom"时：**

- 询问要修改什么（优先级、描述、详细信息）
- 更新信息
- 呈现修订版本
- 再次询问：yes/next/custom

### 步骤 3：继续直到全部处理完毕

- 逐个处理所有项目
- 使用 TodoWrite 跟踪以保持可见性
- 不要等待项目之间的批准 - 继续前进

### 步骤 4：最终总结

处理完所有项目后：

````markdown
## 分类完成

**总项目数：** [X] **批准的待办事项（ready）：** [Y] **跳过：** [Z]

### 批准的待办事项（准备处理）：

- `042-ready-p1-transaction-boundaries.md` - 事务边界问题
- `043-ready-p2-cache-optimization.md` - 缓存性能改进 ...

### 跳过的项目（已删除）：

- 项目 #5：[原因] - 已从 todos/ 删除
- 项目 #12：[原因] - 已从 todos/ 删除

### 所做更改摘要：

在分类期间，发生了以下状态更新：

- **Pending → Ready：** 文件名和 frontmatter 已更新以反映批准状态
- **已删除：** 跳过发现的待办文件已从 todos/ 目录中删除
- 每个批准的文件现在在 YAML frontmatter 中都有 `status: ready`

### 下一步：

1. 查看批准的待办事项：
   ```bash
   ls todos/*-ready-*.md
   ```
````

2. 开始处理批准的项目：

   ```bash
   /resolve_todo_parallel  # 高效处理多个批准的项目
   ```

3. 或选择单独的项目处理

4. 处理时，更新待办状态：
   - Ready → In Progress（在本地上下文中处理时）
   - In Progress → Complete（重命名文件：ready → complete，更新 frontmatter）

````

## 示例响应格式

```

---

问题 #5：多步骤操作缺少事务边界

严重性：🔴 P1（关键）

类别：数据完整性 / 安全

描述：GoogleOauthCallbacks concern 中的 google_oauth2_connected 回调在没有事务保护的情况下执行多个数据库操作。如果任何步骤在中途失败，数据库将处于不一致状态。

位置：app/controllers/concerns/google_oauth_callbacks.rb:13-50

问题场景：

1. User.update 成功（电子邮件已更改）
2. Account.save! 失败（验证错误）
3. 结果：用户更改了电子邮件但没有关联的账户
4. 下次登录尝试完全失败

没有事务的操作：

- 用户确认（第 13 行）
- 候选名单移除（第 14 行）
- 用户个人资料更新（第 21-23 行）
- 账户创建（第 28-37 行）
- 头像附件（第 39-45 行）
- 旅程创建（第 47 行）

拟议解决方案：将所有操作包装在 ApplicationRecord.transaction do ... end 块中

预估工作量：小（30 分钟）

---

您想将此添加到待办事项列表吗？

1. yes - 创建待办文件
2. next - 跳过此项
3. custom - 创建前修改

```

## 重要实施详细信息

### 分类期间的状态转换

**选择"yes"时：**
1. 重命名文件：`{id}-pending-{priority}-{desc}.md` → `{id}-ready-{priority}-{desc}.md`
2. 更新 YAML frontmatter：`status: pending` → `status: ready`
3. 使用分类批准条目更新工作日志
4. 确认："✅ 已批准：`{filename}`（问题 #{issue_id}）- 状态：**ready**"

**选择"next"时：**
1. 从 todos/ 目录删除待办文件
2. 跳到下一个项目
3. 系统中没有剩余文件

### 进度跟踪

每次将待办事项作为标题呈现时，包括：
- **进度：** X/Y 已完成（例如，"3/10 已完成"）
- **预估剩余时间：** 根据您的进展速度
- **节奏：** 监控每个发现的时间并相应调整预估

示例：
```

进度：3/10 已完成 | 预估时间：约 2 分钟剩余

```

### 分类期间不要编码

- ✅ 呈现发现
- ✅ 做出 yes/next/custom 决策
- ✅ 更新待办文件（重命名、frontmatter、工作日志）
- ❌ 不要实施修复或编写代码
- ❌ 不要添加详细的实施细节
- ❌ 那是 /resolve_todo_parallel 阶段的工作
```

完成后给出这些选项

```markdown
您接下来想做什么？

1. 运行 /resolve_todo_parallel 来解决待办事项
2. 提交待办事项
3. 什么都不做，去休息
```

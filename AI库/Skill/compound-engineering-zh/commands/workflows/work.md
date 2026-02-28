---
name: workflows:work
description: 高效执行工作计划，同时保持质量并完成功能
argument-hint: "[计划文件、规范或待办事项文件路径]"
---

# Work 计划执行命令

高效执行工作计划，同时保持质量并完成功能。

## 简介

此命令接收工作文档（计划、规范或待办文件）并系统地执行它。重点是**交付完整功能**，通过快速理解需求、遵循现有模式并在整个过程中保持质量。

## 输入文档

<input_document> #$ARGUMENTS </input_document>

## 执行工作流

### 阶段 1：快速开始

1. **阅读计划并澄清**

   - 完整阅读工作文档
   - 审查计划中提供的任何参考或链接
   - 如果有任何不清楚或模棱两可的地方，现在提出澄清问题
   - 获得用户批准继续
   - **不要跳过此步骤** - 现在提问比以后构建错误的东西更好

2. **设置环境**

   选择你的工作风格：

   **选项 A：在当前分支上实时工作**
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature-branch-name
   ```

   **选项 B：使用工作树并行工作（推荐用于并行开发）**
   ```bash
   # 首先询问用户："使用工作树并行工作还是在当前分支上工作？"
   # 如果使用工作树：
   skill: git-worktree
   # 该技能将在隔离的工作树中从 main 创建新分支
   ```

   **建议**：如果满足以下条件，使用工作树：
   - 你想同时处理多个功能
   - 你想在实验时保持 main 干净
   - 你计划频繁在分支之间切换

   如果满足以下条件，使用实时分支：
   - 你正在处理单个功能
   - 你更喜欢留在主仓库中

3. **创建待办列表**
   - 使用 TodoWrite 将计划分解为可操作的任务
   - 包含任务之间的依赖关系
   - 根据首先需要完成的内容确定优先级
   - 包括测试和质量检查任务
   - 保持任务具体且可完成

### 阶段 2：执行

1. **任务执行循环**

   按优先级顺序对每个任务执行：

   ```
   while (tasks remain):
     - 在 TodoWrite 中将任务标记为 in_progress
     - 阅读计划中引用的任何文件
     - 在代码库中查找类似模式
     - 遵循现有约定实施
     - 为新功能编写测试
     - 更改后运行测试
     - 将任务标记为已完成
   ```

2. **遵循现有模式**

   - 计划应引用类似的代码 - 首先阅读这些文件
   - 完全匹配命名约定
   - 尽可能重用现有组件
   - 遵循项目编码标准（参见 CLAUDE.md）
   - 如果有疑问，grep 类似的实现

3. **持续测试**

   - 在每次重大更改后运行相关测试
   - 不要等到最后才测试
   - 立即修复失败
   - 为新功能添加新测试

4. **Figma 设计同步**（如适用）

   对于使用 Figma 设计的 UI 工作：

   - 遵循设计规范实施组件
   - 使用 figma-design-sync 代理迭代比较
   - 修复发现的视觉差异
   - 重复直到实现与设计匹配

5. **跟踪进度**
   - 完成任务时保持 TodoWrite 更新
   - 注意任何阻碍因素或意外发现
   - 如果范围扩大，创建新任务
   - 让用户了解主要里程碑

### 阶段 3：质量检查

1. **运行核心质量检查**

   提交前始终运行：

   ```bash
   # 运行完整测试套件
   bin/rails test

   # 运行 linting（根据 CLAUDE.md）
   # 在推送到 origin 之前使用 linting-agent
   ```

2. **考虑审查代理**（可选）

   用于复杂、风险或大型更改：

   - **code-simplicity-reviewer**：检查不必要的复杂性
   - **kieran-rails-reviewer**：验证 Rails 约定（Rails 项目）
   - **performance-oracle**：检查性能问题
   - **security-sentinel**：扫描安全漏洞
   - **cora-test-reviewer**：审查测试质量（CORA 项目）

   使用 Task 工具并行运行审查者：

   ```
   Task(code-simplicity-reviewer): "Review changes for simplicity"
   Task(kieran-rails-reviewer): "Check Rails conventions"
   ```

   向用户展示发现并解决关键问题。

3. **最终验证**
   - 所有 TodoWrite 任务标记为已完成
   - 所有测试通过
   - Linting 通过
   - 代码遵循现有模式
   - Figma 设计匹配（如适用）
   - 没有控制台错误或警告

### 阶段 4：交付

1. **创建提交**

   ```bash
   git add .
   git status  # 审查正在提交的内容
   git diff --staged  # 检查更改

   # 使用传统格式提交
   git commit -m "$(cat <<'EOF'
   feat(scope): 描述是什么和为什么

   如需简要解释。

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

2. **为 UI 更改捕获并上传截图**（任何 UI 工作必需）

   对于**任何**设计更改、新视图或 UI 修改，你必须捕获并上传截图：

   **步骤 1：启动开发服务器**（如果未运行）
   ```bash
   bin/dev  # 在后台运行
   ```

   **步骤 2：使用 Playwright MCP 工具捕获截图**
   - `browser_navigate` 前往受影响的页面
   - `browser_resize` 设置视口（桌面或移动端，根据需要）
   - `browser_snapshot` 验证页面状态
   - `browser_take_screenshot` 捕获图像

   **步骤 3：使用 imgup 技能上传**
   ```bash
   skill: imgup
   # 然后上传每个截图：
   imgup -h pixhost screenshot.png  # pixhost 无需 API 密钥即可工作
   # 其他主机：catbox、imagebin、beeimg
   ```

   **要捕获的内容：**
   - **新屏幕**：新 UI 的截图
   - **修改的屏幕**：之前和之后的截图
   - **设计实现**：显示 Figma 设计匹配的截图

   **重要**：始终在 PR 描述中包含上传的图像 URL。这为审查者提供了视觉上下文并记录了更改。

3. **创建拉取请求**

   ```bash
   git push -u origin feature-branch-name

   gh pr create --title "Feature: [Description]" --body "$(cat <<'EOF'
   ## Summary
   - 构建了什么
   - 为什么需要
   - 做出的关键决策

   ## Testing
   - 添加/修改的测试
   - 执行的手动测试

   ## Before / After Screenshots
   | Before | After |
   |--------|-------|
   | ![before](URL) | ![after](URL) |

   ## Figma Design
   [如适用则提供链接]

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

4. **通知用户**
   - 总结完成的内容
   - 链接到 PR
   - 注意任何需要的后续工作
   - 如适用，建议后续步骤

---

## 关键原则

### 快速开始，更快执行

- 在开始时获得一次澄清，然后执行
- 不要等待完美理解 - 提问并继续
- 目标是**完成功能**，而不是创建完美的流程

### 计划是你的指南

- 工作文档应引用类似的代码和模式
- 加载这些引用并遵循它们
- 不要重新发明 - 匹配现有的

### 边做边测试

- 在每次更改后运行测试，而不是最后
- 立即修复失败
- 持续测试可以防止大意外

### 质量是内置的

- 遵循现有模式
- 为新代码编写测试
   - 在推送之前运行 linting
- 仅对复杂/风险更改使用审查代理

### 交付完整功能

   - 在继续之前将所有任务标记为已完成
   - 不要让功能完成 80%
   - 交付的完成功能胜过未交付的完美功能

## 质量检查清单

在创建 PR 之前，验证：

- [ ] 所有澄清问题已提出并得到回答
- [ ] 所有 TodoWrite 任务标记为已完成
- [ ] 测试通过（运行 `bin/rails test`）
- [ ] Linting 通过（使用 linting-agent）
- [ ] 代码遵循现有模式
- [ ] Figma 设计与实现匹配（如适用）
- [ ] 已捕获并上传之前/之后的截图（对于 UI 更改）
- [ ] 提交消息遵循传统格式
- [ ] PR 描述包括摘要、测试说明和截图

## 何时使用审查代理

**默认不使用。** 仅在以下情况使用审查代理：

- 影响许多文件的大型重构（10+）
- 安全敏感的更改（身份验证、权限、数据访问）
- 性能关键代码路径
- 复杂算法或业务逻辑
- 用户明确要求彻底审查

对于大多数功能：测试 + linting + 遵循模式就足够了。

## 要避免的常见陷阱

- **分析瘫痪** - 不要过度思考，阅读计划并执行
- **跳过澄清问题** - 现在提问，而不是在构建错误的东西之后
- **忽略计划参考** - 计划有链接是有原因的
- **最后测试** - 持续测试否则以后会受苦
- **忘记 TodoWrite** - 跟踪进度否则会失去已完成内容的跟踪
- **80% 完成综合症** - 完成功能，不要提前移动
- **过度审查简单更改** - 将审查代理留给复杂工作

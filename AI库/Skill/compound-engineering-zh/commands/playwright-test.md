---
name: playwright-test
description: 在受当前 PR 或分支影响的页面上运行 Playwright 浏览器测试
argument-hint: "[PR 编号、分支名称或 'current' 表示当前分支]"
---

# Playwright 测试命令

<command_purpose>使用 Playwright MCP 在受 PR 或分支更改影响的页面上运行端到端浏览器测试。</command_purpose>

## 简介

<role>专门从事基于浏览器的端到端测试的 QA 工程师</role>

此命令在真实浏览器中测试受影响的页面，捕获单元测试遗漏的问题：
- JavaScript 集成错误
- CSS/布局回归
- 用户工作流中断
- 控制台错误

## 前提条件

<requirements>
- 本地开发服务器正在运行（例如，`bin/dev`、`rails server`）
- Playwright MCP 服务器已连接
- 包含要测试的更改的 Git 仓库
</requirements>

## 主要任务

### 1. 确定测试范围

<test_target> $ARGUMENTS </test_target>

<determine_scope>

**如果提供了 PR 编号：**
```bash
gh pr view [number] --json files -q '.files[].path'
```

**如果是 'current' 或为空：**
```bash
git diff --name-only main...HEAD
```

**如果提供了分支名称：**
```bash
git diff --name-only main...[branch]
```

</determine_scope>

### 2. 将文件映射到路由

<file_to_route_mapping>

将更改的文件映射到可测试的路由：

| 文件模式 | 路由 |
|-------------|----------|
| `app/views/users/*` | `/users`、`/users/:id`、`/users/new` |
| `app/controllers/settings_controller.rb` | `/settings` |
| `app/javascript/controllers/*_controller.js` | 使用该 Stimulus 控制器的页面 |
| `app/components/*_component.rb` | 渲染该组件的页面 |
| `app/views/layouts/*` | 所有页面（至少测试主页） |
| `app/assets/stylesheets/*` | 关键页面的视觉回归 |
| `app/helpers/*_helper.rb` | 使用该辅助方法的页面 |

根据映射构建要测试的 URL 列表。

</file_to_route_mapping>

### 3. 验证服务器正在运行

<check_server>

在测试之前，验证本地服务器可访问：

```
mcp__playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__playwright__browser_snapshot({})
```

如果服务器未运行，通知用户：
```markdown
**Server not running**

请启动您的开发服务器：
- Rails: `bin/dev` 或 `rails server`
- Node: `npm run dev`

然后再次运行 `/playwright-test`。
```

</check_server>

### 4. 测试每个受影响的页面

<test_pages>

对于每个受影响的路由：

**步骤 1：导航并捕获快照**
```
mcp__playwright__browser_navigate({ url: "http://localhost:3000/[route]" })
mcp__playwright__browser_snapshot({})
```

**步骤 2：检查错误**
```
mcp__playwright__browser_console_messages({ level: "error" })
```

**步骤 3：验证关键元素**
- 页面标题/标题存在
- 主要内容已渲染
- 没有可见的错误消息
- 表单具有预期的字段

**步骤 4：测试关键交互（如适用）**
```
mcp__playwright__browser_click({ element: "[description]", ref: "[ref]" })
mcp__playwright__browser_snapshot({})
```

</test_pages>

### 5. 人工验证（需要时）

<human_verification>

当测试涉及以下内容时暂停以进行人工输入：

| 流程类型 | 询问内容 |
|-----------|-------------|
| OAuth | "Please sign in with [provider] and confirm it works" |
| 电子邮件 | "Check your inbox for the test email and confirm receipt" |
| 支付 | "Complete a test purchase in sandbox mode" |
| 短信 | "Verify you received the SMS code" |
| 外部 API | "Confirm the [service] integration is working" |

使用 AskUserQuestion：
```markdown
**Human Verification Needed**

此测试涉及 [flow type]。请：
1. [Action to take]
2. [What to verify]

它是否正常工作？
1. 是 - 继续测试
2. 否 - 描述问题
```

</human_verification>

### 6. 处理失败

<failure_handling>

当测试失败时：

1. **记录失败：**
   - 截取错误状态
   - 捕获控制台错误
   - 记录确切的复现步骤

2. **询问用户如何继续：**
   ```markdown
   **Test Failed: [route]**

   Issue: [description]
   Console errors: [if any]

   How to proceed?
   1. Fix now - 我将帮助调试和修复
   2. Create todo - 添加到 todos/ 以备后用
   3. Skip - 继续测试其他页面
   ```

3. **如果"Fix now"：**
   - 调查问题
   - 提出修复方案
   - 应用修复
   - 重新运行失败的测试

4. **如果"Create todo"：**
   - 创建 `{id}-pending-p1-playwright-{description}.md`
   - 继续测试

5. **如果"Skip"：**
   - 记录为跳过
   - 继续测试

</failure_handling>

### 7. 测试摘要

<test_summary>

所有测试完成后，展示摘要：

```markdown
## 🎭 Playwright 测试结果

**Test Scope:** PR #[number] / [branch name]
**Server:** http://localhost:3000

### Pages Tested: [count]

| Route | Status | Notes |
|-------|--------|-------|
| `/users` | ✅ Pass | |
| `/settings` | ✅ Pass | |
| `/dashboard` | ❌ Fail | Console error: [msg] |
| `/checkout` | ⏭️ Skip | Requires payment credentials |

### Console Errors: [count]
- [List any errors found]

### Human Verifications: [count]
- OAuth flow: ✅ Confirmed
- Email delivery: ✅ Confirmed

### Failures: [count]
- `/dashboard` - [issue description]

### Created Todos: [count]
- `005-pending-p1-playwright-dashboard-error.md`

### Result: [PASS / FAIL / PARTIAL]
```

</test_summary>

## 快速使用示例

```bash
# 测试当前分支更改
/playwright-test

# 测试特定 PR
/playwright-test 847

# 测试特定分支
/playwright-test feature/new-dashboard
```

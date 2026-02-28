---
name: reproduce-bug
description: 使用日志、控制台检查和浏览器截图重现并调查错误
argument-hint: "[GitHub issue 编号]"
---

# Reproduce Bug 命令

查看 github issue #$ARGUMENTS 并阅读问题描述和评论。

## 阶段 1：日志调查

并行运行以下代理来调查错误：

1. Task rails-console-explorer(issue_description)
2. Task appsignal-log-investigator(issue_description)

思考查看代码库时可能出现问题的地方。寻找我们可以查看的日志输出。

再次运行代理以查找任何可以帮助我们重现错误的日志。

继续运行这些代理，直到您对正在发生的情况有很好的了解。

## 阶段 2：使用 Playwright 进行视觉重现

如果错误与 UI 相关或涉及用户流程，使用 Playwright 以视觉方式重现它：

### 步骤 1：验证服务器正在运行

```
mcp__plugin_compound-engineering_pw__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_compound-engineering_pw__browser_snapshot({})
```

如果服务器未运行，通知用户启动 `bin/dev`。

### 步骤 2：导航到受影响的区域

根据问题描述，导航到相关页面：

```
mcp__plugin_compound-engineering_pw__browser_navigate({ url: "http://localhost:3000/[affected_route]" })
mcp__plugin_compound-engineering_pw__browser_snapshot({})
```

### 步骤 3：捕获截图

在重现错误的每个步骤拍摄截图：

```
mcp__plugin_compound-engineering_pw__browser_take_screenshot({ filename: "bug-[issue]-step-1.png" })
```

### 步骤 4：遵循用户流程

按照问题中的确切步骤进行：

1. **阅读问题的重现步骤**
2. **使用 Playwright 执行每个步骤：**
   - `browser_click` 用于单击元素
   - `browser_type` 用于填写表单
   - `browser_snapshot` 查看当前状态
   - `browser_take_screenshot` 捕获证据

3. **检查控制台错误：**
   ```
   mcp__plugin_compound-engineering_pw__browser_console_messages({ level: "error" })
   ```

### 步骤 5：捕获错误状态

当您重现错误时：

1. 拍摄错误状态的截图
2. 捕获控制台错误
3. 记录触发它的确切步骤

```
mcp__plugin_compound-engineering_pw__browser_take_screenshot({ filename: "bug-[issue]-reproduced.png" })
```

## 阶段 3：记录发现

**参考收集：**

- [ ] 记录所有研究结果，包括特定文件路径（例如，`app/services/example_service.rb:42`）
- [ ] 包括显示错误重现的截图
- [ ] 列出控制台错误（如果有）
- [ ] 记录确切的重现步骤

## 阶段 4：回复

向问题添加评论，包括：

1. **发现** - 您发现的关于原因的内容
2. **重现步骤** - 重现的确切步骤（已验证）
3. **截图** - 错误的视觉证据（上传捕获的截图）
4. **相关代码** - 文件路径和行号
5. **建议的修复** - 如果您有

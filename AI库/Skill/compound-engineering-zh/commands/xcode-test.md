---
name: xcode-test
description: 使用 XcodeBuildMCP 在模拟器上构建和测试 iOS 应用
argument-hint: "[方案名称或 'current' 使用默认值]"
---

# Xcode 测试命令

<command_purpose>使用 XcodeBuildMCP 在模拟器上构建、安装和测试 iOS/macOS 应用。捕获屏幕截图、日志并验证应用行为。</command_purpose>

## 简介

<role>专门从事基于模拟器测试的 iOS QA 工程师</role>

此命令通过以下方式测试 iOS/macOS 应用：
- 为模拟器构建
- 安装和启动应用
- 截取关键屏幕的屏幕截图
- 捕获控制台日志以检查错误
- 支持人工验证外部流程

## 前提条件

<requirements>
- 安装 Xcode 和命令行工具
- 连接 XcodeBuildMCP 服务器
- 有效的 Xcode 项目或工作空间
- 至少有一个可用的 iOS 模拟器
</requirements>

## 主要任务

### 0. 验证 XcodeBuildMCP 已安装

<check_mcp_installed>

**首先，检查 XcodeBuildMCP 工具是否可用。**

尝试调用：
```
mcp__xcodebuildmcp__list_simulators({})
```

**如果未找到工具或出错：**

告诉用户：
```markdown
**XcodeBuildMCP 未安装**

请先安装 XcodeBuildMCP 服务器：

\`\`\`bash
claude mcp add XcodeBuildMCP -- npx xcodebuildmcp@latest
\`\`\`

然后重启 Claude Code 并再次运行 `/xcode-test`。
```

**请勿继续**，直到确认 XcodeBuildMCP 正常工作。

</check_mcp_installed>

### 1. 发现项目和方案

<discover_project>

**查找可用的项目：**
```
mcp__xcodebuildmcp__discover_projs({})
```

**列出项目的方案：**
```
mcp__xcodebuildmcp__list_schemes({ project_path: "/path/to/Project.xcodeproj" })
```

**如果提供了参数：**
- 使用指定的方案名称
- 或 "current" 使用默认/上次使用的方案

</discover_project>

### 2. 启动模拟器

<boot_simulator>

**列出可用的模拟器：**
```
mcp__xcodebuildmcp__list_simulators({})
```

**启动首选模拟器（推荐 iPhone 15 Pro）：**
```
mcp__xcodebuildmcp__boot_simulator({ simulator_id: "[uuid]" })
```

**等待模拟器准备就绪：**
在继续安装之前检查模拟器状态。

</boot_simulator>

### 3. 构建应用

<build_app>

**为 iOS 模拟器构建：**
```
mcp__xcodebuildmcp__build_ios_sim_app({
  project_path: "/path/to/Project.xcodeproj",
  scheme: "[scheme_name]"
})
```

**处理构建失败：**
- 捕获构建错误
- 为每个构建错误创建 P1 待办事项
- 向用户报告具体的错误详细信息

**成功时：**
- 记录构建的应用路径以供安装
- 继续进行安装步骤

</build_app>

### 4. 安装和启动

<install_launch>

**在模拟器上安装应用：**
```
mcp__xcodebuildmcp__install_app_on_simulator({
  app_path: "/path/to/built/App.app",
  simulator_id: "[uuid]"
})
```

**启动应用：**
```
mcp__xcodebuildmcp__launch_app_on_simulator({
  bundle_id: "[app.bundle.id]",
  simulator_id: "[uuid]"
})
```

**开始捕获日志：**
```
mcp__xcodebuildmcp__capture_sim_logs({
  simulator_id: "[uuid]",
  bundle_id: "[app.bundle.id]"
})
```

</install_launch>

### 5. 测试关键屏幕

<test_screens>

对于应用中的每个关键屏幕：

**截取屏幕截图：**
```
mcp__xcodebuildmcp__take_screenshot({
  simulator_id: "[uuid]",
  filename: "screen-[name].png"
})
```

**审查屏幕截图是否：**
- UI 元素正确渲染
- 没有可见的错误消息
- 显示预期内容
- 布局看起来正确

**检查日志中的错误：**
```
mcp__xcodebuildmcp__get_sim_logs({ simulator_id: "[uuid]" })
```

查找：
- 崩溃
- 异常
- 错误级别的日志消息
- 失败的网络请求

</test_screens>

### 6. 人工验证（需要时）

<human_verification>

在测试涉及人工操作时暂停以等待人工输入：

| 流程类型 | 询问内容 |
|-----------|----------|
| 使用 Apple 登录 | "请在模拟器上完成使用 Apple 登录" |
| 推送通知 | "发送测试推送并确认其出现" |
| 应用内购买 | "完成沙盒购买" |
| 相机/照片 | "授予权限并验证相机是否工作" |
| 位置 | "允许位置访问并验证地图更新" |

使用 AskUserQuestion：
```markdown
**需要人工验证**

此测试需要 [流程类型]。请：
1. [在模拟器上采取的操作]
2. [要验证的内容]

它是否正常工作？
1. Yes - 继续测试
2. No - 描述问题
```

</human_verification>

### 7. 处理失败

<failure_handling>

当测试失败时：

1. **记录失败：**
   - 截取错误状态的屏幕截图
   - 捕获控制台日志
   - 记录重现步骤

2. **询问用户如何继续：**
   ```markdown
   **测试失败：[屏幕/功能]**

   问题：[描述]
   日志：[相关错误消息]

   如何继续？
   1. 立即修复 - 我将帮助调试和修复
   2. 创建待办事项 - 添加到 todos/ 以后处理
   3. 跳过 - 继续测试其他屏幕
   ```

3. **如果选择"立即修复"：**
   - 调查代码中的问题
   - 提出修复方案
   - 重新构建和重新测试

4. **如果选择"创建待办事项"：**
   - 创建 `{id}-pending-p1-xcode-{description}.md`
   - 继续测试

</failure_handling>

### 8. 测试总结

<test_summary>

所有测试完成后，呈现总结：

```markdown
## 📱 Xcode 测试结果

**项目：** [项目名称]
**方案：** [方案名称]
**模拟器：** [模拟器名称]

### 构建：✅ 成功 / ❌ 失败

### 已测试屏幕：[数量]

| 屏幕 | 状态 | 备注 |
|--------|--------|-------|
| 启动 | ✅ 通过 | |
| 主页 | ✅ 通过 | |
| 设置 | ❌ 失败 | 点击时崩溃 |
| 个人资料 | ⏭️ 跳过 | 需要登录 |

### 控制台错误：[数量]
- [列出找到的任何错误]

### 人工验证：[数量]
- 使用 Apple 登录：✅ 已确认
- 推送通知：✅ 已确认

### 失败：[数量]
- 设置屏幕 - 导航时崩溃

### 创建的待办事项：[数量]
- `006-pending-p1-xcode-settings-crash.md`

### 结果：[通过 / 失败 / 部分]
```

</test_summary>

### 9. 清理

<cleanup>

测试完成后：

**停止日志捕获：**
```
mcp__xcodebuildmcp__stop_log_capture({ simulator_id: "[uuid]" })
```

**可选择关闭模拟器：**
```
mcp__xcodebuildmcp__shutdown_simulator({ simulator_id: "[uuid]" })
```

</cleanup>

## 快速使用示例

```bash
# 使用默认方案测试
/xcode-test

# 测试特定方案
/xcode-test MyApp-Debug

# 更改后测试
/xcode-test current
```

## 与 /workflows:review 集成

当审查涉及 iOS 代码的 PR 时，`/workflows:review` 命令可以将其作为子代理启动：

```
Task general-purpose("为方案 [name] 运行 /xcode-test。在模拟器上构建、安装、测试关键屏幕、检查崩溃。")
```

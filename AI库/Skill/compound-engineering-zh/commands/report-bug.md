---
name: report-bug
description: 报告 compound-engineering-zh 插件中的错误
argument-hint: "[可选：错误的简要描述]"
---

# 报告复合工程插件错误

报告使用 compound-engineering-zh 插件时遇到的错误。此命令收集结构化信息并为维护者创建 GitHub issue。

## 步骤 1：收集错误信息

使用 AskUserQuestion 工具收集以下信息：

**问题 1：错误类别**
- 您遇到的是什么类型的问题？
- 选项：代理不工作、命令不工作、技能不工作、MCP 服务器问题、安装问题、其他

**问题 2：特定组件**
- 哪个特定组件受影响？
- 询问代理、命令、技能或 MCP 服务器的名称

**问题 3：发生了什么（实际行为）**
- 询问："您使用此组件时发生了什么？"
- 获得实际行为的清晰描述

**问题 4：应该发生什么（预期行为）**
- 询问："您预期会发生什么？"
- 获得预期行为的清晰描述

**问题 5：重现步骤**
- 询问："错误发生前您采取了什么步骤？"
- 获取重现步骤

**问题 6：错误消息**
- 询问："您看到任何错误消息了吗？如果有，请分享它们。"
- 捕获任何错误输出

## 步骤 2：收集环境信息

自动收集：
```bash
# 获取插件版本
cat ~/.claude/plugins/installed_plugins.json 2>/dev/null | grep -A5 "compound-engineering" | head -10 || echo "Plugin info not found"

# 获取 Claude Code 版本
claude --version 2>/dev/null || echo "Claude CLI version unknown"

# 获取操作系统信息
uname -a
```

## 步骤 3：格式化错误报告

创建一个结构良好的错误报告：

```markdown
## 错误描述

**组件：** [类型] - [名称]
**摘要：** [来自参数或收集信息的简要描述]

## 环境

- **插件版本：** [来自 installed_plugins.json]
- **Claude Code 版本：** [来自 claude --version]
- **操作系统：** [来自 uname]

## 发生了什么

[实际行为描述]

## 预期行为

[预期行为描述]

## 重现步骤

1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

## 错误消息

```
[任何错误输出]
```

## 附加上下文

[任何其他相关信息]

---
*通过 `/report-bug` 命令报告*
```

## 步骤 4：创建 GitHub Issue

使用 GitHub CLI 创建 issue：

```bash
gh issue create \
  --repo EveryInc/ray-marketplace \
  --title "[compound-engineering] Bug: [Brief description]" \
  --body "[Formatted bug report from Step 3]" \
  --label "bug,compound-engineering"
```

**注意：** 如果标签不存在，则不使用标签创建：
```bash
gh issue create \
  --repo EveryInc/ray-marketplace \
  --title "[compound-engineering] Bug: [Brief description]" \
  --body "[Formatted bug report]"
```

## 步骤 5：确认提交

创建 issue 后：
1. 向用户显示 issue URL
2. 感谢他们报告错误
3. 通知他们维护者（Kieran Klaassen）将收到通知

## 输出格式

```
✅ 错误报告提交成功！

Issue: https://github.com/EveryInc/ray-marketplace/issues/[NUMBER]
Title: [compound-engineering] Bug: [description]

感谢您帮助改进 compound-engineering-zh 插件！
维护者将审查您的报告并尽快回复。
```

## 错误处理

- 如果 `gh` CLI 未通过身份验证：提示用户先运行 `gh auth login`
- 如果 issue 创建失败：显示格式化的报告，以便用户可以手动创建 issue
- 如果缺少必需信息：重新提示填写该特定字段

## 隐私声明

此命令不收集：
- 个人信息
- API 密钥或凭据
- 您项目的私有代码
- 超出基本操作系统信息的文件路径

报告中仅包含关于错误的技术信息。

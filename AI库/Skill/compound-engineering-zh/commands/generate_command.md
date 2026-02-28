---
name: generate_command
description: 创建遵循约定和最佳实践的新自定义斜杠命令
argument-hint: "[命令目的和要求]"
---

# 创建自定义 Claude Code 命令

在 `.claude/commands/` 中为请求的任务创建新的斜杠命令。

## 目标

#$ARGUMENTS

## 要利用的关键功能

**文件操作：**
- Read、Edit、Write - 精确修改文件
- Glob、Grep - 搜索代码库
- MultiEdit - 原子性多部分更改

**开发：**
- Bash - 运行命令（git、测试、linter）
- Task - 为复杂任务启动专业代理
- TodoWrite - 使用待办事项列表跟踪进度

**Web 和 API：**
- WebFetch、WebSearch - 研究文档
- GitHub (gh cli) - PR、问题、审查
- Playwright - 浏览器自动化、截图

**集成：**
- AppSignal - 日志和监控
- Context7 - 框架文档
- Stripe、Todoist、Featurebase（如果相关）

## 最佳实践

1. **具体明确** - 详细的指令会产生更好的结果
2. **分解复杂任务** - 使用分步计划
3. **使用示例** - 参考现有代码模式
4. **包含成功标准** - 测试通过、代码检查干净等
5. **先思考** - 对复杂问题使用 "think hard" 或 "plan" 关键字
6. **迭代** - 逐步引导过程

## 必需：YAML Frontmatter

**每个命令必须以 YAML frontmatter 开头：**

```yaml
---
name: command-name
description: 对此命令功能的简要描述（最多 100 个字符）
argument-hint: "[命令接受什么参数]"
---
```

**字段：**
- `name`：小写命令标识符（内部使用）
- `description`：对命令用途的清晰简洁的摘要
- `argument-hint`：显示用户期望的参数（例如 `[file path]`、`[PR number]`、`[optional: format]`）

## 构建命令

```markdown
# [命令名称]

[对此命令功能的简要描述]

## 步骤

1. [包含具体细节的第一步]
   - 包括文件路径、模式或约束
   - 参考现有代码（如果适用）

2. [第二步]
   - 尽可能使用并行工具调用
   - 检查/验证结果

3. [最后步骤]
   - 运行测试
   - 代码检查
   - 提交更改（如果适用）

## 成功标准

- [ ] 测试通过
- [ ] 代码遵循风格指南
- [ ] 文档已更新（如果需要）
```

## 有效命令的提示

- **使用 $ARGUMENTS** 占位符进行动态输入
- **参考 CLAUDE.md** 模式和约定
- **包括验证步骤** - 测试、linter、视觉检查
- **明确约束** - 不要修改 X，使用模式 Y
- **使用 XML 标签** 进行结构化提示：`<task>`、`<requirements>`、`<constraints>`

## 示例模式

```markdown
按照以下步骤实现 #$ARGUMENTS：

1. 研究现有模式
   - 使用 Grep 搜索类似代码
   - 阅读相关文件以了解方法

2. 规划实施
   - 考虑边界情况和需求
   - 考虑所需的测试用例

3. 实施
   - 遵循现有代码模式（参考特定文件）
   - 如果进行 TDD，首先编写测试
   - 确保代码遵循 CLAUDE.md 约定

4. 验证
   - 运行测试：`bin/rails test`
   - 运行 linter：`bundle exec standardrb`
   - 使用 git diff 检查更改

5. 提交（可选）
   - 暂存更改
   - 编写清晰的提交消息
```

## 创建命令文件

1. **在以下位置创建文件** `.claude/commands/[name].md`（支持 `workflows/` 等子目录）
2. **以 YAML frontmatter 开头**（见上面的部分）
3. **使用上面的模板构建命令**
4. **使用适当的参数测试命令**

## 命令文件模板

```markdown
---
name: command-name
description: 命令的功能
argument-hint: "[期望的参数]"
---

# 命令标题

简要介绍命令的功能以及何时使用它。

## 工作流

### 步骤 1：[第一个主要步骤]

关于做什么的详细信息。

### 步骤 2：[第二个主要步骤]

关于做什么的详细信息。

## 成功标准

- [ ] 期望的结果 1
- [ ] 期望的结果 2
```

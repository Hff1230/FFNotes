---
name: heal-skill
description: 修复错误的 SKILL.md 文件，当技能有错误的指令或过时的 API 引用时
argument-hint: [可选：要修复的具体问题]
allowed-tools: [Read, Edit, Bash(ls:*), Bash(git:*)]
---

<objective>
根据执行过程中发现的更正更新技能的 SKILL.md 和相关文件。

分析对话以检测哪个技能正在运行，反思出了什么问题，提出具体的修复，获得用户批准，然后应用更改并可选择提交。
</objective>

<context>
技能检测：!`ls -1 ./skills/*/SKILL.md | head -5`
</context>

<quick_start>
<workflow>
1. **检测技能** 从对话上下文（调用消息、最近的 SKILL.md 引用）
2. **反思** 出了什么问题以及如何发现修复
3. **呈现** 建议的更改以及之前/之后的差异
4. **获得批准** 在进行任何编辑之前
5. **应用** 更改并可选择提交
</workflow>
</quick_start>

<process>
<step_1 name="detect_skill">
从对话上下文中识别技能：

- 查找技能调用消息
- 检查最近引用了哪个 SKILL.md
- 检查当前任务上下文

设置：`SKILL_NAME=[skill-name]` 和 `SKILL_DIR=./skills/$SKILL_NAME`

如果不清楚，请询问用户。
</step_1>

<step_2 name="reflection_and_analysis">
如果提供了 $ARGUMENTS，则专注于它，否则分析更广泛的上下文。

确定：
- **出了什么问题**：引用 SKILL.md 中不正确的特定部分
- **发现方法**：Context7、错误消息、试错、文档查找
- **根本原因**：过时的 API、不正确的参数、错误的端点、缺少上下文
- **影响范围**：单个部分还是多个？相关文件是否受影响？
- **建议的修复**：哪些文件、哪些部分、每个文件的之前/之后
</step_2>

<step_3 name="scan_affected_files">
```bash
ls -la $SKILL_DIR/
ls -la $SKILL_DIR/references/ 2>/dev/null
ls -la $SKILL_DIR/scripts/ 2>/dev/null
```
</step_3>

<step_4 name="present_proposed_changes">
以以下格式呈现更改：

```
**正在修复的技能：** [skill-name]
**发现的问题：** [1-2 句话摘要]
**根本原因：** [简要说明]

**要修改的文件：**
- [ ] SKILL.md
- [ ] references/[file].md
- [ ] scripts/[file].py

**建议的更改：**

### 更改 1：SKILL.md - [Section name]
**位置：** SKILL.md 中的第 [X] 行

**当前（不正确）：**
```
[当前文件中的确切文本]
```

**已更正：**
```
[新文本]
```

**原因：** [为什么这可以解决问题]

[对所有文件中的每个更改重复]

**影响评估：**
- 影响：[身份验证/API 端点/参数/示例等]

**验证：**
这些更改将防止：[促使此操作的特定错误]
```
</step_4>

<step_5 name="request_approval">
```
我应该应用这些更改吗？

1. 是的，应用并提交所有更改
2. 应用但不提交（让我先审查）
3. 修改更改（我将提供反馈）
4. 取消（不进行更改）

选择 (1-4)：
```

**等待用户响应。未经批准不得继续。**
</step_5>

<step_6 name="apply_changes">
仅在批准后（选项 1 或 2）：

1. 对所有文件中的每个更正使用编辑工具
2. 读回修改的部分以验证
3. 如果选项 1，使用结构化消息提交，显示修复的内容
4. 使用文件列表确认完成
</step_6>
</process>

<success_criteria>
- 从对话上下文中正确检测到技能
- 所有不正确的部分都标识了之前/之后
- 用户在应用之前批准了更改
- 在 SKILL.md 和相关文件上应用了所有编辑
- 通过读回验证了更改
- 如果用户选择了选项 1，则创建了提交
- 使用文件列表确认完成
</success_criteria>

<verification>
完成之前：

- 读回每个修改的部分以确认应用了更改
- 确保跨文件一致性（SKILL.md 示例与 references/ 匹配）
- 如果选择了选项 1，验证已创建 git 提交
- 检查没有意外文件被修改
</verification>

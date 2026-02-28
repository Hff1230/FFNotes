# 推荐的技能结构

复杂技能的最佳结构将路由、工作流和知识分离开来。

<structure>
```
skill-name/
├── SKILL.md              # 路由器 + 核心原则（不可避免）
├── workflows/            # 分步流程（如何做）
│   ├── workflow-a.md
│   ├── workflow-b.md
│   └── ...
└── references/           # 领域知识（是什么）
    ├── reference-a.md
    ├── reference-b.md
    └── ...
```
</structure>

<why_this_works>
## 解决的问题

**问题 1：上下文被跳过**
当重要原则在单独的文件中时，Claude 可能不会读取它们。
**解决方案：** 将核心原则直接放在 SKILL.md 中。它们会自动加载。

**问题 2：加载了错误的上下文**
"构建"任务加载了调试参考。"调试"任务加载了构建参考。
**解决方案：** 接入问题确定意图 → 路由到特定工作流 → 工作流指定要读取哪些参考。

**问题 3：单体技能令人不知所措**
500+ 行混合内容使得很难找到相关部分。
**解决方案：** 小型路由器（SKILL.md）+ 专注的工作流 + 参考库。

**问题 4：流程与知识混合**
"如何做 X" 与 "X 的含义" 混合在一起会造成混乱。
**解决方案：** 工作流是流程（步骤）。参考是知识（模式、示例）。
</why_this_works>

<skill_md_template>
## SKILL.md 模板

```markdown
---
name: skill-name
description: 它的作用以及何时使用它。
---

<essential_principles>
## 此技能的工作原理

[适用于所有工作流的内联原则。不能跳过。]

### 原则 1：[名称]
[简要解释]

### 原则 2：[名称]
[简要解释]
</essential_principles>

<intake>
**询问用户：**

您想做什么？
1. [选项 A]
2. [选项 B]
3. [选项 C]
4. 其他

**等待响应后再继续。**
</intake>

<routing>
| 响应 | 工作流 |
|----------|----------|
| 1, "关键词", "关键词" | `workflows/option-a.md` |
| 2, "关键词", "关键词" | `workflows/option-b.md` |
| 3, "关键词", "关键词" | `workflows/option-c.md` |
| 4, 其他 | 澄清，然后选择 |

**阅读工作流后，严格遵循它。**
</routing>

<reference_index>
`references/` 中的所有领域知识：

**类别 A：** file-a.md, file-b.md
**类别 B：** file-c.md, file-d.md
</reference_index>

<workflows_index>
| 工作流 | 目的 |
|----------|---------|
| option-a.md | [它的作用] |
| option-b.md | [它的作用] |
| option-c.md | [它的作用] |
</workflows_index>
```
</skill_md_template>

<workflow_template>
## 工作流模板

```markdown
# 工作流：[名称]

<required_reading>
**现在阅读这些参考文件：**
1. references/relevant-file.md
2. references/another-file.md
</required_reading>

<process>
## 步骤 1：[名称]
[做什么]

## 步骤 2：[名称]
[做什么]

## 步骤 3：[名称]
[做什么]
</process>

<success_criteria>
此工作流在以下情况下完成：
- [ ] 标准 1
- [ ] 标准 2
- [ ] 标准 3
</success_criteria>
```
</workflow_template>

<when_to_use_this_pattern>
## 何时使用此模式

**在以下情况使用路由器 + 工作流 + 参考：**
- 多个不同的工作流（构建 vs 调试 vs 发布）
- 不同的工作流需要不同的参考
- 核心原则不能跳过
- 技能增长超过 200 行

**在以下情况使用简单的单文件技能：**
- 一个工作流
- 小型参考集
- 总共少于 200 行
- 没有强制执行的核心原则
</when_to_use_this_pattern>

<key_insight>
## 关键见解

**SKILL.md 始终被加载。利用这一保证。**

将不可避免的内容放在 SKILL.md 中：
- 核心原则
- 接入问题
- 路由逻辑

将工作流特定的内容放在 workflows/ 中：
- 分步流程
- 该工作流所需的参考
- 该工作流的成功标准

将可复用的知识放在 references/ 中：
- 模式和示例
- 技术细节
- 领域专业知识
</key_insight>

---
name: {{SKILL_NAME}}
description: {{它做什么}} 当{{触发条件}}时使用。
---

<essential_principles>
## {{核心概念}}

{{无论运行哪个工作流都始终适用的原则}}

### 1. {{第一原则}}
{{解释}}

### 2. {{第二原则}}
{{解释}}

### 3. {{第三原则}}
{{解释}}
</essential_principles>

<intake>
**询问用户：**

您想做什么？
1. {{第一个选项}}
2. {{第二个选项}}
3. {{第三个选项}}

**在继续之前等待响应。**
</intake>

<routing>
| 响应 | 工作流 |
|----------|----------|
| 1, "{{keywords}}" | `workflows/{{first-workflow}}.md` |
| 2, "{{keywords}}" | `workflows/{{second-workflow}}.md` |
| 3, "{{keywords}}" | `workflows/{{third-workflow}}.md` |

**阅读工作流后，严格遵循它。**
</routing>

<quick_reference>
## {{技能名称}} 快速参考

{{始终有用的简短参考信息}}
</quick_reference>

<reference_index>
## 领域知识

全部在 `references/` 中：
- {{reference-1.md}} - {{目的}}
- {{reference-2.md}} - {{目的}}
</reference_index>

<workflows_index>
## 工作流

全部在 `workflows/` 中：

| 工作流 | 用途 |
|----------|---------|
| {{first-workflow}}.md | {{目的}} |
| {{second-workflow}}.md | {{目的}} |
| {{third-workflow}}.md | {{目的}} |
</workflows_index>

<success_criteria>
一个执行良好的 {{skill name}}：
- {{第一标准}}
- {{第二标准}}
- {{第三标准}}
</success_criteria>

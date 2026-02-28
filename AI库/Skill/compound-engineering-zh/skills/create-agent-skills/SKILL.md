---
name: creating-agent-skills
description: 当创建、编写和改进 Claude Code 技能时的专家指导。在使用 SKILL.md 文件、编写新技能、改进现有技能或理解技能结构和最佳实践时使用。
---

# 创建智能体技能

此技能教授如何按照 Anthropic 官方规范创建有效的 Claude Code 技能。

## 核心原则

### 1. 技能即提示

所有提示最佳实践都适用。要清晰、要直接。假设 Claude 是聪明的——只添加 Claude 没有的上下文。

### 2. 标准 Markdown 格式

使用 YAML frontmatter + markdown 主体。**无 XML 标签** - 使用标准 markdown 标题。

```markdown
---
name: my-skill-name
description: 它的作用以及何时使用它
---

# My Skill Name

## 快速开始
立即可操作的指导...

## 说明
分步过程...

## 示例
显示预期行为的具体用法示例...
```

### 3. 渐进式披露

保持 SKILL.md 在 500 行以下。将详细内容拆分为参考文件。仅加载需要的内容。

```
my-skill/
├── SKILL.md              # 入口点（必需）
├── reference.md          # 详细文档（需要时加载）
├── examples.md           # 使用示例
└── scripts/              # 实用脚本（已执行，未加载）
```

### 4. 有效描述

description 字段启用技能发现。包括技能的作用以及何时使用它。使用第三人称。

**良好：**
```yaml
description: 从 PDF 文件中提取文本和表格、填写表单、合并文档。在使用 PDF 文件或用户提及 PDF、表单或文档提取时使用。
```

**不良：**
```yaml
description: 帮助处理文档
```

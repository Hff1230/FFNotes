# Anthropic 官方技能规范

来源：[code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)

## SKILL.md 文件结构

每个技能都需要一个 `SKILL.md` 文件，包含 YAML frontmatter 和 Markdown 指令。

### 基本格式

```markdown
---
name: your-skill-name
description: 对此技能功能的简要描述以及何时使用它
---

# 您的技能名称

## 指令
为 Claude 提供清晰的、循序渐进的指导。

## 示例
展示使用此技能的具体示例。
```

## 必需的 Frontmatter 字段

| 字段 | 必需 | 描述 |
|-------|----------|-------------|
| `name` | 是 | 技能名称，仅使用小写字母、数字和连字符（最多 64 个字符）。应与目录名称匹配。 |
| `description` | 是 | 技能的功能以及何时使用它（最多 1024 个字符）。Claude 使用此字段来决定何时应用该技能。 |
| `allowed-tools` | 否 | 当此技能处于活动状态时，Claude 可以在未经许可的情况下使用的工具。例如：`Read, Grep, Glob` |
| `model` | 否 | 当此技能处于活动状态时使用的特定模型（例如 `claude-sonnet-4-20250514`）。默认为对话的模型。 |

## 技能位置和优先级

```
Enterprise（最高优先级）→ Personal → Project → Plugin（最低优先级）
```

| 类型 | 路径 | 适用于 |
|------|------|-----------|
| **Enterprise** | 参见托管设置 | 组织中的所有用户 |
| **Personal** | `~/.claude/skills/` | 您，跨所有项目 |
| **Project** | `.claude/skills/` | 在仓库中工作的任何人 |
| **Plugin** | 随插件捆绑 | 任何安装了插件的人 |

## 技能的工作原理

1. **发现**：Claude 在启动时仅加载名称和描述
2. **激活**：当您的请求匹配技能的描述时，Claude 会请求确认
3. **执行**：Claude 遵循技能的指令并加载引用的文件

**关键原则**：技能是**模型调用**的 — Claude 根据您的请求自动决定使用哪些技能。

## 渐进式披露模式

通过链接到支持文件来保持 `SKILL.md` 在 500 行以下：

```
my-skill/
├── SKILL.md（必需 - 概述和导航）
├── reference.md（详细的 API 文档 - 按需加载）
├── examples.md（使用示例 - 按需加载）
└── scripts/
    └── helper.py（实用程序脚本 - 被执行，不被加载）
```

### 带有引用的示例 SKILL.md

```markdown
---
name: pdf-processing
description: 提取文本、填写表单、合并 PDF。在处理 PDF 文件、表单或文档提取时使用。需要 pypdf 和 pdfplumber 包。
allowed-tools: Read, Bash(python:*)
---

# PDF 处理

## 快速开始

提取文本：
```python
import pdfplumber
with pdfplumber.open("doc.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

有关表单填写，请参阅 [FORMS.md](FORMS.md)。
有关详细的 API 参考，请参阅 [REFERENCE.md](REFERENCE.md)。

## 要求

必须安装软件包：
```bash
pip install pypdf pdfplumber
```
```

## 限制工具访问

```yaml
---
name: reading-files-safely
description: 在不进行更改的情况下读取文件。当您需要只读文件访问时使用。
allowed-tools: Read, Grep, Glob
---
```

好处：
- 不应修改文件的只读技能
- 特定任务的有限范围
- 安全敏感的工作流

## 编写有效的描述

`description` 字段启用技能发现，应包括技能的功能以及何时使用它。

**始终使用第三人称编写。** 描述被注入到系统提示中。

- **良好**："处理 Excel 文件并生成报告"
- **避免**："我可以帮助您处理 Excel 文件"
- **避免**："您可以使用它来处理 Excel 文件"

**具体并包含关键术语**：

```yaml
description: 从 PDF 文件中提取文本和表格、填写表单、合并文档。在处理 PDF 文件或当用户提到 PDF、表单或文档提取时使用。
```

**避免模糊的描述**：

```yaml
description: 有助于处理文档  # 太模糊了！
```

## 完整示例：提交消息生成器

```markdown
---
name: generating-commit-messages
description: 从 git diff 生成清晰的提交消息。在编写提交消息或审查暂存更改时使用。
---

# 生成提交消息

## 指令

1. 运行 `git diff --staged` 查看更改
2. 我将建议一个提交消息，包括：
   - 50 个字符以内的摘要
   - 详细描述
   - 受影响的组件

## 最佳实践

- 使用现在时态
- 解释是什么和为什么，而不是如何
```

## 完整示例：代码解释技能

```markdown
---
name: explaining-code
description: 使用视觉图表和类比来解释代码。在解释代码如何工作、教授有关代码库或当用户询问"这是如何工作的？"时使用。
---

# 解释代码

解释代码时，始终包括：

1. **从类比开始**：将代码与日常生活中的事物进行比较
2. **绘制图表**：使用 ASCII 艺术来显示流程、结构或关系
3. **逐步介绍代码**：解释一步一步发生的事情
4. **强调陷阱**：常见的误解是什么？

保持解释对话化。对于复杂的概念，使用多个类比。
```

## 分发

- **项目技能**：将 `.claude/skills/` 提交到版本控制
- **插件**：将 `skills/` 目录添加到带有技能文件夹的插件
- **企业版**：通过托管设置在整个组织内部署

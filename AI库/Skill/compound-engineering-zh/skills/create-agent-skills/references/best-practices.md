# 技能编写最佳实践

来源：[platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## 核心原则

### 简洁是关键

上下文窗口是公共资源。您的技能与 Claude 需要了解的所有其他内容共享上下文窗口。

**默认假设**：Claude 已经非常智能。只添加 Claude 尚未拥有的上下文。

质疑每条信息：
- "Claude 真的需要这个解释吗？"
- "我可以假设 Claude 知道这一点吗？"
- "这个段落是否值得其 token 成本？"

**好的示例（简洁，约 50 个 token）：**
```markdown
## 提取 PDF 文本

使用 pdfplumber 进行文本提取：

```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
```

**不好的示例（太冗长，约 150 个 token）：**
```markdown
## 提取 PDF 文本

PDF（便携式文档格式）文件是一种常见的文件格式，包含
文本、图像和其他内容。要从 PDF 中提取文本，您需要
使用一个库。有许多可用的库...
```

### 设置适当的自由度

将具体性与任务脆弱性和可变性相匹配。

**高自由度**（多种有效方法）：
```markdown
## 代码审查流程

1. 分析代码结构和组织
2. 检查潜在的错误或边缘情况
3. 建议可读性改进
4. 验证是否符合项目约定
```

**中等自由度**（首选模式带有变化）：
```markdown
## 生成报告

使用此模板并根据需要自定义：

```python
def generate_report(data, format="markdown"):
    # 处理数据
    # 以指定格式生成输出
```
```

**低自由度**（脆弱，需要精确序列）：
```markdown
## 数据库迁移

完全按照此脚本运行：

```bash
python scripts/migrate.py --verify --backup
```

不要修改命令或添加标志。
```

### 使用所有模型进行测试

技能作为模型的补充。使用 Haiku、Sonnet 和 Opus 进行测试。

- **Haiku**：技能是否提供足够的指导？
- **Sonnet**：技能是否清晰高效？
- **Opus**：技能是否避免了过度解释？

## 命名约定

使用**动名词形式**（动词 + -ing）作为技能名称：

**好的：**
- `processing-pdfs`
- `analyzing-spreadsheets`
- `managing-databases`
- `testing-code`
- `writing-documentation`

**可接受的替代方案：**
- 名词短语：`pdf-processing`、`spreadsheet-analysis`
- 面向动作：`process-pdfs`、`analyze-spreadsheets`

**避免：**
- 模糊：`helper`、`utils`、`tools`
- 通用：`documents`、`data`、`files`
- 保留：`anthropic-*`、`claude-*`

## 编写有效的描述

**始终使用第三人称编写。**描述会被注入到系统提示中。

**具体并包含关键术语：**

```yaml
# PDF 处理技能
description: 从 PDF 文件中提取文本和表格，填充表单，合并文档。在处理 PDF 文件或用户提到 PDF、表单或文档提取时使用。

# Excel 分析技能
description: 分析 Excel 电子表格，创建数据透视表，生成图表。在分析 Excel 文件、电子表格、表格数据或 .xlsx 文件时使用。

# Git 提交助手技能
description: 通过分析 git 差异生成描述性提交消息。当用户请求帮助编写提交消息或审查暂存更改时使用。
```

**避免模糊的描述：**
```yaml
description: 帮助处理文档  # 太模糊！
description: 处理数据       # 太通用！
description: 处理文件的事情 # 无用！
```

## 渐进式披露模式

### 模式 1：高级指南和参考

```markdown
---
name: pdf-processing
description: 从 PDF 文件中提取文本和表格，填充表单，合并文档。
---

# PDF 处理

## 快速开始

```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## 高级功能

**表单填充**：参见 [FORMS.md](FORMS.md)
**API 参考**：参见 [REFERENCE.md](REFERENCE.md)
**示例**：参见 [EXAMPLES.md](EXAMPLES.md)
```

### 模式 2：特定领域的组织

```
bigquery-skill/
├── SKILL.md (概述和导航)
└── reference/
    ├── finance.md (收入、账单)
    ├── sales.md (机会、管道)
    ├── product.md (API 使用、功能)
    └── marketing.md (活动、归因)
```

### 模式 3：条件细节

```markdown
# DOCX 处理

## 创建文档

使用 docx-js 创建新文档。参见 [DOCX-JS.md](DOCX-JS.md)。

## 编辑文档

对于简单编辑，直接修改 XML。

**用于修订跟踪**：参见 [REDLINING.md](REDLINING.md)
**用于 OOXML 详细信息**：参见 [OOXML.md](OOXML.md)
```

## 保持参考仅一层深

当从其他参考文件引用文件时，Claude 可能会部分读取文件。

**不好的（太深）：**
```markdown
# SKILL.md
参见 [advanced.md](advanced.md)...

# advanced.md
参见 [details.md](details.md)...

# details.md
这里是实际信息...
```

**好的（一层深）：**
```markdown
# SKILL.md

**基本用法**：[在 SKILL.md 中]
**高级功能**：参见 [advanced.md](advanced.md)
**API 参考**：参见 [reference.md](reference.md)
**示例**：参见 [examples.md](examples.md)
```

## 工作流程和反馈循环

### 带清单的工作流程

```markdown
## 研究综合工作流程

复制此清单：

```
- [ ] 步骤 1：阅读所有源文档
- [ ] 步骤 2：确定关键主题
- [ ] 步骤 3：交叉引用声明
- [ ] 步骤 4：创建结构化摘要
- [ ] 步骤 5：验证引用
```

**步骤 1：阅读所有源文档**

审查 `sources/` 中的每个文档。注意主要论点。
...
```

### 反馈循环模式

```markdown
## 文档编辑流程

1. 对 `word/document.xml` 进行编辑
2. **立即验证**：`python scripts/validate.py unpacked_dir/`
3. 如果验证失败：
   - 审查错误消息
   - 修复问题
   - 再次运行验证
4. **仅在验证通过时继续**
5. 重新构建：`python scripts/pack.py unpacked_dir/ output.docx`
```

## 常见模式

### 模板模式

```markdown
## 报告结构

使用此模板：

```markdown
# [分析标题]

## 执行摘要
[一段概述]

## 主要发现
- 带有支持数据的发现 1
- 带有支持数据的发现 2

## 建议
1. 具体可行的建议
2. 具体可行的建议
```
```

### 示例模式

```markdown
## 提交消息格式

**示例 1：**
输入：使用 JWT 令牌添加用户身份验证
输出：
```
feat(auth): 实现基于 JWT 的身份验证

添加登录端点和令牌验证中间件
```

**示例 2：**
输入：修复日期显示不正确的错误
输出：
```
fix(reports): 更正时区转换中的日期格式
```
```

### 条件工作流程模式

```markdown
## 文档修改

1. 确定修改类型：

   **创建新内容？** → 遵循"创建工作流程"
   **编辑现有内容？** → 遵循"编辑工作流程"

2. 创建工作流程：
   - 使用 docx-js 库
   - 从头开始构建文档

3. 编辑工作流程：
   - 解包现有文档
   - 直接修改 XML
   - 每次更改后验证
```

## 内容指南

### 避免时间敏感信息

**不好的：**
```markdown
如果您在 2025 年 8 月之前执行此操作，请使用旧 API。
```

**好的：**
```markdown
## 当前方法

使用 v2 API 端点：`api.example.com/v2/messages`

## 旧模式

<details>
<summary>旧版 v1 API（于 2025-08 弃用）</summary>
v1 API 使用：`api.example.com/v1/messages`
</details>
```

### 使用一致的术语

**好的 - 一致：**
- 始终"API 端点"
- 始终"字段"
- 始终"提取"

**不好的 - 不一致：**
- 混合"API 端点"、"URL"、"API 路由"、"路径"
- 混合"字段"、"框"、"元素"、"控件"

## 要避免的反模式

### Windows 风格的路径

- **好的**：`scripts/helper.py`、`reference/guide.md`
- **避免**：`scripts\helper.py`、`reference\guide.md`

### 选项太多

**不好的：**
```markdown
您可以使用 pypdf，或 pdfplumber，或 PyMuPDF，或 pdf2image，或...
```

**好的：**
```markdown
使用 pdfplumber 进行文本提取：
```python
import pdfplumber
```

对于需要 OCR 的扫描 PDF，请改用 pdf2image 和 pytesseract。
```

## 有效技能的清单

### 核心质量
- [ ] 描述具体并包含关键术语
- [ ] 描述包括内容和时机
- [ ] SKILL.md 主体在 500 行以下
- [ ] 额外细节在单独的文件中
- [ ] 没有时间敏感信息
- [ ] 术语一致
- [ ] 示例具体
- [ ] 参考仅一层深
- [ ] 适当使用渐进式披露
- [ ] 工作流程有清晰的步骤

### 代码和脚本
- [ ] 脚本显式处理错误
- [ ] 没有"巫术常量"（所有值都有理由）
- [ ] 列出了所需的包
- [ ] 脚本有清晰的文档
- [ ] 没有 Windows 风格的路径
- [ ] 关键操作的验证步骤
- [ ] 质量关键任务的反馈循环

### 测试
- [ ] 至少三个测试场景
- [ ] 使用 Haiku、Sonnet 和 Opus 进行测试
- [ ] 使用实际使用场景进行测试
- [ ] 融入团队反馈

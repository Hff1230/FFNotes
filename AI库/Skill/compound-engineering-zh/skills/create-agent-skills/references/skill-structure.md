<overview>
技能具有三个结构组件：YAML frontmatter（元数据）、纯 XML 主体结构（内容组织）和渐进式披露（文件组织）。此参考文档定义了每个组件的要求和最佳实践。
</overview>

<xml_structure_requirements>
<critical_rule>
**从技能主体内容中删除所有 markdown 标题（#、##、###）。** 替换为语义 XML 标签。在内容内保留 markdown 格式（粗体、斜体、列表、代码块、链接）。
</critical_rule>

<required_tags>
每个技能必须具有这三个标签：

- **`<objective>`** - 技能的作用及其重要性（1-3 段）
- **`<quick_start>`** - 立即可操作的指导（最小工作示例）
- **`<success_criteria>`** 或 **`<when_successful>`** - 如何知道它有效
</required_tags>

<conditional_tags>
根据技能复杂性和领域要求添加：

- **`<context>`** - 背景/情境信息
- **`<workflow>` 或 `<process>`** - 分步程序
- **`<advanced_features>`** - 深入主题（渐进式披露）
- **`<validation>`** - 如何验证输出
- **`<examples>`** - 多样本学习
- **`<anti_patterns>`** - 要避免的常见错误
- **`<security_checklist>`** - 不可协商的安全模式
- **`<testing>`** - 测试工作流程
- **`<common_patterns>`** - 代码示例和配方
- **`<reference_guides>` 或 `<detailed_references>`** - 指向参考文件的链接

有关每个标签的详细指导，请参见 [use-xml-tags.md](use-xml-tags.md)。
</conditional_tags>

<tag_selection_intelligence>
**简单技能**（单一领域，简单直接）：
- 仅必需标签
- 示例：文本提取、文件格式转换

**中等技能**（多种模式，一些复杂性）：
- 必需标签 + 根据需要的工作流程/示例
- 示例：具有步骤的文档处理、API 集成

**复杂技能**（多个领域、安全性、API）：
- 必需标签 + 适当的条件标签
- 示例：支付处理、身份验证系统、多步工作流程
</tag_selection_intelligence>

<xml_nesting>
正确嵌套 XML 标签以实现分层内容：

```xml
<examples>
<example number="1">
<input>用户输入</input>
<output>预期输出</output>
</example>
</examples>
```

始终关闭标签：
```xml
<objective>
此处为内容
</objective>
```
</xml_nesting>

<tag_naming_conventions>
使用描述性、语义名称：
- `<workflow>` 而不是 `<steps>`
- `<success_criteria>` 而不是 `<done>`
- `<anti_patterns>` 而不是 `<dont_do>`

在技能内保持一致。如果您使用 `<workflow>`，则不要为了相同目的使用 `<process>`（除非它们服务于不同的角色）。
</tag_naming_conventions>
</xml_structure_requirements>

<yaml_requirements>
<required_fields>
```yaml
---
name: skill-name-here
description: 功能以及何时使用它（第三人称，特定触发器）
---
```
</required_fields>

<name_field>
**验证规则**：
- 最多 64 个字符
- 仅小写字母、数字、连字符
- 无 XML 标签
- 无保留词："anthropic"、"claude"
- 必须与目录名称完全匹配

**示例**：
- ✅ `process-pdfs`
- ✅ `manage-facebook-ads`
- ✅ `setup-stripe-payments`
- ❌ `PDF_Processor`（大写）
- ❌ `helper`（模糊）
- ❌ `claude-helper`（保留词）
</name_field>

<description_field>
**验证规则**：
- 非空，最多 1024 个字符
- 无 XML 标签
- 第三人称（永不用第一或第二人称）
- 包括功能以及何时使用它

**关键规则**：始终使用第三人称编写。
- ✅ "处理 Excel 文件并生成报告"
- ❌ "我可以帮助您处理 Excel 文件"
- ❌ "您可以使用它来处理 Excel 文件"

**结构**：包括功能和触发器。

**有效示例**：
```yaml
description: 从 PDF 文件中提取文本和表格，填充表单，合并文档。在处理 PDF 文件或用户提到 PDF、表单或文档提取时使用。
```

```yaml
description: 分析 Excel 电子表格，创建数据透视表，生成图表。在分析 Excel 文件、电子表格、表格数据或 .xlsx 文件时使用。
```

```yaml
description: 通过分析 git 差异生成描述性提交消息。当用户请求帮助编写提交消息或审查暂存更改时使用。
```

**避免**：
```yaml
description: 帮助处理文档
```

```yaml
description: 处理数据
```
</description_field>
</yaml_requirements>

<naming_conventions>
对技能名称使用**动词-名词约定**：

<pattern name="create">
构建/编写工具

示例：`create-agent-skills`、`create-hooks`、`create-landing-pages`
</pattern>

<pattern name="manage">
管理外部服务或资源

示例：`manage-facebook-ads`、`manage-zoom`、`manage-stripe`、`manage-supabase`
</pattern>

<pattern name="setup">
配置/集成任务

示例：`setup-stripe-payments`、`setup-meta-tracking`
</pattern>

<pattern name="generate">
生成任务

示例：`generate-ai-images`
</pattern>

<avoid_patterns>
- 模糊：`helper`、`utils`、`tools`
- 通用：`documents`、`data`、`files`
- 保留词：`anthropic-helper`、`claude-tools`
- 不一致：目录 `facebook-ads` 但名称 `facebook-ads-manager`
</avoid_patterns>
</naming_conventions>

<progressive_disclosure>
<principle>
SKILL.md 作为概述，根据需要指向详细材料。这可以保持上下文窗口使用效率。
</principle>

<practical_guidance>
- 保持 SKILL.md 主体在 500 行以下
- 接近此限制时将内容拆分为单独的文件
- 从 SKILL.md 开始保持参考仅一层深
- 向超过 100 行的参考文件添加目录
</practical_guidance>

<pattern name="high_level_guide">
SKILL.md 中的快速开始，参考文件中的详细信息：

```markdown
---
name: pdf-processing
description: 从 PDF 文件中提取文本和表格，填充表单，合并文档。在处理 PDF 文件或用户提到 PDF、表单或文档提取时使用。
---

<objective>
使用 Python 库从 PDF 文件中提取文本和表格，填充表单，合并文档。
</objective>

<quick_start>
使用 pdfplumber 提取文本：

```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
</quick_start>

<advanced_features>
**表单填充**：参见 [forms.md](forms.md)
**API 参考**：参见 [reference.md](reference.md)
</advanced_features>
```

Claude 仅在需要时加载 forms.md 或 reference.md。
</pattern>

<pattern name="domain_organization">
对于具有多个域的技能，按域组织以加载不相关的上下文：

```
bigquery-skill/
├── SKILL.md (概述和导航)
└── reference/
    ├── finance.md (收入、账单指标)
    ├── sales.md (机会、管道)
    ├── product.md (API 使用、功能)
    └── marketing.md (活动、归因)
```

当用户询问收入时，Claude 仅读取 finance.md。其他文件保留在文件系统上，消耗零 token。
</pattern>

<pattern name="conditional_details">
在 SKILL.md 中显示基本内容，链接到参考文件中的高级内容：

```xml
<objective>
处理具有创建和编辑功能的 DOCX 文件。
</objective>

<quick_start>
<creating_documents>
使用 docx-js 创建新文档。参见 [docx-js.md](docx-js.md)。
</creating_documents>

<editing_documents>
对于简单编辑，直接修改 XML。

**用于修订跟踪**：参见 [redlining.md](redlining.md)
**用于 OOXML 详细信息**：参见 [ooxml.md](ooxml.md)
</editing_documents>
</quick_start>
```

Claude 仅在用户需要这些功能时读取 redlining.md 或 ooxml.md。
</pattern>

<critical_rules>
**保持参考仅一层深**：所有参考文件应直接从 SKILL.md 链接。避免嵌套参考（SKILL.md → advanced.md → details.md），因为 Claude 可能只会部分读取深度嵌套的文件。

**向长文件添加目录**：对于超过 100 行的参考文件，在顶部包含目录。

**在参考文件中使用纯 XML**：参考文件也应使用纯 XML 结构（主体中无 markdown 标题）。
</critical_rules>
</progressive_disclosure>

<file_organization>
<filesystem_navigation>
Claude 使用 bash 命令导航您的技能目录：

- 使用正斜杠：`reference/guide.md`（而不是 `reference\guide.md`）
- 描述性地命名文件：`form_validation_rules.md`（而不是 `doc2.md`）
- 按域组织：`reference/finance.md`、`reference/sales.md`
</filesystem_navigation>

<directory_structure>
典型技能结构：

```
skill-name/
├── SKILL.md (主入口点，纯 XML 结构)
├── references/ (可选，用于渐进式披露)
│   ├── guide-1.md (纯 XML 结构)
│   ├── guide-2.md (纯 XML 结构)
│   └── examples.md (纯 XML 结构)
└── scripts/ (可选，用于实用脚本)
    ├── validate.py
    └── process.py
```
</directory_structure>
</file_organization>

<anti_patterns>
<pitfall name="markdown_headings_in_body">
❌ 不要在技能主体中使用 markdown 标题：

```markdown
# PDF 处理

## 快速开始
提取文本...

## 高级功能
表单填充...
```

✅ 使用纯 XML 结构：

```xml
<objective>
具有文本提取、表单填充和合并功能的 PDF 处理。
</objective>

<quick_start>
提取文本...
</quick_start>

<advanced_features>
表单填充...
</advanced_features>
```
</pitfall>

<pitfall name="vague_descriptions">
- ❌ "帮助处理文档"
- ✅ "从 PDF 文件中提取文本和表格，填充表单，合并文档。在处理 PDF 文件或用户提到 PDF、表单或文档提取时使用。"
</pitfall>

<pitfall name="inconsistent_pov">
- ❌ "我可以帮助您处理 Excel 文件"
- ✅ "处理 Excel 文件并生成报告"
</pitfall>

<pitfall name="wrong_naming_convention">
- ❌ 目录：`facebook-ads`，名称：`facebook-ads-manager`
- ✅ 目录：`manage-facebook-ads`，名称：`manage-facebook-ads`
- ❌ 目录：`stripe-integration`，名称：`stripe`
- ✅ 目录：`setup-stripe-payments`，名称：`setup-stripe-payments`
</pitfall>

<pitfall name="deeply_nested_references">
从 SKILL.md 开始保持参考仅一层深。Claude 可能只会部分读取嵌套文件（SKILL.md → advanced.md → details.md）。
</pitfall>

<pitfall name="windows_paths">
始终使用正斜杠：`scripts/helper.py`（而不是 `scripts\helper.py`）
</pitfall>

<pitfall name="missing_required_tags">
每个技能必须具有：`<objective>`、`<quick_start>` 和 `<success_criteria>`（或 `<when_successful>`）。
</pitfall>
</anti_patterns>

<validation_checklist>
在最终确定技能之前，验证：

- ✅ YAML frontmatter 有效（名称与目录匹配，描述使用第三人称）
- ✅ 主体中无 markdown 标题（纯 XML 结构）
- ✅ 存在必需标签：objective、quick_start、success_criteria
- ✅ 条件标签适合复杂度级别
- ✅ 所有 XML 标签正确关闭
- ✅ 应用渐进式披露（SKILL.md < 500 行）
- ✅ 参考文件使用纯 XML 结构
- ✅ 文件路径使用正斜杠
- ✅ 描述性文件名
</validation_checklist>

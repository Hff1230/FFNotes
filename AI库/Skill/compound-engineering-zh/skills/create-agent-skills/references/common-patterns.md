<overview>
此参考文档记录了技能编写的常见模式，包括模板、示例、术语一致性和反模式。所有模式都使用纯 XML 结构。
</overview>

<template_pattern>
<description>
为输出格式提供模板。根据您的需求匹配严格程度。
</description>

<strict_requirements>
当输出格式必须精确和一致时使用：

```xml
<report_structure>
始终使用此精确的模板结构：

```markdown
# [分析标题]

## 执行摘要
[关键发现的一段概述]

## 主要发现
- 带有支持数据的发现 1
- 带有支持数据的发现 2
- 带有支持数据的发现 3

## 建议
1. 具体可行的建议
2. 具体可行的建议
```
</report_structure>
```

**何时使用**：合规报告、标准化格式、自动处理
</strict_requirements>

<flexible_guidance>
当 Claude 应根据上下文调整格式时使用：

```xml
<report_structure>
这是一个合理的默认格式，但请使用您的最佳判断：

```markdown
# [分析标题]

## 执行摘要
[概述]

## 主要发现
[根据您发现的内容调整部分]

## 建议
[针对特定上下文定制]
```

根据特定分析类型调整部分。
</report_structure>
```

**何时使用**：探索性分析、上下文相关格式、创意任务
</flexible_guidance>
</template_pattern>

<examples_pattern>
<description>
对于输出质量取决于查看示例的技能，提供输入/输出对。
</description>

<commit_messages_example>
```xml
<objective>
遵循传统提交格式生成提交消息。
</objective>

<commit_message_format>
遵循这些示例生成提交消息：

<example number="1">
<input>使用 JWT 令牌添加用户身份验证</input>
<output>
```
feat(auth): 实现基于 JWT 的身份验证

添加登录端点和令牌验证中间件
```
</output>
</example>

<example number="2">
<input>修复报告中日期显示不正确的错误</input>
<output>
```
fix(reports): 更正时区转换中的日期格式

在报告生成中始终如一地使用 UTC 时间戳
```
</output>
</example>

遵循此样式：type(scope): 简要描述，然后详细解释。
</commit_message_format>
```
</commit_messages_example>

<when_to_use>
- 输出格式具有文本解释无法捕获的细微差别
- 模式识别比遵循规则更容易
- 示例演示边缘情况
- 多样本学习提高质量
</when_to_use>
</examples_pattern>

<consistent_terminology>
<principle>
选择一个术语并在整个技能中使用。不一致的术语会混淆 Claude 并降低执行质量。
</principle>

<good_example>
一致使用：
- 始终"API 端点"（不混合"URL"、"API 路由"、"路径"）
- 始终"字段"（不混合"框"、"元素"、"控件"）
- 始终"提取"（不混合"拉"、"获取"、"检索"）

```xml
<objective>
使用字段映射从 API 端点提取数据。
</objective>

<quick_start>
1. 确定 API 端点
2. 将响应字段映射到您的架构
3. 提取字段值
</quick_start>
```
</good_example>

<bad_example>
不一致使用会造成混淆：

```xml
<objective>
使用元素映射从 API 路由中提取数据。
</objective>

<quick_start>
1. 确定 URL
2. 将响应框映射到您的架构
3. 检索控件值
</quick_start>
```

Claude 现在必须解释："API 路由"和"URL"是否相同？"字段"、"框"、"元素"和"控件"是否相同？
</bad_example>

<implementation>
1. 在技能开发早期选择术语
2. 在 `<objective>` 或 `<context>` 中记录关键术语
3. 使用查找/替换来强制一致性
4. 审查参考文件以确保一致使用
</implementation>
</consistent_terminology>

<provide_default_with_escape_hatch>
<principle>
提供默认方法和特殊情况的后门，而不是替代方案列表。太多选项会使决策瘫痪。
</principle>

<good_example>
带有后门的清晰默认值：

```xml
<quick_start>
使用 pdfplumber 进行文本提取：

```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

对于需要 OCR 的扫描 PDF，请改用 pdf2image 和 pytesseract。
</quick_start>
```
</good_example>

<bad_example>
太多选项会导致决策瘫痪：

```xml
<quick_start>
您可以使用以下任何库：

- **pypdf**：适合基本提取
- **pdfplumber**：更适合表格
- **PyMuPDF**：更快但更复杂
- **pdf2image**：用于扫描文档
- **pdfminer**：低级控制
- **tabula-py**：专注于表格

根据您的需求选择。
</quick_start>
```

Claude 现在必须在开始之前研究和比较所有选项。这会浪费 token 和时间。
</bad_example>

<implementation>
1. 推荐一种默认方法
2. 解释何时使用默认值（暗示：大多数时候）
3. 为边缘情况添加一个后门
4. 如果确实需要多个替代方案，请链接到高级参考
</implementation>
</provide_default_with_escape_hatch>

<anti_patterns>
<description>
在编写技能时要避免的常见错误。
</description>

<pitfall name="markdown_headings_in_body">
❌ **不好**：在技能主体中使用 markdown 标题：

```markdown
# PDF 处理

## 快速开始
使用 pdfplumber 提取文本...

## 高级功能
表单填充需要额外设置...
```

✅ **好的**：使用纯 XML 结构：

```xml
<objective>
具有文本提取、表单填充和合并功能的 PDF 处理。
</objective>

<quick_start>
使用 pdfplumber 提取文本...
</quick_start>

<advanced_features>
表单填充需要额外设置...
</advanced_features>
```

**为什么重要**：XML 提供语义含义、可靠的解析和 token 效率。
</pitfall>

<pitfall name="vague_descriptions">
❌ **不好**：
```yaml
description: 帮助处理文档
```

✅ **好的**：
```yaml
description: 从 PDF 文件中提取文本和表格，填充表单，合并文档。在处理 PDF 文件或用户提到 PDF、表单或文档提取时使用。
```

**为什么重要**：模糊的描述会阻止 Claude 适当地发现和使用技能。
</pitfall>

<pitfall name="inconsistent_pov">
❌ **不好**：
```yaml
description: 我可以帮助您处理 Excel 文件并生成报告
```

✅ **好的**：
```yaml
description: 处理 Excel 文件并生成报告。在分析电子表格或 .xlsx 文件时使用。
```

**为什么重要**：技能必须使用第三人称。第一/第二人称会破坏技能元数据模式。
</pitfall>

<pitfall name="wrong_naming_convention">
❌ **不好**：目录名称与技能名称不匹配或不符合动词-名词约定：
- 目录：`facebook-ads`，名称：`facebook-ads-manager`
- 目录：`stripe-integration`，名称：`stripe`
- 目录：`helper-scripts`，名称：`helper`

✅ **好的**：一致的动词-名词约定：
- 目录：`manage-facebook-ads`，名称：`manage-facebook-ads`
- 目录：`setup-stripe-payments`，名称：`setup-stripe-payments`
- 目录：`process-pdfs`，名称：`process-pdfs`

**为什么重要**：命名一致性使技能可发现和可预测。
</pitfall>

<pitfall name="too_many_options">
❌ **不好**：
```xml
<quick_start>
您可以使用 pypdf，或 pdfplumber，或 PyMuPDF，或 pdf2image，或 pdfminer，或 tabula-py...
</quick_start>
```

✅ **好的**：
```xml
<quick_start>
使用 pdfplumber 进行文本提取：

```python
import pdfplumber
```

对于需要 OCR 的扫描 PDF，请改用 pdf2image 和 pytesseract。
</quick_start>
```

**为什么重要**：决策瘫痪。提供一个默认方法和特殊情况的后门。
</pitfall>

<pitfall name="deeply_nested_references">
❌ **不好**：参考嵌套多层：
```
SKILL.md → advanced.md → details.md → examples.md
```

✅ **好的**：从 SKILL.md 开始参考仅一层深：
```
SKILL.md → advanced.md
SKILL.md → details.md
SKILL.md → examples.md
```

**为什么重要**：Claude 可能只会部分读取深度嵌套的文件。从 SKILL.md 开始保持参考仅一层深。
</pitfall>

<pitfall name="windows_paths">
❌ **不好**：
```xml
<reference_guides>
参见 scripts\validate.py 进行验证
</reference_guides>
```

✅ **好的**：
```xml
<reference_guides>
参见 scripts/validate.py 进行验证
</reference_guides>
```

**为什么重要**：始终使用正斜杠以实现跨平台兼容性。
</pitfall>

<pitfall name="dynamic_context_and_file_reference_execution">
**问题**：当显示动态上下文语法（感叹号 + 反引号）或文件引用（@ 前缀）的示例时，技能加载器会在技能加载期间执行这些。

❌ **不好** - 这些在技能加载期间执行：
```xml
<examples>
使用以下命令加载当前状态：!`git status`
在 @package.json 中审查依赖项
</examples>
```

✅ **好的** - 添加空格以防止执行：
```xml
<examples>
使用以下命令加载当前状态：! `git status`（在实际使用中删除反引号前的空格）
在 @ package.json 中审查依赖项（在实际使用中删除 @ 后的空格）
</examples>
```

**何时适用**：
- 教用户有关动态上下文的技能（斜杠命令、提示）
- 任何显示感叹号前缀语法或 @ 文件引用的文档
- 具有不应在加载期间执行的示例命令或文件路径的技能

**为什么重要**：没有空格，这些会在技能加载期间执行，导致错误或不需要的文件读取。
</pitfall>

<pitfall name="missing_required_tags">
❌ **不好**：缺少必需标签：
```xml
<quick_start>
使用此工具进行处理...
</quick_start>
```

✅ **好的**：所有必需标签都存在：
```xml
<objective>
处理具有验证和转换功能的数据文件。
</objective>

<quick_start>
使用此工具进行处理...
</quick_start>

<success_criteria>
- 输入文件成功处理
- 输出文件验证无错误
- 转换正确应用
</success_criteria>
```

**为什么重要**：每个技能必须具有 `<objective>`、`<quick_start>` 和 `<success_criteria>`（或 `<when_successful>`）。
</pitfall>

<pitfall name="hybrid_xml_markdown">
❌ **不好**：混合 XML 标签和 markdown 标题：
```markdown
<objective>
PDF 处理功能
</objective>

## 快速开始

使用 pdfplumber 提取文本...

## 高级功能

表单填充...
```

✅ **好的**：全程使用纯 XML：
```xml
<objective>
PDF 处理功能
</objective>

<quick_start>
使用 pdfplumber 提取文本...
</quick_start>

<advanced_features>
表单填充...
</advanced_features>
```

**为什么重要**：结构一致性。要么使用纯 XML，要么使用纯 markdown（首选 XML）。
</pitfall>

<pitfall name="unclosed_xml_tags">
❌ **不好**：忘记关闭 XML 标签：
```xml
<objective>
处理 PDF 文件

<quick_start>
使用 pdfplumber...
</quick_start>
```

✅ **好的**：正确关闭的标签：
```xml
<objective>
处理 PDF 文件
</objective>

<quick_start>
使用 pdfplumber...
</quick_start>
```

**为什么重要**：未关闭的标签会破坏 XML 解析并创建模糊的边界。
</pitfall>
</anti_patterns>

<progressive_disclosure_pattern>
<description>
通过链接到详细的参考文件来保持 SKILL.md 简洁。Claude 仅在需要时加载参考文件。
</description>

<implementation>
```xml
<objective>
通过 Marketing API 管理 Facebook Ads 活动、广告集和广告。
</objective>

<quick_start>
<basic_operations>
参见 [basic-operations.md](basic-operations.md) 进行活动创建和管理。
</basic_operations>
</quick_start>

<advanced_features>
**自定义受众**：参见 [audiences.md](audiences.md)
**转化跟踪**：参见 [conversions.md](conversions.md)
**预算优化**：参见 [budgets.md](budgets.md)
**API 参考**：参见 [api-reference.md](api-reference.md)
</advanced_features>
```

**好处**：
- SKILL.md 保持在 500 行以下
- Claude 仅读取相关的参考文件
- Token 使用随任务复杂度缩放
- 更易于维护和更新
</implementation>
</progressive_disclosure_pattern>

<validation_pattern>
<description>
对于具有验证步骤的技能，使验证脚本详细且具体。
</description>

<implementation>
```xml
<validation>
进行更改后，立即验证：

```bash
python scripts/validate.py output_dir/
```

如果验证失败，在继续之前修复错误。验证错误包括：

- **字段未找到**："未找到字段 'signature_date'。可用字段：customer_name、order_total、signature_date_signed"
- **类型不匹配**："字段 'order_total' 期望数字，得到字符串"
- **缺少必需字段**："缺少必需字段 'customer_name'"

仅在验证通过且零错误时继续。
</validation>
```

**为什么详细错误有帮助**：
- Claude 可以在不猜测的情况下修复问题
- 特定错误消息减少迭代周期
- 错误消息中显示可用选项
</implementation>
</validation_pattern>

<checklist_pattern>
<description>
对于复杂的多步工作流程，提供 Claude 可以复制和跟踪进度的清单。
</description>

<implementation>
```xml
<workflow>
复制此清单并在完成项目时勾选：

```
任务进度：
- [ ] 步骤 1：分析表单（运行 analyze_form.py）
- [ ] 步骤 2：创建字段映射（编辑 fields.json）
- [ ] 步骤 3：验证映射（运行 validate_fields.py）
- [ ] 步骤 4：填充表单（运行 fill_form.py）
- [ ] 步骤 5：验证输出（运行 verify_output.py）
```

<step_1>
**分析表单**

运行：`python scripts/analyze_form.py input.pdf`

这将提取表单字段及其位置，保存到 `fields.json`。
</step_1>

<step_2>
**创建字段映射**

编辑 `fields.json` 为每个字段添加值。
</step_2>

<step_3>
**验证映射**

运行：`python scripts/validate_fields.py fields.json`

在继续之前修复任何验证错误。
</step_3>

<step_4>
**填充表单**

运行：`python scripts/fill_form.py input.pdf fields.json output.pdf`
</step_4>

<step_5>
**验证输出**

运行：`python scripts/verify_output.py output.pdf`

如果验证失败，返回步骤 2。
</step_5>
</workflow>
```

**好处**：
- 清晰的进度跟踪
- 防止跳过步骤
- 易于在中断后恢复
</implementation>
</checklist_pattern>

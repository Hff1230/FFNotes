<overview>
核心原则指导技能创作决策。这些原则确保技能在不同模型和用例中高效、有效且可维护。
</overview>

<xml_structure_principle>
<description>
技能使用纯 XML 结构以实现一致的解析、高效的 token 使用和改进的 Claude 性能。
</description>

<why_xml>
<consistency>
XML 强制所有技能的一致结构。所有技能为相同目的使用相同的标签名称：
- `<objective>` 始终定义技能的功能
- `<quick_start>` 始终提供即时指导
- `<success_criteria>` 始终定义完成

这种一致性使技能可预测且更易于维护。
</consistency>

<parseability>
XML 提供明确的边界和语义含义。Claude 可以可靠地：
- 识别部分边界（内容的开始和结束位置）
- 理解内容目的（每个部分扮演的角色）
- 跳过不相关的部分（渐进式披露）
- 以编程方式解析（验证工具可以检查结构）

Markdown 标题只是视觉格式。Claude 必须从标题文本推断含义，这不太可靠。
</parseability>

<token_efficiency>
XML 标记比 markdown 标题更高效：

**Markdown 标题**：
```markdown
## 快速开始
## 工作流
## 高级功能
## 成功标准
```
总计：约 20 个 token，对 Claude 没有语义含义

**XML 标记**：
```xml
<quick_start>
<workflow>
<advanced_features>
<success_criteria>
```
总计：约 15 个 token，内置语义含义

节省的 token 在整个生态系统的所有技能中复合。
</token_efficiency>

<claude_performance>
Claude 使用纯 XML 性能更好，因为：
- 明确的部分边界减少解析错误
- 语义标记直接传达意图（无需推断）
- 嵌套标记创建清晰的层次结构
- 跨技能的一致结构减少认知负荷
- 渐进式披露更可靠地工作

纯 XML 结构不仅是一种风格偏好——它是一种性能优化。
</claude_performance>
</why_xml>

<critical_rule>
**从技能主体内容中删除所有 markdown 标题（#、##、###）。** 替换为语义 XML 标记。保留内容内的 markdown 格式（粗体、斜体、列表、代码块、链接）。
</critical_rule>

<required_tags>
每个技能必须具有：
- `<objective>` - 技能的功能以及为什么它很重要
- `<quick_start>` - 立即可操作的指导
- `<success_criteria>` 或 `<when_successful>` - 如何知道它有效

有关条件标记和智能规则，请参阅 [use-xml-tags.md](use-xml-tags.md)。
</required_tags>
</xml_structure_principle>

<conciseness_principle>
<description>
上下文窗口是共享的。您的技能与系统提示、对话历史、其他技能的元数据和实际请求共享它。
</description>

<guidance>
仅添加 Claude 尚不具备的上下文。质疑每条信息：
- "Claude 真的需要这个解释吗？"
- "我可以假设 Claude 知道这个吗？"
- "这个段落是否证明了其 token 成本的合理性？"

假设 Claude 是聪明的。不要解释显而易见的概念。
</guidance>

<concise_example>
**简洁**（约 50 个 token）：
```xml
<quick_start>
使用 pdfplumber 提取 PDF 文本：

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
</quick_start>
```

**冗长**（约 150 个 token）：
```xml
<quick_start>
PDF 文件是用于文档的常见文件格式。要从它们中提取文本，我们将使用一个名为 pdfplumber 的 Python 库。首先，您需要导入该库，然后使用 open 方法打开 PDF 文件，最后从每个页面提取文本。以下是操作方法：

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

此代码打开 PDF 并从第一页提取文本。
</quick_start>
```

简洁版本假设 Claude 知道什么是 PDF、理解 Python 导入并且可以阅读代码。所有这些假设都是正确的。
</concise_example>

<when_to_elaborate>
在以下情况下添加解释：
- 概念是特定于领域的（不是一般编程知识）
- 模式是不明显的或反直觉的
- 上下文以微妙的方式影响行为
- 权衡需要判断

不要为以下内容添加解释：
- 常见编程概念（循环、函数、导入）
- 标准库使用（读取文件、发出 HTTP 请求）
- 众所周知的工具（git、npm、pip）
- 明显的下一步
</when_to_elaborate>
</conciseness_principle>

<degrees_of_freedom_principle>
<description>
将特异性级别与任务的脆弱性和可变性相匹配。为创造性任务给 Claude 更多自由，为脆弱操作给更少自由。
</description>

<high_freedom>
<when>
- 多种方法有效
- 决策取决于上下文
- 启发式方法指导方法
- 欢迎创造性解决方案
</when>

<example>
```xml
<objective>
审查代码的质量、错误和可维护性。
</objective>

<workflow>
1. 分析代码结构和组织
2. 检查潜在错误或边缘情况
3. 建议改进可读性和可维护性
4. 验证遵守项目约定
</workflow>

<success_criteria>
- 识别了所有主要问题
- 建议是可操作的和具体的
- 审查平衡了表扬和批评
</success_criteria>
```

Claude 有自由根据代码需要调整审查。
</example>
</high_freedom>

<medium_freedom>
<when>
- 存在首选模式
- 一些变化是可接受的
- 配置影响行为
- 模板可以适应
</when>

<example>
```xml
<objective>
生成具有可自定义格式和部分的报告。
</objective>

<report_template>
使用此模板并根据需要自定义：

```python
def generate_report(data, format="markdown", include_charts=True):
    # 处理数据
    # 以指定格式生成输出
    # 可选地包括可视化
```
</report_template>

<success_criteria>
- 报告包括所有必需的部分
- 格式匹配用户偏好
- 数据准确表示
</success_criteria>
```

Claude 可以根据要求自定义模板。
</example>
</medium_freedom>

<low_freedom>
<when>
- 操作是脆弱的和容易出错的
- 一致性至关重要
- 必须遵循特定序列
- 偏差导致失败
</when>

<example>
```xml
<objective>
使用精确的序列运行数据库迁移以防止数据丢失。
</objective>

<workflow>
完全运行此脚本：

```bash
python scripts/migrate.py --verify --backup
```

**不要修改命令或添加其他标志。**
</workflow>

<success_criteria>
- 迁移完成且没有错误
- 在迁移之前创建备份
- 验证确认数据完整性
</success_criteria>
```

Claude 必须完全遵循精确的命令，没有变化。
</example>
</low_freedom>

<matching_specificity>
关键是将特异性与脆弱性相匹配：

- **脆弱操作**（数据库迁移、支付处理、安全性）：低自由度、精确指令
- **标准操作**（API 调用、文件处理、数据转换）：中等自由度、具有灵活性的首选模式
- **创造性操作**（代码审查、内容生成、分析）：高自由度、启发式和原则

特异性不匹配会导致问题：
- 脆弱任务上的自由度太多 → 错误和失败
- 创造性任务上的自由度太少 → 僵硬、次优的输出
</matching_specificity>
</degrees_of_freedom_principle>

<model_testing_principle>
<description>
技能充当模型的添加，因此有效性取决于底层模型。适用于 Opus 的内容可能需要为 Haiku 提供更多细节。
</description>

<testing_across_models>
使用您计划使用的所有模型测试您的技能：

<haiku_testing>
**Claude Haiku**（快速、经济）

要问的问题：
- 技能是否提供足够的指导？
- 示例是否清晰和完整？
- 隐式假设是否变得明确？
- Haiku 是否需要更多结构？

Haiku 受益于：
- 更明确的指令
- 完整的示例（没有部分代码）
- 清晰的成功标准
- 逐步工作流
</haiku_testing>

<sonnet_testing>
**Claude Sonnet**（均衡）

要问的问题：
- 技能是否清晰和高效？
- 它是否避免过度解释？
- 工作流是否结构良好？
- 渐进式披露是否有效？

Sonnet 受益于：
- 均衡的细节级别
- 用于清晰性的 XML 结构
- 渐进式披露
- 简洁但完整的指导
</sonnet_testing>

<opus_testing>
**Claude Opus**（强大推理）

要问的问题：
- 技能是否避免过度解释？
- Opus 是否能推断明显的步骤？
- 约束是否清晰？
- 上下文是否最少但足够？

Opus 受益于：
- 简洁的指令
- 原则而非程序
- 高自由度
- 对推理能力的信任
</opus_testing>
</testing_across_models>

<balancing_across_models>
以此为目标：在所有目标模型上都能良好工作的指令：

**良好的平衡**：
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

这适用于所有模型：
- Haiku 获得完整的工作示例
- Sonnet 获得清晰的默认值和逃生舱
- Opus 获得足够的上下文而没有过度解释

**对 Haiku 来说太少**：
```xml
<quick_start>
使用 pdfplumber 进行文本提取。
</quick_start>
```

**对 Opus 来说太冗长**：
```xml
<quick_start>
PDF 文件是包含文本的文档。要提取该文本，我们使用一个名为 pdfplumber 的库。首先，在 Python 文件顶部导入该库。然后，使用 pdfplumber.open() 方法打开 PDF 文件。这将返回一个 PDF 对象。访问 pages 属性以获取页面列表。每个页面都有一个 extract_text() 方法，返回文本内容...
</quick_start>
```
</balancing_across_models>

<iterative_improvement>
1. 从中等细节级别开始
2. 使用目标模型进行测试
3. 观察模型在哪些地方挣扎或成功
4. 根据实际性能进行调整
5. 重新测试并迭代

不要为一个模型进行优化。找到适用于您的目标模型的平衡。
</iterative_improvement>
</model_testing_principle>

<progressive_disclosure_principle>
<description>
SKILL.md 充当概述。参考文件包含详细信息。Claude 仅在需要时加载参考文件。
</description>

<token_efficiency>
渐进式披露使 token 使用与任务复杂性成正比：
- 简单任务：仅加载 SKILL.md（约 500 个 token）
- 中等任务：加载 SKILL.md + 一个参考（约 1000 个 token）
- 复杂任务：加载 SKILL.md + 多个参考（约 2000 个 token）

如果没有渐进式披露，每个任务都会加载所有内容，无论是否需要。
</token_efficiency>

<implementation>
- 保持 SKILL.md 在 500 行以下
- 将详细内容拆分为参考文件
- 保持参考文件距离 SKILL.md 一层
- 从相关部分链接到参考
- 使用描述性的参考文件名

有关渐进式披露模式，请参阅 [skill-structure.md](skill-structure.md)。
</implementation>
</progressive_disclosure_principle>

<validation_principle>
<description>
验证脚本是力量倍增器。它们捕获 Claude 可能遗漏的错误并提供可操作的反馈。
</description>

<characteristics>
良好的验证脚本：
- 提供详细、具体的错误消息
- 当某些内容无效时显示可用的有效选项
- 精确定位问题的确切位置
- 建议可操作的修复
- 是确定性和可靠的

有关验证模式，请参阅 [workflows-and-validation.md](workflows-and-validation.md)。
</characteristics>
</validation_principle>

<principle_summary>
<xml_structure>
使用纯 XML 结构以实现一致性、可解析性和 Claude 性能。必需的标记：objective、quick_start、success_criteria。
</xml_structure>

<conciseness>
仅添加 Claude 没有的上下文。假设 Claude 是聪明的。质疑每条内容。
</conciseness>

<degrees_of_freedom>
将特异性与脆弱性相匹配。创造性任务高自由度，脆弱操作低自由度，标准工作中等自由度。
</degrees_of_freedom>

<model_testing>
使用所有目标模型进行测试。平衡细节级别以在 Haiku、Sonnet 和 Opus 之间工作。
</model_testing>

<progressive_disclosure>
保持 SKILL.md 简洁。将细节拆分为参考文件。仅在需要时加载参考文件。
</progressive_disclosure>

<validation>
使验证脚本详细和具体。通过可操作的反馈尽早捕获错误。
</validation>
</principle_summary>

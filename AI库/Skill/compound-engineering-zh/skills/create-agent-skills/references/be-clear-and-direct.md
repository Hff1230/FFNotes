<golden_rule>
将您的技能展示给具有最少上下文的人，并要求他们遵循说明。如果他们感到困惑，Claude 也会如此。
</golden_rule>

<overview>
清晰和直接是有效技能编写的基础。清晰的指令减少错误，提高执行质量，并最大限度地减少 token 浪费。
</overview>

<guidelines>
<contextual_information>
为 Claude 提供构建任务上下文的背景信息：

- 任务结果将用于什么
- 输出针对什么受众
- 任务是哪个工作流的一部分
- 最终目标或成功完成是什么样的

上下文帮助 Claude 做出更好的决策并产生更合适的输出。

<example>
```xml
<context>
此分析将向重视透明度和可操作见解的投资者展示。专注于财务指标和明确的建议。
</context>
```
</example>
</contextual_information>

<specificity>
具体说明您希望 Claude 做什么。如果您只想要代码而不要其他内容，请明确说明。

**模糊**："帮助处理报告"
**具体**："生成一个包含三个部分的 markdown 报告：执行摘要、关键发现、建议"

**模糊**："处理数据"
**具体**："从 CSV 文件中提取客户姓名和电子邮件地址，删除重复项，并保存为 JSON 格式"

具体性消除歧义并减少迭代周期。
</specificity>

<sequential_steps>
以顺序步骤的形式提供指令。使用编号列表或项目符号。

```xml
<workflow>
1. 从源文件提取数据
2. 转换为目标格式
3. 验证转换
4. 保存到输出文件
5. 验证输出正确性
</workflow>
```

顺序步骤创建清晰的期望，并减少 Claude 跳过重要操作的机会。
</sequential_steps>
</guidelines>

<example_comparison>
<unclear_example>
```xml
<quick_start>
请从这些客户反馈消息中删除所有个人身份信息：{{FEEDBACK_DATA}}
</quick_start>
```

**问题**：
- 什么算作 PII？
- 应该用什么替换 PII？
- 输出应该是什么格式？
- 如果没有发现 PII 怎么办？
- 产品名称应该被编辑吗？
</unclear_example>

<clear_example>
```xml
<objective>
匿名化客户反馈以供季度审查演示。
</objective>

<quick_start>
<instructions>
1. 将所有客户姓名替换为 "CUSTOMER_[ID]"（例如，"Jane Doe" → "CUSTOMER_001"）
2. 将电子邮件地址替换为 "EMAIL_[ID]@example.com"
3. 将电话号码编辑为 "PHONE_[ID]"
4. 如果消息提及特定产品（例如，"AcmeCloud"），保持其完整
5. 如果没有发现 PII，逐字复制消息
6. 仅输出处理后的消息，用 "---" 分隔
</instructions>

要处理的数据：{{FEEDBACK_DATA}}
</quick_start>

<success_criteria>
- 所有客户姓名替换为 ID
- 所有电子邮件和电话已编辑
- 产品名称已保留
- 输出格式符合规范
</success_criteria>
```

**为什么这样更好**：
- 说明目的（季度审查）
- 提供明确的逐步规则
- 清楚定义输出格式
- 指定边缘情况（产品名称、未发现 PII）
- 定义成功标准
</clear_example>
</example_comparison>

<key_differences>
清晰版本：
- 说明目的（季度审查）
- 提供明确的逐步规则
- 定义输出格式
- 指定边缘情况（产品名称、未发现 PII）
- 包括成功标准

不清晰版本将所有这些决定留给 Claude，增加了与期望不符的机会。
</key_differences>

<show_dont_just_tell>
<principle>
当格式很重要时，展示示例而不仅仅是描述它。
</principle>

<telling_example>
```xml
<commit_messages>
生成包含类型、范围和描述的传统格式的提交消息。
</commit_messages>
```
</telling_example>

<showing_example>
```xml
<commit_message_format>
遵循这些示例生成提交消息：

<example number="1">
<input>添加了使用 JWT 令牌的用户身份验证</input>
<output>
```
feat(auth): 实现基于 JWT 的身份验证

添加登录端点和令牌验证中间件
```
</output>
</example>

<example number="2">
<input>修复了报告中日期显示不正确的错误</input>
<output>
```
fix(reports): 更正时区转换中的日期格式

在报告生成中始终使用 UTC 时间戳
```
</output>
</example>

遵循此样式：type(scope): 简要描述，然后详细解释。
</commit_message_format>
```
</showing_example>

<why_showing_works>
示例传达了文本描述无法传达的细微差别：
- 精确格式（间距、大小写、标点符号）
- 语气和风格
- 详细程度
- 多种情况下的模式

Claude 从示例中学习模式比从描述中更可靠。
</why_showing_works>
</show_dont_just_tell>

<avoid_ambiguity>
<principle>
消除产生歧义或留下开放决策的词语和短语。
</principle>

<ambiguous_phrases>
❌ **"尝试..."** - 暗示可选
✅ **"始终..."** 或 **"从不..."** - 明确要求

❌ **"可能应该..."** - 不清楚的义务
✅ **"必须..."** 或 **"可以可选地..."** - 明确的义务级别

❌ **"一般来说..."** - 何时允许例外？
✅ **"始终...除了当..."** - 带有明确例外的明确规则

❌ **"考虑..."** - Claude 应该始终这样做还是仅有时这样做？
✅ **"如果 X，则 Y"** 或 **"始终..."** - 明确的条件
</ambiguous_phrases>

<example>
❌ **模糊**：
```xml
<validation>
您可能应该验证输出并尝试修复任何错误。
</validation>
```

✅ **清晰**：
```xml
<validation>
在继续之前始终验证输出：

```bash
python scripts/validate.py output_dir/
```

如果验证失败，修复错误并重新验证。仅在验证通过且零错误时继续。
</validation>
```
</example>
</avoid_ambiguity>

<define_edge_cases>
<principle>
预见到边缘情况并定义如何处理它们。不要让 Claude 猜测。
</principle>

<without_edge_cases>
```xml
<quick_start>
从文本文件中提取电子邮件地址并保存为 JSON 数组。
</quick_start>
```

**未回答的问题**：
- 如果没有找到电子邮件怎么办？
- 如果相同的电子邮件出现多次怎么办？
- 如果电子邮件格式错误怎么办？
- 确切什么 JSON 格式？
</without_edge_cases>

<with_edge_cases>
```xml
<quick_start>
从文本文件中提取电子邮件地址并保存为 JSON 数组。

<edge_cases>
- **未找到电子邮件**：保存空数组 `[]`
- **重复的电子邮件**：仅保留唯一电子邮件
- **格式错误的电子邮件**：跳过无效格式，记录到 stderr
- **输出格式**：字符串数组，每个元素一封电子邮件
</edge_cases>

<example_output>
```json
[
  "user1@example.com",
  "user2@example.com"
]
```
</example_output>
</quick_start>
```
</with_edge_cases>
</define_edge_cases>

<output_format_specification>
<principle>
当输出格式很重要时，精确指定它。展示示例。
</principle>

<vague_format>
```xml
<output>
生成包含分析结果的报告。
</output>
```
</vague_format>

<specific_format>
```xml
<output_format>
生成具有此确切结构的 markdown 报告：

```markdown
# 分析报告：[标题]

## 执行摘要
[1-2 段总结关键发现]

## 关键发现
- 带有支持数据的发现 1
- 带有支持数据的发现 2
- 带有支持数据的发现 3

## 建议
1. 具体的可操作建议
2. 具体的可操作建议

## 附录
[原始数据和详细计算]
```

**要求**：
- 完全使用这些章节标题
- 执行摘要必须是 1-2 段
- 列出 3-5 个关键发现
- 提供 2-4 条建议
- 包含带有源数据的附录
</output_format>
```
</specific_format>
</output_format_specification>

<decision_criteria>
<principle>
当 Claude 必须做出决策时，提供明确的标准。
</principle>

<no_criteria>
```xml
<workflow>
分析数据并决定使用哪种可视化。
</workflow>
```

**问题**：什么因素应该指导此决策？
</no_criteria>

<with_criteria>
```xml
<workflow>
分析数据并选择适当的可视化：

<decision_criteria>
**在以下情况使用条形图**：
- 比较跨类别的数量
- 少于 10 个类别
- 精确值很重要

**在以下情况使用折线图**：
- 显示随时间变化的趋势
- 连续数据
- 模式识别比精确值更重要

**在以下情况使用散点图**：
- 显示两个变量之间的关系
- 寻找相关性
- 个别数据点很重要
</decision_criteria>
</workflow>
```

**优点**：Claude 具有做出决策的客观标准，而不是猜测。
</with_criteria>
</decision_criteria>

<constraints_and_requirements>
<principle>
清楚地区分"必须做"、"最好有"和"不能做"。
</principle>

<unclear_requirements>
```xml
<requirements>
报告应包括财务数据、客户指标和市场分析。最好有可视化。不要太长。
</requirements>
```

**问题**：
- 所有三种内容类型都是必需的吗？
- 可视化是可选的还是必需的？
- 多长是"太长"？
</unclear_requirements>

<clear_requirements>
```xml
<requirements>
<must_have>
- 财务数据（收入、成本、利润率）
- 客户指标（获取、留存、生命周期价值）
- 市场分析（竞争、趋势、机会）
- 最多 5 页
</must_have>

<nice_to_have>
- 图表和可视化
- 行业基准
- 未来预测
</nice_to_have>

<must_not>
- 包括机密客户姓名
- 超过 5 页
- 使用未定义的技术术语
</must_not>
</requirements>
```

**优点**：清晰的优先级和约束防止不符。
</clear_requirements>
</constraints_and_requirements>

<success_criteria>
<principle>
定义成功的样子。Claude 如何知道它成功了？
</principle>

<without_success_criteria>
```xml
<objective>
处理 CSV 文件并生成报告。
</objective>
```

**问题**：此任务何时完成？什么定义成功？
</without_success_criteria>

<with_success_criteria>
```xml
<objective>
处理 CSV 文件并生成摘要报告。
</objective>

<success_criteria>
- CSV 中的所有行成功解析
- 没有数据验证错误
- 生成的报告包含所有必需的章节
- 报告保存到 output/report.md
- 输出文件是有效的 markdown
- 过程完成且没有错误
</success_criteria>
```

**优点**：明确的完成标准消除了关于任务何时完成的歧义。
</with_success_criteria>
</success_criteria>

<testing_clarity>
<principle>
通过询问："我能将这些指令交给初级开发人员并期望正确的结果吗？"来测试您的指令。
</principle>

<testing_process>
1. 阅读您的技能指令
2. 删除只有您拥有的上下文（项目知识、未说明的假设）
3. 识别模糊的术语或模糊的要求
4. 在需要的地方添加具体性
5. 与没有您上下文的人一起测试
6. 根据他们的问题和困惑进行迭代

如果具有最少上下文的人类感到困难，Claude 也会如此。
</testing_process>
</testing_clarity>

<practical_examples>
<example domain="data_processing">
❌ **不清晰**：
```xml
<quick_start>
清理数据并删除不良条目。
</quick_start>
```

✅ **清晰**：
```xml
<quick_start>
<data_cleaning>
1. 删除必需字段（姓名、电子邮件、日期）为空的行
2. 将日期格式标准化为 YYYY-MM-DD
3. 基于电子邮件地址删除重复条目
4. 验证电子邮件格式（必须包含 @ 和域）
5. 将清理后的数据保存到 output/cleaned_data.csv
</data_cleaning>

<success_criteria>
- 没有空必需字段
- 所有日期为 YYYY-MM-DD 格式
- 没有重复的电子邮件
- 所有电子邮件格式有效
- 输出文件创建成功
</success_criteria>
</quick_start>
```
</example>

<example domain="code_generation">
❌ **不清晰**：
```xml
<quick_start>
编写一个函数来处理用户输入。
</quick_start>
```

✅ **清晰**：
```xml
<quick_start>
<function_specification>
编写具有此签名的 Python 函数：

```python
def process_user_input(raw_input: str) -> dict:
    """
    验证和解析用户输入。

    Args:
        raw_input: 来自用户的原始字符串（格式："name:email:age"）

    Returns:
        带有键的字典：name (str)、email (str)、age (int)

    Raises:
        ValueError: 如果输入格式无效
    """
```

**要求**：
- 在冒号分隔符上拆分输入
- 验证电子邮件包含 @ 和域
- 将年龄转换为整数，如果不是数字则引发 ValueError
- 返回带有指定键的字典
- 包括文档字符串和类型提示
</function_specification>

<success_criteria>
- 函数签名符合规范
- 所有验证检查已实施
- 对无效输入的正确错误处理
- 包含类型提示
- 包含文档字符串
</success_criteria>
</quick_start>
```
</example>
</practical_examples>

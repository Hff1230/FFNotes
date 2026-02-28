<overview>
此参考文档涵盖技能编写中复杂工作流程、验证循环和反馈周期的模式。所有模式都使用纯 XML 结构。
</overview>

<complex_workflows>
<principle>
将复杂操作分解为清晰、连续的步骤。对于特别复杂的工作流程，提供清单。
</principle>

<pdf_forms_example>
```xml
<objective>
使用来自 JSON 字段映射的经过验证的数据填充 PDF 表单。
</objective>

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
</pdf_forms_example>

<when_to_use>
在以下情况下使用清单模式：
- 工作流程有 5 个或更多连续步骤
- 步骤必须按顺序完成
- 进度跟踪有助于防止错误
- 中断后易于恢复很有价值
</when_to_use>
</complex_workflows>

<feedback_loops>
<validate_fix_repeat_pattern>
<principle>
运行验证器 → 修复错误 → 重复。此模式大大提高输出质量。
</principle>

<document_editing_example>
```xml
<objective>
在每一步使用 XML 验证编辑 OOXML 文档。
</objective>

<editing_process>
<step_1>
对 `word/document.xml` 进行编辑
</step_1>

<step_2>
**立即验证**：`python ooxml/scripts/validate.py unpacked_dir/`
</step_2>

<step_3>
如果验证失败：
- 仔细查看错误消息
- 修复 XML 中的问题
- 再次运行验证
</step_3>

<step_4>
**仅在验证通过时继续**
</step_4>

<step_5>
重新构建：`python ooxml/scripts/pack.py unpacked_dir/ output.docx`
</step_5>

<step_6>
测试输出文档
</step_6>
</editing_process>

<validation>
永远不要跳过验证。及早捕获错误可以防止输出文件损坏。
</validation>
```
</document_editing_example>

<why_it_works>
- 在应用更改之前及早捕获错误
- 可通过客观验证进行机器验证
- 可以在不触及原始文件的情况下迭代计划
- 减少总迭代周期
</why_it_works>
</validate_fix_repeat_pattern>

<plan_validate_execute_pattern>
<principle>
当 Claude 执行复杂的、开放式的任务时，以结构化格式创建计划，验证它，然后执行。

工作流程：分析 → **创建计划文件** → **验证计划** → 执行 → 验证
</principle>

<batch_update_example>
```xml
<objective>
使用计划验证应用批量更新到电子表格。
</objective>

<workflow>
<plan_phase>
<step_1>
分析电子表格和需求
</step_1>

<step_2>
使用所有计划的更新创建 `changes.json`
</step_2>
</plan_phase>

<validation_phase>
<step_3>
验证计划：`python scripts/validate_changes.py changes.json`
</step_3>

<step_4>
如果验证失败：
- 查看错误消息
- 修复 changes.json 中的问题
- 再次验证
</step_4>

<step_5>
仅在验证通过时继续
</step_5>
</validation_phase>

<execution_phase>
<step_6>
应用更改：`python scripts/apply_changes.py changes.json`
</step_6>

<step_7>
验证输出
</step_7>
</execution_phase>
</workflow>

<success_criteria>
- 计划验证通过且零错误
- 所有更改成功应用
- 输出验证确认预期结果
</success_criteria>
```
</batch_update_example>

<implementation_tip>
使验证脚本详细并提供特定错误消息：

**好的错误消息**：
"未找到字段 'signature_date'。可用字段：customer_name、order_total、signature_date_signed"

**不好的错误消息**：
"无效字段"

特定错误有助于 Claude 在不猜测的情况下修复问题。
</implementation_tip>

<when_to_use>
在以下情况下使用计划-验证-执行：
- 操作复杂且容易出错
- 更改不可逆或难以撤销
- 计划可以独立验证
- 及早捕获错误可节省大量时间
</when_to_use>
</plan_validate_execute_pattern>
</feedback_loops>

<conditional_workflows>
<principle>
使用清晰的分支逻辑指导 Claude 通过决策点。
</principle>

<document_modification_example>
```xml
<objective>
根据任务类型使用适当的方法修改 DOCX 文件。
</objective>

<workflow>
<decision_point_1>
确定修改类型：

**创建新内容？** → 遵循"创建工作流程"
**编辑现有内容？** → 遵循"编辑工作流程"
</decision_point_1>

<creation_workflow>
<objective>从头开始构建文档</objective>

<steps>
1. 使用 docx-js 库
2. 从头开始构建文档
3. 导出为 .docx 格式
</steps>
</creation_workflow>

<editing_workflow>
<objective>修改现有文档</objective>

<steps>
1. 解包现有文档
2. 直接修改 XML
3. 每次更改后验证
4. 完成后重新打包
</steps>
</editing_workflow>
</workflow>

<success_criteria>
- 根据任务类型选择了正确的工作流程
- 所选工作流程中的所有步骤已完成
- 输出文件已验证和验证
</success_criteria>
```
</document_modification_example>

<when_to_use>
在以下情况下使用条件工作流程：
- 不同的任务类型需要不同的方法
- 决策点清晰且定义明确
- 工作流程互斥
- 指导 Claude 走上正确路径可改善结果
</when_to_use>
</conditional_workflows>

<validation_scripts>
<principles>
验证脚本是力量倍增器。它们捕获 Claude 可能遗漏的错误，并为修复问题提供可操作的反馈。
</principles>

<characteristics_of_good_validation>
<verbose_errors>
**好的**："未找到字段 'signature_date'。可用字段：customer_name、order_total、signature_date_signed"

**不好的**："无效字段"

详细的错误帮助 Claude 在一次迭代中修复问题，而不是多轮猜测。
</verbose_errors>

<specific_feedback>
**好的**："第 47 行：期望结束标签 `</paragraph>` 但找到 `</section>`"

**不好的**："XML 语法错误"

特定反馈精确定位问题的确切位置和性质。
</specific_feedback>

<actionable_suggestions>
**好的**："缺少必需字段 'customer_name'。添加：{\"customer_name\": \"value\"}"

**不好的**："缺少必需字段"

可操作的建议确切地向 Claude 显示要修复什么。
</actionable_suggestions>

<available_options>
当验证失败时，显示可用的有效选项：

**好的**："无效状态 'pending_review'。有效状态：active、paused、archived"

**不好的**："无效状态"

显示有效选项可消除猜测工作。
</available_options>
</characteristics_of_good_validation>

<implementation_pattern>
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
- **无效值**："无效状态 'pending_review'。有效状态：active、paused、archived"

仅在验证通过且零错误时继续。
</validation>
```
</implementation_pattern>

<benefits>
- 在错误传播之前捕获它们
- 减少迭代周期
- 提供学习反馈
- 使调试具有确定性
- 启用自信的执行
</benefits>
</validation_scripts>

<iterative_refinement>
<principle>
许多工作流程受益于迭代：生成 → 验证 → 改进 → 验证 → 定稿。
</principle>

<implementation_example>
```xml
<objective>
通过迭代质量改进生成报告。
</objective>

<workflow>
<iteration_1>
**生成初始草稿**

根据数据和需求创建报告。
</iteration_1>

<iteration_2>
**验证草稿**

运行：`python scripts/validate_report.py draft.md`

修复任何结构问题、缺少的部分或数据错误。
</iteration_2>

<iteration_3>
**改进内容**

提高清晰度、添加支持数据、增强可视化。
</iteration_3>

<iteration_4>
**最终验证**

运行：`python scripts/validate_report.py final.md`

确保满足所有质量标准。
</iteration_4>

<iteration_5>
**定稿**

导出为最终格式并交付。
</iteration_5>
</workflow>

<success_criteria>
- 最终验证通过且零错误
- 满足所有质量标准
- 报告准备好交付
</success_criteria>
```
</implementation_example>

<when_to_use>
在以下情况下使用迭代改进：
- 质量通过多次传递而提高
- 验证提供可操作的反馈
- 时间允许迭代
- 完美输出比速度更重要
</when_to_use>
</iterative_refinement>

<checkpoint_pattern>
<principle>
对于长时间的工作流程，添加检查点，Claude 可以在这些检查点暂停并验证进度后再继续。
</principle>

<implementation_example>
```xml
<workflow>
<phase_1>
**数据收集**（步骤 1-3）

1. 从源提取数据
2. 转换为目标格式
3. **检查点**：验证数据完整性

仅在检查点通过时继续。
</phase_1>

<phase_2>
**数据处理**（步骤 4-6）

4. 应用业务规则
5. 验证转换
6. **检查点**：验证处理准确性

仅在检查点通过时继续。
</phase_2>

<phase_3>
**输出生成**（步骤 7-9）

7. 生成输出文件
8. 验证输出格式
9. **检查点**：验证最终输出

仅在检查点通过时继续交付。
</phase_3>
</workflow>

<checkpoint_validation>
在每个检查点：
1. 运行验证脚本
2. 审查输出的正确性
3. 验证没有错误或警告
4. 仅在验证通过时继续
</checkpoint_validation>
```
</implementation_example>

<benefits>
- 防止级联错误
- 更容易诊断问题
- 清晰的进度指示器
- 审查的自然暂停点
- 减少早期错误造成的浪费工作
</benefits>
</checkpoint_pattern>

<error_recovery>
<principle>
设计具有清晰错误恢复路径的工作流程。Claude 应该知道当出现问题时该怎么做。
</principle>

<implementation_example>
```xml
<workflow>
<normal_path>
1. 处理输入文件
2. 验证输出
3. 保存结果
</normal_path>

<error_recovery>
**如果步骤 2 中的验证失败：**
- 查看验证错误
- 检查输入文件是否损坏 → 返回步骤 1 并使用不同的输入
- 检查处理逻辑是否失败 → 修复逻辑，返回步骤 1
- 检查输出格式是否错误 → 修复格式，返回步骤 2

**如果步骤 3 中的保存失败：**
- 检查磁盘空间
- 检查文件权限
- 检查文件路径有效性
- 使用更正的条件重试保存
</error_recovery>

<escalation>
**如果 3 次尝试后错误仍然存在：**
- 使用完整上下文记录错误
- 如果可用，保存部分结果
- 使用诊断信息向用户报告问题
</escalation>
</workflow>
```
</implementation_example>

<when_to_use>
在以下情况下包含错误恢复：
- 工作流程与外部系统交互
- 文件操作可能失败
- 网络调用可能超时
- 用户输入可能无效
- 错误可恢复
</when_to_use>
</error_recovery>

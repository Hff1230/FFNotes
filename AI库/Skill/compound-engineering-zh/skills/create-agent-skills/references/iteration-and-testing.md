<overview>
技能通过迭代和测试得到改进。本参考涵盖了评估驱动的开发、Claude A/B 测试模式以及测试期间的 XML 结构验证。
</overview>

<evaluation_driven_development>
<principle>
在编写大量文档之前创建评估。这确保你的技能解决实际问题,而不是记录想象的问题。
</principle>

<workflow>
<step_1>
**识别差距**: 在没有技能的情况下对代表性任务运行 Claude。记录具体的失败或缺失的上下文。
</step_1>

<step_2>
**创建评估**: 构建测试这些差距的三个场景。
</step_2>

<step_3>
**建立基线**: 测量 Claude 在没有技能的情况下的性能。
</step_3>

<step_4>
**编写最少指令**: 创建足以解决差距并通过评估的内容。
</step_4>

<step_5>
**迭代**: 执行评估,与基线比较,并改进。
</step_5>
</workflow>

<evaluation_structure>
```json
{
  "skills": ["pdf-processing"],
  "query": "从此 PDF 文件中提取所有文本并将其保存到 output.txt",
  "files": ["test-files/document.pdf"],
  "expected_behavior": [
    "使用适当的库成功读取 PDF 文件",
    "从所有页面提取文本内容而不遗漏任何内容",
    "将提取的文本以清晰可读的格式保存到 output.txt"
  ]
}
```
</evaluation_structure>

<why_evaluations_first>
- 防止记录想象的问题
- 迫使清晰说明成功的样子
- 提供技能效果的客观测量
- 保持技能专注于实际需求
- 启用定量改进跟踪
</why_evaluations_first>
</evaluation_driven_development>

<iterative_development_with_claude>
<principle>
最有效的技能开发使用 Claude 本身。与 "Claude A" (帮助改进的专家) 一起创建供 "Claude B" (执行任务的 agent) 使用的技能。
</principle>

<creating_skills>
<workflow>
<step_1>
**在没有技能的情况下完成任务**: 与 Claude A 一起解决问题,注意你反复提供的上下文。
</step_1>

<step_2>
**要求 Claude A 创建技能**: "创建一个捕获我们刚刚使用的这个模式的技能"
</step_2>

<step_3>
**审查简洁性**: 删除不必要的解释。
</step_3>

<step_4>
**改进架构**: 使用渐进式披露组织内容。
</step_4>

<step_5>
**使用 Claude B 测试**: 使用新实例测试实际任务。
</step_5>

<step_6>
**基于观察进行迭代**: 向 Claude A 返回在特定用法中观察到的问题。
</step_6>
</workflow>

<insight>
Claude 模型原生地理解技能格式。只需要求 Claude 创建一个技能,它就会生成正确结构的 SKILL.md 内容。
</insight>
</creating_skills>

<improving_skills>
<workflow>
<step_1>
**在实际工作流程中使用技能**: 给 Claude B 实际任务。
</step_1>

<step_2>
**观察行为**: 它在哪里挣扎、成功或做出意外的选择?
</step_2>

<step_3>
**返回 Claude A**: 分享观察和当前的 SKILL.md。
</step_3>

<step_4>
**审查建议**: Claude A 可能建议重新组织、更强的语言或工作流程重组。
</step_4>

<step_5>
**应用并测试**: 更新技能并再次测试。
</step_5>

<step_6>
**重复**: 基于实际用法继续,而不是假设。
</step_6>
</workflow>

<what_to_watch_for>
- **意外的探索路径**: 结构可能不直观
- **错过的连接**: 链接可能需要更明确
- **过度依赖部分**: 考虑将频繁阅读的内容移动到主 SKILL.md
- **被忽略的内容**: 信号不良或不必要的文件
- **关键元数据**: 技能中的名称和描述对发现至关重要
</what_to_watch_for>
</improving_skills>
</iterative_development_with_claude>

<model_testing>
<principle>
测试你计划使用的所有模型。不同的模型有不同的优势,需要不同级别的细节。
</principle>

<haiku_testing>
**Claude Haiku** (快速,经济)

要问的问题:
- 技能是否提供足够的指导?
- 示例是否清晰完整?
- 隐式假设是否变得明确?
- Haiku 是否需要更多结构?

Haiku 受益于:
- 更明确的指令
- 完整的示例 (没有部分代码)
- 清晰的成功标准
- 分步工作流程
</haiku_testing>

<sonnet_testing>
**Claude Sonnet** (平衡)

要问的问题:
- 技能是否清晰高效?
- 它是否避免过度解释?
- 工作流程是否结构良好?
- 渐进式披露是否有效?

Sonnet 受益于:
- 平衡的详细级别
- XML 结构以清晰
- 渐进式披露
- 简洁但完整的指导
</sonnet_testing>

<opus_testing>
**Claude Opus** (强大推理)

要问的问题:
- 技能是否避免过度解释?
- Opus 是否能推断明显的步骤?
- 约束是否清晰?
- 上下文是否最少但足够?

Opus 受益于:
- 简洁的指令
- 原则而不是程序
- 高度的自由
- 信任推理能力
</opus_testing>

<balancing_across_models>
适用于 Opus 的可能需要为 Haiku 提供更多细节。以适用于所有目标模型的指令为目标。找到服务于你的目标受众的平衡。

有关模型测试示例,请参阅 [core-principles.md](core-principles.md)。
</balancing_across_models>
</model_testing>

<xml_structure_validation>
<principle>
在测试期间,验证你的技能的 XML 结构是否正确和完整。
</principle>

<validation_checklist>
更新技能后,验证:

<required_tags_present>
- ✅ `<objective>` 标签存在并定义技能的作用
- ✅ `<quick_start>` 标签存在并带有即时指导
- ✅ `<success_criteria>` 或 `<when_successful>` 标签存在
</required_tags_present>

<no_markdown_headings>
- ✅ 技能主体中没有 `#`、`##` 或 `###` 标题
- ✅ 所有部分使用 XML 标签代替
- ✅ 标签内保留 Markdown 格式 (粗体、斜体、列表、代码块)
</no_markdown_headings>

<proper_xml_nesting>
- ✅ 所有 XML 标签正确关闭
- ✅ 嵌套标签具有正确的层次结构
- ✅ 没有未关闭的标签
</proper_xml_nesting>

<conditional_tags_appropriate>
- ✅ 条件标签匹配技能复杂性
- ✅ 简单技能仅使用必需标签
- ✅ 复杂技能添加适当的条件标签
- ✅ 没有过度设计或规范不足
</conditional_tags_appropriate>

<reference_files_check>
- ✅ 参考文件也使用纯 XML 结构
- ✅ 到参考文件的链接正确
- ✅ 引用在 SKILL.md 下一级深度
</reference_files_check>
</validation_checklist>

<testing_xml_during_iteration>
迭代技能时:

1. 更改 XML 结构
2. **验证 XML 结构** (检查标签、嵌套、完整性)
3. 在代表性任务上用 Claude 测试
4. 观察 XML 结构是否有助于或阻碍 Claude 的理解
5. 根据实际性能迭代结构
</testing_xml_during_iteration>
</xml_structure_validation>

<observation_based_iteration>
<principle>
根据你观察到的进行迭代,而不是你假设的。实际用法揭示了假设错过的内容。
</principle>

<observation_categories>
<what_claude_reads>
Claude 实际阅读哪些部分?哪些被忽略?这揭示了:
- 内容的相关性
- 渐进式披露的有效性
- 部分名称是否清晰
</what_claude_reads>

<where_claude_struggles>
哪些任务导致混淆或错误?这揭示了:
- 缺失的上下文
- 不清楚的指令
- 不充分的示例
- 模糊的要求
</where_claude_struggles>

<where_claude_succeeds>
哪些任务顺利进行?这揭示了:
- 有效的模式
- 好的示例
- 清晰的指令
- 适当的详细级别
</where_claude_succeeds>

<unexpected_behaviors>
Claude 做了什么让你惊讶的事情?这揭示了:
- 未说明的假设
- 模糊的措辞
- 缺失的约束
- 替代解释
</unexpected_behaviors>
</observation_categories>

<iteration_pattern>
1. **观察**: 使用当前技能在实际任务上运行 Claude
2. **记录**: 注意具体问题,而不是一般感觉
3. **假设**: 为什么会出现这个问题?
4. **修复**: 做出有针对性的更改以解决具体问题
5. **测试**: 在相同场景上验证修复有效
6. **验证**: 确保修复不会破坏其他场景
7. **重复**: 继续下一个观察到的问题
</iteration_pattern>
</observation_based_iteration>

<progressive_refinement>
<principle>
技能最初不需要完美。从最少开始,观察用法,添加缺失的内容。
</principle>

<initial_version>
从以下开始:
- 有效的 YAML frontmatter
- 必需的 XML 标签: objective、quick_start、success_criteria
- 最少的工作示例
- 基本成功标准

最初跳过:
- 大量示例
- 边缘情况文档
- 高级功能
- 详细的参考文件
</initial_version>

<iteration_additions>
通过迭代添加:
- 当模式从描述不清楚时的示例
- 在实际用法中观察到边缘情况时
- 用户需要时的高级功能
- 当 SKILL.md 接近 500 行时的参考文件
- 当错误常见时的验证脚本
</iteration_additions>

<benefits>
- 更快的初始工作版本
- 添加解决实际需求,而不是想象的需求
- 保持技能专注和简洁
- 渐进式披露自然出现
- 文档与实际用法保持一致
</benefits>
</progressive_refinement>

<testing_discovery>
<principle>
测试 Claude 可以在适当时发现并使用你的技能。
</principle>

<discovery_testing>
<test_description>
测试 Claude 是否在应该时加载你的技能:

1. 开始新对话 (Claude B)
2. 询问应该触发技能的问题
3. 检查技能是否已加载
4. 验证技能是否被适当使用
</test_description>

<description_quality>
如果技能未被发现:
- 检查描述包括触发关键字
- 验证描述具体,而不是模糊
- 确保描述解释何时使用技能
- 使用相同请求的不同措辞测试

描述是 Claude 的主要发现机制。
</description_quality>
</discovery_testing>
</testing_discovery>

<common_iteration_patterns>
<pattern name="too_verbose">
**观察**: 技能有效但使用大量 tokens

**修复**:
- 删除明显的解释
- 假设 Claude 知道常见概念
- 使用示例而不是冗长的描述
- 将高级内容移动到参考文件
</pattern>

<pattern name="too_minimal">
**观察**: Claude 做出错误的假设或错过步骤

**修复**:
- 在假设失败的地方添加明确的指令
- 提供完整的工作示例
- 定义边缘情况
- 添加验证步骤
</pattern>

<pattern name="poor_discovery">
**观察**: 技能存在但 Claude 在需要时不加载它

**修复**:
- 使用特定触发器改进描述
- 添加相关关键字
- 根据实际用户查询测试描述
- 使描述对用例更具体
</pattern>

<pattern name="unclear_structure">
**观察**: Claude 阅读错误的部分或错过相关内容

**修复**:
- 使用更清晰的 XML 标签名称
- 重新组织内容层次结构
- 更早移动经常需要的内容
- 添加到相关部分的显式链接
</pattern>

<pattern name="incomplete_examples">
**观察**: Claude 产生与预期模式不匹配的输出

**修复**:
- 添加更多显示模式的示例
- 使示例更完整
- 在示例中显示边缘情况
- 添加反模式示例 (不应该做什么)
</pattern>
</common_iteration_patterns>

<iteration_velocity>
<principle>
小而频繁的迭代胜过大而稀少的重写。
</principle>

<fast_iteration>
**好的方法**:
1. 做出一个有针对性的更改
2. 在特定场景上测试
3. 验证改进
4. 提交更改
5. 移动到下一个问题

每次时间: 每次迭代几分钟
每天迭代: 10-20 次
学习率: 高
</fast_iteration>

<slow_iteration>
**有问题的方法**:
1. 积累许多问题
2. 进行大规模重构
3. 一次测试所有内容
4. 同时调试多个问题
5. 难以知道修复了什么

每次时间: 每次迭代几小时
每天迭代: 1-2 次
学习率: 低
</slow_iteration>

<benefits_of_fast_iteration>
- 隔离因果关系
- 更快地建立模式识别
- 错误方向的浪费工作更少
- 更容易在需要时恢复
- 保持势头
</benefits_of_fast_iteration>
</iteration_velocity>

<success_metrics>
<principle>
定义你将如何测量技能是否工作。量化成功。
</principle>

<objective_metrics>
- **成功率**: 正确完成的任务百分比
- **Token 使用**: 每个任务消耗的平均 tokens
- **迭代计数**: 获得正确输出需要多少次尝试
- **错误率**: 有错误的任务百分比
- **发现率**: 技能在应该时加载的频率
</objective_metrics>

<subjective_metrics>
- **输出质量**: 输出是否满足要求?
- **适当的细节**: 太冗长还是太少?
- **Claude 信心**: Claude 似乎不确定吗?
- **用户满意度**: 技能解决实际问题吗?
</subjective_metrics>

<tracking_improvement>
比较更改前后的指标:
- 基线: 在没有技能的情况下测量
- 初始: 使用第一个版本测量
- 迭代 N: 在每次更改后测量

跟踪哪些更改改进了哪些指标。加倍有效的模式。
</tracking_improvement>
</success_metrics>

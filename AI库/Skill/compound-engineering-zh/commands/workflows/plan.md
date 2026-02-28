---
name: workflows:plan
description: 将功能描述转换为遵循规范的结构化项目计划
argument-hint: "[功能描述、错误报告或改进想法]"
---

# 为新功能或错误修复创建计划

## 简介

**注意：当前年份是 2026 年。** 在为计划添加日期和搜索最新文档时使用此年份。

将功能描述、错误报告或改进想法转换为遵循项目约定和最佳实践的结构化 markdown 文件问题。此命令提供灵活的详细程度以满足您的需求。

## 功能描述

<feature_description> #$ARGUMENTS </feature_description>

**如果上面的功能描述为空，请询问用户：**"您想要规划什么？请描述您想到的功能、错误修复或改进。"

在从用户那里获得清晰的功能描述之前，请勿继续。

## 主要任务

### 1. 仓库研究和上下文收集

<thinking>
首先，我需要了解项目的约定和现有模式，利用所有可用资源并使用并行子代理来执行此操作。
</thinking>

同时运行这三个代理：

- Task repo-research-analyst(feature_description)
- Task best-practices-researcher(feature_description)
- Task framework-docs-researcher(feature_description)

**参考收集：**

- [ ] 记录所有研究结果，包括具体文件路径（例如 `app/services/example_service.rb:42`）
- [ ] 包含外部文档和最佳实践指南的 URL
- [ ] 创建类似问题或 PR 的参考列表（例如 `#123`、`#456`）
- [ ] 注意在 `CLAUDE.md` 或团队文档中发现的任何团队约定

### 2. 问题规划和结构

<thinking>
像产品经理一样思考 - 什么会使这个问题清晰且可操作？考虑多个角度
</thinking>

**标题和分类：**

- [ ] 使用传统格式（例如 `feat:`、`fix:`、`docs:`）起草清晰、可搜索的问题标题
- [ ] 确定问题类型：增强、错误、重构

**利益相关者分析：**

- [ ] 确定谁会受此问题影响（最终用户、开发人员、运维）
- [ ] 考虑实施复杂性和所需专业知识

**内容规划：**

- [ ] 根据问题复杂程度和受众选择适当的详细程度
- [ ] 列出所选模板的所有必要部分
- [ ] 收集支持材料（错误日志、屏幕截图、设计模型）
- [ ] 准备代码示例或重现步骤（如适用），在列表中命名模型文件名

### 3. SpecFlow 分析

规划问题结构后，运行 SpecFlow 分析器来验证和完善功能规范：

- Task spec-flow-analyzer(feature_description, research_findings)

**SpecFlow 分析器输出：**

- [ ] 审查 SpecFlow 分析结果
- [ ] 将发现的任何差距或边界情况纳入问题
- [ ] 根据 SpecFlow 发现更新验收标准

### 4. 选择实施详细程度

选择您希望问题有多全面，简单通常更好。

#### 📄 MINIMAL（快速问题）

**适用于：** 简单错误、小改进、清晰功能

**包括：**

- 问题陈述或功能描述
- 基本验收标准
- 仅关键上下文

**结构：**

````markdown
[简短的问题/功能描述]

## 验收标准

- [ ] 核心要求 1
- [ ] 核心要求 2

## 上下文

[任何关键信息]

## MVP

### test.rb

```ruby
class Test
  def initialize
    @name = "test"
  end
end
```

## 参考

- 相关问题：#[issue_number]
- 文档：[relevant_docs_url]
````

#### 📋 MORE（标准问题）

**适用于：** 大多数功能、复杂错误、团队协作

**包括 MINIMAL 的所有内容加上：**

- 详细的背景和动机
- 技术考虑
- 成功指标
- 依赖关系和风险
- 基本实施建议

**结构：**

```markdown
## 概述

[综合描述]

## 问题陈述 / 动机

[为什么这很重要]

## 拟议解决方案

[高级方法]

## 技术考虑

- 架构影响
- 性能影响
- 安全考虑

## 验收标准

- [ ] 详细要求 1
- [ ] 详细要求 2
- [ ] 测试要求

## 成功指标

[我们如何衡量成功]

## 依赖关系和风险

[可能阻止或使此复杂化的事情]

## 参考和研究

- 类似实现：[file_path:line_number]
- 最佳实践：[documentation_url]
- 相关 PR：#[pr_number]
```

#### 📚 A LOT（综合问题）

**适用于：** 主要功能、架构更改、复杂集成

**包括 MORE 的所有内容加上：**

- 分阶段的详细实施计划
- 考虑的替代方法
- 广泛的技术规范
- 资源要求和时间表
- 未来考虑和可扩展性
- 风险缓解策略
- 文档要求

**结构：**

```markdown
## 概述

[执行摘要]

## 问题陈述

[详细问题分析]

## 拟议解决方案

[综合解决方案设计]

## 技术方法

### 架构

[详细技术设计]

### 实施阶段

#### 阶段 1：[基础]

- 任务和交付成果
- 成功标准
- 预估工作量

#### 阶段 2：[核心实施]

- 任务和交付成果
- 成功标准
- 预估工作量

#### 阶段 3：[完善和优化]

- 任务和交付成果
- 成功标准
- 预估工作量

## 考虑的替代方法

[评估的其他解决方案以及拒绝原因]

## 验收标准

### 功能要求

- [ ] 详细功能标准

### 非功能要求

- [ ] 性能目标
- [ ] 安全要求
- [ ] 可访问性标准

### 质量关卡

- [ ] 测试覆盖率要求
- [ ] 文档完整性
- [ ] 代码审查批准

## 成功指标

[详细的 KPI 和衡量方法]

## 依赖关系和先决条件

[详细依赖分析]

## 风险分析和缓解

[综合风险评估]

## 资源要求

[团队、时间、基础设施需求]

## 未来考虑

[可扩展性和长期愿景]

## 文档计划

[需要更新哪些文档]

## 参考和研究

### 内部参考

- 架构决策：[file_path:line_number]
- 类似功能：[file_path:line_number]
- 配置：[file_path:line_number]

### 外部参考

- 框架文档：[url]
- 最佳实践指南：[url]
- 行业标准：[url]

### 相关工作

- 以前的 PR：#[pr_numbers]
- 相关问题：#[issue_numbers]
- 设计文档：[links]
```

### 5. 问题创建和格式化

<thinking>
应用最佳实践以获得清晰性和可操作性，使问题易于扫描和理解
</thinking>

**内容格式化：**

- [ ] 使用清晰、描述性的标题和适当的层次结构（##、###）
- [ ] 在三重反引号中包含代码示例，并使用语言语法高亮
- [ ] 如果与 UI 相关，添加屏幕截图/模型（拖放或使用图像托管）
- [ ] 使用任务列表（- [ ]）用于可跟踪的可勾选项
- [ ] 使用 `<details>` 标签为长日志或可选详细信息添加可折叠部分
- [ ] 应用适当的表情符号进行视觉扫描（🐛 错误、✨ 功能、📚 文档、♻️ 重构）

**交叉引用：**

- [ ] 使用 #number 格式链接到相关问题/PR
- [ ] 在相关时使用 SHA 哈希引用特定提交
- [ ] 使用 GitHub 的永久链接功能链接到代码（按 'y' 获取永久链接）
- [ ] 如有必要，使用 @username 提及相关团队成员
- [ ] 使用描述性文本添加外部资源链接

**代码和示例：**

````markdown
# 带有语法高亮和行引用的好示例


```ruby
# app/services/user_service.rb:42
def process_user(user)

# 实现在这里

end
```

# 可折叠的错误日志

<details>
<summary>完整错误堆栈跟踪</summary>

`此处的错误详细信息...`

</details>
````

**AI 时代考虑：**

- [ ] 考虑 AI 结对编程的加速开发
- [ ] 包含在研究期间效果良好的提示或指令
- [ ] 注意哪些 AI 工具用于初始探索（Claude、Copilot 等）
- [ ] 鉴于快速实施，强调全面测试
- [ ] 记录任何需要人工审查的 AI 生成代码

### 6. 最终审查和提交

**提交前检查清单：**

- [ ] 标题可搜索且具有描述性
- [ ] 标签准确地对问题进行分类
- [ ] 所有模板部分都已完成
- [ ] 链接和参考正常工作
- [ ] 验收标准可衡量
- [ ] 在伪代码示例和待办事项列表中添加文件名
- [ ] 如适用于新的模型更改，添加 ERD mermaid 图

## 输出格式

将计划写入 `plans/<issue_title>.md`

## 生成后选项

编写计划文件后，使用 **AskUserQuestion 工具**呈现这些选项：

**问题：** "计划已准备就绪，位于 `plans/<issue_title>.md`。您接下来想做什么？"

**选项：**
1. **在编辑器中打开计划** - 打开计划文件进行审查
2. **运行 `/deepen-plan`** - 使用并行研究代理增强每个部分（最佳实践、性能、UI）
3. **运行 `/plan_review`** - 获得审查者的反馈（DHH、Kieran、Simplicity）
4. **开始 `/workflows:work`** - 在本地开始实施此计划
5. **在远程开始 `/workflows:work`** - 在 Claude Code 网页版中开始实施（使用 `&` 在后台运行）
6. **创建问题** - 在项目跟踪器中创建问题（GitHub/Linear）
7. **简化** - 降低详细程度

根据选择：
- **在编辑器中打开计划** → 运行 `open plans/<issue_title>.md` 在用户的默认编辑器中打开文件
- **`/deepen-plan`** → 使用计划文件路径调用 /deepen-plan 命令以通过研究增强
- **`/plan_review`** → 使用计划文件路径调用 /plan_review 命令
- **`/workflows:work`** → 使用计划文件路径调用 /workflows:work 命令
- **在远程开始 `/workflows:work`** → 运行 `/workflows:work plans/<issue_title>.md &` 在 Claude Code 网页版的后台开始工作
- **创建问题** → 见下面的"问题创建"部分
- **简化** → 询问"我应该简化什么？"然后重新生成更简单的版本
- **其他**（自动提供）→ 接受自由文本进行返工或特定更改

**注意：** 如果在启用 ultrathink 的情况下运行 `/workflows:plan`，请在计划创建后自动运行 `/deepen-plan` 以获得最大深度和基础。

在简化或其他更改后循环回选项，直到用户选择 `/workflows:work` 或 `/plan_review`。

## 问题创建

当用户选择"创建问题"时，从 CLAUDE.md 检测他们的项目跟踪器：

1. **检查跟踪器偏好** 在用户的 CLAUDE.md 中（全局或项目）：
   - 查找 `project_tracker: github` 或 `project_tracker: linear`
   - 或在其工作流部分中查找 "GitHub Issues" 或 "Linear" 的提及

2. **如果是 GitHub：**
   ```bash
   # 从计划文件名中提取标题（kebab-case 转换为 Title Case）
   # 读取计划内容作为正文
   gh issue create --title "feat: [Plan Title]" --body-file plans/<issue_title>.md
   ```

3. **如果是 Linear：**
   ```bash
   # 使用 linear CLI（如果可用），或提供说明
   # linear issue create --title "[Plan Title]" --description "$(cat plans/<issue_title>.md)"
   ```

4. **如果未配置跟踪器：**
   询问用户："您使用哪个项目跟踪器？（GitHub/Linear/其他）"
   - 建议在其 CLAUDE.md 中添加 `project_tracker: github` 或 `project_tracker: linear`

5. **创建后：**
   - 显示问题 URL
   - 询问他们是否想要继续 `/workflows:work` 或 `/plan_review`

请勿编写代码！只需研究和编写计划。

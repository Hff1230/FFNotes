---
name: workflows:compound
description: 记录最近解决的问题以积累团队知识
argument-hint: "[可选：关于修复的简要背景]"
---

# /compound

协调多个并行子代理来记录最近解决的问题。

## 目的

在上下文新鲜时捕获问题解决方案，在 `docs/solutions/` 中创建带有 YAML 前置元数据的结构化文档，以便搜索和未来参考。使用并行子代理以实现最高效率。

**为什么叫"compound"（积累）？**每个记录的解决方案都会积累团队的知识。第一次解决问题需要研究。记录下来后，下次出现只需几分钟。知识会不断积累。

## 用法

```bash
/workflows:compound                    # 记录最近的修复
/workflows:compound [简要背景]         # 提供额外的背景提示
```

## 执行策略：并行子代理

此命令同时启动多个专用子代理以实现最高效率：

### 1. **上下文分析器**（并行）
   - 提取对话历史
   - 识别问题类型、组件、症状
   - 验证是否符合 CORA 模式
   - 返回：YAML 前置元数据骨架

### 2. **解决方案提取器**（并行）
   - 分析所有调查步骤
   - 识别根本原因
   - 提取带有代码示例的有效解决方案
   - 返回：解决方案内容块

### 3. **相关文档查找器**（并行）
   - 在 `docs/solutions/` 中搜索相关文档
   - 识别交叉引用和链接
   - 查找相关的 GitHub 问题
   - 返回：链接和关系

### 4. **预防策略师**（并行）
   - 制定预防策略
   - 创建最佳实践指南
   - 生成适用的测试用例
   - 返回：预防/测试内容

### 5. **类别分类器**（并行）
   - 确定最佳的 `docs/solutions/` 类别
   - 根据模式验证类别
   - 基于别名建议文件名
   - 返回：最终路径和文件名

### 6. **文档编写器**（并行）
   - 组装完整的 markdown 文件
   - 验证 YAML 前置元数据
   - 格式化内容以提高可读性
   - 在正确位置创建文件

### 7. **可选：专用代理调用**（文档生成后）
   根据检测到的问题类型，自动调用适用的代理：
   - **performance_issue** → `performance-oracle`
   - **security_issue** → `security-sentinel`
   - **database_issue** → `data-integrity-guardian`
   - **test_failure** → `cora-test-reviewer`
   - 任何涉及大量代码的问题 → `kieran-rails-reviewer` + `code-simplicity-reviewer`

## 捕获的内容

- **问题症状**：确切的错误消息、可观察的行为
- **尝试的调查步骤**：什么不起作用以及原因
- **根本原因分析**：技术解释
- **有效的解决方案**：带有代码示例的分步修复方法
- **预防策略**：如何避免未来发生
- **交叉引用**：指向相关问题和文档的链接

## 前置条件

<preconditions enforcement="advisory">
  <check condition="problem_solved">
    问题已解决（未进行中）
  </check>
  <check condition="solution_verified">
    解决方案已验证有效
  </check>
  <check condition="non_trivial">
    非平凡问题（不是简单的拼写错误或明显错误）
  </check>
</preconditions>

## 生成内容

**有组织的文档：**

- 文件：`docs/solutions/[category]/[filename].md`

**从问题自动检测的类别：**

- build-errors/
- test-failures/
- runtime-errors/
- performance-issues/
- database-issues/
- security-issues/
- ui-bugs/
- integration-issues/
- logic-errors/

## 成功输出

```
✓ 并行文档生成完成

主要子代理结果：
  ✓ 上下文分析器：识别 brief_system 中的 performance_issue
  ✓ 解决方案提取器：提取 3 个代码修复
  ✓ 相关文档查找器：找到 2 个相关问题
  ✓ 预防策略师：生成测试用例
  ✓ 类别分类器：docs/solutions/performance-issues/
  ✓ 文档编写器：创建完整的 markdown

专用代理审查（自动触发）：
  ✓ performance-oracle：验证查询优化方法
  ✓ kieran-rails-reviewer：代码示例符合 Rails 标准
  ✓ code-simplicity-reviewer：解决方案适当且简洁
  ✓ every-style-editor：文档样式已验证

创建的文件：
- docs/solutions/performance-issues/n-plus-one-brief-generation.md

当电子邮件处理或简报系统模块中出现类似问题时，此文档可搜索以供将来参考。

下一步做什么？
1. 继续工作流（推荐）
2. 链接相关文档
3. 更新其他引用
4. 查看文档
5. 其他
```

## 积累哲学

这创建了一个积累知识系统：

1. 第一次解决"简报生成中的 N+1 查询" → 研究（30 分钟）
2. 记录解决方案 → docs/solutions/performance-issues/n-plus-one-briefs.md（5 分钟）
3. 下次出现类似问题 → 快速查找（2 分钟）
4. 知识积累 → 团队变得更聪明

反馈循环：

```
构建 → 测试 → 发现问题 → 研究 → 改进 → 记录 → 验证 → 部署
    ↑                                                                      ↓
    └──────────────────────────────────────────────────────────────────────┘
```

**每个工程工作单元应使后续工作单元更容易——而不是更困难。**

## 自动调用

<auto_invoke> <trigger_phrases> - "成功了" - "修复了" - "现在可以了" - "问题解决了" </trigger_phrases>

<manual_override> 使用 /workflows:compound [context] 立即记录，无需等待自动检测。 </manual_override> </auto_invoke>

## 路由到

`compound-docs` 技能

## 适用的专用代理

根据问题类型，这些代理可以增强文档：

### 代码质量和审查
- **kieran-rails-reviewer**：审查代码示例是否符合 Rails 最佳实践
- **code-simplicity-reviewer**：确保解决方案代码简洁清晰
- **pattern-recognition-specialist**：识别反模式或重复出现的问题

### 特定领域专家
- **performance-oracle**：分析 performance_issue 类别的解决方案
- **security-sentinel**：审查 security_issue 解决方案是否存在漏洞
- **cora-test-reviewer**：为预防策略创建测试用例
- **data-integrity-guardian**：审查 database_issue 迁移和查询

### 增强和文档
- **best-practices-researcher**：用行业最佳实践丰富解决方案
- **every-style-editor**：审查文档风格和清晰度
- **framework-docs-researcher**：链接到 Rails/gem 文档参考

### 何时调用
- **自动触发**（可选）：代理可以在文档生成后运行以进行增强
- **手动触发**：用户可以在 /workflows:compound 完成后调用代理以进行更深入的审查

## 相关命令

- `/research [topic]` - 深入调查（在 docs/solutions/ 中搜索模式）
- `/workflows:plan` - 规划工作流（引用记录的解决方案）

# Workflow: 创建新技能

<required_reading>
**立即阅读以下参考文件：**
1. references/recommended-structure.md
2. references/skill-structure.md
3. references/core-principles.md
4. references/use-xml-tags.md
</required_reading>

<process>
## 步骤 1: 自适应需求收集

**如果用户提供了上下文**（例如，"为 X 构建技能"）：
→ 分析所说的内容、可以推断的内容、不清楚的内容
→ 仅询问真正的缺口

**如果用户只是调用技能而没有任何上下文：**
→ 询问他们想构建什么

### 使用 AskUserQuestion

根据实际缺口提出 2-4 个特定于领域的问题。每个问题应该：
- 有特定选项和描述
- 专注于范围、复杂性、输出、边界
- 不询问上下文中明显的内容

示例问题：
- "此技能应处理哪些具体操作？"（基于领域的选项）
- "这也应该处理[相关事物]还是专注于[核心事物]？"
- "成功时用户应该看到什么？"

### 决策门

初始问题后，询问：
"准备继续构建，还是希望我提出更多问题？"

选项：
1. **继续构建** - 我有足够的上下文
2. **提出更多问题** - 还有更多细节需要澄清
3. **让我添加详细信息** - 我想提供额外的上下文

## 步骤 2: 研究触发器（如果是外部 API）

**当检测到外部服务时**，使用 AskUserQuestion 询问：
"这涉及 [服务名称] API。您希望我在构建之前研究当前的端点和模式吗？"

选项：
1. **是的，先研究** - 获取当前文档以准确实施
2. **不，继续使用通用模式** - 使用通用模式而不进行特定的 API 研究

如果请求研究：
- 使用 Context7 MCP 获取当前库文档
- 或使用 WebSearch 获取最近的 API 文档
- 专注于 2024-2025 年的来源
- 存储发现以用于内容生成

## 步骤 3: 决定结构

**简单技能（单个工作流，<200 行）：**
→ 单个 SKILL.md 文件，包含所有内容

**复杂技能（多个工作流或领域知识）：**
→ 路由器模式：
```
skill-name/
├── SKILL.md (路由器 + 原则)
├── workflows/ (流程 - 遵循)
├── references/ (知识 - 阅读)
├── templates/ (输出结构 - 复制 + 填充)
└── scripts/ (可复用代码 - 执行)
```

倾向于路由器模式的因素：
- 多个不同的用户意图（创建 vs 调试 vs 发布）
- 跨工作流共享领域知识
- 不能跳过的核心原则
- 技能可能会随时间增长

**考虑 templates/ 当：**
- 技能产生一致的输出结构（计划、规范、报告）
- 结构比创意生成更重要

**考虑 scripts/ 当：**
- 相同代码在调用间运行（部署、设置、API 调用）
- 每次重写时容易出错的操作

有关模板，请参阅 references/recommended-structure.md。

## 步骤 4: 创建目录

```bash
mkdir -p ~/.claude/skills/{skill-name}
# 如果复杂：
mkdir -p ~/.claude/skills/{skill-name}/workflows
mkdir -p ~/.claude/skills/{skill-name}/references
# 如果需要：
mkdir -p ~/.claude/skills/{skill-name}/templates  # 用于输出结构
mkdir -p ~/.claude/skills/{skill-name}/scripts    # 用于可复用代码
```

## 步骤 5: 编写 SKILL.md

**简单技能：** 编写完整的技能文件，包含：
- YAML frontmatter（name、description）
- `<objective>`
- `<quick_start>`
- 带有纯 XML 的内容部分
- `<success_criteria>`

**复杂技能：** 编写路由器，包含：
- YAML frontmatter
- `<essential_principles>`（内联，不可避免）
- `<intake>`（询问用户的问题）
- `<routing>`（将答案映射到工作流）
- `<reference_index>` 和 `<workflows_index>`

## 步骤 6: 编写工作流（如果复杂）

对于每个工作流：
```xml
<required_reading>
要为此工作流加载哪些参考
</required_reading>

<process>
分步程序
</process>

<success_criteria>
如何知道此工作流完成
</success_criteria>
```

## 步骤 7: 编写参考（如果需要）

可能需要的领域知识：
- 多个工作流可能需要
- 不基于工作流而变化
- 包含模式、示例、技术细节

## 步骤 8: 验证结构

检查：
- [ ] YAML frontmatter 有效
- [ ] 名称与目录匹配（小写-带-连字符）
- [ ] 描述说明它做什么以及何时使用它（第三人称）
- [ ] 正文中无 markdown 标题（#） - 使用 XML 标签
- [ ] 存在必需标签：objective、quick_start、success_criteria
- [ ] 所有引用的文件都存在
- [ ] SKILL.md 不超过 500 行
- [ ] XML 标签正确关闭

## 步骤 9: 创建斜杠命令

```bash
cat > ~/.claude/commands/{skill-name}.md << 'EOF'
---
description: {简要描述}
argument-hint: [{参数提示}]
allowed-tools: Skill({skill-name})
---

调用 {skill-name} 技能以：$ARGUMENTS
EOF
```

## 步骤 10: 测试

调用技能并观察：
- 它是否提出正确的接收问题？
- 它是否加载正确的工作流？
- 工作流是否加载正确的参考？
- 输出是否符合预期？

基于实际使用而非假设进行迭代。
</process>

<success_criteria>
技能完成时：
- [ ] 通过适当的问题收集需求
- [ ] 如果涉及外部服务，完成 API 研究
- [ ] 目录结构正确
- [ ] SKILL.md 具有有效的 frontmatter
- [ ] 核心原则内联（如果是复杂技能）
- [ ] 接收问题路由到正确的工作流
- [ ] 所有工作流都有 required_reading + process + success_criteria
- [ ] 参考包含可复用的领域知识
- [ ] 斜杠命令存在且有效
- [ ] 已通过实际调用测试
</success_criteria>

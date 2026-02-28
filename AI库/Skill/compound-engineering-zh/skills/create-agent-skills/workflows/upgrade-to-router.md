# Workflow: 将技能升级到路由器模式

<required_reading>
**立即阅读以下参考文件：**
1. references/recommended-structure.md
2. references/skill-structure.md
</required_reading>

<process>
## 步骤 1: 选择技能

```bash
ls ~/.claude/skills/
```

展示编号列表，询问："哪个技能应该升级到路由器模式？"

## 步骤 2: 验证是否需要升级

读取技能：
```bash
cat ~/.claude/skills/{skill-name}/SKILL.md
ls ~/.claude/skills/{skill-name}/
```

**已经是路由器？**（有 workflows/ 和接收问题）
→ 告诉用户它已经使用路由器模式，提供添加工作流

**应该保持简单的简单技能？**（不超过 200 行，单个工作流）
→ 解释路由器模式可能过度，询问是否仍要继续

**升级的好候选：**
- 超过 200 行
- 多个不同的用例
- 不应跳过的核心原则
- 增长的复杂性

## 步骤 3: 识别组件

分析当前技能并识别：

1. **核心原则** - 适用于所有用例的规则
2. **不同的工作流** - 用户可能想做的不同事情
3. **可复用的知识** - 模式、示例、技术细节

展示发现：
```
## 分析

**我发现的核心原则：**
- [原则 1]
- [原则 2]

**我识别的不同工作流：**
- [工作流 A]：[描述]
- [工作流 B]：[描述]

**可以作为参考的知识：**
- [参考主题 1]
- [参考主题 2]
```

询问："此细分看起来正确吗？有任何调整吗？"

## 步骤 4: 创建目录结构

```bash
mkdir -p ~/.claude/skills/{skill-name}/workflows
mkdir -p ~/.claude/skills/{skill-name}/references
```

## 步骤 5: 提取工作流

对于每个识别的工作流：

1. 创建 `workflows/{workflow-name}.md`
2. 添加 required_reading 部分（它需要的参考）
3. 添加 process 部分（来自原始技能的步骤）
4. 添加 success_criteria 部分

## 步骤 6: 提取参考

对于每个识别的参考主题：

1. 创建 `references/{reference-name}.md`
2. 从原始技能移动相关内容
3. 使用语义化 XML 标签构建结构

## 步骤 7: 将 SKILL.md 重写为路由器

将 SKILL.md 替换为路由器结构：

```markdown
---
name: {skill-name}
description: {现有描述}
---

<essential_principles>
[提取的原则 - 内联，不能跳过]
</essential_principles>

<intake>
**询问用户：**

您想做什么？
1. [工作流 A 选项]
2. [工作流 B 选项]
...

**在继续之前等待响应。**
</intake>

<routing>
| 响应 | 工作流 |
|----------|----------|
| 1, "keywords" | `workflows/workflow-a.md` |
| 2, "keywords" | `workflows/workflow-b.md` |
</routing>

<reference_index>
[按类别列出所有参考]
</reference_index>

<workflows_index>
| 工作流 | 用途 |
|----------|---------|
| workflow-a.md | [它做什么] |
| workflow-b.md | [它做什么] |
</workflows_index>
```

## 步骤 8: 验证没有丢失任何内容

将原始技能内容与新结构进行比较：
- [ ] 所有原则都保留（现在内联）
- [ ] 所有流程都保留（现在在工作流中）
- [ ] 所有知识都保留（现在在参考中）
- [ ] 无孤立内容

## 步骤 9: 测试

调用升级后的技能：
- 接收问题出现吗？
- 每个路由选项有效吗？
- 工作流加载正确的参考吗？
- 行为与原始技能匹配吗？

报告任何问题。
</process>

<success_criteria>
升级完成时：
- [ ] 已创建 workflows/ 目录和工作流文件
- [ ] 已创建 references/ 目录（如需要）
- [ ] SKILL.md 重写为路由器
- [ ] 核心原则在 SKILL.md 中内联
- [ ] 所有原始内容都保留
- [ ] 接收问题正确路由
- [ ] 已测试并正常工作
</success_criteria>

# Workflow: 为现有技能添加工作流

<required_reading>
**立即阅读以下参考文件：**
1. references/recommended-structure.md
2. references/workflows-and-validation.md
</required_reading>

<process>
## 步骤 1: 选择技能

**不要使用 AskUserQuestion** - 可能有很多技能。

```bash
ls ~/.claude/skills/
```

展示编号列表，询问："哪个技能需要添加新的工作流？"

## 步骤 2: 分析当前结构

读取技能：
```bash
cat ~/.claude/skills/{skill-name}/SKILL.md
ls ~/.claude/skills/{skill-name}/workflows/ 2>/dev/null
```

确定：
- **简单技能？** → 可能需要先升级到路由器模式
- **已有 workflows/?** → 很好，可以直接添加
- **有哪些工作流？** → 避免重复

向用户报告当前结构。

## 步骤 3: 收集工作流需求

使用 AskUserQuestion 或直接问题询问：
- 此工作流应该做什么？
- 何时会使用它而不是现有的工作流？
- 需要哪些参考？

## 步骤 4: 升级到路由器模式（如需要）

**如果技能当前是简单的（没有 workflows/）：**

询问："此技能需要先升级到路由器模式。我应该重构它吗？"

如果是：
1. 创建 workflows/ 目录
2. 将现有流程内容移至 workflows/main.md
3. 将 SKILL.md 重写为带有接收 + 路由的路由器
4. 在继续之前验证结构有效

## 步骤 5: 创建工作流文件

创建 `workflows/{workflow-name}.md`：

```markdown
# Workflow: {工作流名称}

<required_reading>
**立即阅读以下参考文件：**
1. references/{relevant-file}.md
</required_reading>

<process>
## 步骤 1: {第一步}
[要做什么]

## 步骤 2: {第二步}
[要做什么]

## 步骤 3: {第三步}
[要做什么]
</process>

<success_criteria>
此工作流完成时：
- [ ] 标准 1
- [ ] 标准 2
- [ ] 标准 3
</success_criteria>
```

## 步骤 6: 更新 SKILL.md

将新工作流添加到：

1. **接收问题** - 添加新选项
2. **路由表** - 将选项映射到工作流文件
3. **工作流索引** - 添加到列表

## 步骤 7: 创建参考（如需要）

如果工作流需要不存在的领域知识：
1. 创建 `references/{reference-name}.md`
2. 添加到 SKILL.md 的 reference_index
3. 在工作流的 required_reading 中引用它

## 步骤 8: 测试

调用技能：
- 新选项是否出现在接收中？
- 选择它是否路由到正确的工作流？
- 工作流是否加载正确的参考？
- 工作流是否正确执行？

向用户报告结果。
</process>

<success_criteria>
工作流添加完成时：
- [ ] 技能已升级到路由器模式（如需要）
- [ ] 工作流文件已创建，包含 required_reading、process、success_criteria
- [ ] SKILL.md 接收已更新，包含新选项
- [ ] SKILL.md 路由已更新
- [ ] SKILL.md workflows_index 已更新
- [ ] 已创建任何需要的参考
- [ ] 已测试并正常工作
</success_criteria>

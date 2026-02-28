# Workflow: 为现有技能添加参考

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

展示编号列表，询问："哪个技能需要添加新的参考？"

## 步骤 2: 分析当前结构

```bash
cat ~/.claude/skills/{skill-name}/SKILL.md
ls ~/.claude/skills/{skill-name}/references/ 2>/dev/null
```

确定：
- **已有 references/ 文件夹？** → 很好，可以直接添加
- **简单技能？** → 可能需要先创建 references/
- **已有哪些参考？** → 了解知识体系

向用户报告当前的参考文件。

## 步骤 3: 收集参考需求

询问：
- 此参考应包含什么知识？
- 哪些工作流将使用它？
- 这是在工作流间可复用的，还是特定于某个工作流的？

**如果仅用于某个工作流** → 考虑将其内联到该工作流中。

## 步骤 4: 创建参考文件

创建 `references/{reference-name}.md`：

使用语义化 XML 标签来构建内容：
```xml
<overview>
简要说明此参考涵盖的内容
</overview>

<patterns>
## 常见模式
[可复用的模式、示例、代码片段]
</patterns>

<guidelines>
## 指南
[最佳实践、规则、约束]
</guidelines>

<examples>
## 示例
[带说明的具体示例]
</examples>
```

## 步骤 5: 更新 SKILL.md

将新参考添加到 `<reference_index>`：
```markdown
**类别：** existing.md, new-reference.md
```

## 步骤 6: 更新需要此参考的工作流

对于每个应使用此参考的工作流：

1. 读取工作流文件
2. 将其添加到 `<required_reading>` 部分
3. 验证添加后的工作流是否仍然合理

## 步骤 7: 验证

- [ ] 参考文件存在且结构良好
- [ ] 参考已添加到 SKILL.md 的 reference_index
- [ ] 相关工作流在 required_reading 中引用了它
- [ ] 无断链引用
</process>

<success_criteria>
参考添加完成时：
- [ ] 参考文件已创建且包含有用内容
- [ ] 已添加到 SKILL.md 的 reference_index
- [ ] 相关工作流已更新以读取它
- [ ] 内容可复用（非特定于某个工作流）
</success_criteria>

# Workflow: 审计技能

<required_reading>
**立即阅读以下参考文件：**
1. references/recommended-structure.md
2. references/skill-structure.md
3. references/use-xml-tags.md
</required_reading>

<process>
## 步骤 1: 列出可用技能

**不要使用 AskUserQuestion** - 可能有很多技能。

在聊天中枚举技能作为编号列表：
```bash
ls ~/.claude/skills/
```

展示为：
```
可用技能：
1. create-agent-skills
2. build-macos-apps
3. manage-stripe
...
```

询问："您想审计哪个技能？(输入编号或名称)"

## 步骤 2: 读取技能

用户选择后，读取完整的技能结构：
```bash
# 读取主文件
cat ~/.claude/skills/{skill-name}/SKILL.md

# 检查工作流和参考
ls ~/.claude/skills/{skill-name}/
ls ~/.claude/skills/{skill-name}/workflows/ 2>/dev/null
ls ~/.claude/skills/{skill-name}/references/ 2>/dev/null
```

## 步骤 3: 运行审计清单

根据每个标准进行评估：

### YAML Frontmatter
- [ ] 有 `name:` 字段（小写-带-连字符）
- [ ] 名称与目录名称匹配
- [ ] 有 `description:` 字段
- [ ] 描述说明了它做什么以及何时使用它
- [ ] 描述是第三人称（"当...时使用"）

### 结构
- [ ] SKILL.md 不超过 500 行
- [ ] 纯 XML 结构（正文中无 markdown 标题 #）
- [ ] 所有 XML 标签正确关闭
- [ ] 有必需标签：objective 或 essential_principles
- [ ] 有 success_criteria

### 路由器模式（如果是复杂技能）
- [ ] 核心原则在 SKILL.md 中内联（不在单独文件中）
- [ ] 有接收问题
- [ ] 有路由表
- [ ] 所有引用的工作流文件都存在
- [ ] 所有引用的参考文件都存在

### 工作流（如果存在）
- [ ] 每个都有 required_reading 部分
- [ ] 每个都有 process 部分
- [ ] 每个都有 success_criteria 部分
- [ ] 必需读取的引用存在

### 内容质量
- [ ] 原则可操作（不是模糊的陈词滥调）
- [ ] 步骤具体（不是"做这件事"）
- [ ] 成功标准可验证
- [ ] 跨文件无冗余内容

## 步骤 4: 生成报告

将发现展示为：

```
## 审计报告：{skill-name}

### ✅ 通过
- [通过的项列表]

### ⚠️ 发现的问题
1. **[问题名称]**: [描述]
   → 修复：[具体操作]

2. **[问题名称]**: [描述]
   → 修复：[具体操作]

### 📊 评分：X/Y 标准通过
```

## 步骤 5: 提供修复

如果发现问题，询问：
"您希望我修复这些问题吗？"

选项：
1. **全部修复** - 应用所有推荐的修复
2. **逐个修复** - 在应用之前审查每个修复
3. **仅需报告** - 无需更改

如果修复：
- 进行每个更改
- 每次更改后验证文件有效性
- 报告修复了什么
</process>

<audit_anti_patterns>
## 需要标记的常见反模式

**可跳过的原则**：核心原则在单独文件中而非内联
**单一巨型技能**：单个文件超过 500 行
**混合关注点**：流程和知识在同一文件中
**模糊的步骤**："适当地处理错误"
**不可测试的标准**："用户满意"
**正文中的 markdown 标题**：使用 # 而非 XML 标签
**缺少路由**：复杂技能没有接收/路由
**断链引用**：提到但不存在的文件
**冗余内容**：多处相同信息
</audit_anti_patterns>

<success_criteria>
审计完成时：
- [ ] 技能已完全读取和分析
- [ ] 所有清单项已评估
- [ ] 报告已展示给用户
- [ ] 修复已应用（如果请求）
- [ ] 用户清楚了解技能健康状况
</success_criteria>

# Workflow: 验证技能内容准确性

<required_reading>
**立即阅读以下参考文件：**
1. references/skill-structure.md
</required_reading>

<purpose>
审计检查结构。**验证检查真相。**

技能包含关于外部事物的声明：API、CLI 工具、框架、服务。这些会随时间变化。此工作流检查技能的内容是否仍然准确。
</purpose>

<process>
## 步骤 1: 选择技能

```bash
ls ~/.claude/skills/
```

展示编号列表，询问："我应该验证哪个技能的准确性？"

## 步骤 2: 读取和分类

读取整个技能（SKILL.md + workflows/ + references/）：
```bash
cat ~/.claude/skills/{skill-name}/SKILL.md
cat ~/.claude/skills/{skill-name}/workflows/*.md 2>/dev/null
cat ~/.claude/skills/{skill-name}/references/*.md 2>/dev/null
```

按主要依赖类型分类：

| 类型 | 示例 | 验证方法 |
|------|----------|---------------------|
| **API/服务** | manage-stripe、manage-gohighlevel | Context7 + WebSearch |
| **CLI 工具** | build-macos-apps（xcodebuild、swift） | 运行命令 |
| **框架** | build-iphone-apps（SwiftUI、UIKit） | Context7 获取文档 |
| **集成** | setup-stripe-payments | WebFetch + Context7 |
| **纯流程** | create-agent-skills | 无外部依赖 |

报告："此技能主要基于 [类型]。我将使用 [方法] 进行验证。"

## 步骤 3: 提取可验证的声明

扫描技能内容并提取：

**提到的 CLI 工具：**
- 工具名称（xcodebuild、swift、npm 等）
- 记录的特定标志/选项
- 预期的输出模式

**API 端点：**
- 服务名称（Stripe、Meta 等）
- 记录的特定端点
- 身份验证方法
- SDK 版本

**框架模式：**
- 框架名称（SwiftUI、React 等）
- 记录的特定 API/模式
- 特定于版本的功能

**文件路径/结构：**
- 预期的项目结构
- 配置文件位置

展示："发现了 X 个可验证的声明要检查。"

## 步骤 4: 按类型验证

### 对于 CLI 工具
```bash
# 检查工具存在
which {tool-name}

# 检查版本
{tool-name} --version

# 验证记录的标志有效
{tool-name} --help | grep "{documented-flag}"
```

### 对于 API/服务技能
使用 Context7 获取当前文档：
```
mcp__context7__resolve-library-id: {service-name}
mcp__context7__get-library-docs: {library-id}, topic: {relevant-topic}
```

将技能记录的模式与当前文档进行比较：
- 端点仍然有效吗？
- 身份验证是否已更改？
- 是否有已弃用的方法在使用？

### 对于框架技能
使用 Context7：
```
mcp__context7__resolve-library-id: {framework-name}
mcp__context7__get-library-docs: {library-id}, topic: {specific-api}
```

检查：
- 记录的 API 是否仍然最新？
- 模式是否已更改？
- 是否有更新的推荐方法？

### 对于集成技能
WebSearch 查找最近的更改：
```
"[service name] API changes 2025"
"[service name] breaking changes"
"[service name] deprecated endpoints"
```

然后使用 Context7 获取当前 SDK 模式。

### 对于有状态页面的服务
如果可用，WebFetch 官方文档/changelog。

## 步骤 5: 生成新鲜度报告

展示发现：

```
## 验证报告：{skill-name}

### ✅ 已验证最新
- [声明]：[它仍然准确的证据]

### ⚠️ 可能已过时
- [声明]：[更改的内容 / 找到的新信息]
  → 当前：[文档现在所说的]

### ❌ 已损坏 / 无效
- [声明]：[为什么错误]
  → 修复：[应该是什么]

### ℹ️ 无法验证
- [声明]：[为什么无法验证]

---
**总体状态：**[新鲜 / 需要更新 / 显著过时]
**最后验证：**[今天的日期]
```

## 步骤 6: 提供更新

如果发现问题：

"发现 [N] 项需要更新。您希望我："

1. **全部更新** - 应用所有更正
2. **逐个审查** - 在应用之前展示每个更改
3. **仅需报告** - 无需更改

如果更新：
- 基于经过验证的当前信息进行更改
- 适当添加验证日期注释
- 报告更新的内容

## 步骤 7: 建议验证计划

根据技能类型，推荐：

| 技能类型 | 推荐频率 |
|------------|----------------------|
| API/服务 | 每 1-2 个月 |
| 框架 | 每 3-6 个月 |
| CLI 工具 | 每 6 个月 |
| 纯流程 | 每年 |

"此技能应在大约 [时间范围] 内重新验证。"
</process>

<verification_shortcuts>
## 快速验证命令

**检查 CLI 工具是否存在并获取版本：**
```bash
which {tool} && {tool} --version
```

**任何库的 Context7 模式：**
```
1. resolve-library-id: "{library-name}"
2. get-library-docs: "{id}", topic: "{specific-feature}"
```

**WebSearch 模式：**
- 重大更改："{service} breaking changes 2025"
- 弃用："{service} deprecated API"
- 当前最佳实践："{framework} best practices 2025"
</verification_shortcuts>

<success_criteria>
验证完成时：
- [ ] 技能按依赖类型分类
- [ ] 可验证的声明已提取
- [ ] 每个声明都使用适当的方法检查
- [ ] 新鲜度报告已生成
- [ ] 更新已应用（如请求）
- [ ] 用户知道何时重新验证
</success_criteria>

# Workflow: 创建详尽的领域专业知识技能

<objective>
构建一个在特定领域执行实际工作的综合执行技能。领域专业知识技能是功能齐全的构建技能，在参考中包含详尽的领域知识、完整生命周期的完整工作流（构建 → 调试 → 优化 → 发布），既可以被用户直接调用，也可以被其他技能（如 create-plans）加载以获取领域知识。
</objective>

<critical_distinction>
**常规技能**："做一件具体的事"
**领域专业知识技能**："做这个领域的一切，拥有完整的从业者知识"

示例：
- `expertise/macos-apps` - 从零开始构建 macOS 应用直至发布
- `expertise/python-games` - 构建完整的 Python 游戏，拥有完整的游戏开发生命周期
- `expertise/rust-systems` - 构建拥有详尽系统知识的 Rust 系统程序
- `expertise/web-scraping` - 构建爬虫，处理所有边缘情况，大规模部署

领域专业知识技能：
- ✅ 执行任务（构建、调试、优化、发布）
- ✅ 在参考中包含综合领域知识
- ✅ 被用户直接调用（"构建一个 macOS 应用"）
- ✅ 可被其他技能加载（create-plans 读取参考以进行规划）
- ✅ 覆盖完整生命周期，不仅仅是入门
</critical_distinction>

<required_reading>
**立即阅读以下参考文件：**
1. references/recommended-structure.md
2. references/core-principles.md
3. references/use-xml-tags.md
</required_reading>

<process>
## 步骤 1: 识别领域

询问用户要构建什么领域专业知识：

**示例领域：**
- macOS/iOS 应用开发
- Python 游戏开发
- Rust 系统编程
- 机器学习 / AI
- 网络抓取和自动化
- 数据工程管道
- 音频处理 / DSP
- 3D 图形 / 着色器
- Unity/Unreal 游戏开发
- 嵌入式系统

获取具体信息："Python 游戏"还是"特别使用 Pygame 的 Python 游戏"？

## 步骤 2: 确认目标位置

说明：
```
领域专业知识技能位于：~/.claude/skills/expertise/{domain-name}/

这些是综合的构建技能，可以：
- 执行任务（构建、调试、优化、发布）
- 包含详尽的领域知识
- 被用户直接调用
- 被其他技能加载以获取领域知识

建议名称：{suggested-name}
位置：~/.claude/skills/expertise/{suggested-name}/
```

确认或调整名称。

## 步骤 3: 识别工作流

领域专业知识技能覆盖完整生命周期。识别需要哪些工作流。

**大多数领域的常见工作流：**
1. **build-new-{thing}.md** - 从零开始创建
2. **add-feature.md** - 扩展现有 {thing}
3. **debug-{thing}.md** - 查找和修复错误
4. **write-tests.md** - 测试正确性
5. **optimize-performance.md** - 分析和加速
6. **ship-{thing}.md** - 部署/分发

**特定于领域的工作流：**
- 游戏：`implement-game-mechanic.md`、`add-audio.md`、`polish-ui.md`
- Web 应用：`setup-auth.md`、`add-api-endpoint.md`、`setup-database.md`
- 系统：`optimize-memory.md`、`profile-cpu.md`、`cross-compile.md`

每个工作流 = 一种用户实际执行的完整任务类型。

## 步骤 4: 详尽研究阶段

**关键：** 此研究必须全面，而非肤浅。

### 研究策略

运行多次网络搜索以确保覆盖：

**搜索 1：当前生态系统**
- "best {domain} libraries 2024 2025"
- "popular {domain} frameworks comparison"
- "{domain} tech stack recommendations"

**搜索 2：架构模式**
- "{domain} architecture patterns"
- "{domain} best practices design patterns"
- "how to structure {domain} projects"

**搜索 3：生命周期和工具**
- "{domain} development workflow"
- "{domain} testing debugging best practices"
- "{domain} deployment distribution"

**搜索 4：常见陷阱**
- "{domain} common mistakes avoid"
- "{domain} anti-patterns"
- "what not to do {domain}"

**搜索 5：实际使用**
- "{domain} production examples GitHub"
- "{domain} case studies"
- "successful {domain} projects"

### 验证要求

对于找到的每个主要库/工具/模式：
- **检查时效性：** 它最后更新是什么时候？
- **检查采用度：** 它是否积极维护？社区规模？
- **检查替代方案：** 还存在什么？何时使用每个？
- **检查弃用：** 有什么正在被替换吗？

**过时内容的危险信号：**
- 2023 年之前的文章（除非是基本概念）
- 被遗弃的库（12 个月以上没有提交）
- 已弃用的 API 或模式
- "这曾经很流行，但是..."

### 文档来源

可用的 Context7 MCP：
```
mcp__context7__resolve-library-id: {library-name}
mcp__context7__get-library-docs: {library-id}
```

专注于官方文档，而非教程。

## 步骤 5: 将知识组织到领域区域

按领域关注点而非任意类别来构建参考。

**游戏开发示例：**
```
references/
├── architecture.md         # ECS、基于组件、状态机
├── libraries.md           # Pygame、Arcade、Panda3D（何时使用每个）
├── graphics-rendering.md  # 2D/3D 渲染、精灵、着色器
├── physics.md             # 碰撞、物理引擎
├── audio.md               # 音效、音乐、空间音频
├── input.md               # 键盘、鼠标、游戏手柄、触摸
├── ui-menus.md            # HUD、菜单、对话框
├── game-loop.md           # 更新/渲染循环、固定时间步长
├── state-management.md    # 游戏状态、场景管理
├── networking.md          # 多人游戏、客户端-服务器、P2P
├── asset-pipeline.md      # 加载、缓存、优化
├── testing-debugging.md   # 单元测试、分析、调试工具
├── performance.md         # 优化、分析、基准测试
├── packaging.md           # 构建可执行文件、安装程序
├── distribution.md        # Steam、itch.io、应用商店
└── anti-patterns.md       # 常见错误、什么不该做
```

**macOS 应用开发示例：**
```
references/
├── app-architecture.md     # 状态管理、依赖注入
├── swiftui-patterns.md     # 声明式 UI 模式
├── appkit-integration.md   # 将 AppKit 与 SwiftUI 一起使用
├── concurrency-patterns.md # Async/await、actor、结构化并发
├── data-persistence.md     # 存储策略
├── networking.md           # URLSession、异步网络
├── system-apis.md          # macOS 特定框架
├── testing-tdd.md          # 测试模式
├── testing-debugging.md    # 调试工具和技术
├── performance.md          # 分析、优化
├── design-system.md        # 平台约定
├── macos-polish.md         # 原生感觉、可访问性
├── security-code-signing.md # 签名、公证
└── project-scaffolding.md  # 基于 CLI 的设置
```

**对于每个参考文件：**
- 纯 XML 结构
- 决策树："如果 X，使用 Y。如果 Z，改用 A。"
- 比较表：库与库（速度、功能、学习曲线）
- 显示模式的代码示例
- "何时使用"指导
- 特定于平台的考虑
- 当前版本和兼容性

## 步骤 6: 创建 SKILL.md

领域专业知识技能使用带有核心原则的路由器模式：

```yaml
---
name: build-{domain-name}
description: 从零开始构建{领域事物}直至发布。完整生命周期 - 构建、调试、测试、优化、发布。{任何特定约束，如"仅限 CLI，无 IDE"}。
---

<essential_principles>
## {此领域}如何工作

{始终适用的领域特定原则}

### 1. {第一原则}
{不能跳过的关键实践}

### 2. {第二原则}
{另一个基本实践}

### 3. {第三原则}
{核心工作流模式}
</essential_principles>

<intake>
**询问用户：**

您想做什么？
1. 构建一个新的{thing}
2. 调试现有的{thing}
3. 添加功能
4. 编写/运行测试
5. 优化性能
6. 发布/版本
7. 其他

**然后从 `workflows/` 读取匹配的工作流并遵循它。**
</intake>

<routing>
| 响应 | 工作流 |
|----------|----------|
| 1, "new", "create", "build", "start" | `workflows/build-new-{thing}.md` |
| 2, "broken", "fix", "debug", "crash", "bug" | `workflows/debug-{thing}.md` |
| 3, "add", "feature", "implement", "change" | `workflows/add-feature.md` |
| 4, "test", "tests", "TDD", "coverage" | `workflows/write-tests.md` |
| 5, "slow", "optimize", "performance", "fast" | `workflows/optimize-performance.md` |
| 6, "ship", "release", "deploy", "publish" | `workflows/ship-{thing}.md` |
| 7, other | 澄清，然后选择工作流或参考 |
</routing>

<verification_loop>
## 每次更改后

{领域特定验证步骤}

编译语言示例：
```bash
# 1. 能构建吗？
{build command}

# 2. 测试通过吗？
{test command}

# 3. 能运行吗？
{run command}
```

向用户报告：
- "构建：✓"
- "测试：X 通过，Y 失败"
- "准备好供您检查[特定内容]"
</verification_loop>

<reference_index>
## 领域知识

全部在 `references/` 中：

**架构：**{列出文件}
**{领域区域}：**{列出文件}
**{领域区域}：**{列出文件}
**开发：**{列出文件}
**发布：**{列出文件}
</reference_index>

<workflows_index>
## 工作流

全部在 `workflows/` 中：

| 文件 | 用途 |
|------|---------|
| build-new-{thing}.md | 从零开始创建新{thing} |
| debug-{thing}.md | 查找和修复错误 |
| add-feature.md | 添加到现有{thing} |
| write-tests.md | 编写和运行测试 |
| optimize-performance.md | 分析和加速 |
| ship-{thing}.md | 部署/分发 |
</workflows_index>
```

## 步骤 7: 编写工作流

对于步骤 3 中识别的每个工作流：

### 工作流模板

```markdown
# Workflow: {工作流名称}

<required_reading>
**在{执行任务}之前立即阅读以下参考文件：**
1. references/{relevant-file}.md
2. references/{another-relevant-file}.md
3. references/{third-relevant-file}.md
</required_reading>

<process>
## 步骤 1: {第一个操作}

{要做什么}

## 步骤 2: {第二个操作}

{要做什么 - 实际实施步骤}

## 步骤 3: {第三个操作}

{要做什么}

## 步骤 4: 验证

{如何证明它有效}

```bash
{verification commands}
```
</process>

<anti_patterns>
避免：
- {常见错误 1}
- {常见错误 2}
- {常见错误 3}
</anti_patterns>

<success_criteria>
良好的{已完成任务}：
- {标准 1}
- {标准 2}
- {标准 3}
- 无错误地构建/运行
- 测试通过
- 感觉{原生/专业/正确}
</success_criteria>
```

**关键工作流特征：**
- 以 required_reading 开头（要加载哪些参考）
- 包含实际实施步骤（不仅仅是"阅读参考"）
- 包含验证步骤
- 有成功标准
- 记录反模式

## 步骤 8: 编写综合参考

对于步骤 5 中识别的每个参考文件：

### 结构模板

```xml
<overview>
简要介绍此领域区域
</overview>

<options>
## 可用的方法/库

<option name="Library A">
**何时使用：**[特定场景]
**优势：**[它最擅长什么]
**劣势：**[它不擅长什么]
**当前状态：**v{version}，积极维护
**学习曲线：**[简单/中等/困难]

```code
# 示例用法
```
</option>

<option name="Library B">
[相同结构]
</option>
</options>

<decision_tree>
## 选择正确的方法

**如果您需要 [X]：**使用 [Library A]
**如果您需要 [Y]：**使用 [Library B]
**如果您有 [约束 Z]：**使用 [Library C]

**如果避免使用 [Library D]：**[特定场景]
</decision_tree>

<patterns>
## 常见模式

<pattern name="模式名称">
**何时使用：**[场景]
**实施：**[代码示例]
**考虑：**[权衡]
</pattern>
</patterns>

<anti_patterns>
## 什么不该做

<anti_pattern name="常见错误">
**问题：**[人们做错了什么]
**为什么不好：**[后果]
**而是：**[正确方法]
</anti_pattern>
</anti_patterns>

<platform_considerations>
## 特定于平台的说明

**Windows：**[考虑]
**macOS：**[考虑]
**Linux：**[考虑]
**移动：**[如果适用]
</platform_considerations>
```

### 质量标准

每个参考必须包括：
- **当前信息**（验证日期）
- **多个选项**（不仅仅是一个库）
- **决策指导**（何时使用每个）
- **真实示例**（工作代码，而非伪代码）
- **权衡**（没有灵丹妙药）
- **反模式**（什么不该做）

### 常见参考文件

大多数领域需要：
- **architecture.md** - 如何构建项目
- **libraries.md** - 生态系统概述和比较
- **patterns.md** - 特定于领域的设计模式
- **testing-debugging.md** - 如何验证正确性
- **performance.md** - 优化策略
- **deployment.md** - 如何发布/分发
- **anti-patterns.md** - 整合的常见错误

## 步骤 9: 验证完整性

### 完整性清单

询问："用户可以仅使用此技能从头到发布构建专业的{领域事物}吗？"

**必须回答是：**
- [ ] 所有主要库/框架都覆盖了吗？
- [ ] 所有架构方法都记录了吗？
- [ ] 完整生命周期已解决（构建 → 调试 → 测试 → 优化 → 发布）？
- [ ] 包含特定于平台的考虑？
- [ ] 提供了"何时使用 X 与 Y"指导？
- [ ] 记录了常见陷阱？
- [ ] 截至 2024-2025 年最新？
- [ ] 工作流实际执行任务（不仅仅是参考知识）？
- [ ] 每个工作流指定要读取哪些参考？

**要检查的特定缺口：**
- [ ] 测试策略覆盖了吗？
- [ ] 调试/分析工具列出了吗？
- [ ] 部署/分发方法记录了吗？
- [ ] 性能优化解决了吗？
- [ ] 安全考虑（如适用）？
- [ ] 资源/资源管理（如适用）？
- [ ] 网络（如适用）？

### 双重用途测试

测试两个用例：

**直接调用：**"用户可以调用此技能并构建东西吗？"
- 接收路由到适当的工作流
- 工作流加载相关参考
- 工作流提供实施步骤
- 成功标准清晰

**知识参考：**"create-plans 可以加载参考来规划项目吗？"
- 参考包含决策指导
- 所有选项已比较
- 完整生命周期覆盖
- 架构模式已记录

## 步骤 10: 创建目录和文件

```bash
# 创建结构
mkdir -p ~/.claude/skills/expertise/{domain-name}
mkdir -p ~/.claude/skills/expertise/{domain-name}/workflows
mkdir -p ~/.claude/skills/expertise/{domain-name}/references

# 编写 SKILL.md
# 编写所有工作流文件
# 编写所有参考文件

# 验证结构
ls -R ~/.claude/skills/expertise/{domain-name}
```

## 步骤 11: 在 create-plans 中记录

更新 `~/.claude/skills/create-plans/SKILL.md` 以引用此新领域：

添加到领域推理表：
```markdown
| "{keyword}", "{domain term}" | expertise/{domain-name} |
```

因此 create-plans 可以自动检测并提供加载它。

## 步骤 12: 最终质量检查

审查整个技能：

**SKILL.md：**
- [ ] 名称与目录匹配（build-{domain-name}）
- [ ] 描述说明它从头到发布构建东西
- [ ] 核心原则内联（始终加载）
- [ ] 接收询问用户想做什么
- [ ] 路由映射到工作流
- [ ] 参考索引完整且组织良好
- [ ] 工作流索引完整

**工作流：**
- [ ] 每个工作流以 required_reading 开头
- [ ] 每个工作流有实际实施步骤
- [ ] 每个工作流有验证步骤
- [ ] 每个工作流有成功标准
- [ ] 工作流覆盖完整生命周期（构建、调试、测试、优化、发布）

**参考：**
- [ ] 纯 XML 结构（无 markdown 标题）
- [ ] 每个文件中的决策指导
- [ ] 当前版本已验证
- [ ] 代码示例有效
- [ ] 反模式已记录
- [ ] 包含平台考虑

**完整性：**
- [ ] 专业从业者会认为这很全面
- [ ] 没有遗漏的主要库/模式
- [ ] 完整生命周期覆盖
- [ ] 通过"从头到发布构建"测试
- [ ] 可被用户直接调用
- [ ] 可被 create-plans 加载以获取知识

</process>

<success_criteria>
领域专业知识技能完成时：

- [ ] 综合研究已完成（5+ 次网络搜索）
- [ ] 所有来源已验证时效性（2024-2025）
- [ ] 知识按领域区域组织（而非任意）
- [ ] SKILL.md 中的核心原则（始终加载）
- [ ] 接收路由到适当的工作流
- [ ] 每个工作流有 required_reading + 实施步骤 + 验证
- [ ] 每个参考有决策树和比较
- [ ] 整个过程记录反模式
- [ ] 完整生命周期覆盖（构建 → 调试 → 测试 → 优化 → 发布）
- [ ] 包含特定于平台的考虑
- [ ] 位于 ~/.claude/skills/expertise/{domain-name}/
- [ ] 在 create-plans 领域推理表中引用
- [ ] 通过双重用途测试：可直接调用并加载以获取知识
- [ ] 用户可以从头到发布构建专业的东西
</success_criteria>

<anti_patterns>
**不要：**
- 在没有验证的情况下复制教程内容
- 仅包含"入门"材料
- 跳过"何时不要使用"指导
- 忘记检查库是否仍在维护
- 按文档类型而非领域关注点组织
- 使其仅为知识而没有执行工作流
- 跳过工作流中的验证步骤
- 包含来自旧博客文章的过时内容
- 跳过决策树和比较
- 创建只说"阅读参考"的工作流

**应该：**
- 验证所有内容都是最新的
- 包含完整生命周期（构建 → 发布）
- 提供决策指导
- 记录反模式
- 使工作流执行实际任务
- 以 required_reading 开头工作流
- 在每个工作流中包含验证
- 使其详尽，而非最少
- 测试直接调用和知识参考用例
</anti_patterns>

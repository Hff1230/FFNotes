---
name: workflows:review
description: 使用多代理分析、深度思考和工作树执行详尽的代码审查
argument-hint: "[PR 编号、GitHub URL、分支名称或 latest]"
---

# Review 命令

<command_purpose> 使用多代理分析、深度思考和 Git 工作树执行详尽的代码审查，进行深度本地检查。 </command_purpose>

## 简介

<role>在安全、性能、架构和质量保证方面具有专业知识的高级代码审查架构师</role>

## 前提条件

<requirements>
- 安装并认证了 GitHub CLI (`gh`) 的 Git 仓库
- 干净的 main/master 分支
- 创建工作树和访问仓库的适当权限
- 对于文档审查：markdown 文件或文档的路径
</requirements>

## 主要任务

### 1. 确定审查目标并设置（始终首先执行）

<review_target> #$ARGUMENTS </review_target>

<thinking>
首先，我需要确定审查目标类型并设置代码以进行分析。
</thinking>

#### 立即行动：

<task_list>

- [ ] 确定审查类型：PR 编号（数字）、GitHub URL、文件路径（.md）或空（当前分支）
- [ ] 检查当前 git 分支
- [ ] 如果已经在 PR 分支上 → 在当前分支上继续分析
- [ ] 如果在不同分支上 → 提议使用工作树：对隔离工作使用 git-worktree 技能，调用 `skill: git-worktree` 并提供分支名称
- [ ] 使用 `gh pr view --json` 获取 PR 元数据，包括标题、正文、文件、关联问题
- [ ] 设置特定语言的分析工具
- [ ] 准备安全扫描环境
- [ ] 确保我们在正在审查的分支上。使用 gh pr checkout 切换到分支或手动检出分支。

确保代码已准备好进行分析（在工作树或当前分支中）。只有在此时才继续下一步。

</task_list>

#### 用于审查 PR 的并行代理：

<parallel_tasks>

同时运行所有或大多数这些代理：

1. Task kieran-rails-reviewer(PR 内容)
2. Task dhh-rails-reviewer(PR 标题)
3. 如果使用了 turbo：Task rails-turbo-expert(PR 内容)
4. Task git-history-analyzer(PR 内容)
5. Task dependency-detective(PR 内容)
6. Task pattern-recognition-specialist(PR 内容)
7. Task architecture-strategist(PR 内容)
8. Task code-philosopher(PR 内容)
9. Task security-sentinel(PR 内容)
10. Task performance-oracle(PR 内容)
11. Task devops-harmony-analyst(PR 内容)
12. Task data-integrity-guardian(PR 内容)
13. Task agent-native-reviewer(PR 内容) - 验证新功能是否可被代理访问

</parallel_tasks>

#### 条件代理（如适用则运行）：

<conditional_agents>

这些代理仅在 PR 符合特定条件时运行。检查 PR 文件列表以确定它们是否适用：

**如果 PR 包含数据库迁移（db/migrate/*.rb 文件）或数据回填：**

14. Task data-migration-expert(PR 内容) - 验证 ID 映射与生产环境匹配，检查交换的值，验证回滚安全性
15. Task deployment-verification-agent(PR 内容) - 创建包含 SQL 验证查询的继续/停止部署检查清单

**何时运行迁移代理：**
- PR 包含匹配 `db/migrate/*.rb` 的文件
- PR 修改存储 ID、枚举或映射的列
- PR 包含数据回填脚本或 rake 任务
- PR 更改数据读/写方式（例如，从 FK 更改为字符串列）
- PR 标题/正文提及：migration、backfill、data transformation、ID mapping

**这些代理检查的内容：**
- `data-migration-expert`：验证硬编码映射与生产现实匹配（防止交换的 ID），检查孤立的关联，验证双写模式
- `deployment-verification-agent`：生成包含 SQL 查询、回滚程序和监控计划的可执行部署前/后检查清单

</conditional_agents>

### 4. 超级思考深入阶段

<ultrathink_instruction> 对于以下每个阶段，投入最大的认知努力。逐步思考。考虑所有角度。质疑假设。并将所有审查综合呈现给用户。</ultrathink_instruction>

<deliverable>
包含组件交互的完整系统上下文图
</deliverable>

#### 阶段 3：利益相关者视角分析

<thinking_prompt> 超级思考：设身处地地为每个利益相关者着想。他们关心什么？他们的痛点是什么？ </thinking_prompt>

<stakeholder_perspectives>

1. **开发者视角** <questions>

   - 这有多容易理解和修改？
   - API 是否直观？
   - 调试是否简单直接？
   - 我可以轻松测试吗？ </questions>

2. **运维视角** <questions>

   - 如何安全地部署这个？
   - 有哪些指标和日志可用？
   - 如何排查问题？
   - 资源要求是什么？ </questions>

3. **最终用户视角** <questions>

   - 功能是否直观？
   - 错误消息是否有帮助？
   - 性能是否可接受？
   - 它能解决我的问题吗？ </questions>

4. **安全团队视角** <questions>

   - 攻击面是什么？
   - 有合规要求吗？
   - 数据如何保护？
   - 审计能力是什么？ </questions>

5. **业务视角** <questions>
   - 投资回报率是多少？
   - 有法律/合规风险吗？
   - 这如何影响上市时间？
   - 总拥有成本是多少？ </questions> </stakeholder_perspectives>

#### 阶段 4：场景探索

<thinking_prompt> 超级思考：探索边缘情况和失败场景。什么可能出错？系统在压力下如何表现？ </thinking_prompt>

<scenario_checklist>

- [ ] **正常路径**：使用有效输入的正常操作
- [ ] **无效输入**：Null、空、格式错误的数据
- [ ] **边界条件**：最小/最大值、空集合
- [ ] **并发访问**：竞争条件、死锁
- [ ] **规模测试**：10x、100x、1000x 正常负载
- [ ] **网络问题**：超时、部分失败
- [ ] **资源耗尽**：内存、磁盘、连接
- [ ] **安全攻击**：注入、溢出、DoS
- [ ] **数据损坏**：部分写入、不一致
- [ ] **级联失败**：下游服务问题 </scenario_checklist>

### 6. 多角度审查视角

#### 技术卓越角度

- 代码工艺评估
- 工程最佳实践
- 技术文档质量
- 工具和自动化评估

#### 业务价值角度

- 功能完整性验证
- 对用户的性能影响
- 成本效益分析
- 上市时间考虑

#### 风险管理角度

- 安全风险评估
- 运维风险评估
- 合规风险验证
- 技术债务累积

#### 团队动态角度

- 代码审查礼仪
- 知识共享有效性
- 协作模式
- 指导机会

### 4. 简化和极简主义审查

运行 Task code-simplicity-reviewer() 以查看我们是否可以简化代码。

### 5. 使用 file-todos 技能综合发现并创建待办事项

<critical_requirement> 所有发现必须使用 file-todos 技能存储在 todos/ 目录中。在综合后立即创建待办文件 - 不要先向用户展示发现以供批准。使用该技能进行结构化待办管理。 </critical_requirement>

#### 步骤 1：综合所有发现

<thinking>
将所有代理报告整合为分类的发现列表。
删除重复项，按严重性和影响排序。
</thinking>

<synthesis_tasks>

- [ ] 从所有并行代理收集发现
- [ ] 按类型分类：安全、性能、架构、质量等
- [ ] 分配严重性级别：🔴 严重（P1）、🟡 重要（P2）、🔵 最好有（P3）
- [ ] 删除重复或重叠的发现
- [ ] 估计每个发现的工作量（小/中/大）

</synthesis_tasks>

#### 步骤 2：使用 file-todos 技能创建待办文件

<critical_instruction> 使用 file-todos 技能立即为所有发现创建待办文件。不要逐一展示发现以征求用户批准。使用该技能并行创建所有待办文件，然后向用户总结结果。 </critical_instruction>

**实现选项：**

**选项 A：直接文件创建（快速）**

- 使用 Write 工具直接创建待办文件
- 所有发现并行进行以提高速度
- 使用来自 `.claude/skills/file-todos/assets/todo-template.md` 的标准模板
- 遵循命名约定：`{issue_id}-pending-{priority}-{description}.md`

**选项 B：并行子代理（推荐用于大规模）** 对于具有 15+ 个发现的大型 PR，使用子代理并行创建发现文件：

```bash
# 并行启动多个发现创建代理
Task() - 为第一个发现创建待办
Task() - 为第二个发现创建待办
Task() - 为第三个发现创建待办
# 以此类推，针对每个发现。
```

子代理可以：

- 同时处理多个发现
- 编写填充所有部分的详细待办文件
- 按严重性组织发现
- 创建全面的建议解决方案
- 添加验收标准和工作日志
- 比顺序处理快得多

**执行策略：**

1. 将所有发现综合到类别中（P1/P2/P3）
2. 按严重性分组发现
3. 启动 3 个并行子代理（每个严重性级别一个）
4. 每个子代理使用 file-todos 技能创建其批次待办
5. 整合结果并展示摘要

**流程（使用 file-todos 技能）：**

1. 对于每个发现：

   - 确定严重性（P1/P2/P3）
   - 编写详细的问题陈述和发现
   - 创建 2-3 个建议解决方案，包括优缺点/工作量/风险
   - 估计工作量（小/中/大）
   - 添加验收标准和工作日志

2. 使用 file-todos 技能进行结构化待办管理：

   ```bash
   skill: file-todos
   ```

   该技能提供：

   - 模板位置：`.claude/skills/file-todos/assets/todo-template.md`
   - 命名约定：`{issue_id}-{status}-{priority}-{description}.md`
   - YAML frontmatter 结构：status、priority、issue_id、tags、dependencies
   - 所有必需部分：问题陈述、发现、解决方案等

3. 并行创建待办文件：

   ```bash
   {next_id}-pending-{priority}-{description}.md
   ```

4. 示例：

   ```
   001-pending-p1-path-traversal-vulnerability.md
   002-pending-p1-api-response-validation.md
   003-pending-p2-concurrency-limit.md
   004-pending-p3-unused-parameter.md
   ```

5. 遵循 file-todos 技能的模板结构：`.claude/skills/file-todos/assets/todo-template.md`

**待办文件结构（来自模板）：**

每个待办必须包括：

- **YAML frontmatter**：status、priority、issue_id、tags、dependencies
- **问题陈述**：什么坏了/缺失，为什么重要
- **发现**：来自代理的发现，包含证据/位置
- **建议解决方案**：2-3 个选项，每个都有优缺点/工作量/风险
- **建议操作**：（在分类期间填写，最初留空）
- **技术细节**：受影响的文件、组件、数据库更改
- **验收标准**：可测试的清单项目
- **工作日志**：带日期的记录，包含行动和学习
- **资源**：指向 PR、问题、文档、类似模式的链接

**文件命名约定：**

```
{issue_id}-{status}-{priority}-{description}.md

示例：
- 001-pending-p1-security-vulnerability.md
- 002-pending-p2-performance-optimization.md
- 003-pending-p3-code-cleanup.md
```

**状态值：**

- `pending` - 新发现，需要分类/决策
- `ready` - 已获管理者批准，准备工作
- `complete` - 工作已完成

**优先级值：**

- `p1` - 严重（阻止合并、安全/数据问题）
- `p2` - 重要（应该修复、架构/性能）
- `p3` - 最好有（增强、清理）

**标签：** 始终添加 `code-review` 标签，以及：`security`、`performance`、`architecture`、`rails`、`quality` 等。

#### 步骤 3：摘要报告

创建所有待办文件后，展示综合摘要：

````markdown
## ✅ 代码审查完成

**审查目标：** PR #XXXX - [PR 标题] **分支：** [branch-name]

### 发现摘要：

- **总发现数：** [X]
- **🔴 严重（P1）：** [count] - 阻止合并
- **🟡 重要（P2）：** [count] - 应该修复
- **🔵 最好有（P3）：** [count] - 增强

### 创建的待办文件：

**P1 - 严重（阻止合并）：**

- `001-pending-p1-{finding}.md` - {description}
- `002-pending-p1-{finding}.md` - {description}

**P2 - 重要：**

- `003-pending-p2-{finding}.md` - {description}
- `004-pending-p2-{finding}.md` - {description}

**P3 - 最好有：**

- `005-pending-p3-{finding}.md` - {description}

### 使用的审查代理：

- kieran-rails-reviewer
- security-sentinel
- performance-oracle
- architecture-strategist
- agent-native-reviewer
- [其他代理]

### 下一步：

1. **处理 P1 发现**：严重 - 必须在合并前修复

   - 详细审查每个 P1 待办
   - 实施修复或请求豁免
   - 在合并 PR 之前验证修复

2. **分类所有待办：**
   ```bash
   ls todos/*-pending-*.md  # 查看所有待处理的待办
   /triage                  # 使用斜杠命令进行交互式分类
   ```
````

3. **处理已批准的待办：**

   ```bash
   /resolve_todo_parallel  # 高效修复所有已批准项目
   ```

4. **跟踪进度：**
   - 状态更改时重命名文件：pending → ready → complete
   - 工作时更新工作日志
   - 提交待办：`git add todos/ && git commit -m "refactor: add code review findings"`

### 严重性细分：

**🔴 P1（严重 - 阻止合并）：**

- 安全漏洞
- 数据损坏风险
- 破坏性更改
- 严重架构问题

**🟡 P2（重要 - 应该修复）：**

- 性能问题
- 重大架构问题
- 主要代码质量问题
- 可靠性问题

**🔵 P3（最好有）：**

- 次要改进
- 代码清理
- 优化机会
- 文档更新

```

### 7. 端到端测试（可选）

<detect_project_type>

**首先，从 PR 文件中检测项目类型：**

| 指标 | 项目类型 |
|-----------|--------------|
| `*.xcodeproj`, `*.xcworkspace`, `Package.swift` (iOS) | iOS/macOS |
| `Gemfile`, `package.json`, `app/views/*`, `*.html.*` | Web |
| iOS 文件和 Web 文件 | 混合（两者都测试） |

</detect_project_type>

<offer_testing>

在展示摘要报告后，根据项目类型提供适当的测试：

**对于 Web 项目：**
```markdown
**"想在受影响的页面上运行 Playwright 浏览器测试吗？"**
1. 是 - 运行 `/playwright-test`
2. 否 - 跳过
```

**对于 iOS 项目：**
```markdown
**"想在应用上运行 Xcode 模拟器测试吗？"**
1. 是 - 运行 `/xcode-test`
2. 否 - 跳过
```

**对于混合项目（例如 Rails + Hotwire Native）：**
```markdown
**"想运行端到端测试吗？"**
1. 仅 Web - 运行 `/playwright-test`
2. 仅 iOS - 运行 `/xcode-test`
3. 两者 - 运行两个命令
4. 否 - 跳过
```

</offer_testing>

#### 如果用户接受 Web 测试：

生成一个子代理来运行 Playwright 测试（保留主上下文）：

```
Task general-purpose("为 PR #[number] 运行 /playwright-test。测试所有受影响的页面，检查控制台错误，通过创建待办和修复来处理失败。")
```

子代理将：
1. 识别受 PR 影响的页面
2. 导航到每个页面并捕获快照
3. 检查控制台错误
4. 测试关键交互
5. 在 OAuth/电子邮件/支付流程上暂停以进行人工验证
6. 为任何失败创建 P1 待办
7. 修复并重试直到所有测试通过

**独立运行：** `/playwright-test [PR number]`

#### 如果用户接受 iOS 测试：

生成一个子代理来运行 Xcode 测试（保留主上下文）：

```
Task general-purpose("为 scheme [name] 运行 /xcode-test。为模拟器构建、安装、启动、截图、检查崩溃。")
```

子代理将：
1. 验证 XcodeBuildMCP 已安装
2. 发现项目和 schemes
3. 为 iOS 模拟器构建
4. 安装并启动应用
5. 拍摄关键屏幕的截图
6. 捕获错误控制台日志
7. 暂停以进行人工验证（使用 Apple 登录、推送、IAP）
8. 为任何失败创建 P1 待办
9. 修复并重试直到所有测试通过

**独立运行：** `/xcode-test [scheme]`

### 重要：P1 发现阻止合并

任何 **🔴 P1（严重）** 发现都必须在合并 PR 之前解决。突出展示这些发现，并确保在接受 PR 之前已解决。
```

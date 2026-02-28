# 更新日志

compound-engineering-zh 插件的所有重要更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/spec/v2.0.0.html)。

## [2.23.2] - 2026-01-09

### 更改

- **`/reproduce-bug` 命令** - 使用 Playwright 增强了视觉重现功能：
  - 添加了使用浏览器自动化进行视觉错误重现的阶段 2
  - 导航到受影响区域的分步指南
  - 在每个重现步骤捕获屏幕截图
  - 控制台错误检查
  - 使用点击、输入和快照重现用户流程
  - 更好的文档结构，包含 4 个清晰的阶段

### 摘要

- 27 个代理、21 个命令、13 个技能、2 个 MCP 服务器

---

## [2.23.1] - 2026-01-08

### 更改

- **代理模型继承** - 所有 26 个代理现在使用 `model: inherit`，以便它们与用户配置的模型匹配。只有 `lint` 保留 `model: haiku` 以提高成本效率。（修复 #69）

### 摘要

- 27 个代理、21 个命令、13 个技能、2 个 MCP 服务器

---

## [2.23.0] - 2026-01-08

### 新增

- **`/agent-native-audit` 命令** - 全面的 agent-native 架构审查
  - 为每个核心原则启动 8 个并行子代理
  - 原则：操作对等性、工具作为原语、上下文注入、共享工作空间、CRUD 完整性、UI 集成、能力发现、Prompt-Native 功能
  - 每个代理产生特定分数（X/Y 格式带百分比）
  - 生成包含总体分数和前 10 条建议的摘要报告
  - 支持通过参数进行单个原则审查

### 摘要

- 27 个代理、21 个命令、13 个技能、2 个 MCP 服务器

---

## [2.22.0] - 2026-01-05

### 新增

- **`rclone` 技能** - 上传文件到 S3、Cloudflare R2、Backblaze B2 和其他云存储提供商

### 更改

- **`/feature-video` 命令** - 增强功能：
  - 更好的视频/GIF 创建 ffmpeg 命令（正确的缩放、帧率控制）
  - 用于云上传的 rclone 集成
  - 屏幕截图复制到项目文件夹
  - 改进的上传选项工作流

### 摘要

- 27 个代理、20 个命令、13 个技能、2 个 MCP 服务器

---

## [2.21.0] - 2026-01-05

### 修复

- 解决合并冲突后的版本历史清理

### 摘要

此版本整合了所有最近的工作：
- `/feature-video` 命令用于录制 PR 演示
- `/deepen-plan` 命令用于增强规划
- `create-agent-skills` 技能重写（符合官方规范）
- `agent-native-architecture` 技能重大扩展
- `dhh-rails-style` 技能整合（合并了 dhh-ruby-style）
- 27 个代理、20 个命令、12 个技能、2 个 MCP 服务器

---

## [2.20.0] - 2026-01-05

### 新增

- **`/feature-video` 命令** - 使用 Playwright 录制功能视频演练

### 更改

- **`create-agent-skills` 技能** - 完全重写以匹配 Anthropic 的官方技能规范

### 移除

- **`dhh-ruby-style` 技能** - 已合并到 `dhh-rails-style` 技能

---

## [2.19.0] - 2025-12-31

### 新增

- **`/deepen-plan` 命令** - 计划的强力增强。接受现有计划并为每个主要部分运行并行研究子代理以添加：
  - 最佳实践和行业模式
  - 性能优化
  - UI/UX 改进（如适用）
  - 质量增强和边界情况
  - 真实世界的实施示例

  结果是一个深度扎根的、生产就绪的计划，包含具体的实施细节。

### 更改

- **`/workflows:plan` 命令** - 在生成后菜单的选项 2 中添加了 `/deepen-plan`。添加说明：如果使用 ultrathink 启用，自动运行 deepen-plan 以获得最大深度。

## [2.18.0] - 2025-12-25

### 新增

- **`agent-native-architecture` 技能** - 添加了**动态能力发现**模式和**架构审查清单**：

  **mcp-tool-design.md 中的新模式：**
  - **动态能力发现** - 对于外部 API（HealthKit、HomeKit、GraphQL），构建一个在运行时返回可用能力的发现工具（`list_*`），以及一个接受字符串（而不是枚举）的通用访问工具。由 API 验证，而不是你的代码。这意味着代理可以在不更改代码的情况下使用新的 API 能力。
  - **CRUD 完整性** - 代理可以创建的每个实体也必须可读、可更新和可删除。不完整的 CRUD = 破坏的操作对等性。

  **SKILL.md 中的新增内容：**
  - **架构审查清单** - 将审查者的发现提前推送到设计阶段。涵盖工具设计（动态 vs 静态、CRUD 完整性）、操作对等性（能力映射、编辑/删除）、UI 集成（代理 → UI 通信）和上下文注入。
  - **选项 11：API 集成** - 用于连接到外部 API（如 HealthKit、HomeKit、GraphQL）的新摄入选项
  - **新反模式：** 静态工具映射（为每个 API 端点构建单独的工具）、不完整的 CRUD（仅创建工具）
  - **工具设计标准**部分添加到成功标准清单

  **shared-workspace-architecture.md 中的新增内容：**
  - **用于多设备同步的 iCloud 文件存储** - 将 iCloud 文档用于共享工作空间，以获得免费的自动多设备同步，而无需构建同步层。包括实施模式、冲突处理、权限和不适用的情况。

### 哲学

此更新将 **agent-native 应用**的一个关键见解编纂成文：当集成到代理应该具有与用户相同访问权限的外部 API 时，使用**动态能力发现**而不是静态工具映射。不要构建 `read_steps`、`read_heart_rate`、`read_sleep`... 而是构建 `list_health_types` + `read_health_data(dataType: string)`。代理发现可用的内容，API 验证类型。

注意：此模式专门适用于遵循"用户可以做的任何事情，代理都可以做"哲学的 agent-native 应用。对于具有故意限制能力的受限代理，静态工具映射可能是合适的。

---

## [2.17.0] - 2025-12-25

### 增强

- **`agent-native-architecture` 技能** - 基于构建 Every Reader iOS 应用程序的真实经验进行了重大扩展。添加了 5 个新参考文档并扩展现有文档：

  **新参考：**
  - **dynamic-context-injection.md** - 如何将运行时应用状态注入到代理系统提示中。涵盖上下文注入模式、要注入的上下文（资源、活动、能力、词汇）、Swift/iOS 和 TypeScript 的实施模式以及上下文新鲜度。
  - **action-parity-discipline.md** - 确保代理可以执行用户可以执行的所有操作的工作流。包括能力映射模板、对等性审计流程、PR 清单、对等性的工具设计和上下文对等性指南。
  - **shared-workspace-architecture.md** - 代理和用户在同一数据空间中工作的模式。涵盖目录结构、文件工具、UI 集成（文件监视、共享存储）、代理-用户协作模式和安全注意事项。
  - **agent-native-testing.md** - agent-native 应用的测试模式。包括"代理能做吗？"测试、惊喜测试、自动对等性测试、集成测试和 CI/CD 集成。
  - **mobile-patterns.md** - iOS/Android 的移动特定模式。涵盖后台执行（检查点/恢复）、权限处理、成本感知设计（模型层级、token 预算、网络感知）、离线处理和电池感知。

  **更新的参考：**
  - **architecture-patterns.md** - 添加了 3 个新模式：统一代理架构（一个编排器，多种代理类型）、代理到 UI 通信（共享数据存储、文件监视、事件总线）和模型层级选择（快速/平衡/强大）。

  **更新的技能根：**
  - **SKILL.md** - 扩展了摄入菜单（现在有 10 个选项，包括上下文注入、操作对等性、共享工作空间、测试、移动模式）。添加了 5 个新的 agent-native 反模式（上下文匮乏、孤立功能、沙箱隔离、静默操作、能力隐藏）。使用 agent-native 和移动特定清单扩展了成功标准。

- **`agent-native-reviewer` 代理** - 显著增强，涵盖所有新模式的全面审查流程。现在检查操作对等性、上下文对等性、共享工作空间、工具设计（原语 vs 工作流）、动态上下文注入和移动特定问题。包括详细的反模式、输出格式模板、快速检查（"写入位置"测试、惊喜测试）和移动特定验证。

### 哲学

这些更新将构建 agent-native 移动应用的一个关键见解付诸实践：**"代理应该能够通过反映 UI 能力的工具做用户可以做的任何事情，并具有关于应用状态的完整上下文。"** 促成这些更改的失败案例：当用户说"在我的阅读源中写点什么"时，代理问"什么阅读源？"——因为它没有 `publish_to_feed` 工具，也没有关于"feed"意味着什么的上下文。

## [2.16.0] - 2025-12-21

### 增强

- **`dhh-rails-style` 技能** - 大量扩展参考文档，整合了 Marc Köhlbrugge 的非官方 37signals 编码风格指南中的模式：
  - **controllers.md** - 添加了授权模式、速率限制、Sec-Fetch-Site CSRF 保护、请求上下文问题
  - **models.md** - 添加了验证哲学、让它崩溃哲学（bang 方法）、使用 lambda 的默认值、Rails 7.1+ 模式（normalizes、delegated types、store accessor）、使用 touch 链的 concern 指南
  - **frontend.md** - 添加了 Turbo morphing 最佳实践、Turbo frames 模式、6 个新的 Stimulus 控制器（auto-submit、dialog、local-time 等）、Stimulus 最佳实践、视图助手、个性化缓存、广播模式
  - **architecture.md** - 添加了基于路径的多租户、数据库模式（UUID、状态作为记录、硬删除、计数器缓存）、后台作业模式（事务安全、错误处理、批处理）、电子邮件模式、安全模式（XSS、SSRF、CSP）、Active Storage 模式
  - **gems.md** - 添加了扩展的他们避免的内容部分（服务对象、表单对象、装饰器、CSS 预处理器、React/Vue）、使用 Minitest/fixtures 模式的测试哲学

### 致谢

- 参考模式衍生自 [Marc Köhlbrugge 的非官方 37signals 编码风格指南](https://github.com/marckohlbrugge/unofficial-37signals-coding-style-guide)

## [2.15.2] - 2025-12-21

### 修复

- **所有技能** - 修复了 12 个技能的规范合规性问题：
  - 参考文件现在使用正确的 markdown 链接（`[file.md](./references/file.md)`）而不是反引号文本
  - 描述现在使用第三人称（"此技能应在...时使用"）符合 skill-creator 规范
  - 受影响的技能：agent-native-architecture、andrew-kane-gem-writer、compound-docs、create-agent-skills、dhh-rails-style、dspy-ruby、every-style-editor、file-todos、frontend-design、gemini-imagegen

### 新增

- **CLAUDE.md** - 添加了技能合规性清单和验证命令，以确保新技能符合规范要求

## [2.15.1] - 2025-12-18

### 更改

- **`/workflows:review` 命令** - 第 7 节现在检测项目类型（Web、iOS 或混合）并提供适当的测试。Web 项目获得 `/playwright-test`，iOS 项目获得 `/xcode-test`，混合项目可以同时运行两者。

## [2.15.0] - 2025-12-18

### 新增

- **`/xcode-test` 命令** - 使用 XcodeBuildMCP 在模拟器上构建和测试 iOS 应用。自动检测 Xcode 项目、构建应用、启动模拟器并运行测试套件。包括对不稳定测试的重试。

- **`/playwright-test` 命令** - 在当前 PR 或分支影响的页面上运行 Playwright 浏览器测试。检测更改的文件、映射到受影响的路由、生成/运行针对性测试，并报告结果和屏幕截图。

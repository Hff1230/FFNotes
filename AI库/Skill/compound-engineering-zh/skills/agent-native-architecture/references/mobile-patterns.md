<overview>
移动端是 agent-native 应用的一等平台。它具有独特的约束和机遇。本指南涵盖为什么移动端重要、iOS 存储架构、检查点/恢复模式，以及成本感知设计。
</overview>

<why_mobile>
## 为什么移动端重要

移动设备为 agent-native 应用提供了独特的优势：

### 文件系统
Agent 可以自然地处理文件，使用与各地相同的原语。文件系统是通用接口。

### 丰富的上下文
你可以访问的封闭花园。健康数据、位置、照片、日历——桌面或 Web 上不存在的上下文。这实现了深度个性化的 agent 体验。

### 本地应用
每个人都有自己的应用副本。这开启了尚未完全实现的机会：可以修改自身、分叉自身、按用户演化的应用。App Store 政策今天限制了一些这方面，但基础已经存在。

### 跨设备同步
如果你将文件系统与 iCloud 一起使用，所有设备共享相同的文件系统。agent 在一个设备上的工作会出现在所有设备上——无需你构建服务器。

### 挑战

**Agent 是长期运行的。移动应用不是。**

Agent 可能需要 30 秒、5 分钟或一小时来完成任务。但 iOS 会在几秒钟不活动后将你的应用后台化，并可能为了回收内存而完全终止它。用户可能会在任务中途切换应用、接听电话或锁定手机。

这意味着移动 agent 应用需要：
- **检查点** — 保存状态以免工作丢失
- **恢复** — 中断后从中断处继续
- **后台执行** — 明智地使用 iOS 给你的有限时间
- **本地与云决策** — 什么在本地运行，什么需要服务器
</why_mobile>

<ios_storage>
## iOS 存储架构

> **需要验证：** 这是一个行之有效的方法，但可能存在更好的解决方案。

对于 agent-native iOS 应用，使用 iCloud Drive 的 Documents 文件夹作为共享工作区。这为你提供**免费、自动的多设备同步**，无需构建同步层或运行服务器。

### 为什么选择 iCloud Documents？

| 方法 | 成本 | 复杂度 | 离线 | 多设备 |
|----------|------|------------|---------|--------------|
| 自定义后端 + 同步 | $$$ | 高 | 手动 | 是 |
| CloudKit 数据库 | 免费层限制 | 中等 | 手动 | 是 |
| **iCloud Documents** | 免费（用户的存储） | 低 | 自动 | 自动 |

iCloud Documents：
- 使用用户现有的 iCloud 存储（免费 5GB，大多数用户更多）
- 跨所有用户设备自动同步
- 离线工作，在线时同步
- 文件在 Files.app 中可见以实现透明度
- 无服务器成本，无需维护同步代码

### 实现：iCloud 优先与本地回退

```swift
// 获取 iCloud Documents 容器
func iCloudDocumentsURL() -> URL? {
    FileManager.default.url(forUbiquityContainerIdentifier: nil)?
        .appendingPathComponent("Documents")
}

// 你的共享工作区位于 iCloud
class SharedWorkspace {
    let rootURL: URL

    init() {
        // 如果可用，使用 iCloud，否则回退到本地
        if let iCloudURL = iCloudDocumentsURL() {
            self.rootURL = iCloudURL
        } else {
            // 回退到本地 Documents（用户未登录 iCloud）
            self.rootURL = FileManager.default.urls(
                for: .documentDirectory,
                in: .userDomainMask
            ).first!
        }
    }

    // 所有文件操作都通过此根目录
    func researchPath(for bookId: String) -> URL {
        rootURL.appendingPathComponent("Research/\(bookId)")
    }

    func journalPath() -> URL {
        rootURL.appendingPathComponent("Journal")
    }
}
```

### iCloud 中的目录结构

```
iCloud Drive/
└── YourApp/                          # 你的应用容器
    └── Documents/                    # 在 Files.app 中可见
        ├── Journal/
        │   ├── user/
        │   │   └── 2025-01-15.md     # 跨设备同步
        │   └── agent/
        │       └── 2025-01-15.md     # Agent 观察也同步
        ├── Research/
        │   └── {bookId}/
        │       ├── full_text.txt
        │       └── sources/
        ├── Chats/
        │   └── {conversationId}.json
        └── context.md                # Agent 的累积知识
```

### 处理 iCloud 文件状态

iCloud 文件可能未在本地下载。处理此情况：

```swift
func readFile(at url: URL) throws -> String {
    // iCloud 可能创建 .icloud 占位符文件
    if url.pathExtension == "icloud" {
        // 触发下载
        try FileManager.default.startDownloadingUbiquitousItem(at: url)
        throw FileNotYetAvailableError()
    }

    return try String(contentsOf: url, encoding: .utf8)
}

// 对于写入，使用协调文件访问
func writeFile(_ content: String, to url: URL) throws {
    let coordinator = NSFileCoordinator()
    var error: NSError?

    coordinator.coordinate(
        writingItemAt: url,
        options: .forReplacing,
        error: &error
    ) { newURL in
        try? content.write(to: newURL, atomically: true, encoding: .utf8)
    }

    if let error = error { throw error }
}
```

### iCloud 启用的功能

1. **用户在 iPhone 上开始实验** → Agent 创建配置文件
2. **用户在 iPad 上打开应用** → 相同的实验可见，无需同步代码
3. **Agent 在 iPhone 上记录观察** → 自动同步到 iPad
4. **用户在 iPad 上编辑日记** → iPhone 看到编辑

### 所需权限

添加到应用的权限：

```xml
<key>com.apple.developer.icloud-container-identifiers</key>
<array>
    <string>iCloud.com.yourcompany.yourapp</string>
</array>
<key>com.apple.developer.icloud-services</key>
<array>
    <string>CloudDocuments</string>
</array>
<key>com.apple.developer.ubiquity-container-identifiers</key>
<array>
    <string>iCloud.com.yourcompany.yourapp</string>
</array>
```

### 何时不使用 iCloud Documents

- **敏感数据** - 改用 Keychain 或加密的本地存储
- **高频写入** - iCloud 同步有延迟；使用本地 + 定期同步
- **大型媒体文件** - 考虑 CloudKit Assets 或按需资源
- **用户间共享** - iCloud Documents 是单用户的；使用 CloudKit 进行共享
</ios_storage>

<background_execution>
## 后台执行与恢复

> **需要验证：** 这些模式有效，但可能存在更好的解决方案。

移动应用可以随时被暂停或终止。Agent 必须优雅地处理此情况。

### 挑战

```
用户启动研究 agent
     ↓
Agent 开始网络搜索
     ↓
用户切换到另一个应用
     ↓
iOS 暂停你的应用
     ↓
Agent 正在执行中...会发生什么？
```

### 检查点/恢复模式

在后台之前保存 agent 状态，在前台时恢复：

```swift
class AgentOrchestrator: ObservableObject {
    @Published var activeSessions: [AgentSession] = []

    // 当应用即将后台时调用
    func handleAppWillBackground() {
        for session in activeSessions {
            saveCheckpoint(session)
            session.transition(to: .backgrounded)
        }
    }

    // 当应用返回前台时调用
    func handleAppDidForeground() {
        for session in activeSessions where session.state == .backgrounded {
            if let checkpoint = loadCheckpoint(session.id) {
                resumeFromCheckpoint(session, checkpoint)
            }
        }
    }

    private func saveCheckpoint(_ session: AgentSession) {
        let checkpoint = AgentCheckpoint(
            sessionId: session.id,
            conversationHistory: session.messages,
            pendingToolCalls: session.pendingToolCalls,
            partialResults: session.partialResults,
            timestamp: Date()
        )
        storage.save(checkpoint, for: session.id)
    }

    private func resumeFromCheckpoint(_ session: AgentSession, _ checkpoint: AgentCheckpoint) {
        session.messages = checkpoint.conversationHistory
        session.pendingToolCalls = checkpoint.pendingToolCalls

        // 如果有待处理的工具调用，则恢复执行
        if !checkpoint.pendingToolCalls.isEmpty {
            session.transition(to: .running)
            Task { await executeNextTool(session) }
        }
    }
}
```

### Agent 生命周期的状态机

```swift
enum AgentState {
    case idle           // 未运行
    case running        // 主动执行
    case waitingForUser // 暂停，等待用户输入
    case backgrounded   // 应用后台化，状态已保存
    case completed      // 成功完成
    case failed(Error)  // 完成但有错误
}

class AgentSession: ObservableObject {
    @Published var state: AgentState = .idle

    func transition(to newState: AgentState) {
        let validTransitions: [AgentState: Set<AgentState>] = [
            .idle: [.running],
            .running: [.waitingForUser, .backgrounded, .completed, .failed],
            .waitingForUser: [.running, .backgrounded],
            .backgrounded: [.running, .completed],
        ]

        guard validTransitions[state]?.contains(newState) == true else {
            logger.warning("无效转换：\(state) → \(newState)")
            return
        }

        state = newState
    }
}
```

### 后台任务扩展（iOS）

在后台期间请求额外时间以进行关键操作：

```swift
class AgentOrchestrator {
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid

    func handleAppWillBackground() {
        // 请求额外时间以保存状态
        backgroundTask = UIApplication.shared.beginBackgroundTask { [weak self] in
            self?.endBackgroundTask()
        }

        // 保存所有检查点
        Task {
            for session in activeSessions {
                await saveCheckpoint(session)
            }
            endBackgroundTask()
        }
    }

    private func endBackgroundTask() {
        if backgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
    }
}
```

### 用户通信

让用户知道正在发生什么：

```swift
struct AgentStatusView: View {
    @ObservedObject var session: AgentSession

    var body: some View {
        switch session.state {
        case .backgrounded:
            Label("已暂停（应用在后台）", systemImage: "pause.circle")
                .foregroundColor(.orange)
        case .running:
            Label("工作中...", systemImage: "ellipsis.circle")
                .foregroundColor(.blue)
        case .waitingForUser:
            Label("等待你的输入", systemImage: "person.circle")
                .foregroundColor(.green)
        // ...
        }
    }
}
```
</background_execution>

<permissions>
## 权限处理

移动 agent 可能需要访问系统资源。优雅地处理权限请求。

### 常见权限

| 资源 | iOS 权限 | 用例 |
|----------|---------------|----------|
| 照片库 | PHPhotoLibrary | 从照片生成个人资料 |
| 文件 | 文档选择器 | 读取用户文档 |
| 相机 | AVCaptureDevice | 扫描书籍封面 |
| 位置 | CLLocationManager | 位置感知推荐 |
| 网络 | （自动） | 网络搜索、API 调用 |

### 权限感知工具

在执行前检查权限：

```swift
struct PhotoTools {
    static func readPhotos() -> AgentTool {
        tool(
            name: "read_photos",
            description: "从用户的照片库读取照片",
            parameters: [
                "limit": .number("要读取的最大照片数"),
                "dateRange": .string("日期范围过滤").optional()
            ],
            execute: { params, context in
                // 首先检查权限
                let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)

                switch status {
                case .authorized, .limited:
                    // 继续读取照片
                    let photos = await fetchPhotos(params)
                    return ToolResult(text: "找到 \(photos.count) 张照片", images: photos)

                case .denied, .restricted:
                    return ToolResult(
                        text: "需要照片访问权限。请在 设置 → 隐私 → 照片中授予权限。",
                        isError: true
                    )

                case .notDetermined:
                    return ToolResult(
                        text: "需要照片权限。请重试。",
                        isError: true
                    )

                @unknown default:
                    return ToolResult(text: "未知权限状态", isError: true)
                }
            }
        )
    }
}
```

### 优雅降级

当未授予权限时，提供替代方案：

```swift
func readPhotos() async -> ToolResult {
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)

    switch status {
    case .denied, .restricted:
        // 建议替代方案
        return ToolResult(
            text: """
            我无法访问你的照片。你可以：
            1. 在 设置 → 隐私 → 照片中授予权限
            2. 在聊天中直接分享特定照片

            你想让我帮你做点别的吗？
            """,
            isError: false  // 不是硬错误，只是一个限制
        )
    // ...
    }
}
```

### 权限请求时机

在需要之前不要请求权限：

```swift
// 坏：启动时请求所有权限
func applicationDidFinishLaunching() {
    requestPhotoAccess()
    requestCameraAccess()
    requestLocationAccess()
    // 用户被权限对话框淹没
}

// 好：使用功能时请求
tool("analyze_book_cover", async ({ image }) => {
    // 仅在用户尝试扫描封面时请求相机访问
    let status = await AVCaptureDevice.requestAccess(for: .video)
    if status {
        return await scanCover(image)
    } else {
        return ToolResult(text: "书籍扫描需要相机访问权限")
    }
})
```
</permissions>

<cost_awareness>
## 成本感知设计

移动用户可能使用蜂窝数据或关心 API 成本。设计高效的 agent。

### 模型层级选择

使用实现结果的最便宜模型：

```swift
enum ModelTier {
    case fast      // claude-3-haiku: ~$0.25/1M tokens
    case balanced  // claude-3-sonnet: ~$3/1M tokens
    case powerful  // claude-3-opus: ~$15/1M tokens

    var modelId: String {
        switch self {
        case .fast: return "claude-3-haiku-20240307"
        case .balanced: return "claude-3-sonnet-20240229"
        case .powerful: return "claude-3-opus-20240229"
        }
    }
}

// 将模型与任务复杂度匹配
let agentConfigs: [AgentType: ModelTier] = [
    .quickLookup: .fast,        // "我的图书馆里有什么？"
    .chatAssistant: .balanced,  // 一般对话
    .researchAgent: .balanced,  // 网络搜索 + 综合
    .profileGenerator: .powerful, // 复杂照片分析
    .introductionWriter: .balanced,
]
```

### Token 预算

限制每个 agent 会话的 token：

```swift
struct AgentConfig {
    let modelTier: ModelTier
    let maxInputTokens: Int
    let maxOutputTokens: Int
    let maxTurns: Int

    static let research = AgentConfig(
        modelTier: .balanced,
        maxInputTokens: 50_000,
        maxOutputTokens: 4_000,
        maxTurns: 20
    )

    static let quickChat = AgentConfig(
        modelTier: .fast,
        maxInputTokens: 10_000,
        maxOutputTokens: 1_000,
        maxTurns: 5
    )
}

class AgentSession {
    var totalTokensUsed: Int = 0

    func checkBudget() -> Bool {
        if totalTokensUsed > config.maxInputTokens {
            transition(to: .failed(AgentError.budgetExceeded))
            return false
        }
        return true
    }
}
```

### 网络感知执行

将繁重的操作推迟到 WiFi：

```swift
class NetworkMonitor: ObservableObject {
    @Published var isOnWiFi: Bool = false
    @Published var isExpensive: Bool = false  // 蜂窝网络或热点

    private let monitor = NWPathMonitor()

    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isOnWiFi = path.usesInterfaceType(.wifi)
                self?.isExpensive = path.isExpensive
            }
        }
        monitor.start(queue: .global())
    }
}

class AgentOrchestrator {
    @ObservedObject var network = NetworkMonitor()

    func startResearchAgent(for book: Book) async {
        if network.isExpensive {
            // 警告用户或推迟
            let proceed = await showAlert(
                "研究使用数据",
                message: "这将使用大约 1-2 MB 的蜂窝数据。继续吗？"
            )
            if !proceed { return }
        }

        // 继续研究
        await runAgent(ResearchAgent.create(book: book))
    }
}
```

### 批量 API 调用

组合多个小请求：

```swift
// 坏：许多小 API 调用
for book in books {
    await agent.chat("总结 \(book.title)")
}

// 好：批量到一个请求
let bookList = books.map { $0.title }.joined(separator: ", ")
await agent.chat("简要总结每本书：\(bookList)")
```

### 缓存

缓存昂贵的操作：

```swift
class ResearchCache {
    private var cache: [String: CachedResearch] = [:]

    func getCachedResearch(for bookId: String) -> CachedResearch? {
        guard let cached = cache[bookId] else { return nil }

        // 24 小时后过期
        if Date().timeIntervalSince(cached.timestamp) > 86400 {
            cache.removeValue(forKey: bookId)
            return nil
        }

        return cached
    }

    func cacheResearch(_ research: Research, for bookId: String) {
        cache[bookId] = CachedResearch(
            research: research,
            timestamp: Date()
        )
    }
}

// 在研究工具中
tool("web_search", async ({ query, bookId }) => {
    // 首先检查缓存
    if let cached = cache.getCachedResearch(for: bookId) {
        return ToolResult(text: cached.research.summary, cached: true)
    }

    // 否则，执行搜索
    let results = await webSearch(query)
    cache.cacheResearch(results, for: bookId)
    return ToolResult(text: results.summary)
})
```

### 成本可见性

向用户展示他们的花费：

```swift
struct AgentCostView: View {
    @ObservedObject var session: AgentSession

    var body: some View {
        VStack(alignment: .leading) {
            Text("会话统计")
                .font(.headline)

            HStack {
                Label("\(session.turnCount) 次轮换", systemImage: "arrow.2.squarepath")
                Spacer()
                Label(formatTokens(session.totalTokensUsed), systemImage: "text.word.spacing")
            }

            if let estimatedCost = session.estimatedCost {
                Text("估计成本：\(estimatedCost, format: .currency(code: "USD"))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
```
</cost_awareness>

<offline_handling>
## 离线优雅降级

优雅地处理离线场景：

```swift
class ConnectivityAwareAgent {
    @ObservedObject var network = NetworkMonitor()

    func executeToolCall(_ toolCall: ToolCall) async -> ToolResult {
        // 检查工具是否需要网络
        let requiresNetwork = ["web_search", "web_fetch", "call_api"]
            .contains(toolCall.name)

        if requiresNetwork && !network.isConnected {
            return ToolResult(
                text: """
                我现在无法访问互联网。我可以离线做的是：
                - 读取你的图书馆和现有研究
                - 从缓存数据回答问题
                - 编写笔记和草稿供以后使用

                你想让我尝试一些离线工作的东西吗？
                """,
                isError: false
            )
        }

        return await executeOnline(toolCall)
    }
}
```

### 离线优先工具

某些工具应该完全离线工作：

```swift
let offlineTools: Set<String> = [
    "read_file",
    "write_file",
    "list_files",
    "read_library",  // 本地数据库
    "search_local",  // 本地搜索
]

let onlineTools: Set<String> = [
    "web_search",
    "web_fetch",
    "publish_to_cloud",
]

let hybridTools: Set<String> = [
    "publish_to_feed",  // 离线工作，稍后同步
]
```

### 排队的操作

对需要连接的操作进行排队：

```swift
class OfflineQueue: ObservableObject {
    @Published var pendingActions: [QueuedAction] = []

    func queue(_ action: QueuedAction) {
        pendingActions.append(action)
        persist()
    }

    func processWhenOnline() {
        network.$isConnected
            .filter { $0 }
            .sink { [weak self] _ in
                self?.processPendingActions()
            }
    }

    private func processPendingActions() {
        for action in pendingActions {
            Task {
                try await execute(action)
                remove(action)
            }
        }
    }
}
```
</offline_handling>

<battery_awareness>
## 电池感知执行

尊重设备电池状态：

```swift
class BatteryMonitor: ObservableObject {
    @Published var batteryLevel: Float = 1.0
    @Published var isCharging: Bool = false
    @Published var isLowPowerMode: Bool = false

    var shouldDeferHeavyWork: Bool {
        return batteryLevel < 0.2 && !isCharging
    }

    func startMonitoring() {
        UIDevice.current.isBatteryMonitoringEnabled = true

        NotificationCenter.default.addObserver(
            forName: UIDevice.batteryLevelDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.batteryLevel = UIDevice.current.batteryLevel
        }

        NotificationCenter.default.addObserver(
            forName: NSNotification.Name.NSProcessInfoPowerStateDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.isLowPowerMode = ProcessInfo.processInfo.isLowPowerModeEnabled
        }
    }
}

class AgentOrchestrator {
    @ObservedObject var battery = BatteryMonitor()

    func startAgent(_ config: AgentConfig) async {
        if battery.shouldDeferHeavyWork && config.isHeavy {
            let proceed = await showAlert(
                "电量低",
                message: "此任务消耗大量电池。继续还是推迟到充电？"
            )
            if !proceed { return }
        }

        // 根据电池调整模型层级
        let adjustedConfig = battery.isLowPowerMode
            ? config.withModelTier(.fast)
            : config

        await runAgent(adjustedConfig)
    }
}
```
</battery_awareness>

<on_device_vs_cloud>
## 本地与云

了解移动 agent-native 应用中什么在哪里运行：

| 组件 | 本地 | 云 |
|-----------|-----------|-------|
| 编排 | ✅ | |
| 工具执行 | ✅（文件操作、照片访问、HealthKit） | |
| LLM 调用 | | ✅（Anthropic API） |
| 检查点 | ✅（本地文件） | 通过 iCloud 可选 |
| 长期运行的 agent | 受 iOS 限制 | 可能通过服务器 |

### 影响

**推理需要网络：**
- 应用需要网络连接进行 LLM 调用
- 设计工具在网络不可用时优雅降级
- 考虑对常见查询进行离线缓存

**数据保持本地：**
- 文件操作在设备上进行
- 敏感数据除非明确同步，否则不会离开设备
- 默认保护隐私

**长期运行的 agent：**
对于真正长期运行的 agent（数小时），考虑可以无限期运行的服务器端编排器，移动应用作为查看器和输入机制。
</on_device_vs_cloud>

<checklist>
## 移动 Agent-Native 清单

**iOS 存储：**
- [ ] iCloud Documents 作为主存储（或有意识的替代方案）
- [ ] iCloud 不可用时本地 Documents 回退
- [ ] 处理 `.icloud` 占位符文件（触发下载）
- [ ] 使用 NSFileCoordinator 进行冲突安全写入

**后台执行：**
- [ ] 所有 agent 会话实现检查点/恢复
- [ ] agent 生命周期的状态机（空闲、运行、后台化等）
- [ ] 关键保存的后台任务扩展（30 秒窗口）
- [ ] 后台 agent 的用户可见状态

**权限：**
- [ ] 仅在需要时请求权限，而非启动时
- [ ] 权限被拒绝时的优雅降级
- [ ] 清晰的错误消息和设置深度链接
- [ ] 权限不可用时的替代路径

**成本感知：**
- [ ] 模型层级与任务复杂度匹配
- [ ] 每个会话的 token 预算
- [ ] 网络感知（将繁重工作推迟到 WiFi）
- [ ] 昂贵操作的缓存
- [ ] 向用户展示成本

**离线处理：**
- [ ] 识别离线能力工具
- [ ] 仅在线功能的优雅降级
- [ ] 在线时的同步操作队列
- [ ] 关于离线状态的清晰用户通信

**电池感知：**
- [ ] 繁重操作的电池监控
- [ ] 低功耗模式检测
- [ ] 根据电池状态推迟或降级
</checklist>

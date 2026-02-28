<overview>
Agent 和用户应该在相同的数据空间中工作，而不是独立的沙盒。当 agent 写入文件时，用户可以看到它。当用户编辑某些东西时，agent 可以读取更改。这创建了透明度，实现了协作，并消除了对同步层的需要。

**核心原则：**agent 在与用户相同的文件系统中操作，而不是封闭花园。
</overview>

<why_shared_workspace>
## 为什么共享工作区？

### 沙盒反模式

许多 agent 实现将 agent 隔离开来：

```
┌─────────────────┐     ┌─────────────────┐
│   用户空间    │     │   Agent 空间   │
├─────────────────┤     ├─────────────────┤
│ Documents/      │     │ agent_output/   │
│ user_files/     │  ←→ │ temp_files/     │
│ settings.json   │sync │ cache/          │
└─────────────────┘     └─────────────────┘
```

问题：
- 需要同步层在空间之间移动数据
- 用户无法轻易检查 agent 工作
- Agent 无法建立在用户贡献之上
- 状态重复
- 保持空间一致的复杂性

### 共享工作区模式

```
┌─────────────────────────────────────────┐
│           共享工作区              │
├─────────────────────────────────────────┤
│ Documents/                              │
│ ├── Research/                           │
│ │   └── {bookId}/        ← Agent 写入 │
│ │       ├── full_text.txt               │
│ │       ├── introduction.md  ← 用户可以编辑 │
│ │       └── sources/                    │
│ ├── Chats/               ← 两者都读/写 │
│ └── profile.md           ← Agent 生成，用户完善 │
└─────────────────────────────────────────┘
         ↑                    ↑
       用户                 Agent
       (UI)               (工具)
```

优势：
- 用户可以检查、编辑和扩展 agent 工作
- Agent 可以建立在用户贡献之上
- 无需同步层
- 完全透明
- 单一真相来源
</why_shared_workspace>

<directory_structure>
## 设计你的共享工作区

### 按域组织

按数据代表的内容组织，而不是谁创建的：

```
Documents/
├── Research/
│   └── {bookId}/
│       ├── full_text.txt        # Agent 下载
│       ├── introduction.md      # Agent 生成，用户可以编辑
│       ├── notes.md             # 用户添加，agent 可以读取
│       └── sources/
│           └── {source}.md      # Agent 收集
├── Chats/
│   └── {conversationId}.json    # 两者都读/写
├── Exports/
│   └── {date}/                  # Agent 为用户生成
└── profile.md                   # Agent 从照片生成
```

### 不要按参与者结构化

```
# 坏 - 按创建者分离
Documents/
├── user_created/
│   └── notes.md
├── agent_created/
│   └── research.md
└── system/
    └── config.json
```

这创造了人为边界并使协作更困难。

### 使用约定来处理元数据

如果你需要跟踪谁创建/修改了某物：

```markdown
<!-- introduction.md -->
---
created_by: agent
created_at: 2024-01-15
last_modified_by: user
last_modified_at: 2024-01-16
---

# 《白鲸》介绍

这个个性化介绍是由你的阅读助手生成的
并在 1 月 16 日由你完善。
```
</directory_structure>

<file_tools>
## 共享工作区的文件工具

给 agent 与应用相同的文件原语：

```swift
// iOS/Swift 实现
struct FileTools {
    static func readFile() -> AgentTool {
        tool(
            name: "read_file",
            description: "从用户的文档中读取文件",
            parameters: ["path": .string("相对于 Documents/ 的文件路径")],
            execute: { params in
                let path = params["path"] as! String
                let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                let fileURL = documentsURL.appendingPathComponent(path)
                let content = try String(contentsOf: fileURL)
                return ToolResult(text: content)
            }
        )
    }

    static func writeFile() -> AgentTool {
        tool(
            name: "write_file",
            description: "写入文件到用户的文档",
            parameters: [
                "path": .string("相对于 Documents/ 的文件路径"),
                "content": .string("文件内容")
            ],
            execute: { params in
                let path = params["path"] as! String
                let content = params["content"] as! String
                let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                let fileURL = documentsURL.appendingPathComponent(path)

                // 如果需要，创建父目录
                try FileManager.default.createDirectory(
                    at: fileURL.deletingLastPathComponent(),
                    withIntermediateDirectories: true
                )

                try content.write(to: fileURL, atomically: true, encoding: .utf8)
                return ToolResult(text: "已写入 \(path)")
            }
        )
    }

    static func listFiles() -> AgentTool {
        tool(
            name: "list_files",
            description: "列出目录中的文件",
            parameters: ["path": .string("相对于 Documents/ 的目录路径")],
            execute: { params in
                let path = params["path"] as! String
                let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                let dirURL = documentsURL.appendingPathComponent(path)
                let contents = try FileManager.default.contentsOfDirectory(atPath: dirURL.path)
                return ToolResult(text: contents.joined(separator: "\n"))
            }
        )
    }

    static func searchText() -> AgentTool {
        tool(
            name: "search_text",
            description: "在文件中搜索文本",
            parameters: [
                "query": .string("要搜索的文本"),
                "path": .string("要搜索的目录").optional()
            ],
            execute: { params in
                // 跨文档实现文本搜索
                // 返回匹配文件和片段
            }
        )
    }
}
```

### TypeScript/Node.js 实现

```typescript
const fileTools = [
  tool(
    "read_file",
    "从工作区读取文件",
    { path: z.string().describe("文件路径") },
    async ({ path }) => {
      const content = await fs.readFile(path, 'utf-8');
      return { text: content };
    }
  ),

  tool(
    "write_file",
    "写入文件到工作区",
    {
      path: z.string().describe("文件路径"),
      content: z.string().describe("文件内容")
    },
    async ({ path, content }) => {
      await fs.mkdir(dirname(path), { recursive: true });
      await fs.writeFile(path, content, 'utf-8');
      return { text: `已写入 ${path}` };
    }
  ),

  tool(
    "list_files",
    "列出目录中的文件",
    { path: z.string().describe("目录路径") },
    async ({ path }) => {
      const files = await fs.readdir(path);
      return { text: files.join('\n') };
    }
  ),

  tool(
    "append_file",
    "将内容追加到文件",
    {
      path: z.string().describe("文件路径"),
      content: z.string().describe("要追加的内容")
    },
    async ({ path, content }) => {
      await fs.appendFile(path, content, 'utf-8');
      return { text: `已追加到 ${path}` };
    }
  ),
];
```
</file_tools>

<ui_integration>
## 与共享工作区的 UI 集成

UI 应该观察 agent 写入的相同文件：

### 模式 1：基于文件的响应式（iOS）

```swift
class ResearchViewModel: ObservableObject {
    @Published var researchFiles: [ResearchFile] = []

    private var watcher: DirectoryWatcher?

    func startWatching(bookId: String) {
        let researchPath = documentsURL
            .appendingPathComponent("Research")
            .appendingPathComponent(bookId)

        watcher = DirectoryWatcher(url: researchPath) { [weak self] in
            // 当 agent 写入新文件时重新加载
            self?.loadResearchFiles(from: researchPath)
        }

        loadResearchFiles(from: researchPath)
    }
}

// 当文件更改时 SwiftUI 自动更新
struct ResearchView: View {
    @StateObject var viewModel = ResearchViewModel()

    var body: some View {
        List(viewModel.researchFiles) { file in
            ResearchFileRow(file: file)
        }
    }
}
```

### 模式 2：共享数据存储

当文件观察不切实际时，使用共享数据存储：

```swift
// UI 和 agent 工具都使用的共享服务
class BookLibraryService: ObservableObject {
    static let shared = BookLibraryService()

    @Published var books: [Book] = []
    @Published var analysisRecords: [AnalysisRecord] = []

    func addAnalysisRecord(_ record: AnalysisRecord) {
        analysisRecords.append(record)
        // 持久化到共享存储
        saveToStorage()
    }
}

// Agent 工具通过相同的服务写入
tool("publish_to_feed", async ({ bookId, content, headline }) => {
    let record = AnalysisRecord(bookId: bookId, content: content, headline: headline)
    BookLibraryService.shared.addAnalysisRecord(record)
    return { text: "已发布到源" }
})

// UI 观察相同的服务
struct FeedView: View {
    @StateObject var library = BookLibraryService.shared

    var body: some View {
        List(library.analysisRecords) { record in
            FeedItemRow(record: record)
        }
    }
}
```

### 模式 3：混合（文件 + 索引）

使用文件存储内容，数据库进行索引：

```
Documents/
├── Research/
│   └── book_123/
│       └── introduction.md   # 实际内容（文件）

Database:
├── research_index
│   └── { bookId: "book_123", path: "Research/book_123/introduction.md", ... }
```

```swift
// Agent 写入文件
await writeFile("Research/\(bookId)/introduction.md", content)

// 并更新索引
await database.insert("research_index", {
    bookId: bookId,
    path: "Research/\(bookId)/introduction.md",
    title: extractTitle(content),
    createdAt: Date()
})

// UI 查询索引，然后读取文件
let items = database.query("research_index", where: bookId == "book_123")
for item in items {
    let content = readFile(item.path)
    // 显示...
}
```
</ui_integration>

<collaboration_patterns>
## Agent-用户协作模式

### 模式：Agent 起草，用户完善

```
1. Agent 生成 introduction.md
2. 用户在 Files.app 或应用内编辑器中打开
3. 用户进行完善
4. Agent 可以通过 read_file 看到更改
5. 未来的 agent 工作建立在用户完善之上
```

agent 的系统提示应该承认这一点：

```markdown
## 与用户内容合作

当你创建内容（介绍、研究笔记等）时，用户可以
在之后编辑它。在修改之前始终读取现有文件——用户
可能进行了你应该保留的改进。

如果文件存在且已被用户修改（检查元数据或
与你的最后一个已知版本比较），在覆盖之前询问。
```

### 模式：用户播种，Agent 扩展

```
1. 用户创建带有初步想法的 notes.md
2. 用户问："研究更多关于这个"
3. Agent 读取 notes.md 以理解上下文
4. Agent 添加到 notes.md 或创建相关文件
5. 用户继续建立在 agent 添加之上
```

### 模式：仅追加协作

对于聊天日志或活动流：

```markdown
<!-- activity.md - 两者都追加，都不覆盖 -->

## 2024-01-15

**用户：**开始阅读《白鲸》

**Agent：**下载全文并创建研究文件夹

**用户：**添加关于鲸鱼象征意义的高光

**Agent：**在梅尔维尔的作品中发现了 3 个关于鲸鱼象征意义的学术来源
```
</collaboration_patterns>

<security_considerations>
## 共享工作区中的安全性

### 限制工作区范围

不要给 agent 访问整个文件系统的权限：

```swift
// 好：限制到应用的文档
let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]

tool("read_file", { path }) {
    // 路径相对于文档，无法转义
    let fileURL = documentsURL.appendingPathComponent(path)
    guard fileURL.path.hasPrefix(documentsURL.path) else {
        throw ToolError("无效路径")
    }
    return try String(contentsOf: fileURL)
}

// 坏：绝对路径允许转义
tool("read_file", { path }) {
    return try String(contentsOf: URL(fileURLWithPath: path))  // 可以读取 /etc/passwd!
}
```

### 保护敏感文件

```swift
let protectedPaths = [".env", "credentials.json", "secrets/"]

tool("read_file", { path }) {
    if protectedPaths.any({ path.contains($0) }) {
        throw ToolError("无法访问受保护的文件")
    }
    // ...
}
```

### 审计 Agent 操作

记录 agent 读取/写入的内容：

```swift
func logFileAccess(action: String, path: String, agentId: String) {
    logger.info("[\(agentId)] \(action): \(path)")
}

tool("write_file", { path, content }) {
    logFileAccess(action: "WRITE", path: path, agentId: context.agentId)
    // ...
}
```
</security_considerations>

<examples>
## 真实示例：Every Reader

Every Reader 应用使用共享工作区进行研究：

```
Documents/
├── Research/
│   └── book_moby_dick/
│       ├── full_text.txt           # Agent 从 Gutenberg 下载
│       ├── introduction.md         # Agent 生成，个性化
│       ├── sources/
│       │   ├── whale_symbolism.md  # Agent 研究
│       │   └── melville_bio.md     # Agent 研究
│       └── user_notes.md           # 用户可以添加自己的笔记
├── Chats/
│   └── 2024-01-15.json             # 聊天历史
└── profile.md                       # Agent 从照片生成
```

**它是如何工作的：**

1. 用户将《白鲸》添加到图书馆
2. 用户启动研究 agent
3. Agent 下载全文到 `Research/book_moby_dick/full_text.txt`
4. Agent 研究并写入到 `sources/`
5. Agent 根据用户的阅读档案生成 `introduction.md`
6. 用户可以在应用或 Files.app 中查看所有文件
7. 用户可以编辑 `introduction.md` 以完善它
8. 聊天 agent 在回答问题时可以读取所有这些上下文
</examples>

<icloud_sync>
## 多设备同步的 iCloud 文件存储（iOS）

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

### 实现模式

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
            self.rootURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
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
        ├── Experiments/
        │   └── magnesium-sleep/
        │       ├── config.json
        │       └── log.json
        └── Research/
            └── {topic}/
                └── sources.md
```

### 处理同步冲突

iCloud 自动处理冲突，但你应该为此设计：

```swift
// 读取时检查冲突
func readJournalEntry(at url: URL) throws -> JournalEntry {
    // iCloud 可能为尚未下载的内容创建 .icloud 占位符文件
    if url.pathExtension == "icloud" {
        // 触发下载
        try FileManager.default.startDownloadingUbiquitousItem(at: url)
        throw FileNotYetAvailableError()
    }

    let data = try Data(contentsOf: url)
    return try JSONDecoder().decode(JournalEntry.self, from: data)
}

// 对于写入，使用协调文件访问
func writeJournalEntry(_ entry: JournalEntry, to url: URL) throws {
    let coordinator = NSFileCoordinator()
    var error: NSError?

    coordinator.coordinate(writingItemAt: url, options: .forReplacing, error: &error) { newURL in
        let data = try? JSONEncoder().encode(entry)
        try? data?.write(to: newURL)
    }

    if let error = error {
        throw error
    }
}
```

### 这启用的功能

1. **用户在 iPhone 上开始实验** → Agent 创建 `Experiments/sleep-tracking/config.json`
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
</icloud_sync>

<checklist>
## 共享工作区清单

架构：
- [ ] agent 和用户数据的单一共享目录
- [ ] 按域组织，而非按参与者
- [ ] 文件工具限制到工作区（无法转义）
- [ ] 敏感文件的保护路径

工具：
- [ ] `read_file` - 读取工作区中的任何文件
- [ ] `write_file` - 写入工作区中的任何文件
- [ ] `list_files` - 浏览目录结构
- [ ] `search_text` - 跨文件查找内容（可选）

UI 集成：
- [ ] UI 观察 agent 写入的相同文件
- [ ] 更改立即反映（文件观察或共享存储）
- [ ] 用户可以编辑 agent 创建的文件
- [ ] Agent 在覆盖之前读取用户修改

协作：
- [ ] 系统提示承认用户可以编辑文件
- [ ] Agent 在覆盖之前检查用户修改
- [ ] 元数据跟踪谁创建/修改（可选）

多设备（iOS）：
- [ ] 使用 iCloud Documents 进行共享工作区（免费同步）
- [ ] 如果 iCloud 不可用，回退到本地 Documents
- [ ] 处理 `.icloud` 占位符文件（触发下载）
- [ ] 使用 NSFileCoordinator 进行冲突安全写入
</checklist>

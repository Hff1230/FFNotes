<overview>
构建以智能体为本系统的架构模式。这些模式从五个核心原则中涌现：均等性、粒度、可组合性、涌现能力和持续改进。

功能是智能体在循环中运行实现的结果，而不是您编写的函数。工具是原子原语。智能体应用判断；提示定义结果。

另请参阅：
- [files-universal-interface.md](./files-universal-interface.md) 了解文件组织和 context.md 模式
- [agent-execution-patterns.md](./agent-execution-patterns.md) 了解完成信号和部分完成
- [product-implications.md](./product-implications.md) 了解渐进式披露和批准模式
</overview>

<pattern name="event-driven-agent">
## 事件驱动的智能体架构

智能体作为响应事件的长生命进程运行。事件变成提示。

```
┌─────────────────────────────────────────────────────────────┐
│                    智能体循环                                │
├─────────────────────────────────────────────────────────────┤
│  事件源 → 智能体 (Claude) → 工具调用 → 响应                   │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌───────────┐
    │ 内容    │    │   自我   │    │   数据    │
    │  工具   │    │  工具    │    │   工具    │
    └─────────┘    └──────────┘    └───────────┘
    (write_file)   (read_source)   (store_item)
                   (restart)       (list_items)
```

**关键特征：**
- 事件（消息、webhooks、定时器）触发智能体回合
- 智能体根据系统提示决定如何响应
- 工具是 IO 的原语，不是业务逻辑
- 通过数据工具在事件之间持久化状态

**示例：Discord 反馈机器人**
```typescript
// 事件源
client.on("messageCreate", (message) => {
  if (!message.author.bot) {
    runAgent({
      userMessage: `来自 ${message.author} 的新消息："${message.content}"`,
      channelId: message.channelId,
    });
  }
});

// 系统提示定义行为
const systemPrompt = `
当有人分享反馈时：
1. 温暖地确认他们的反馈
2. 如有必要，提出澄清问题
3. 使用反馈工具存储它
4. 更新反馈站点

使用您的判断来确定重要性和分类。
`;
```
</pattern>

<pattern name="two-layer-git">
## 两层 Git 架构

对于自我修改的智能体，将代码（共享）与数据（实例特定）分离。

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub（共享仓库）                      │
│  - src/           （智能体代码）                             │
│  - site/          （Web 界面）                               │
│  - package.json   （依赖项）                                 │
│  - .gitignore     （排除 data/, logs/）                     │
└─────────────────────────────────────────────────────────────┘
                          │
                     git clone
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  实例（服务器）                              │
│                                                              │
│  来自 GITHUB（已跟踪）：                                      │
│  - src/           → 代码更改时推回                          │
│  - site/          → 推送，触发部署                           │
│                                                              │
│  仅本地（未跟踪）：                                           │
│  - data/          → 实例特定的存储                           │
│  - logs/          → 运行时日志                               │
│  - .env           → 密钥                                     │
└─────────────────────────────────────────────────────────────┘
```

**为什么这样做有效：**
- 代码和站点受版本控制（GitHub）
- 原始数据保持本地（实例特定）
- 站点从数据生成，因此可重现
- 通过 git 历史自动回滚
</pattern>

<pattern name="multi-instance">
## 多实例分支

每个智能体实例都有自己的分支，同时共享核心代码。

```
main                        # 共享功能、错误修复
├── instance/feedback-bot   # Every Reader 反馈机器人
├── instance/support-bot    # 客户支持机器人
└── instance/research-bot   # 研究助手
```

**更改流程：**
| 更改类型 | 在...上工作 | 然后 |
|-------------|---------|------|
| 核心功能 | main | 合并到实例分支 |
| 错误修复 | main | 合并到实例分支 |
| 实例配置 | instance branch | 完成 |
| 实例数据 | instance branch | 完成 |

**同步工具：**
```typescript
tool("self_deploy", "从 main 拉取最新、重建、重启", ...)
tool("sync_from_instance", "从另一个实例合并", ...)
tool("propose_to_main", "创建 PR 以共享改进", ...)
```
</pattern>

<pattern name="site-as-output">
## 站点作为智能体输出

智能体生成和维护网站作为自然输出，而不是通过专门的站点工具。

```
Discord 消息
      ↓
智能体处理它，提取见解
      ↓
智能体决定需要什么站点更新
      ↓
智能体使用 write_file 原语写入文件
      ↓
Git 提交 + 推送触发部署
      ↓
站点自动更新
```

**关键见解：** 不要构建站点生成工具。给智能体文件工具并在提示中教导它如何创建好的站点。

```markdown
## 站点管理

您维护一个公共反馈站点。当反馈进来时：
1. 使用 write_file 更新 site/public/content/feedback.json
2. 如果站点的 React 组件需要改进，修改它们
3. 提交更改并推送以触发 Vercel 部署

站点应该是：
- 干净、现代的仪表板美学
- 清晰的视觉层次
- 状态组织（收件箱、活动、完成）

您决定结构。把它做好。
```
</pattern>

<pattern name="approval-gates">
## 批准门模式

将"提议"与"应用"分开，用于危险操作。

```typescript
// 待处理的更改单独存储
const pendingChanges = new Map<string, string>();

tool("write_file", async ({ path, content }) => {
  if (requiresApproval(path)) {
    // 存储以供批准
    pendingChanges.set(path, content);
    const diff = generateDiff(path, content);
    return {
      text: `更改需要批准。\n\n${diff}\n\n回复"yes"以应用。`
    };
  } else {
    // 立即应用
    writeFileSync(path, content);
    return { text: `已写入 ${path}` };
  }
});

tool("apply_pending", async () => {
  for (const [path, content] of pendingChanges) {
    writeFileSync(path, content);
  }
  pendingChanges.clear();
  return { text: "已应用所有待处理的更改" };
});
```

**什么需要批准：**
- src/*.ts（智能体代码）
- package.json（依赖项）
- 系统提示更改

**什么不需要：**
- data/*（实例数据）
- site/*（生成的内容）
- docs/*（文档）
</pattern>

<pattern name="unified-agent-architecture">
## 统一智能体架构

一个执行引擎，多种智能体类型。所有智能体使用相同的编排器，但配置不同。

```
┌─────────────────────────────────────────────────────────────┐
│                    智能体编排器                             │
├─────────────────────────────────────────────────────────────┤
│  - 生命周期管理（启动、暂停、恢复、停止）                     │
│  - 检查点/恢复（用于后台执行）                               │
│  - 工具执行                                                  │
│  - 聊天集成                                                  │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
    ┌─────┴─────┐        ┌─────┴─────┐        ┌─────┴─────┐
    │  研究     │        │   聊天    │        │  档案     │
    │  智能体   │        │  智能体   │        │  智能体   │
    └───────────┘        └───────────┘        └───────────┘
    - web_search         - read_library       - read_photos
    - write_file         - publish_to_feed    - write_file
    - read_file          - web_search         - analyze_image
```

**实现：**

```swift
// 所有智能体使用相同的编排器
let session = try await AgentOrchestrator.shared.startAgent(
    config: ResearchAgent.create(book: book),  // 配置变化
    tools: ResearchAgent.tools,                 // 工具变化
    context: ResearchAgent.context(for: book)   // 上下文变化
)

// 智能体类型定义自己的配置
struct ResearchAgent {
    static var tools: [AgentTool] {
        [
            FileTools.readFile(),
            FileTools.writeFile(),
            WebTools.webSearch(),
            WebTools.webFetch(),
        ]
    }

    static func context(for book: Book) -> String {
        """
        您正在研究"\(book.title)"，作者 \(book.author)。
        将发现保存到 Documents/Research/\(book.id)/
        """
    }
}

struct ChatAgent {
    static var tools: [AgentTool] {
        [
            FileTools.readFile(),
            FileTools.writeFile(),
            BookTools.readLibrary(),
            BookTools.publishToFeed(),  // 聊天可以直接发布
            WebTools.webSearch(),
        ]
    }

    static func context(library: [Book]) -> String {
        """
        您帮助用户进行阅读。
        可用的书籍：\(library.map { $0.title }.joined(separator: ", "))
        """
    }
}
```

**好处：**
- 所有智能体类型的生命周期管理一致
- 自动检查点/恢复（对移动设备至关重要）
- 共享工具协议
- 易于添加新的智能体类型
- 集中式错误处理和日志记录
</pattern>

<pattern name="agent-to-ui-communication">
## 智能体到 UI 通信

当智能体采取行动时，UI 应该立即反映它们。用户应该看到智能体做了什么。

**模式 1：共享数据存储（推荐）**

智能体通过 UI 观察的相同服务写入：

```swift
// 共享服务
class BookLibraryService: ObservableObject {
    static let shared = BookLibraryService()
    @Published var books: [Book] = []
    @Published var feedItems: [FeedItem] = []

    func addFeedItem(_ item: FeedItem) {
        feedItems.append(item)
        persist()
    }
}

// 智能体工具通过共享服务写入
tool("publish_to_feed", async ({ bookId, content, headline }) => {
    let item = FeedItem(bookId: bookId, content: content, headline: headline)
    BookLibraryService.shared.addFeedItem(item)  // 与 UI 相同的服务
    return { text: "已发布到 feed" }
})

// UI 观察相同的服务
struct FeedView: View {
    @StateObject var library = BookLibraryService.shared

    var body: some View {
        List(library.feedItems) { item in
            FeedItemRow(item: item)
            // 当智能体添加项目时自动更新
        }
    }
}
```

**模式 2：文件系统观察**

对于基于文件的数据，监视文件系统：

```swift
class ResearchWatcher: ObservableObject {
    @Published var files: [URL] = []
    private var watcher: DirectoryWatcher?

    func watch(bookId: String) {
        let path = documentsURL.appendingPathComponent("Research/\(bookId)")

        watcher = DirectoryWatcher(path: path) { [weak self] in
            self?.reload(from: path)
        }

        reload(from: path)
    }
}

// 智能体写入文件
tool("write_file", { path, content }) -> {
    writeFile(documentsURL.appendingPathComponent(path), content)
    // DirectoryWatcher 自动触发 UI 更新
}
```

**模式 3：事件总线（跨组件）**

对于具有多个独立组件的复杂应用：

```typescript
// 共享事件总线
const agentEvents = new EventEmitter();

// 智能体工具发出事件
tool("publish_to_feed", async ({ content }) => {
    const item = await feedService.add(content);
    agentEvents.emit('feed:new-item', item);
    return { text: "已发布" };
});

// UI 组件订阅
function FeedView() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        const handler = (item) => setItems(prev => [...prev, item]);
        agentEvents.on('feed:new-item', handler);
        return () => agentEvents.off('feed:new-item', handler);
    }, []);

    return <FeedList items={items} />;
}
```

**要避免的内容：**

```swift
// 不良：UI 不观察智能体更改
// 智能体直接写入数据库
tool("publish_to_feed", { content }) {
    database.insert("feed", content)  // UI 看不到这个
}

// UI 在启动时加载一次，从不刷新
struct FeedView: View {
    let items = database.query("feed")  // 过时了！
}
```
</pattern>

<pattern name="model-tier-selection">
## 模型层级选择

不同的智能体需要不同的智能级别。使用实现结果的最便宜的模型。

| 智能体类型 | 推荐层级 | 推理 |
|------------|-----------------|-----------|
| 聊天/对话 | 均衡 | 快速响应，良好的推理 |
| 研究 | 均衡 | 工具循环，而不是超复杂的综合 |
| 内容生成 | 均衡 | 有创意但不是繁重的综合 |
| 复杂分析 | 强大 | 多文档综合、细致的判断 |
| 档案/入门 | 强大 | 照片分析、复杂的模式识别 |
| 简单查询 | 快速/Haiku | 快速查找、简单的转换 |

**实现：**

```swift
enum ModelTier {
    case fast      // claude-3-haiku：快速、便宜、简单任务
    case balanced  // claude-3-sonnet：大多数任务的良好平衡
    case powerful  // claude-3-opus：复杂推理、综合
}

struct AgentConfig {
    let modelTier: ModelTier
    let tools: [AgentTool]
    let systemPrompt: String
}

// 研究智能体：均衡层级
let researchConfig = AgentConfig(
    modelTier: .balanced,
    tools: researchTools,
    systemPrompt: researchPrompt
)

// 档案分析：强大层级（复杂的照片解释）
let profileConfig = AgentConfig(
    modelTier: .powerful,
    tools: profileTools,
    systemPrompt: profilePrompt
)

// 快速查找：快速层级
let lookupConfig = AgentConfig(
    modelTier: .fast,
    tools: [readLibrary],
    systemPrompt: "回答关于用户图书馆的快速问题。"
)
```

**成本优化策略：**
- 从均衡层级开始，只有在质量不足时才升级
- 对工具繁重的循环使用快速层级，其中每个回合都很简单
- 为综合任务保留强大层级（比较多个来源）
- 考虑每回合的 token 限制以控制成本
</pattern>

<design_questions>
## 设计时需要问的问题

1. **什么事件触发智能体回合？**（消息、webhooks、定时器、用户请求）
2. **智能体需要什么原语？**（读取、写入、调用 API、重启）
3. **智能体应该做出什么决定？**（格式、结构、优先级、行动）
4. **什么决定应该硬编码？**（安全边界、批准要求）
5. **智能体如何验证它的工作？**（健康检查、构建验证）
6. **智能体如何从错误中恢复？**（git 回滚、批准门）
7. **UI 如何知道智能体何时更改状态？**（共享存储、文件监视、事件）
8. **每种智能体类型需要什么模型层级？**（快速、均衡、强大）
9. **智能体如何共享基础设施？**（统一编排器、共享工具）
</design_questions>

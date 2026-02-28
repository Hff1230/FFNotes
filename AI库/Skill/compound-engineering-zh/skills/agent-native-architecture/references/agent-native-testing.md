<overview>
测试 agent-native 应用需要与传统单元测试不同的方法。你要测试的是 agent 是否实现结果,而不是它是否调用特定函数。本指南提供了具体的测试模式,用于验证你的应用是否真正是 agent-native 的。
</overview>

<testing_philosophy>
## 测试哲学

### 测试结果,而不是过程

**传统 (过程导向):**
```typescript
// 测试使用特定参数调用了特定函数
expect(mockProcessFeedback).toHaveBeenCalledWith({
  message: "Great app!",
  category: "praise",
  priority: 2
});
```

**Agent-native (结果导向):**
```typescript
// 测试实现了结果
const result = await agent.process("Great app!");
const storedFeedback = await db.feedback.getLatest();

expect(storedFeedback.content).toContain("Great app");
expect(storedFeedback.importance).toBeGreaterThanOrEqual(1);
expect(storedFeedback.importance).toBeLessThanOrEqual(5);
// 我们不关心它如何分类——只要合理即可
```

### 接受可变性

Agent 每次可能会以不同的方式解决问题。你的测试应该:
- 验证最终状态,而不是路径
- 接受合理的范围,而不是精确的值
- 检查所需元素的存在,而不是确切的格式
</testing_philosophy>

<can_agent_do_it_test>
## "Agent 能做吗?" 测试

对于每个 UI 功能,编写一个测试提示并验证 agent 可以完成它。

### 模板

```typescript
describe('Agent Capability Tests', () => {
  test('Agent can add a book to library', async () => {
    const result = await agent.chat("Add 'Moby Dick' by Herman Melville to my library");

    // 验证结果
    const library = await libraryService.getBooks();
    const mobyDick = library.find(b => b.title.includes("Moby Dick"));

    expect(mobyDick).toBeDefined();
    expect(mobyDick.author).toContain("Melville");
  });

  test('Agent can publish to feed', async () => {
    // 设置: 确保书籍存在
    await libraryService.addBook({ id: "book_123", title: "1984" });

    const result = await agent.chat("Write something about surveillance themes in my feed");

    // 验证结果
    const feed = await feedService.getItems();
    const newItem = feed.find(item => item.bookId === "book_123");

    expect(newItem).toBeDefined();
    expect(newItem.content.toLowerCase()).toMatch(/surveillance|watching|control/);
  });

  test('Agent can search and save research', async () => {
    await libraryService.addBook({ id: "book_456", title: "Moby Dick" });

    const result = await agent.chat("Research whale symbolism in Moby Dick");

    // 验证创建了文件
    const files = await fileService.listFiles("Research/book_456/");
    expect(files.length).toBeGreaterThan(0);

    // 验证内容相关
    const content = await fileService.readFile(files[0]);
    expect(content.toLowerCase()).toMatch(/whale|symbolism|melville/);
  });
});
```

### "写入位置" 测试

一个关键的试金石: agent 可以在特定的应用位置创建内容吗?

```typescript
describe('Location Awareness Tests', () => {
  const locations = [
    { userPhrase: "my reading feed", expectedTool: "publish_to_feed" },
    { userPhrase: "my library", expectedTool: "add_book" },
    { userPhrase: "my research folder", expectedTool: "write_file" },
    { userPhrase: "my profile", expectedTool: "write_file" },
  ];

  for (const { userPhrase, expectedTool } of locations) {
    test(`Agent knows how to write to "${userPhrase}"`, async () => {
      const prompt = `Write a test note to ${userPhrase}`;
      const result = await agent.chat(prompt);

      // 检查 agent 使用了正确的工具 (或实现了结果)
      expect(result.toolCalls).toContainEqual(
        expect.objectContaining({ name: expectedTool })
      );

      // 或直接验证结果
      // expect(await locationHasNewContent(userPhrase)).toBe(true);
    });
  }
});
```
</can_agent_do_it_test>

<surprise_test>
## "惊喜测试"

设计良好的 agent-native 应用让 agent 能够找出创造性的方法。通过给出开放式请求来测试这一点。

### 测试

```typescript
describe('Agent Creativity Tests', () => {
  test('Agent can handle open-ended requests', async () => {
    // 设置: 用户有一些书籍
    await libraryService.addBook({ id: "1", title: "1984", author: "Orwell" });
    await libraryService.addBook({ id: "2", title: "Brave New World", author: "Huxley" });
    await libraryService.addBook({ id: "3", title: "Fahrenheit 451", author: "Bradbury" });

    // 开放式请求
    const result = await agent.chat("Help me organize my reading for next month");

    // Agent 应该做一些有用的事情
    // 我们不确切指定什么——这就是重点
    expect(result.toolCalls.length).toBeGreaterThan(0);

    // 它应该与图书馆互动
    const libraryTools = ["read_library", "write_file", "publish_to_feed"];
    const usedLibraryTool = result.toolCalls.some(
      call => libraryTools.includes(call.name)
    );
    expect(usedLibraryTool).toBe(true);
  });

  test('Agent finds creative solutions', async () => {
    // 不指定如何完成任务
    const result = await agent.chat(
      "I want to understand the dystopian themes across my sci-fi books"
    );

    // Agent 可能:
    // - 阅读所有书籍并创建比较文档
    // - 研究反乌托邦文学并将其与用户的书籍联系起来
    // - 在 markdown 文件中创建思维导图
    // - 发布一系列见解到 feed

    // 我们只验证它做了一些实质性的事情
    expect(result.response.length).toBeGreaterThan(100);
    expect(result.toolCalls.length).toBeGreaterThan(0);
  });
});
```

### 失败是什么样子的

```typescript
// 失败: Agent 只能说它不能
const result = await agent.chat("Help me prepare for a book club discussion");

// 不良结果:
expect(result.response).not.toContain("I can't");
expect(result.response).not.toContain("I don't have a tool");
expect(result.response).not.toContain("Could you clarify");

// 如果 agent 询问它应该理解的事情的澄清,
// 你有一个上下文注入或功能差距
```
</surprise_test>

<parity_testing>
## 自动化对等性测试

确保每个 UI 操作都有 agent 等效项。

### 功能映射测试

```typescript
// capability-map.ts
export const capabilityMap = {
  // UI 操作: Agent 工具
  "View library": "read_library",
  "Add book": "add_book",
  "Delete book": "delete_book",
  "Publish insight": "publish_to_feed",
  "Start research": "start_research",
  "View highlights": "read_library",  // 相同的工具,不同的查询
  "Edit profile": "write_file",
  "Search web": "web_search",
  "Export data": "N/A",  // 仅 UI 操作
};

// parity.test.ts
import { capabilityMap } from './capability-map';
import { getAgentTools } from './agent-config';
import { getSystemPrompt } from './system-prompt';

describe('Action Parity', () => {
  const agentTools = getAgentTools();
  const systemPrompt = getSystemPrompt();

  for (const [uiAction, toolName] of Object.entries(capabilityMap)) {
    if (toolName === 'N/A') continue;

    test(`"${uiAction}" has agent tool: ${toolName}`, () => {
      const toolNames = agentTools.map(t => t.name);
      expect(toolNames).toContain(toolName);
    });

    test(`${toolName} is documented in system prompt`, () => {
      expect(systemPrompt).toContain(toolName);
    });
  }
});
```

### 上下文对等性测试

```typescript
describe('Context Parity', () => {
  test('Agent sees all data that UI shows', async () => {
    // 设置: 创建一些数据
    await libraryService.addBook({ id: "1", title: "Test Book" });
    await feedService.addItem({ id: "f1", content: "Test insight" });

    // 获取系统提示 (包括上下文)
    const systemPrompt = await buildSystemPrompt();

    // 验证数据包括在内
    expect(systemPrompt).toContain("Test Book");
    expect(systemPrompt).toContain("Test insight");
  });

  test('Recent activity is visible to agent', async () => {
    // 执行一些操作
    await activityService.log({ action: "highlighted", bookId: "1" });
    await activityService.log({ action: "researched", bookId: "2" });

    const systemPrompt = await buildSystemPrompt();

    // 验证活动包括在内
    expect(systemPrompt).toMatch(/highlighted|researched/);
  });
});
```
</parity_testing>

<integration_testing>
## 集成测试

测试从用户请求到结果的完整流程。

### 端到端流程测试

```typescript
describe('End-to-End Flows', () => {
  test('Research flow: request → web search → file creation', async () => {
    // 设置
    const bookId = "book_123";
    await libraryService.addBook({ id: bookId, title: "Moby Dick" });

    // 用户请求
    await agent.chat("Research the historical context of whaling in Moby Dick");

    // 验证: 执行了网络搜索
    const searchCalls = mockWebSearch.mock.calls;
    expect(searchCalls.length).toBeGreaterThan(0);
    expect(searchCalls.some(call =>
      call[0].query.toLowerCase().includes("whaling")
    )).toBe(true);

    // 验证: 创建了文件
    const researchFiles = await fileService.listFiles(`Research/${bookId}/`);
    expect(researchFiles.length).toBeGreaterThan(0);

    // 验证: 内容相关
    const content = await fileService.readFile(researchFiles[0]);
    expect(content.toLowerCase()).toMatch(/whale|whaling|nantucket|melville/);
  });

  test('Publish flow: request → tool call → feed update → UI reflects', async () => {
    // 设置
    await libraryService.addBook({ id: "book_1", title: "1984" });

    // 初始状态
    const feedBefore = await feedService.getItems();

    // 用户请求
    await agent.chat("Write something about Big Brother for my reading feed");

    // 验证 feed 更新
    const feedAfter = await feedService.getItems();
    expect(feedAfter.length).toBe(feedBefore.length + 1);

    // 验证内容
    const newItem = feedAfter.find(item =>
      !feedBefore.some(old => old.id === item.id)
    );
    expect(newItem).toBeDefined();
    expect(newItem.content.toLowerCase()).toMatch(/big brother|surveillance|watching/);
  });
});
```

### 失败恢复测试

```typescript
describe('Failure Recovery', () => {
  test('Agent handles missing book gracefully', async () => {
    const result = await agent.chat("Tell me about 'Nonexistent Book'");

    // Agent 不应崩溃
    expect(result.error).toBeUndefined();

    // Agent 应该确认问题
    expect(result.response.toLowerCase()).toMatch(
      /not found|don't see|can't find|library/
    );
  });

  test('Agent recovers from API failure', async () => {
    // 模拟 API 失败
    mockWebSearch.mockRejectedValueOnce(new Error("Network error"));

    const result = await agent.chat("Research this topic");

    // Agent 应该优雅地处理
    expect(result.error).toBeUndefined();
    expect(result.response).not.toContain("unhandled exception");

    // Agent 应该传达问题
    expect(result.response.toLowerCase()).toMatch(
      /couldn't search|unable to|try again/
    );
  });
});
```
</integration_testing>

<snapshot_testing>
## 系统提示的快照测试

跟踪系统提示和上下文注入随时间的变化。

```typescript
describe('System Prompt Stability', () => {
  test('System prompt structure matches snapshot', async () => {
    const systemPrompt = await buildSystemPrompt();

    // 提取结构 (删除动态数据)
    const structure = systemPrompt
      .replace(/id: \w+/g, 'id: [ID]')
      .replace(/"[^"]+"/g, '"[TITLE]"')
      .replace(/\d{4}-\d{2}-\d{2}/g, '[DATE]');

    expect(structure).toMatchSnapshot();
  });

  test('All capability sections are present', async () => {
    const systemPrompt = await buildSystemPrompt();

    const requiredSections = [
      "Your Capabilities",
      "Available Books",
      "Recent Activity",
    ];

    for (const section of requiredSections) {
      expect(systemPrompt).toContain(section);
    }
  });
});
```
</snapshot_testing>

<manual_testing>
## 手动测试检查清单

有些事情最好在开发期间手动测试:

### 自然语言变化测试

尝试相同请求的多种措辞:

```
"Add this to my feed"
"Write something in my reading feed"
"Publish an insight about this"
"Put this in the feed"
"I want this in my feed"
```

如果上下文注入正确,所有这些都应该工作。

### 边缘情况提示

```
"What can you do?"
→ Agent 应该描述能力

"Help me with my books"
→ Agent 应该与图书馆互动,而不是询问 "books" 是什么意思

"Write something"
→ Agent 如果不明确应该问在哪里 (feed, 文件等)

"Delete everything"
→ Agent 应该在破坏性操作之前确认
```

### 困惑测试

询问应该存在但可能没有正确连接的事情:

```
"What's in my research folder?"
→ 应该列出文件,而不是问 "what research folder?"

"Show me my recent reading"
→ 应该显示活动,而不是问 "what do you mean?"

"Continue where I left off"
→ 如果可用应该引用最近的活动
```
</manual_testing>

<ci_integration>
## CI/CD 集成

将 agent-native 测试添加到 CI 管道:

```yaml
# .github/workflows/test.yml
name: Agent-Native Tests

on: [push, pull_request]

jobs:
  agent-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup
        run: npm install

      - name: Run Parity Tests
        run: npm run test:parity

      - name: Run Capability Tests
        run: npm run test:capabilities
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Check System Prompt Completeness
        run: npm run test:system-prompt

      - name: Verify Capability Map
        run: |
          # 确保功能映射图是最新的
          npm run generate:capability-map
          git diff --exit-code capability-map.ts
```

### 成本感知测试

Agent 测试花费 API tokens。管理策略:

```typescript
// 对基本测试使用较小的模型
const testConfig = {
  model: process.env.CI ? "claude-3-haiku" : "claude-3-opus",
  maxTokens: 500,  // 限制输出长度
};

// 为确定性测试缓存响应
const cachedAgent = new CachedAgent({
  cacheDir: ".test-cache",
  ttl: 24 * 60 * 60 * 1000,  // 24 小时
});

// 仅在主分支上运行昂贵的测试
if (process.env.GITHUB_REF === 'refs/heads/main') {
  describe('Full Integration Tests', () => { ... });
}
```
</ci_integration>

<test_utilities>
## 测试工具

### Agent 测试工具

```typescript
class AgentTestHarness {
  private agent: Agent;
  private mockServices: MockServices;

  async setup() {
    this.mockServices = createMockServices();
    this.agent = await createAgent({
      services: this.mockServices,
      model: "claude-3-haiku",  // 测试更便宜
    });
  }

  async chat(message: string): Promise<AgentResponse> {
    return this.agent.chat(message);
  }

  async expectToolCall(toolName: string) {
    const lastResponse = this.agent.getLastResponse();
    expect(lastResponse.toolCalls.map(t => t.name)).toContain(toolName);
  }

  async expectOutcome(check: () => Promise<boolean>) {
    const result = await check();
    expect(result).toBe(true);
  }

  getState() {
    return {
      library: this.mockServices.library.getBooks(),
      feed: this.mockServices.feed.getItems(),
      files: this.mockServices.files.listAll(),
    };
  }
}

// 用法
test('full flow', async () => {
  const harness = new AgentTestHarness();
  await harness.setup();

  await harness.chat("Add 'Moby Dick' to my library");
  await harness.expectToolCall("add_book");
  await harness.expectOutcome(async () => {
    const state = harness.getState();
    return state.library.some(b => b.title.includes("Moby"));
  });
});
```
</test_utilities>

<checklist>
## 测试检查清单

自动化测试:
- [ ] 每个 UI 操作的 "Agent 能做吗?" 测试
- [ ] 位置感知测试 ("write to my feed")
- [ ] 对等性测试 (工具存在,在提示中记录)
- [ ] 上下文对等性测试 (agent 看到 UI 显示的内容)
- [ ] 端到端流程测试
- [ ] 失败恢复测试

手动测试:
- [ ] 自然语言变化 (多种措辞工作)
- [ ] 边缘情况提示 (开放式请求)
- [ ] 困惑测试 (agent 知道应用词汇)
- [ ] 惊喜测试 (agent 可以有创造性)

CI 集成:
- [ ] 对等性测试在每次 PR 上运行
- [ ] 使用 API key 运行功能测试
- [ ] 系统提示完整性检查
- [ ] 功能映射图漂移检测
</checklist>

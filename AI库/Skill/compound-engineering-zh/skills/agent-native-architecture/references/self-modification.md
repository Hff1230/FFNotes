<overview>
自修改是 agent native 工程的高级层级：可以进化自己的代码、提示和行为的 agent。不是每个应用都需要，但这是未来的重要部分。

这是"开发者能做什么，agent 就能做什么"原则的逻辑延伸。
</overview>

<why_self_modification>
## 为什么自修改？

传统软件是静态的——它做你写的事情，仅此而已。自修改 agent 可以：

- **修复自己的错误** - 看到错误，修补代码，重启
- **添加新功能** - 用户要求新东西，agent 实现它
- **演化行为** - 从反馈中学习并调整提示
- **部署自己** - 推送代码，触发构建，重启

agent 成为一个随时间改进的活系统，而不是冻结的代码。
</why_self_modification>

<capabilities>
## 自修改启用的功能

**代码修改：**
- 读取和理解源文件
- 编写修复和新功能
- 提交并推送到版本控制
- 触发构建并验证它们通过

**提示演化：**
- 根据反馈编辑系统提示
- 添加新功能作为提示部分
- 完善不起作用的判断标准

**基础设施控制：**
- 从上游拉取最新代码
- 从其他分支/实例合并
- 更改后重启
- 如果出现问题则回滚

**站点/输出生成：**
- 生成和维护网站
- 创建文档
- 从数据构建仪表板
</capabilities>

<guardrails>
## 所需防护栏

自修改是强大的。它需要安全机制。

**代码更改的批准门：**
```typescript
tool("write_file", async ({ path, content }) => {
  if (isCodeFile(path)) {
    // 存储以供批准，不要立即应用
    pendingChanges.set(path, content);
    const diff = generateDiff(path, content);
    return { text: `需要批准：\n\n${diff}\n\n回复 "yes" 应用。` };
  }
  // 非代码文件立即应用
  writeFileSync(path, content);
  return { text: `已写入 ${path}` };
});
```

**更改前自动提交：**
```typescript
tool("self_deploy", async () => {
  // 首先保存当前状态
  runGit("stash");  // 或提交未提交的更改

  // 然后拉取/合并
  runGit("fetch origin");
  runGit("merge origin/main --no-edit");

  // 构建并验证
  runCommand("npm run build");

  // 只有那时重启
  scheduleRestart();
});
```

**构建验证：**
```typescript
// 除非构建通过，否则不要重启
try {
  runCommand("npm run build", { timeout: 120000 });
} catch (error) {
  // 回滚合并
  runGit("merge --abort");
  return { text: "构建失败，中止部署", isError: true };
}
```

**重启后的健康检查：**
```typescript
tool("health_check", async () => {
  const uptime = process.uptime();
  const buildValid = existsSync("dist/index.js");
  const gitClean = !runGit("status --porcelain");

  return {
    text: JSON.stringify({
      status: "healthy",
      uptime: `${Math.floor(uptime / 60)}m`,
      build: buildValid ? "valid" : "missing",
      git: gitClean ? "clean" : "uncommitted changes",
    }, null, 2),
  };
});
```
</guardrails>

<git_architecture>
## 基于 Git 的自修改

使用 git 作为自修改的基础。它提供：
- 版本历史（回滚能力）
- 分支（安全实验）
- 合并（与其他实例同步）
- 推/拉（部署和协作）

**基本 git 工具：**
```typescript
tool("status", "显示 git 状态", {}, ...);
tool("diff", "显示文件更改", { path: z.string().optional() }, ...);
tool("log", "显示提交历史", { count: z.number() }, ...);
tool("commit_code", "提交代码更改", { message: z.string() }, ...);
tool("git_push", "推送到 GitHub", { branch: z.string().optional() }, ...);
tool("pull", "从 GitHub 拉取", { source: z.enum(["main", "instance"]) }, ...);
tool("rollback", "恢复最近的提交", { commits: z.number() }, ...);
```

**多实例架构：**
```
main                      # 共享代码
├── instance/bot-a       # 实例 A 的分支
├── instance/bot-b       # 实例 B 的分支
└── instance/bot-c       # 实例 C 的分支
```

每个实例可以：
- 从 main 拉取更新
- 将改进推回 main（通过 PR）
- 从其他实例同步功能
- 维护实例特定的配置
</git_architecture>

<prompt_evolution>
## 自修改提示

系统提示是 agent 可以读取和写入的文件。

```typescript
// Agent 可以读取自己的提示
tool("read_file", ...);  // 可以读取 src/prompts/system.md

// Agent 可以提议更改
tool("write_file", ...);  // 可以写入 src/prompts/system.md（需批准）
```

**作为活文档的系统提示：**
```markdown
## 反馈处理

当有人分享反馈时：
1. 热情地确认
2. 评级重要性 1-5
3. 使用反馈工具存储

<!-- 自我注意：视频演练应该始终是 4-5，
     从 Dan 2024-12-07 的反馈中学到这一点 -->
```

agent 可以：
- 向自己添加注释
- 完善判断标准
- 添加新功能部分
- 记录学到的边缘情况
</prompt_evolution>

<when_to_use>
## 何时实现自修改

**好的候选者：**
- 长期运行的自主 agent
- 需要适应反馈的 agent
- 行为演化有价值的系统
- 快速迭代重要的内部工具

**不必要：**
- 简单的单任务 agent
- 高度监管的环境
- 行为必须可审计的系统
- 一次性或短期 agent

首先从非自修改的 prompt-native agent 开始。当你需要时添加自修改。
</when_to_use>

<example_tools>
## 完整的自修改工具集

```typescript
const selfMcpServer = createSdkMcpServer({
  name: "self",
  version: "1.0.0",
  tools: [
    // 文件操作
    tool("read_file", "读取任何项目文件", { path: z.string() }, ...),
    tool("write_file", "写入文件（代码需要批准）", { path, content }, ...),
    tool("list_files", "列出目录内容", { path: z.string() }, ...),
    tool("search_code", "搜索模式", { pattern: z.string() }, ...),

    // 批准工作流
    tool("apply_pending", "应用已批准的更改", {}, ...),
    tool("get_pending", "显示待处理的更改", {}, ...),
    tool("clear_pending", "丢弃待处理的更改", {}, ...),

    // 重启
    tool("restart", "重新构建并重启", {}, ...),
    tool("health_check", "检查 bot 是否健康", {}, ...),
  ],
});

const gitMcpServer = createSdkMcpServer({
  name: "git",
  version: "1.0.0",
  tools: [
    // 状态
    tool("status", "显示 git 状态", {}, ...),
    tool("diff", "显示更改", { path: z.string().optional() }, ...),
    tool("log", "显示历史", { count: z.number() }, ...),

    // 提交和推送
    tool("commit_code", "提交代码更改", { message: z.string() }, ...),
    tool("git_push", "推送到 GitHub", { branch: z.string().optional() }, ...),

    // 同步
    tool("pull", "从上游拉取", { source: z.enum(["main", "instance"]) }, ...),
    tool("self_deploy", "拉取、构建、重启", { source: z.enum(["main", "instance"]) }, ...),

    // 安全
    tool("rollback", "恢复提交", { commits: z.number() }, ...),
    tool("health_check", "详细健康报告", {}, ...),
  ],
});
```
</example_tools>

<checklist>
## 自修改清单

启用自修改之前：
- [ ] 设置基于 git 的版本控制
- [ ] 代码更改的批准门
- [ ] 重启前的构建验证
- [ ] 可用的回滚机制
- [ ] 健康检查端点
- [ ] 配置的实例身份

实现时：
- [ ] Agent 可以读取所有项目文件
- [ ] Agent 可以写入文件（有适当的批准）
- [ ] Agent 可以提交和推送
- [ ] Agent 可以拉取更新
- [ ] Agent 可以重启自己
- [ ] Agent 可以在需要时回滚
</checklist>

---
name: resolve_parallel
description: 使用并行处理解决所有 TODO 注释
argument-hint: "[可选：特定的 TODO 模式或文件]"
---

使用并行处理解决所有 TODO 注释。

## Workflow

### 1. 分析

从上方收集待办事项。

### 2. 规划

创建一个按类型分组的所有未解决项目的 TodoWrite 列表。确保查看可能出现的依赖关系,并优先处理其他项目所需的项目。 例如,如果需要更改名称,则必须等待完成其他操作。 输出一个 mermaid 流程图,展示如何执行此操作。 我们可以并行执行所有操作吗? 我们需要先完成一个操作,然后再并行执行其他操作吗? 我将把待办事项按流程方式放在 mermaid 图中,以便代理知道如何按顺序进行。

### 3. 实施(并行)

为每个未解决的项目并行启动一个 pr-comment-resolver 代理。

因此,如果有 3 条评论,它将并行启动 3 个 pr-comment-resolver 代理。例如:

1. Task pr-comment-resolver(评论1)
2. Task pr-comment-resolver(评论2)
3. Task pr-comment-resolver(评论3)

始终为每个待办事项并行运行所有子代理/任务。

### 4. 提交并解决

- 提交更改
- 推送到远程

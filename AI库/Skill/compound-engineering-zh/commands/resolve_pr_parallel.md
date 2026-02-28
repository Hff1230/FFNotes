---
name: resolve_pr_parallel
description: 使用并行处理解决所有 PR 评论
argument-hint: "[可选：PR 编号或当前 PR]"
---

使用并行处理解决所有 PR 评论。

Claude Code 会自动检测并理解你的 git 上下文:

- 当前分支检测
- 关联的 PR 上下文
- 所有 PR 评论和审查线程
- 可以通过指定 PR 编号处理任何 PR,或询问代理。

## Workflow

### 1. 分析

获取 PR 的所有未解决评论

```bash
gh pr status
bin/get-pr-comments PR编号
```

### 2. 规划

创建一个按类型分组的所有未解决项目的 TodoWrite 列表。

### 3. 实施(并行)

为每个未解决的项目并行启动一个 pr-comment-resolver 代理。

因此,如果有 3 条评论,它将并行启动 3 个 pr-comment-resolver 代理。例如:

1. Task pr-comment-resolver(评论1)
2. Task pr-comment-resolver(评论2)
3. Task pr-comment-resolver(评论3)

始终为每个待办事项并行运行所有子代理/任务。

### 4. 提交并解决

- 提交更改
- Run bin/resolve-pr-thread THREAD_ID_1
- 推送到远程

最后,再次运行 bin/get-pr-comments PR编号 以查看是否所有评论已解决。如果没有,则从步骤 1 重复该过程。

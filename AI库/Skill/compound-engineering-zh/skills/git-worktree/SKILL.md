---
name: git-worktree
description: 此技能管理用于隔离并行开发的 Git 工作树。它通过简单的交互界面处理创建、列出、切换和清理工作树，遵循 KISS 原则。
---

# Git 工作树管理器

此技能为跨开发工作流管理 Git 工作树提供了统一接口。无论您是在隔离中审查 PR 还是在功能上并行工作，此技能都能处理所有复杂性。

## 此技能的作用

- **创建工作树**，分支名称清晰
- **列出工作树**及其当前状态
- **在工作树之间切换**以进行并行工作
- **自动清理已完成的工作树**
- 每一步都有**交互式确认**
- 工作目录的**自动 .gitignore 管理**
- 从主仓库到新工作树的**自动 .env 文件复制**

## 关键：始终使用管理器脚本

**永远不要直接调用 `git worktree add`。** 始终使用 `worktree-manager.sh` 脚本。

该脚本处理原始 git 命令不做的重要设置：
1. 从主仓库复制 `.env`、`.env.local`、`.env.test` 等
2. 确保 `.worktrees` 在 `.gitignore` 中
3. 创建一致的目录结构

```bash
# ✅ 正确 - 始终使用脚本
bash ${CLAUDE_PLUGIN_ROOT}/skills/git-worktree/scripts/worktree-manager.sh create feature-name

# ❌ 错误 - 永远不要直接这样做
git worktree add .worktrees/feature-name -b feature-name main
```

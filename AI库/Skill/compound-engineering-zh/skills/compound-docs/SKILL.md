---
name: compound-docs
description: 将已解决的问题捕获为带有 YAML frontmatter 的分类文档，以便快速查找
allowed-tools:
  - Read # 解析对话上下文
  - Write # 创建解决方案文档
  - Bash # 创建目录
  - Grep # 搜索现有文档
preconditions:
  - 问题已解决（未进行中）
  - 解决方案已验证工作
---

# compound-docs 技能

**目的：** 自动记录已解决的问题，以建立具有基于类别的组织（枚举验证的问题类型）的可搜索机构知识。

## 概述

此技能在确认后立即捕获问题解决方案，创建结构化文档作为未来会话的可搜索知识库。

**组织：** 单文件架构 - 每个问题在其症状类别目录中记录为一个 markdown 文件（例如，`docs/solutions/performance-issues/n-plus-one-briefs.md`）。文件使用 YAML frontmatter 进行元数据和可搜索性。

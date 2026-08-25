# Unity AI 自动化 Agent 操作指南

## 目录
- [概述](#概述)
- [Unity MCP Skill 简介](#unity-mcp-skill-简介)
- [环境配置](#环境配置)
- [常用自动化操作](#常用自动化操作)
- [Agent 工作流最佳实践](#agent-工作流最佳实践)
- [自动化测试](#自动化测试)
- [常见问题与解决方案](#常见问题与解决方案)

---

## 概述

本文档描述如何使用 AI Agent 自动化操作 Unity 编辑器，通过 MCP (Model Context Protocol) 协议实现代码生成、场景管理、资源操作等自动化任务。

### 核心 Skills 列表

| Skill 名称 | 用途 | 触发关键词 |
|-----------|------|-----------|
| `unity-mcp-skill` | Unity编辑器自动化 | Unity, 场景, GameObject |
| `browser-automation` | Web应用测试 | 测试, 验证, UI |
| `desktop-computer-automation` | 桌面应用自动化 | 桌面, 原生应用 |
| `simplify` | 代码简化审查 | 简化, 优化 |

---

## Unity MCP Skill 简介

Unity MCP Skill 是通过 MCP 协议与 Unity 编辑器交互的自动化工具，支持：
- 创建/修改/删除 GameObject
- 编辑脚本和组件
- 管理场景
- 运行测试
- 执行编辑器命令

### 调用方式

```
/unity-mcp-skill <任务描述>
```

或直接描述任务：
```
"使用Unity MCP创建一个新的Player GameObject"
```

---

## 环境配置

### 前置条件

1. **Unity 版本**: 2021.3 LTS 或更高
2. **MCP Server**: 需要在 Unity 项目中配置 MCP Server
3. **Claude Code**: 已安装并配置

### 配置步骤

```json
// .mcp.json 示例配置
{
  "mcpServers": {
    "unity": {
      "command": "node",
      "args": ["path/to/unity-mcp-server/build/index.js"],
      "env": {
        "UNITY_PROJECT_PATH": "E:/WorkSpace/YourUnityProject"
      }
    }
  }
}
```

### 验证连接

```
// 向AI询问
"检查Unity MCP连接状态"
```

---

## 常用自动化操作

### 1. 创建 GameObject

```csharp
// AI指令示例
"在Unity中创建一个名为Player的空GameObject，位置在(0, 1, 0)"

"创建一个Cube，命名为Enemy，添加Rigidbody组件"
```

### 2. 组件操作

```csharp
// AI指令示例
"给Main Camera添加AudioListener组件"

"移除Player对象上的BoxCollider组件"

"获取Player对象上PlayerController组件的所有公共属性"
```

### 3. 场景管理

```csharp
// AI指令示例
"加载场景 'MainMenu'"

"保存当前场景"

"创建新场景 'Level2' 并设置为激活场景"
```

### 4. 脚本操作

```csharp
// AI指令示例
"创建一个新的C#脚本 'EnemyAI'，放在 Scripts/Enemies 文件夹"

"读取 PlayerController.cs 的内容"

"在 PlayerController.cs 中添加一个 Jump() 方法"
```

### 5. 资源管理

```csharp
// AI指令示例
"列出项目中所有未使用的资源"

"查找所有引用 'Player' Prefab 的场景"
```

### 6. 运行测试

```csharp
// AI指令示例
"运行所有EditMode测试"

"运行 PlayMode 测试并报告结果"
```

---

## Agent 工作流最佳实践

### 标准 Agent 工作流

```
1. 理解需求 → 2. 探索代码库 → 3. 制定计划 → 4. 执行操作 → 5. 验证结果
```

### 工作流示例：创建新敌人类型

```
步骤1: 理解需求
"我需要创建一个新的飞行敌人，它会追踪玩家"

步骤2: 让 Agent 探索现有代码
"先查看现有的敌人实现，了解项目结构"

步骤3: Agent 制定计划
Agent 会分析现有的 Enemy 基类、移动逻辑等

步骤4: 执行操作
- 创建 FlyingEnemy.cs 脚本
- 创建 FlyingEnemy Prefab
- 配置组件和参数

步骤5: 验证结果
"运行场景测试飞行敌人的行为"
```

### 并行操作优化

```csharp
// ✅ 推荐：多个独立操作并行执行
// Agent 可以同时：
// 1. 创建脚本
// 2. 创建 Prefab
// 3. 配置场景

// ❌ 避免：串行依赖操作
// 步骤1 完成后才能执行步骤2
```

---

## 自动化测试

### 使用 Browser Automation 测试 WebGL 构建

```
"构建WebGL版本，然后在浏览器中测试主菜单功能"
```

Agent 会：
1. 触发 WebGL 构建
2. 启动本地服务器
3. 打开浏览器
4. 自动化测试 UI 交互
5. 报告结果

### 使用 Desktop Automation 测试 Standalone 构建

```
"构建Windows版本，启动并测试游戏流程"
```

### 测试脚本模板

```csharp
// 自动生成的测试脚本示例
using NUnit.Framework;
using UnityEngine.TestTools;

public class PlayerTests
{
    [Test]
    public void Player_InitialHealth_IsCorrect()
    {
        // Arrange
        var player = new GameObject().AddComponent<PlayerHealth>();

        // Act
        int initialHealth = player.CurrentHealth;

        // Assert
        Assert.AreEqual(100, initialHealth);
    }

    [UnityTest]
    public IEnumerator Player_TakesDamage_HealthDecreases()
    {
        // Arrange
        var player = new GameObject().AddComponent<PlayerHealth>();

        // Act
        player.TakeDamage(20);
        yield return null;

        // Assert
        Assert.AreEqual(80, player.CurrentHealth);
    }
}
```

---

## 常见问题与解决方案

### Q1: MCP 连接失败

```
解决方案:
1. 检查 Unity 编辑器是否运行
2. 验证 MCP Server 进程是否启动
3. 确认 .mcp.json 配置正确
4. 查看 Unity Console 是否有错误信息
```

### Q2: 脚本编译错误

```
解决方案:
1. 让 Agent 读取完整的错误信息
2. 检查命名空间和引用
3. 验证 Assembly Definition 配置
4. 使用 Agent 的 simplify skill 修复代码
```

### Q3: 场景操作不生效

```
解决方案:
1. 确保场景已保存或有未保存的更改提示
2. 检查操作的 GameObject 是否在当前激活场景
3. 验证编辑器处于 Play Mode 还是 Edit Mode
```

### Q4: 资源引用丢失

```
解决方案:
1. 使用 Addressables 或 AssetDatabase 刷新资源
2. 检查 meta 文件是否存在
3. 让 Agent 重新建立引用关系
```

---

## 快捷指令参考

### 项目初始化

```
"初始化Unity项目结构，创建标准文件夹（Scripts, Prefabs, Scenes等）"
```

### 代码生成

```
"基于现有 Player 类，创建一个 Enemy 基类"

"生成一个单例 GameManager 模板"
```

### 重构辅助

```
"分析 PlayerController 类，建议重构方案"

"将 Monster 类拆分为多个组件"
```

### 文档生成

```
"为所有公共API生成XML文档注释"

"生成项目架构文档"
```

### 性能分析

```
"分析项目中的性能瓶颈"

"检查是否有不必要的 Update 方法"
```

---

## 安全注意事项

1. **备份项目**: 在大规模自动化操作前，确保项目已提交到版本控制
2. **权限控制**: 限制 Agent 的文件系统访问权限
3. **审查变更**: 仔细审查 Agent 生成的代码
4. **测试验证**: 在生产环境使用前充分测试

---

## 进阶用法

### 自定义 Skill 创建

```bash
# 使用 skill-creator 创建自定义技能
/sickn33-skill-creator
```

### 与其他工具集成

```
# 结合 Git 操作
"提交当前的修改到 Git"

# 结合 CI/CD
"触发 Jenkins 构建任务"
```

### 批量操作

```
"批量重命名所有敌人 Prefab，添加 'Enemy_' 前缀"

"批量更新所有材质的 Shader"
```

---

*文档版本: 1.0 | 更新日期: 2026-03-20*

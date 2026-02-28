# Workflow: 为技能添加脚本

<required_reading>
**立即阅读以下参考文件：**
1. references/using-scripts.md
</required_reading>

<process>
## 步骤 1: 识别技能

询问（如果尚未提供）：
- 哪个技能需要脚本？
- 脚本应执行什么操作？

## 步骤 2: 分析脚本需求

确认这是一个好的脚本候选：
- [ ] 同样的代码在多次调用中运行
- [ ] 重写时容易出错的操作
- [ ] 一致性比灵活性更重要

如果不适合，建议替代方案（工作流中的内联代码、参考示例）。

## 步骤 3: 创建脚本目录

```bash
mkdir -p ~/.claude/skills/{skill-name}/scripts
```

## 步骤 4: 设计脚本

收集需求：
- 脚本需要什么输入？
- 应输出或完成什么？
- 可能发生什么错误？
- 应该是幂等的吗？

选择语言：
- **bash** - Shell 操作、文件操作、CLI 工具
- **python** - 数据处理、API 调用、复杂逻辑
- **node/ts** - JavaScript 生态系统、异步操作

## 步骤 5: 编写脚本文件

创建 `scripts/{script-name}.{ext}`，包含：
- 顶部注释说明用途
- 使用说明
- 输入验证
- 错误处理
- 清晰的输出/反馈

对于 bash 脚本：
```bash
#!/bin/bash
set -euo pipefail
```

## 步骤 6: 设置可执行权限（如果是 bash）

```bash
chmod +x ~/.claude/skills/{skill-name}/scripts/{script-name}.sh
```

## 步骤 7: 更新工作流以使用脚本

找到需要此操作的工作流。添加：
```xml
<process>
...
N. 运行 `scripts/{script-name}.sh [arguments]`
N+1. 验证操作成功
...
</process>
```

## 步骤 8: 测试

调用技能工作流并验证：
- 脚本在正确的步骤运行
- 输入正确传递
- 错误得到优雅处理
- 输出符合预期
</process>

<success_criteria>
脚本完成时：
- [ ] scripts/ 目录存在
- [ ] 脚本文件具有正确的结构（注释、验证、错误处理）
- [ ] 脚本可执行（如果是 bash）
- [ ] 至少有一个工作流引用该脚本
- [ ] 无硬编码的密钥或凭据
- [ ] 已通过实际调用测试
</success_criteria>

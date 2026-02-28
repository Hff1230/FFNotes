---
name: dspy-ruby
description: 当使用 DSPy.rb 时应使用此技能，DSPy.rb 是一个用于构建类型安全、可组合的 LLM 应用程序的 Ruby 框架。在实现可预测的 AI 功能、创建 LLM 签名和模块、配置语言模型提供商（OpenAI、Anthropic、Gemini、Ollama）、构建带有工具的智能体系统、优化提示或在 Ruby 应用程序中测试 LLM 功能时使用。
---

# DSPy.rb 专家

## 概述

DSPy.rb 是一个 Ruby 框架，使开发者能够**编程 LLM，而不是提示它们**。不是手动制作提示，而是通过类型安全、可组合的模块定义应用程序需求，这些模块可以像常规代码一样进行测试、优化和版本控制。

此技能提供有关以下内容的全面指导：
- 为 LLM 操作创建类型安全的签名
- 构建可组合的模块和工作流
- 配置多个 LLM 提供商
- 实现带有工具的智能体
- 测试和优化 LLM 应用程序
- 生产部署模式

## 核心能力

### 1. 类型安全签名

为 LLM 操作创建带有运行时类型检查的输入/输出契约。

**何时使用：** 定义任何 LLM 任务，从简单分类到复杂分析。

**快速参考：**
```ruby
class EmailClassificationSignature < DSPy::Signature
  description "对客户支持邮件进行分类"

  input do
    const :email_subject, String
    const :email_body, String
  end

  output do
    const :category, T.enum(["Technical", "Billing", "General"])
    const :priority, T.enum(["Low", "Medium", "High"])
  end
end
```

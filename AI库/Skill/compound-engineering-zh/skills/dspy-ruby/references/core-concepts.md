# DSPy.rb 核心概念

## 哲学

DSPy.rb 使开发者能够**编程 LLM,而非提示它们**。通过类型安全、可组合的模块,通过代码定义应用需求,而不是手动编写提示。

## 签名

签名定义 LLM 操作的类型安全输入/输出契约。它们指定输入什么数据、输出什么数据,具有运行时类型检查。

### 基本签名结构

```ruby
class TaskSignature < DSPy::Signature
  description "简要描述此签名的作用"

  input do
    const :field_name, String, desc: "此输入字段的描述"
    const :another_field, Integer, desc: "另一个输入字段"
  end

  output do
    const :result_field, String, desc: "输出的描述"
    const :confidence, Float, desc: "置信度分数 (0.0-1.0)"
  end
end
```

### 类型安全

签名支持 Sorbet 类型,包括:
- `String` - 文本数据
- `Integer`、`Float` - 数值数据
- `T::Boolean` - 布尔值
- `T::Array[Type]` - 特定类型的数组
- 自定义枚举和类

### 字段描述

始终使用 `desc:` 参数提供清晰的字段描述。这些描述:
- 指导 LLM 预期的输入/输出格式
- 作为开发者的文档
- 提高预测准确性

## 模块

模块是使用签名执行 LLM 操作的可组合构建块。它们可以链接在一起创建复杂的工作流。

### 基本模块结构

```ruby
class MyModule < DSPy::Module
  def initialize
    super
    @predictor = DSPy::Predict.new(MySignature)
  end

  def forward(input_hash)
    @predictor.forward(input_hash)
  end
end
```

### 模块组合

模块可以调用其他模块来创建管道:

```ruby
class ComplexWorkflow < DSPy::Module
  def initialize
    super
    @step1 = FirstModule.new
    @step2 = SecondModule.new
  end

  def forward(input)
    result1 = @step1.forward(input)
    result2 = @step2.forward(result1)
    result2
  end
end
```

## 预测器

预测器是采用签名并执行 LLM 推理的核心执行引擎。DSPy.rb 提供了几种预测器类型。

### Predict

具有类型安全输入和输出的基本 LLM 推理。

```ruby
predictor = DSPy::Predict.new(TaskSignature)
result = predictor.forward(field_name: "value", another_field: 42)
# 返回: { result_field: "...", confidence: 0.85 }
```

### ChainOfThought

自动向输出添加推理字段,提高复杂任务的准确性。

```ruby
class EmailClassificationSignature < DSPy::Signature
  description "分类客户支持邮件"

  input do
    const :email_subject, String
    const :email_body, String
  end

  output do
    const :category, String  # "Technical"、"Billing" 或 "General"
    const :priority, String  # "High"、"Medium" 或 "Low"
  end
end

predictor = DSPy::ChainOfThought.new(EmailClassificationSignature)
result = predictor.forward(
  email_subject: "Can't log in to my account",
  email_body: "I've been trying to access my account for hours..."
)
# 返回: {
#   reasoning: "这似乎是一个技术问题...",
#   category: "Technical",
#   priority: "High"
# }
```

### ReAct

具有迭代推理的工具使用代理。通过允许 LLM 使用外部工具实现自主问题解决。

```ruby
class SearchTool < DSPy::Tool
  def call(query:)
    # 执行搜索并返回结果
    { results: search_database(query) }
  end
end

predictor = DSPy::ReAct.new(
  TaskSignature,
  tools: [SearchTool.new],
  max_iterations: 5
)
```

### CodeAct

用于以编程方式解决问题的动态代码生成。需要可选的 `dspy-code_act` gem。

```ruby
predictor = DSPy::CodeAct.new(TaskSignature)
result = predictor.forward(task: "Calculate the factorial of 5")
# LLM 生成并执行 Ruby 代码来解决任务
```

## 多模态支持

DSPy.rb 通过统一的 `DSPy::Image` 接口支持兼容模型的视觉能力。

```ruby
class VisionSignature < DSPy::Signature
  description "描述图像中的内容"

  input do
    const :image, DSPy::Image
    const :question, String
  end

  output do
    const :description, String
  end
end

predictor = DSPy::Predict.new(VisionSignature)
result = predictor.forward(
  image: DSPy::Image.from_file("path/to/image.jpg"),
  question: "此图像中可见哪些对象?"
)
```

### 图像输入方法

```ruby
# 从文件路径
DSPy::Image.from_file("path/to/image.jpg")

# 从 URL(仅 OpenAI)
DSPy::Image.from_url("https://example.com/image.jpg")

# 从 base64 编码的数据
DSPy::Image.from_base64(base64_string, mime_type: "image/jpeg")
```

## 最佳实践

### 1. 清晰的签名描述

始终为签名和字段提供清晰、具体的描述:

```ruby
# 好
description "将客户支持邮件分类为 Technical、Billing 或 General 类别"

# 避免
description "分类邮件"
```

### 2. 类型安全

尽可能使用特定类型而非通用 String:

```ruby
# 好 - 对受约束输出使用枚举
output do
  const :category, T.enum(["Technical", "Billing", "General"])
end

# 不太理想 - 通用字符串
output do
  const :category, String, desc: "必须是 Technical、Billing 或 General"
end
```

### 3. 可组合架构

从简单、可重用的模块构建复杂工作流:

```ruby
class EmailPipeline < DSPy::Module
  def initialize
    super
    @classifier = EmailClassifier.new
    @prioritizer = EmailPrioritizer.new
    @responder = EmailResponder.new
  end

  def forward(email)
    classification = @classifier.forward(email)
    priority = @prioritizer.forward(classification)
    @responder.forward(classification.merge(priority))
  end
end
```

### 4. 错误处理

始终处理潜在的类型验证错误:

```ruby
begin
  result = predictor.forward(input_data)
rescue DSPy::ValidationError => e
  # 处理验证错误
  logger.error "来自 LLM 的无效输出: #{e.message}"
end
```

## 限制

需要注意的当前约束:
- 无流支持(仅单请求处理)
- 通过 Ollama 进行本地部署的多模态支持有限
- 视觉能力因提供商而异(参见 providers.md 了解兼容性矩阵)

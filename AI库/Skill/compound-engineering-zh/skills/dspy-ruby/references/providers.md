# DSPy.rb LLM 提供商

## 支持的提供商

DSPy.rb 通过适配器 gem 提供跨多个 LLM 提供商的统一支持,这些适配器 gem 在安装时自动加载。

### 提供商概述

- **OpenAI**: GPT-4、GPT-4o、GPT-4o-mini、GPT-3.5-turbo
- **Anthropic**: Claude 3 系列(Sonnet、Opus、Haiku)、Claude 3.5 Sonnet
- **Google Gemini**: Gemini 1.5 Pro、Gemini 1.5 Flash、其他版本
- **Ollama**: 通过 OpenAI 兼容层支持的本地模型
- **OpenRouter**: 200+ 模型的统一多提供商 API

## 配置

### 基本设置

```ruby
require 'dspy'

DSPy.configure do |c|
  c.lm = DSPy::LM.new('provider/model-name', api_key: ENV['API_KEY'])
end
```

### OpenAI 配置

**必需的 gem**: `dspy-openai`

```ruby
DSPy.configure do |c|
  # GPT-4o Mini(推荐用于开发)
  c.lm = DSPy::LM.new('openai/gpt-4o-mini', api_key: ENV['OPENAI_API_KEY'])

  # GPT-4o(更强大)
  c.lm = DSPy::LM.new('openai/gpt-4o', api_key: ENV['OPENAI_API_KEY'])

  # GPT-4 Turbo
  c.lm = DSPy::LM.new('openai/gpt-4-turbo', api_key: ENV['OPENAI_API_KEY'])
end
```

**环境变量**: `OPENAI_API_KEY`

### Anthropic 配置

**必需的 gem**: `dspy-anthropic`

```ruby
DSPy.configure do |c|
  # Claude 3.5 Sonnet(最新,最强大)
  c.lm = DSPy::LM.new('anthropic/claude-3-5-sonnet-20241022',
    api_key: ENV['ANTHROPIC_API_KEY'])

  # Claude 3 Opus(Claude 3 系列中最强大)
  c.lm = DSPy::LM.new('anthropic/claude-3-opus-20240229',
    api_key: ENV['ANTHROPIC_API_KEY'])

  # Claude 3 Sonnet(平衡)
  c.lm = DSPy::LM.new('anthropic/claude-3-sonnet-20240229',
    api_key: ENV['ANTHROPIC_API_KEY'])

  # Claude 3 Haiku(快速,性价比高)
  c.lm = DSPy::LM.new('anthropic/claude-3-haiku-20240307',
    api_key: ENV['ANTHROPIC_API_KEY'])
end
```

**环境变量**: `ANTHROPIC_API_KEY`

### Google Gemini 配置

**必需的 gem**: `dspy-gemini`

```ruby
DSPy.configure do |c|
  # Gemini 1.5 Pro(最强大)
  c.lm = DSPy::LM.new('gemini/gemini-1.5-pro',
    api_key: ENV['GOOGLE_API_KEY'])

  # Gemini 1.5 Flash(更快,性价比高)
  c.lm = DSPy::LM.new('gemini/gemini-1.5-flash',
    api_key: ENV['GOOGLE_API_KEY'])
end
```

**环境变量**: `GOOGLE_API_KEY` 或 `GEMINI_API_KEY`

### Ollama 配置

**必需的 gem**: 无(使用 OpenAI 兼容层)

```ruby
DSPy.configure do |c|
  # 本地 Ollama 实例
  c.lm = DSPy::LM.new('ollama/llama3.1',
    base_url: 'http://localhost:11434')

  # 其他 Ollama 模型
  c.lm = DSPy::LM.new('ollama/mistral')
  c.lm = DSPy::LM.new('ollama/codellama')
end
```

**注意**: 确保 Ollama 在本地运行: `ollama serve`

### OpenRouter 配置

**必需的 gem**: `dspy-openai`(使用 OpenAI 适配器)

```ruby
DSPy.configure do |c|
  # 通过 OpenRouter 访问 200+ 模型
  c.lm = DSPy::LM.new('openrouter/anthropic/claude-3.5-sonnet',
    api_key: ENV['OPENROUTER_API_KEY'],
    base_url: 'https://openrouter.ai/api/v1')

  # 其他示例
  c.lm = DSPy::LM.new('openrouter/google/gemini-pro')
  c.lm = DSPy::LM.new('openrouter/meta-llama/llama-3.1-70b-instruct')
end
```

**环境变量**: `OPENROUTER_API_KEY`

## 提供商兼容性矩阵

### 功能支持

| 功能 | OpenAI | Anthropic | Gemini | Ollama |
|---------|--------|-----------|--------|--------|
| 结构化输出 | ✅ | ✅ | ✅ | ✅ |
| 视觉(图像) | ✅ | ✅ | ✅ | ⚠️ 有限 |
| 图像 URL | ✅ | ❌ | ❌ | ❌ |
| 工具调用 | ✅ | ✅ | ✅ | 不同 |
| 流式 | ❌ | ❌ | ❌ | ❌ |
| 函数调用 | ✅ | ✅ | ✅ | 不同 |

**图例**: ✅ 完全支持 | ⚠️ 部分支持 | ❌ 不支持

### 视觉能力

**图像 URL**: 仅 OpenAI 支持直接 URL 引用。对于其他提供商,将图像加载为 base64 或从文件加载。

```ruby
# OpenAI - 支持 URL
DSPy::Image.from_url("https://example.com/image.jpg")

# Anthropic、Gemini - 使用文件或 base64
DSPy::Image.from_file("path/to/image.jpg")
DSPy::Image.from_base64(base64_data, mime_type: "image/jpeg")
```

**Ollama**: 有限的多模态功能。检查特定模型能力。

## 高级配置

### 自定义参数

配置时传递提供商特定的参数:

```ruby
DSPy.configure do |c|
  c.lm = DSPy::LM.new('openai/gpt-4o',
    api_key: ENV['OPENAI_API_KEY'],
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 0.9
  )
end
```

### 多提供商

为不同任务使用不同模型:

```ruby
# 简单任务的快速模型
fast_lm = DSPy::LM.new('openai/gpt-4o-mini', api_key: ENV['OPENAI_API_KEY'])

# 复杂任务的强大模型
powerful_lm = DSPy::LM.new('anthropic/claude-3-5-sonnet-20241022',
  api_key: ENV['ANTHROPIC_API_KEY'])

# 在不同模块中使用不同模型
class SimpleClassifier < DSPy::Module
  def initialize
    super
    DSPy.configure { |c| c.lm = fast_lm }
    @predictor = DSPy::Predict.new(SimpleSignature)
  end
end

class ComplexAnalyzer < DSPy::Module
  def initialize
    super
    DSPy.configure { |c| c.lm = powerful_lm }
    @predictor = DSPy::ChainOfThought.new(ComplexSignature)
  end
end
```

### 每请求配置

为特定预测覆盖配置:

```ruby
predictor = DSPy::Predict.new(MySignature)

# 使用默认配置
result1 = predictor.forward(input: "data")

# 为此请求覆盖 temperature
result2 = predictor.forward(
  input: "data",
  config: { temperature: 0.2 }  # 更确定性
)
```

## 成本优化

### 模型选择策略

1. **开发**: 使用更便宜、更快的模型(gpt-4o-mini、claude-3-haiku、gemini-1.5-flash)
2. **生产简单任务**: 如果质量足够,继续使用更便宜的模型
3. **生产复杂任务**: 升级到更强大的模型(gpt-4o、claude-3.5-sonnet、gemini-1.5-pro)
4. **本地开发**: 使用 Ollama 实现隐私和零 API 成本

### 成本感知设置示例

```ruby
# 开发环境
if Rails.env.development?
  DSPy.configure do |c|
    c.lm = DSPy::LM.new('ollama/llama3.1')  # 免费、本地
  end
elsif Rails.env.test?
  DSPy.configure do |c|
    c.lm = DSPy::LM.new('openai/gpt-4o-mini',  # 测试便宜
      api_key: ENV['OPENAI_API_KEY'])
  end
else  # 生产
  DSPy.configure do |c|
    c.lm = DSPy::LM.new('anthropic/claude-3-5-sonnet-20241022',
      api_key: ENV['ANTHROPIC_API_KEY'])
  end
end
```

## 提供商特定最佳实践

### OpenAI

- 使用 `gpt-4o-mini` 进行开发和简单任务
- 使用 `gpt-4o` 进行生产复杂任务
- 最佳视觉支持,包括 URL 加载
- 出色的函数调用能力

### Anthropic

- Claude 3.5 Sonnet 目前是最强大的模型
- 非常适合复杂推理和分析
- 强大的安全功能和有用的输出
- 图像需要 base64(无 URL 支持)

### Google Gemini

- 复杂任务使用 Gemini 1.5 Pro,追求速度使用 Flash
- 强大的多模态能力
- 成本和性能的良好平衡
- 图像需要 base64

### Ollama

- 最适合隐私敏感应用
- 零 API 成本
- 需要本地硬件资源
- 取决于模型的多模态支持有限
- 适合开发和测试

## 故障排除

### API 密钥问题

```ruby
# 验证设置了 API 密钥
if ENV['OPENAI_API_KEY'].nil?
  raise "未设置 OPENAI_API_KEY 环境变量"
end

# 测试连接
begin
  DSPy.configure { |c| c.lm = DSPy::LM.new('openai/gpt-4o-mini',
    api_key: ENV['OPENAI_API_KEY']) }
  predictor = DSPy::Predict.new(TestSignature)
  predictor.forward(test: "data")
  puts "✅ 连接成功"
rescue => e
  puts "❌ 连接失败: #{e.message}"
end
```

### 速率限制

优雅地处理速率限制:

```ruby
def call_with_retry(predictor, input, max_retries: 3)
  retries = 0
  begin
    predictor.forward(input)
  rescue RateLimitError => e
    retries += 1
    if retries < max_retries
      sleep(2 ** retries)  # 指数退避
      retry
    else
      raise
    end
  end
end
```

### 模型未找到

确保安装了正确的 gem:

```bash
# 对于 OpenAI
gem install dspy-openai

# 对于 Anthropic
gem install dspy-anthropic

# 对于 Gemini
gem install dspy-gemini
```

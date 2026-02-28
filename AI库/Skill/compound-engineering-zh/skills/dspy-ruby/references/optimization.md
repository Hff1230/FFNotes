# DSPy.rb 测试、优化和可观测性

## 测试

DSPy.rb 为 LLM 逻辑启用标准 RSpec 测试模式,使 AI 应用可测试且可维护。

### 基本测试设置

```ruby
require 'rspec'
require 'dspy'

RSpec.describe EmailClassifier do
  before do
    DSPy.configure do |c|
      c.lm = DSPy::LM.new('openai/gpt-4o-mini', api_key: ENV['OPENAI_API_KEY'])
    end
  end

  describe '#classify' do
    it '正确分类技术支持邮件' do
      classifier = EmailClassifier.new
      result = classifier.forward(
        email_subject: "Can't log in",
        email_body: "I'm unable to access my account"
      )

      expect(result[:category]).to eq('Technical')
      expect(result[:priority]).to be_in(['High', 'Medium', 'Low'])
    end
  end
end
```

### 模拟 LLM 响应

在不进行实际 API 调用的情况下测试模块:

```ruby
RSpec.describe MyModule do
  it '正确处理模拟响应' do
    # 创建返回预定结果的模拟预测器
    mock_predictor = instance_double(DSPy::Predict)
    allow(mock_predictor).to receive(:forward).and_return({
      category: 'Technical',
      priority: 'High',
      confidence: 0.95
    })

    # 将模拟注入模块
    module_instance = MyModule.new
    module_instance.instance_variable_set(:@predictor, mock_predictor)

    result = module_instance.forward(input: 'test data')
    expect(result[:category]).to eq('Technical')
  end
end
```

### 测试类型安全

验证签名强制执行类型约束:

```ruby
RSpec.describe EmailClassificationSignature do
  it '验证输出类型' do
    predictor = DSPy::Predict.new(EmailClassificationSignature)

    # 这应该工作
    result = predictor.forward(
      email_subject: 'Test',
      email_body: 'Test body'
    )
    expect(result[:category]).to be_a(String)

    # 测试捕获无效类型
    expect {
      # 模拟 LLM 返回无效类型
      predictor.send(:validate_output, { category: 123 })
    }.to raise_error(DSPy::ValidationError)
  end
end
```

### 测试边缘情况

始终测试边界条件和错误场景:

```ruby
RSpec.describe EmailClassifier do
  it '处理空邮件' do
    classifier = EmailClassifier.new
    result = classifier.forward(
      email_subject: '',
      email_body: ''
    )
    # 定义边缘情况的预期行为
    expect(result[:category]).to eq('General')
  end

  it '处理非常长的邮件' do
    long_body = 'word ' * 10000
    classifier = EmailClassifier.new

    expect {
      classifier.forward(
        email_subject: 'Test',
        email_body: long_body
      )
    }.not_to raise_error
  end

  it '处理特殊字符' do
    classifier = EmailClassifier.new
    result = classifier.forward(
      email_subject: 'Test <script>alert("xss")</script>',
      email_body: 'Body with émojis 🎉 and spëcial çharacters'
    )

    expect(result[:category]).to be_in(['Technical', 'Billing', 'General'])
  end
end
```

### 集成测试

端到端测试完整工作流:

```ruby
RSpec.describe EmailProcessingPipeline do
  it '通过完整管道处理邮件' do
    pipeline = EmailProcessingPipeline.new

    result = pipeline.forward(
      email_subject: 'Billing question',
      email_body: 'How do I update my payment method?'
    )

    # 验证完整管道输出
    expect(result[:classification]).to eq('Billing')
    expect(result[:priority]).to eq('Medium')
    expect(result[:suggested_response]).to include('payment')
    expect(result[:assigned_team]).to eq('billing_support')
  end
end
```

### 使用 VCR 进行确定性测试

使用 VCR 记录和重放 API 响应:

```ruby
require 'vcr'

VCR.configure do |config|
  config.cassette_library_dir = 'spec/vcr_cassettes'
  config.hook_into :webmock
  config.filter_sensitive_data('<OPENAI_API_KEY>') { ENV['OPENAI_API_KEY'] }
end

RSpec.describe EmailClassifier do
  it '一致地分类邮件', :vcr do
    VCR.use_cassette('email_classification') do
      classifier = EmailClassifier.new
      result = classifier.forward(
        email_subject: 'Test subject',
        email_body: 'Test body'
      )

      expect(result[:category]).to eq('Technical')
    end
  end
end
```

## 优化

DSPy.rb 提供强大的优化功能以自动改进提示和模块。

### MIPROv2 优化

MIPROv2 是一种高级多提示优化技术,使用自举采样、指令生成和贝叶斯优化。

```ruby
require 'dspy/mipro'

# 定义要优化的模块
class EmailClassifier < DSPy::Module
  def initialize
    super
    @predictor = DSPy::ChainOfThought.new(EmailClassificationSignature)
  end

  def forward(input)
    @predictor.forward(input)
  end
end

# 准备训练数据
training_examples = [
  {
    input: { email_subject: "Can't log in", email_body: "Password reset not working" },
    expected_output: { category: 'Technical', priority: 'High' }
  },
  {
    input: { email_subject: "Billing question", email_body: "How much does premium cost?" },
    expected_output: { category: 'Billing', priority: 'Medium' }
  },
  # 添加更多示例...
]

# 定义评估指标
def accuracy_metric(example, prediction)
  (example[:expected_output][:category] == prediction[:category]) ? 1.0 : 0.0
end

# 运行优化
optimizer = DSPy::MIPROv2.new(
  metric: method(:accuracy_metric),
  num_candidates: 10,
  num_threads: 4
)

optimized_module = optimizer.compile(
  EmailClassifier.new,
  trainset: training_examples
)

# 使用优化后的模块
result = optimized_module.forward(
  email_subject: "New email",
  email_body: "New email content"
)
```

### 自举少样本学习

从训练数据自动生成少样本示例:

```ruby
require 'dspy/teleprompt'

# 创建少样本优化的 teleprompter
teleprompter = DSPy::BootstrapFewShot.new(
  metric: method(:accuracy_metric),
  max_bootstrapped_demos: 5,
  max_labeled_demos: 3
)

# 编译优化后的模块
optimized = teleprompter.compile(
  MyModule.new,
  trainset: training_examples
)
```

### 自定义优化指标

为特定用例定义自定义指标:

```ruby
def custom_metric(example, prediction)
  score = 0.0

  # 类别准确率(60% 权重)
  score += 0.6 if example[:expected_output][:category] == prediction[:category]

  # 优先级准确率(40% 权重)
  score += 0.4 if example[:expected_output][:priority] == prediction[:priority]

  score
end

# 在优化中使用
optimizer = DSPy::MIPROv2.new(
  metric: method(:custom_metric),
  num_candidates: 10
)
```

### A/B 测试不同方法

比较不同的模块实现:

```ruby
# 方法 A: ChainOfThought
class ApproachA < DSPy::Module
  def initialize
    super
    @predictor = DSPy::ChainOfThought.new(EmailClassificationSignature)
  end

  def forward(input)
    @predictor.forward(input)
  end
end

# 方法 B: 带工具的 ReAct
class ApproachB < DSPy::Module
  def initialize
    super
    @predictor = DSPy::ReAct.new(
      EmailClassificationSignature,
      tools: [KnowledgeBaseTool.new]
    )
  end

  def forward(input)
    @predictor.forward(input)
  end
end

# 评估两种方法
def evaluate_approach(approach_class, test_set)
  approach = approach_class.new
  scores = test_set.map do |example|
    prediction = approach.forward(example[:input])
    accuracy_metric(example, prediction)
  end
  scores.sum / scores.size
end

approach_a_score = evaluate_approach(ApproachA, test_examples)
approach_b_score = evaluate_approach(ApproachB, test_examples)

puts "Approach A 准确率: #{approach_a_score}"
puts "Approach B 准确率: #{approach_b_score}"
```

## 可观测性

跟踪生产环境中 LLM 应用的性能、token 使用和行为。

### OpenTelemetry 集成

配置时 DSPy.rb 自动与 OpenTelemetry 集成:

```ruby
require 'opentelemetry/sdk'
require 'dspy'

# 配置 OpenTelemetry
OpenTelemetry::SDK.configure do |c|
  c.service_name = 'my-dspy-app'
  c.use_all # 使用所有可用的检测
end

# DSPy 自动为预测创建跟踪
predictor = DSPy::Predict.new(MySignature)
result = predictor.forward(input: 'data')
# 跟踪自动发送到 OpenTelemetry 收集器
```

### Langfuse 集成

使用 Langfuse 跟踪详细的 LLM 执行跟踪:

```ruby
require 'dspy/langfuse'

# 配置 Langfuse
DSPy.configure do |c|
  c.lm = DSPy::LM.new('openai/gpt-4o-mini', api_key: ENV['OPENAI_API_KEY'])
  c.langfuse = {
    public_key: ENV['LANGFUSE_PUBLIC_KEY'],
    secret_key: ENV['LANGFUSE_SECRET_KEY'],
    host: ENV['LANGFUSE_HOST'] || 'https://cloud.langfuse.com'
  }
end

# 所有预测自动跟踪
predictor = DSPy::Predict.new(MySignature)
result = predictor.forward(input: 'data')
# 在 Langfuse 仪表板中查看详细跟踪
```

### 手动 Token 跟踪

在不使用外部服务的情况下跟踪 token 使用:

```ruby
class TokenTracker
  def initialize
    @total_tokens = 0
    @request_count = 0
  end

  def track_prediction(predictor, input)
    start_time = Time.now
    result = predictor.forward(input)
    duration = Time.now - start_time

    # 从响应元数据获取 token 使用
    tokens = result.metadata[:usage][:total_tokens] rescue 0
    @total_tokens += tokens
    @request_count += 1

    puts "请求 ##{@request_count}: #{tokens} tokens in #{duration}s"
    puts "总使用 token: #{@total_tokens}"

    result
  end
end

# 使用
tracker = TokenTracker.new
predictor = DSPy::Predict.new(MySignature)

result = tracker.track_prediction(predictor, { input: 'data' })
```

### 自定义日志记录

向模块添加详细日志:

```ruby
class EmailClassifier < DSPy::Module
  def initialize
    super
    @predictor = DSPy::ChainOfThought.new(EmailClassificationSignature)
    @logger = Logger.new(STDOUT)
  end

  def forward(input)
    @logger.info "分类邮件: #{input[:email_subject]}"

    start_time = Time.now
    result = @predictor.forward(input)
    duration = Time.now - start_time

    @logger.info "分类: #{result[:category]} (#{duration}s)"

    if result[:reasoning]
      @logger.debug "推理: #{result[:reasoning]}"
    end

    result
  rescue => e
    @logger.error "分类失败: #{e.message}"
    raise
  end
end
```

### 性能监控

监控延迟和性能指标:

```ruby
class PerformanceMonitor
  def initialize
    @metrics = {
      total_requests: 0,
      total_duration: 0.0,
      errors: 0,
      success_count: 0
    }
  end

  def monitor_request
    start_time = Time.now
    @metrics[:total_requests] += 1

    begin
      result = yield
      @metrics[:success_count] += 1
      result
    rescue => e
      @metrics[:errors] += 1
      raise
    ensure
      duration = Time.now - start_time
      @metrics[:total_duration] += duration

      if @metrics[:total_requests] % 10 == 0
        print_stats
      end
    end
  end

  def print_stats
    avg_duration = @metrics[:total_duration] / @metrics[:total_requests]
    success_rate = @metrics[:success_count].to_f / @metrics[:total_requests]

    puts "\n=== 性能统计 ==="
    puts "总请求数: #{@metrics[:total_requests]}"
    puts "平均持续时间: #{avg_duration.round(3)}s"
    puts "成功率: #{(success_rate * 100).round(2)}%"
    puts "错误: #{@metrics[:errors]}"
    puts "========================\n"
  end
end

# 使用
monitor = PerformanceMonitor.new
predictor = DSPy::Predict.new(MySignature)

result = monitor.monitor_request do
  predictor.forward(input: 'data')
end
```

## 最佳实践

### 1. 从测试开始

在优化之前编写测试:

```ruby
# 首先定义测试用例
test_cases = [
  { input: {...}, expected: {...} },
  # 更多测试用例...
]

# 确保基线功能
test_cases.each do |tc|
  result = module.forward(tc[:input])
  assert result[:category] == tc[:expected][:category]
end

# 然后优化
optimized = optimizer.compile(module, trainset: test_cases)
```

### 2. 使用有意义的指标

定义与业务目标一致的指标:

```ruby
def business_aligned_metric(example, prediction)
  # 高优先级错误代价更高
  if example[:expected_output][:priority] == 'High'
    return prediction[:priority] == 'High' ? 1.0 : 0.0
  else
    return prediction[:category] == example[:expected_output][:category] ? 0.8 : 0.0
  end
end
```

### 3. 在生产中监控

始终跟踪生产性能:

```ruby
class ProductionModule < DSPy::Module
  def initialize
    super
    @predictor = DSPy::ChainOfThought.new(MySignature)
    @monitor = PerformanceMonitor.new
    @error_tracker = ErrorRateMonitor.new
  end

  def forward(input)
    @monitor.monitor_request do
      result = @predictor.forward(input)
      @error_tracker.track_result(success: true)
      result
    rescue => e
      @error_tracker.track_result(success: false)
      raise
    end
  end
end
```

### 4. 模块版本控制

跟踪部署的模块版本:

```ruby
class EmailClassifierV2 < DSPy::Module
  VERSION = '2.1.0'

  def initialize
    super
    @predictor = DSPy::ChainOfThought.new(EmailClassificationSignature)
  end

  def forward(input)
    result = @predictor.forward(input)
    result.merge(model_version: VERSION)
  end
end
```

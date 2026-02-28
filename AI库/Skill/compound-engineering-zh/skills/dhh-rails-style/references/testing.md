# 测试 - DHH Rails 风格

## 核心哲学

"Minitest with fixtures - 简单、快速、确定性。" 该方法优先考虑实用性而非约定。

## 为什么选择 Minitest 而非 RSpec

- **更简单**: 更少 DSL 魔法,纯 Ruby 断言
- **随 Rails 提供**: 无额外依赖
- **更快的启动时间**: 更少开销
- **纯 Ruby**: 无需学习专门语法

## Fixtures 作为测试数据

Fixtures 而非 factories 提供预加载数据:
- 加载一次,跨测试重用
- 无运行时对象创建开销
- 显式的关系可见性
- 确定性 ID 便于调试

### Fixture 结构

```yaml
# test/fixtures/users.yml
david:
  identity: david
  account: basecamp
  role: admin

jason:
  identity: jason
  account: basecamp
  role: member

# test/fixtures/rooms.yml
watercooler:
  name: Water Cooler
  creator: david
  direct: false

# test/fixtures/messages.yml
greeting:
  body: Hello everyone!
  room: watercooler
  creator: david
```

### 在测试中使用 Fixtures

```ruby
test "发送消息" do
  user = users(:david)
  room = rooms(:watercooler)

  # 使用 fixture 数据测试
end
```

### 动态 Fixture 值

ERB 启用时间敏感数据:

```yaml
recent_card:
  title: Recent Card
  created_at: <%= 1.hour.ago %>

old_card:
  title: Old Card
  created_at: <%= 1.month.ago %>
```

## 测试组织

### 单元测试

使用 setup 块和标准断言验证业务逻辑:

```ruby
class CardTest < ActiveSupport::TestCase
  setup do
    @card = cards(:one)
    @user = users(:david)
  end

  test "关闭卡片会创建关闭记录" do
    assert_difference -> { Card::Closure.count } do
      @card.close(creator: @user)
    end

    assert @card.closed?
    assert_equal @user, @card.closure.creator
  end

  test "重新打开卡片会销毁关闭记录" do
    @card.close(creator: @user)

    assert_difference -> { Card::Closure.count }, -1 do
      @card.reopen
    end

    refute @card.closed?
  end
end
```

### 集成测试

测试完整的请求/响应周期:

```ruby
class CardsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:david)
    sign_in @user
  end

  test "关闭卡片" do
    card = cards(:one)

    post card_closure_path(card)

    assert_response :success
    assert card.reload.closed?
  end

  test "未授权用户无法关闭卡片" do
    sign_in users(:guest)
    card = cards(:one)

    post card_closure_path(card)

    assert_response :forbidden
    refute card.reload.closed?
  end
end
```

### 系统测试

使用 Capybara 的基于浏览器的测试:

```ruby
class MessagesTest < ApplicationSystemTestCase
  test "发送消息" do
    sign_in users(:david)
    visit room_path(rooms(:watercooler))

    fill_in "Message", with: "Hello, world!"
    click_button "Send"

    assert_text "Hello, world!"
  end

  test "编辑自己的消息" do
    sign_in users(:david)
    visit room_path(rooms(:watercooler))

    within "#message_#{messages(:greeting).id}" do
      click_on "Edit"
    end

    fill_in "Message", with: "Updated message"
    click_button "Save"

    assert_text "Updated message"
  end

  test "拖放卡片到新列" do
    sign_in users(:david)
    visit board_path(boards(:main))

    card = find("#card_#{cards(:one).id}")
    target = find("#column_#{columns(:done).id}")

    card.drag_to target

    assert_selector "#column_#{columns(:done).id} #card_#{cards(:one).id}"
  end
end
```

## 高级模式

### 时间测试

使用 `travel_to` 进行确定性时间相关断言:

```ruby
test "卡片在 30 天后过期" do
  card = cards(:one)

  travel_to 31.days.from_now do
    assert card.expired?
  end
end
```

### 使用 VCR 进行外部 API 测试

记录和重放 HTTP 交互:

```ruby
test "从 API 获取用户数据" do
  VCR.use_cassette("user_api") do
    user_data = ExternalApi.fetch_user(123)

    assert_equal "John", user_data[:name]
  end
end
```

### 后台作业测试

断言作业入队和邮件投递:

```ruby
test "关闭卡片会入队通知作业" do
  card = cards(:one)

  assert_enqueued_with(job: NotifyWatchersJob, args: [card]) do
    card.close
  end
end

test "注册时发送欢迎邮件" do
  assert_emails 1 do
    Identity.create!(email: "new@example.com")
  end
end
```

### 测试 Turbo Streams

```ruby
test "消息创建会广播到房间" do
  room = rooms(:watercooler)

  assert_turbo_stream_broadcasts [room, :messages] do
    room.messages.create!(body: "Test", creator: users(:david))
  end
end
```

## 测试原则

### 1. 测试可观察行为

关注代码做什么,而不是如何做:

```ruby
# ❌ 测试实现
test "调用每个观察者的 notify 方法" do
  card.expects(:notify).times(3)
  card.close
end

# ✅ 测试行为
test "卡片关闭时观察者接收通知" do
  assert_difference -> { Notification.count }, 3 do
    card.close
  end
end
```

### 2. 不要模拟所有内容

```ruby
# ❌ 过度模拟的测试
test "发送消息" do
  room = mock("room")
  user = mock("user")
  message = mock("message")

  room.expects(:messages).returns(stub(create!: message))
  message.expects(:broadcast_create)

  MessagesController.new.create
end

# ✅ 测试真实的东西
test "发送消息" do
  sign_in users(:david)
  post room_messages_url(rooms(:watercooler)),
    params: { message: { body: "Hello" } }

  assert_response :success
  assert Message.exists?(body: "Hello")
end
```

### 3. 测试与功能一起发布

同一提交,不是 TDD 优先而是一起。既不在之前(严格 TDD)也不在之后(延迟测试)。

### 4. 安全修复始终包含回归测试

每个安全修复必须包含能够捕获漏洞的测试。

### 5. 集成测试验证完整工作流

不要只测试单个部分 - 测试它们一起工作。

## 文件组织

```
test/
├── controllers/         # 控制器的集成测试
├── fixtures/           # 所有模型的 YAML fixtures
├── helpers/            # 辅助方法测试
├── integration/        # API 集成测试
├── jobs/               # 后台作业测试
├── mailers/            # 邮件程序测试
├── models/             # 模型的单元测试
├── system/             # 基于浏览器的系统测试
└── test_helper.rb      # 测试配置
```

## 测试辅助方法设置

```ruby
# test/test_helper.rb
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  fixtures :all

  parallelize(workers: :number_of_processors)
end

class ActionDispatch::IntegrationTest
  include SignInHelper
end

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome
end
```

## 登录辅助方法

```ruby
# test/support/sign_in_helper.rb
module SignInHelper
  def sign_in(user)
    session = user.identity.sessions.create!
    cookies.signed[:session_id] = session.id
  end
end
```

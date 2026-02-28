# Gems - DHH Rails 风格

<what_they_use>
## 37signals 使用什么

**核心 Rails 栈:**
- turbo-rails、stimulus-rails、importmap-rails
- propshaft(资产管道)

**数据库支持的服务(Solid 套件):**
- solid_queue - 后台作业
- solid_cache - 缓存
- solid_cable - WebSockets/Action Cable

**身份验证和安全:**
- bcrypt(用于任何需要的密码哈希)

**他们自己的 gems:**
- geared_pagination(基于光标的分页)
- lexxy(富文本编辑器)
- mittens(邮件程序工具)

**工具:**
- rqrcode(QR 码生成)
- redcarpet + rouge(Markdown 渲染)
- web-push(推送通知)

**部署和运维:**
- kamal(Docker 部署)
- thruster(HTTP/2 代理)
- mission_control-jobs(作业监控)
- autotuner(GC 调优)
</what_they_use>

<what_they_avoid>
## 他们有意避免什么

**身份验证:**
```
devise → 自定义约 150 行身份验证
```
原因: 完全控制,使用魔法链接无密码责任,更简单。

**授权:**
```
pundit/cancancan → 模型中的简单角色检查
```
原因: 大多数应用不需要策略对象。模型上的方法就足够了:
```ruby
class Board < ApplicationRecord
  def editable_by?(user)
    user.admin? || user == creator
  end
end
```

**后台作业:**
```
sidekiq → Solid Queue
```
原因: 数据库支持意味着无 Redis,相同的事务保证。

**缓存:**
```
redis → Solid Cache
```
原因: 数据库已经存在,更简单的基础设施。

**搜索:**
```
elasticsearch → 自定义分片搜索
```
原因: 精确构建他们需要的,无外部服务依赖。

**视图层:**
```
view_component → 标准部分
```
原因: 部分工作正常。ViewComponents 为他们的用例增加了复杂性而没有明显好处。

**API:**
```
GraphQL → 使用 Turbo 的 REST
```
原因: 当你控制两端时,REST 就足够了。GraphQL 复杂性不合理。

**Factories:**
```
factory_bot → Fixtures
```
原因: Fixtures 更简单、更快,鼓励提前思考数据关系。

**服务对象:**
```
Interactor、Trailblazer → 胖模型
```
原因: 业务逻辑保留在模型中。方法如 `card.close` 而非 `CardCloser.call(card)`。

**表单对象:**
```
Reform、dry-validation → params.expect + 模型验证
```
原因: Rails 7.1 的 `params.expect` 足够干净。模型上的上下文验证。

**装饰器:**
```
Draper → 视图辅助方法 + 部分
```
原因: 辅助方法和部分更简单。无装饰器间接层。

**CSS:**
```
Tailwind、Sass → 原生 CSS
```
原因: 现代 CSS 有嵌套、变量、层级。无需构建步骤。

**前端:**
```
React、Vue、SPAs → Turbo + Stimulus
```
原因: 服务器渲染的 HTML 加上 JS 点缀。SPA 复杂性不合理。

**测试:**
```
RSpec → Minitest
```
原因: 更简单、启动更快、更少 DSL 魔法、随 Rails 提供。
</what_they_avoid>

<testing_philosophy>
## 测试哲学

**Minitest** - 更简单、更快:
```ruby
class CardTest < ActiveSupport::TestCase
  test "关闭会创建关闭记录" do
    card = cards(:one)
    assert_difference -> { Card::Closure.count } do
      card.close
    end
    assert card.closed?
  end
end
```

**Fixtures** - 加载一次、确定性:
```yaml
# test/fixtures/cards.yml
open_card:
  title: Open Card
  board: main
  creator: alice

closed_card:
  title: Closed Card
  board: main
  creator: bob
```

**使用 ERB 的动态时间戳:**
```yaml
recent:
  title: Recent
  created_at: <%= 1.hour.ago %>

old:
  title: Old
  created_at: <%= 1.month.ago %>
```

**时间旅行** 用于时间相关测试:
```ruby
test "15 分钟后过期" do
  magic_link = MagicLink.create!(user: users(:alice))

  travel 16.minutes

  assert magic_link.expired?
end
```

**用于外部 API 的 VCR:**
```ruby
VCR.use_cassette("stripe/charge") do
  charge = Stripe::Charge.create(amount: 1000)
  assert charge.paid
end
```

**测试与功能一起发布** - 同一提交,不是之前或之后。
</testing_philosophy>

<decision_framework>
## 决策框架

在添加 gem 之前,询问:

1. **原生 Rails 能做到吗?**
   - ActiveRecord 能做 Sequel 能做的大多数事情
   - ActionMailer 处理邮件正常
   - ActiveJob 适用于大多数作业需求

2. **复杂性值得吗?**
   - 150 行自定义代码 vs 10,000 行 gem
   - 你会更了解你的代码
   - 更少的升级头痛

3. **它会添加基础设施吗?**
   - Redis? 考虑数据库支持的替代方案
   - 外部服务? 考虑内部构建
   - 更简单的基础设施 = 更少的故障模式

4. **它来自你信任的人吗?**
   - 37signals gems: 在大规模下经过实战测试
   - 维护良好的专注 gems: 通常没问题
   - 瑞士军刀 gems: 可能过度

**哲学:**
> "在寻找 gems 之前构建解决方案。"

不是反 gem,而是支持理解。当它们真正解决你有的问题时使用 gems,而不是你可能有的问题。
</decision_framework>

<gem_patterns>
## Gem 使用模式

**分页:**
```ruby
# geared_pagination - 基于光标
class CardsController < ApplicationController
  def index
    @cards = @board.cards.geared(page: params[:page])
  end
end
```

**Markdown:**
```ruby
# redcarpet + rouge
class MarkdownRenderer
  def self.render(text)
    Redcarpet::Markdown.new(
      Redcarpet::Render::HTML.new(filter_html: true),
      autolink: true,
      fenced_code_blocks: true
    ).render(text)
  end
end
```

**后台作业:**
```ruby
# solid_queue - 无 Redis
class ApplicationJob < ActiveJob::Base
  queue_as :default
  # 就这样,由数据库支持
end
```

**缓存:**
```ruby
# solid_cache - 无 Redis
# config/environments/production.rb
config.cache_store = :solid_cache_store
```
</gem_patterns>

# 架构 - DHH Rails 风格

<routing>
## 路由

一切映射到 CRUD。嵌套资源用于相关操作:

```ruby
Rails.application.routes.draw do
  resources :boards do
    resources :cards do
      resource :closure
      resource :goldness
      resource :not_now
      resources :assignments
      resources :comments
    end
  end
end
```

**动词到名词的转换:**
| 操作 | 资源 |
|--------|----------|
| 关闭卡片 | `card.closure` |
| 关注看板 | `board.watching` |
| 标记为重要 | `card.goldness` |
| 归档卡片 | `card.archival` |

**浅层嵌套** - 避免深层 URL:
```ruby
resources :boards do
  resources :cards, shallow: true  # /boards/:id/cards,但 /cards/:id
end
```

**单数资源** 用于每个父级一个:
```ruby
resource :closure   # 不是 resources
resource :goldness
```

**使用 resolve 进行 URL 生成:**
```ruby
# config/routes.rb
resolve("Comment") { |comment| [comment.card, anchor: dom_id(comment)] }

# 现在 url_for(@comment) 正常工作
```
</routing>

<multi_tenancy>
## 多租户(基于路径)

**中间件从 URL 前缀提取租户:**

```ruby
# lib/tenant_extractor.rb
class TenantExtractor
  def initialize(app)
    @app = app
  end

  def call(env)
    path = env["PATH_INFO"]
    if match = path.match(%r{^/(\d+)(/.*)?$})
      env["SCRIPT_NAME"] = "/#{match[1]}"
      env["PATH_INFO"] = match[2] || "/"
    end
    @app.call(env)
  end
end
```

**每个租户的 Cookie 作用域:**
```ruby
# Cookie 限定在租户路径
cookies.signed[:session_id] = {
  value: session.id,
  path: "/#{Current.account.id}"
}
```

**后台作业上下文** - 序列化租户:
```ruby
class ApplicationJob < ActiveJob::Base
  around_perform do |job, block|
    Current.set(account: job.arguments.first.account) { block.call }
  end
end
```

**定期作业** 必须遍历所有租户:
```ruby
class DailyDigestJob < ApplicationJob
  def perform
    Account.find_each do |account|
      Current.set(account: account) do
        send_digest_for(account)
      end
    end
  end
end
```

**控制器安全** - 始终通过租户限定作用域:
```ruby
# 好 - 通过用户可访问的记录限定作用域
@card = Current.user.accessible_cards.find(params[:id])

# 避免 - 直接查找
@card = Card.find(params[:id])
```
</multi_tenancy>

<authentication>
## 身份验证

自定义无密码魔法链接身份验证(约 150 行):

```ruby
# app/models/session.rb
class Session < ApplicationRecord
  belongs_to :user

  before_create { self.token = SecureRandom.urlsafe_base64(32) }
end

# app/models/magic_link.rb
class MagicLink < ApplicationRecord
  belongs_to :user

  before_create do
    self.code = SecureRandom.random_number(100_000..999_999).to_s
    self.expires_at = 15.minutes.from_now
  end

  def expired?
    expires_at < Time.current
  end
end
```

**为什么不使用 Devise:**
- 约 150 行 vs 庞大的依赖
- 无密码存储责任
- 更简单的用户体验
- 完全控制流程

**API 的 Bearer token:**
```ruby
module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :authenticate
  end

  private
    def authenticate
      if bearer_token = request.headers["Authorization"]&.split(" ")&.last
        Current.session = Session.find_by(token: bearer_token)
      else
        Current.session = Session.find_by(id: cookies.signed[:session_id])
      end

      redirect_to login_path unless Current.session
    end
end
```
</authentication>

<background_jobs>
## 后台作业

作业是调用模型方法的浅层包装器:

```ruby
class NotifyWatchersJob < ApplicationJob
  def perform(card)
    card.notify_watchers
  end
end
```

**命名约定:**
- `_later` 后缀表示异步: `card.notify_watchers_later`
- `_now` 后缀表示立即: `card.notify_watchers_now`

```ruby
module Watchable
  def notify_watchers_later
    NotifyWatchersJob.perform_later(self)
  end

  def notify_watchers_now
    NotifyWatchersJob.perform_now(self)
  end

  def notify_watchers
    watchers.each do |watcher|
      WatcherMailer.notification(watcher, self).deliver_later
    end
  end
end
```

**数据库支持** 使用 Solid Queue:
- 无需 Redis
- 与数据具有相同的事务保证
- 更简单的基础设施

**事务安全:**
```ruby
# config/application.rb
config.active_job.enqueue_after_transaction_commit = true
```

**按类型错误处理:**
```ruby
class DeliveryJob < ApplicationJob
  # 瞬态错误 - 指数退避重试
  retry_on Net::OpenTimeout, Net::ReadTimeout,
           Resolv::ResolvError,
           wait: :polynomially_longer

  # 永久错误 - 记录并丢弃
  discard_on Net::SMTPSyntaxError do |job, error|
    Sentry.capture_exception(error, level: :info)
  end
end
```

**可继续的批处理:**
```ruby
class ProcessCardsJob < ApplicationJob
  include ActiveJob::Continuable

  def perform
    Card.in_batches.each_record do |card|
      checkpoint!  # 如果中断,从此处恢复
      process(card)
    end
  end
end
```
</background_jobs>

<database_patterns>
## 数据库模式

**UUID 作为主键** (可按时间排序的 UUIDv7):
```ruby
# migration
create_table :cards, id: :uuid do |t|
  t.references :board, type: :uuid, foreign_key: true
end
```

优势: 无 ID 枚举、分布式友好、客户端生成。

**状态作为记录** (而非布尔值):
```ruby
# 而不是 closed: boolean
class Card::Closure < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end

# 查询变为连接
Card.joins(:closure)          # 已关闭
Card.where.missing(:closure)  # 打开
```

**硬删除** - 无软删除:
```ruby
# 只需销毁
card.destroy!

# 使用事件记录历史
card.record_event(:deleted, by: Current.user)
```

简化查询,使用事件日志进行审计。

**计数器缓存** 提高性能:
```ruby
class Comment < ApplicationRecord
  belongs_to :card, counter_cache: true
end

# card.comments_count 无需查询即可用
```

**每个表的账户作用域:**
```ruby
class Card < ApplicationRecord
  belongs_to :account
  default_scope { where(account: Current.account) }
end
```
</database_patterns>

<current_attributes>
## Current 属性

使用 `Current` 进行请求作用域状态:

```ruby
# app/models/current.rb
class Current < ActiveSupport::CurrentAttributes
  attribute :session, :user, :account, :request_id

  delegate :user, to: :session, allow_nil: true

  def account=(account)
    super
    Time.zone = account&.time_zone || "UTC"
  end
end
```

在控制器中设置:
```ruby
class ApplicationController < ActionController::Base
  before_action :set_current_request

  private
    def set_current_request
      Current.session = authenticated_session
      Current.account = Account.find(params[:account_id])
      Current.request_id = request.request_id
    end
end
```

在整个应用中使用:
```ruby
class Card < ApplicationRecord
  belongs_to :creator, default: -> { Current.user }
end
```
</current_attributes>

<caching>
## 缓存

**使用 ETags 的 HTTP 缓存:**
```ruby
fresh_when etag: [@card, Current.user.timezone]
```

**片段缓存:**
```erb
<% cache card do %>
  <%= render card %>
<% end %>
```

**俄罗斯套娃缓存:**
```erb
<% cache @board do %>
  <% @board.cards.each do |card| %>
    <% cache card do %>
      <%= render card %>
    <% end %>
  <% end %>
<% end %>
```

**通过 `touch: true` 缓存失效:**
```ruby
class Card < ApplicationRecord
  belongs_to :board, touch: true
end
```

**Solid Cache** - 数据库支持:
- 无需 Redis
- 与应用数据一致
- 更简单的基础设施
</caching>

<configuration>
## 配置

**ENV.fetch 带默认值:**
```ruby
# config/application.rb
config.active_job.queue_adapter = ENV.fetch("QUEUE_ADAPTER", "solid_queue").to_sym
config.cache_store = ENV.fetch("CACHE_STORE", "solid_cache").to_sym
```

**多数据库:**
```yaml
# config/database.yml
production:
  primary:
    <<: *default
  cable:
    <<: *default
    migrations_paths: db/cable_migrate
  queue:
    <<: *default
    migrations_paths: db/queue_migrate
  cache:
    <<: *default
    migrations_paths: db/cache_migrate
```

**通过 ENV 在 SQLite 和 MySQL 之间切换:**
```ruby
adapter = ENV.fetch("DATABASE_ADAPTER", "sqlite3")
```

**通过 ENV 可扩展的 CSP:**
```ruby
config.content_security_policy do |policy|
  policy.default_src :self
  policy.script_src :self, *ENV.fetch("CSP_SCRIPT_SRC", "").split(",")
end
```
</configuration>

<testing>
## 测试

**Minitest**,而非 RSpec:
```ruby
class CardTest < ActiveSupport::TestCase
  test "关闭卡片会创建关闭记录" do
    card = cards(:one)

    card.close

    assert card.closed?
    assert_not_nil card.closure
  end
end
```

**Fixtures** 而非 factories:
```yaml
# test/fixtures/cards.yml
one:
  title: First Card
  board: main
  creator: alice

two:
  title: Second Card
  board: main
  creator: bob
```

**控制器的集成测试:**
```ruby
class CardsControllerTest < ActionDispatch::IntegrationTest
  test "关闭卡片" do
    card = cards(:one)
    sign_in users(:alice)

    post card_closure_path(card)

    assert_response :success
    assert card.reload.closed?
  end
end
```

**测试与功能一起发布** - 同一提交,不是 TDD 优先而是一起。

**安全修复的回归测试** - 始终需要。
</testing>

<events>
## 事件跟踪

事件是单一事实来源:

```ruby
class Event < ApplicationRecord
  belongs_to :creator, class_name: "User"
  belongs_to :eventable, polymorphic: true

  serialize :particulars, coder: JSON
end
```

**Eventable concern:**
```ruby
module Eventable
  extend ActiveSupport::Concern

  included do
    has_many :events, as: :eventable, dependent: :destroy
  end

  def record_event(action, particulars = {})
    events.create!(
      creator: Current.user,
      action: action,
      particulars: particulars
    )
  end
end
```

**事件驱动的 webhook** - 事件是规范来源。
</events>

<email_patterns>
## 邮件模式

**多租户 URL 辅助方法:**
```ruby
class ApplicationMailer < ActionMailer::Base
  def default_url_options
    options = super
    if Current.account
      options[:script_name] = "/#{Current.account.id}"
    end
    options
  end
end
```

**时区感知投递:**
```ruby
class NotificationMailer < ApplicationMailer
  def daily_digest(user)
    Time.use_zone(user.timezone) do
      @user = user
      @digest = user.digest_for_today
      mail(to: user.email, subject: "Daily Digest")
    end
  end
end
```

**批量投递:**
```ruby
emails = users.map { |user| NotificationMailer.digest(user) }
ActiveJob.perform_all_later(emails.map(&:deliver_later))
```

**一键取消订阅(RFC 8058):**
```ruby
class ApplicationMailer < ActionMailer::Base
  after_action :set_unsubscribe_headers

  private
    def set_unsubscribe_headers
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
      headers["List-Unsubscribe"] = "<#{unsubscribe_url}>"
    end
end
```
</email_patterns>

<security_patterns>
## 安全模式

**XSS 预防** - 在辅助方法中转义:
```ruby
def formatted_content(text)
  # 先转义,再标记为安全
  simple_format(h(text)).html_safe
end
```

**SSRF 保护:**
```ruby
# 解析 DNS 一次,固定 IP
def fetch_safely(url)
  uri = URI.parse(url)
  ip = Resolv.getaddress(uri.host)

  # 阻止私有网络
  raise "Private IP" if private_ip?(ip)

  # 使用固定的 IP 发出请求
  Net::HTTP.start(uri.host, uri.port, ipaddr: ip) { |http| ... }
end

def private_ip?(ip)
  ip.start_with?("127.", "10.", "192.168.") ||
    ip.match?(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
end
```

**内容安全策略:**
```ruby
# config/initializers/content_security_policy.rb
Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self
    policy.script_src :self
    policy.style_src :self, :unsafe_inline
    policy.base_uri :none
    policy.form_action :self
    policy.frame_ancestors :self
  end
end
```

**ActionText 清理:**
```ruby
# config/initializers/action_text.rb
Rails.application.config.after_initialize do
  ActionText::ContentHelper.allowed_tags = %w[
    strong em a ul ol li p br h1 h2 h3 h4 blockquote
  ]
end
```
</security_patterns>

<active_storage>
## Active Storage 模式

**变体预处理:**
```ruby
class User < ApplicationRecord
  has_one_attached :avatar do |attachable|
    attachable.variant :thumb, resize_to_limit: [100, 100], preprocessed: true
    attachable.variant :medium, resize_to_limit: [300, 300], preprocessed: true
  end
end
```

**直接上传过期** - 为慢速连接延长:
```ruby
# config/initializers/active_storage.rb
Rails.application.config.active_storage.service_urls_expire_in = 48.hours
```

**头像优化** - 重定向到 blob:
```ruby
def show
  expires_in 1.year, public: true
  redirect_to @user.avatar.variant(:thumb).processed.url, allow_other_host: true
end
```

**镜像服务** 用于迁移:
```yaml
# config/storage.yml
production:
  service: Mirror
  primary: amazon
  mirrors: [google]
```
</active_storage>

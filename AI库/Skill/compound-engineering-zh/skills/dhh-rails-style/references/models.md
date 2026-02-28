# 模型 - DHH Rails 风格

<model_concerns>
## 水平行为的 Concerns

模型大量使用 concerns。典型的 Card 模型包含 14+ concerns:

```ruby
class Card < ApplicationRecord
  include Assignable
  include Attachments
  include Broadcastable
  include Closeable
  include Colored
  include Eventable
  include Golden
  include Mentions
  include Multistep
  include Pinnable
  include Postponable
  include Readable
  include Searchable
  include Taggable
  include Watchable
end
```

每个 concern 是自包含的,具有关联、作用域和方法。

**命名:** 描述能力的形容词(`Closeable`、`Publishable`、`Watchable`)
</model_concerns>

<state_records>
## 状态作为记录,而非布尔值

创建单独记录而非布尔列:

```ruby
# 而不是:
closed: boolean
is_golden: boolean
postponed: boolean

# 创建记录:
class Card::Closure < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end

class Card::Goldness < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end

class Card::NotNow < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end
```

**优势:**
- 自动时间戳(何时发生)
- 跟踪谁做的更改
- 通过连接和 `where.missing` 轻松过滤
- 启用显示何时/谁的丰富 UI

**在模型中:**
```ruby
module Closeable
  extend ActiveSupport::Concern

  included do
    has_one :closure, dependent: :destroy
  end

  def closed?
    closure.present?
  end

  def close(creator: Current.user)
    create_closure!(creator: creator)
  end

  def reopen
    closure&.destroy
  end
end
```

**查询:**
```ruby
Card.joins(:closure)         # 已关闭的卡片
Card.where.missing(:closure) # 打开的卡片
```
</state_records>

<callbacks>
## 回调 - 谨慎使用

Fizzy 中 30 个文件中仅 38 个回调出现。指南:

**用于:**
- `after_commit` 用于异步工作
- `before_save` 用于派生数据
- `after_create_commit` 用于副作用

**避免:**
- 复杂的回调链
- 回调中的业务逻辑
- 同步外部调用

```ruby
class Card < ApplicationRecord
  after_create_commit :notify_watchers_later
  before_save :update_search_index, if: :title_changed?

  private
    def notify_watchers_later
      NotifyWatchersJob.perform_later(self)
    end
end
```
</callbacks>

<scopes>
## 作用域命名

标准作用域名称:

```ruby
class Card < ApplicationRecord
  scope :chronologically, -> { order(created_at: :asc) }
  scope :reverse_chronologically, -> { order(created_at: :desc) }
  scope :alphabetically, -> { order(title: :asc) }
  scope :latest, -> { reverse_chronologically.limit(10) }

  # 标准预加载
  scope :preloaded, -> { includes(:creator, :assignees, :tags) }

  # 参数化
  scope :indexed_by, ->(column) { order(column => :asc) }
  scope :sorted_by, ->(column, direction = :asc) { order(column => direction) }
end
```
</scopes>

<poros>
## 普通 Ruby 对象

在父模型下命名的 POROs:

```ruby
# app/models/event/description.rb
class Event::Description
  def initialize(event)
    @event = event
  end

  def to_s
    # 事件描述的呈现逻辑
  end
end

# app/models/card/eventable/system_commenter.rb
class Card::Eventable::SystemCommenter
  def initialize(card)
    @card = card
  end

  def comment(message)
    # 业务逻辑
  end
end

# app/models/user/filtering.rb
class User::Filtering
  # 视图上下文绑定
end
```

**不用于服务对象。** 业务逻辑保留在模型中。
</poros>

<verbs_predicates>
## 方法命名

**动词** - 改变状态的操作:
```ruby
card.close
card.reopen
card.gild      # 使成为重要
card.ungild
board.publish
board.archive
```

**谓词** - 从状态派生的查询:
```ruby
card.closed?    # closure.present?
card.golden?    # goldness.present?
board.published?
```

**避免** 通用 setter:
```ruby
# 坏
card.set_closed(true)
card.update_golden_status(false)

# 好
card.close
card.ungild
```
</verbs_predicates>

<validation_philosophy>
## 验证哲学

模型上的最小验证。在表单/操作对象上使用上下文验证:

```ruby
# 模型 - 最小
class User < ApplicationRecord
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
end

# 表单对象 - 上下文
class Signup
  include ActiveModel::Model

  attr_accessor :email, :name, :terms_accepted

  validates :email, :name, presence: true
  validates :terms_accepted, acceptance: true

  def save
    return false unless valid?
    User.create!(email: email, name: name)
  end
end
```

**优先使用数据库约束** 而非模型验证以确保数据完整性:
```ruby
# migration
add_index :users, :email, unique: true
add_foreign_key :cards, :boards
```
</validation_philosophy>

<error_handling>
## 让它崩溃哲学

使用在失败时引发异常的 bang 方法:

```ruby
# 首选 - 失败时引发
@card = Card.create!(card_params)
@card.update!(title: new_title)
@comment.destroy!

# 避免 - 静默失败
@card = Card.create(card_params)  # 失败时返回 false
if @card.save
  # ...
end
```

让错误自然传播。Rails 使用 422 响应处理 ActiveRecord::RecordInvalid。
</error_handling>

<default_values>
## 使用 Lambda 的默认值

为与 Current 的关联使用 lambda 默认值:

```ruby
class Card < ApplicationRecord
  belongs_to :creator, class_name: "User", default: -> { Current.user }
  belongs_to :account, default: -> { Current.account }
end

class Comment < ApplicationRecord
  belongs_to :commenter, class_name: "User", default: -> { Current.user }
end
```

Lambda 确保在创建时动态解析。
</default_values>

<rails_71_patterns>
## Rails 7.1+ 模型模式

**Normalizes** - 在验证前清理数据:
```ruby
class User < ApplicationRecord
  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :phone, with: ->(phone) { phone.gsub(/\D/, "") }
end
```

**Delegated Types** - 替换多态关联:
```ruby
class Message < ApplicationRecord
  delegated_type :messageable, types: %w[Comment Reply Announcement]
end

# 现在你获得:
message.comment?        # 如果是 Comment 则为 true
message.comment         # 返回 Comment
Message.comments        # Comment 消息的作用域
```

**Store Accessor** - 结构化 JSON 存储:
```ruby
class User < ApplicationRecord
  store :settings, accessors: [:theme, :notifications_enabled], coder: JSON
end

user.theme = "dark"
user.notifications_enabled = true
```
</rails_71_patterns>

<concern_guidelines>
## Concern 指南

- **每 concern 50-150 行** (大多数约 100)
- **内聚** - 仅相关功能
- **以能力命名** - `Closeable`、`Watchable`,而非 `CardHelpers`
- **自包含** - 关联、作用域、方法在一起
- **非仅为组织** - 在真正需要重用时创建

**Touch 链** 用于缓存失效:
```ruby
class Comment < ApplicationRecord
  belongs_to :card, touch: true
end

class Card < ApplicationRecord
  belongs_to :board, touch: true
end
```

当评论更新时,card 的 `updated_at` 改变,级联到 board。

**事务包装** 用于相关更新:
```ruby
class Card < ApplicationRecord
  def close(creator: Current.user)
    transaction do
      create_closure!(creator: creator)
      record_event(:closed)
      notify_watchers_later
    end
  end
end
```
</concern_guidelines>

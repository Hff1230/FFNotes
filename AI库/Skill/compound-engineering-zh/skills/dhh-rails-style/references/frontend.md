# 前端 - DHH Rails 风格

<turbo_patterns>
## Turbo 模式

**Turbo Streams** 用于部分更新:
```erb
<%# app/views/cards/closures/create.turbo_stream.erb %>
<%= turbo_stream.replace @card %>
```

**Morphing** 用于复杂更新:
```ruby
render turbo_stream: turbo_stream.morph(@card)
```

**全局 morphing** - 在布局中启用:
```ruby
turbo_refreshes_with method: :morph, scroll: :preserve
```

**片段缓存** 带 `cached: true`:
```erb
<%= render partial: "card", collection: @cards, cached: true %>
```

**不使用 ViewComponents** - 标准部分工作正常。
</turbo_patterns>

<turbo_morphing>
## Turbo Morphing 最佳实践

**监听 morph 事件** 以恢复客户端状态:
```javascript
document.addEventListener("turbo:morph-element", (event) => {
  // 在 morph 后恢复任何客户端状态
})
```

**永久元素** - 使用 data 属性跳过 morphing:
```erb
<div data-turbo-permanent id="notification-count">
  <%= @count %>
</div>
```

**Frame morphing** - 添加 refresh 属性:
```erb
<%= turbo_frame_tag :assignment, src: path, refresh: :morph %>
```

**常见问题和解决方案:**

| 问题 | 解决方案 |
|---------|----------|
| 计时器不更新 | 在 morph 事件监听器中清除/重启 |
| 表单重置 | 将表单部分包装在 turbo frames 中 |
| 分页中断 | 使用带 `refresh: :morph` 的 turbo frames |
| 替换时闪烁 | 切换到 morph 而非 replace |
| localStorage 丢失 | 监听 `turbo:morph-element`,恢复状态 |
</turbo_morphing>

<turbo_frames>
## Turbo Frames

**带加载器的延迟加载:**
```erb
<%= turbo_frame_tag "menu",
      src: menu_path,
      loading: :lazy do %>
  <div class="spinner">Loading...</div>
<% end %>
```

**带编辑/查看切换的内联编辑:**
```erb
<%= turbo_frame_tag dom_id(card, :edit) do %>
  <%= link_to "Edit", edit_card_path(card),
        data: { turbo_frame: dom_id(card, :edit) } %>
<% end %>
```

**定位父 frame** 而无需硬编码:
```erb
<%= form_with model: @card, data: { turbo_frame: "_parent" } do |f| %>
```

**实时订阅:**
```erb
<%= turbo_stream_from @card %>
<%= turbo_stream_from @card, :activity %>
```
</turbo_frames>

<stimulus_controllers>
## Stimulus 控制器

Fizzy 中有 52 个控制器,分为 62% 可重用,38% 特定领域。

**特征:**
- 每个控制器单一职责
- 通过 values/classes 配置
- 通过事件通信
- 使用 # 的私有方法
- 大多在 50 行以下

**示例:**

```javascript
// copy-to-clipboard (25 行)
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { content: String }

  copy() {
    navigator.clipboard.writeText(this.contentValue)
    this.#showFeedback()
  }

  #showFeedback() {
    this.element.classList.add("copied")
    setTimeout(() => this.element.classList.remove("copied"), 1500)
  }
}
```

```javascript
// auto-click (7 行)
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.click()
  }
}
```

```javascript
// toggle-class (31 行)
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static classes = ["toggle"]
  static values = { open: { type: Boolean, default: false } }

  toggle() {
    this.openValue = !this.openValue
  }

  openValueChanged() {
    this.element.classList.toggle(this.toggleClass, this.openValue)
  }
}
```

```javascript
// auto-submit (28 行) - 防抖表单提交
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { delay: { type: Number, default: 300 } }

  connect() {
    this.timeout = null
  }

  submit() {
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.element.requestSubmit()
    }, this.delayValue)
  }

  disconnect() {
    clearTimeout(this.timeout)
  }
}
```

```javascript
// dialog (45 行) - 原生 HTML dialog 管理
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  open() {
    this.element.showModal()
  }

  close() {
    this.element.close()
    this.dispatch("closed")
  }

  clickOutside(event) {
    if (event.target === this.element) this.close()
  }
}
```

```javascript
// local-time (40 行) - 相对时间显示
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { datetime: String }

  connect() {
    this.#updateTime()
  }

  #updateTime() {
    const date = new Date(this.datetimeValue)
    const now = new Date()
    const diffMinutes = Math.floor((now - date) / 60000)

    if (diffMinutes < 60) {
      this.element.textContent = `${diffMinutes}m ago`
    } else if (diffMinutes < 1440) {
      this.element.textContent = `${Math.floor(diffMinutes / 60)}h ago`
    } else {
      this.element.textContent = `${Math.floor(diffMinutes / 1440)}d ago`
    }
  }
}
```
</stimulus_controllers>

<stimulus_best_practices>
## Stimulus 最佳实践

**Values API 优于 getAttribute:**
```javascript
// 好
static values = { delay: { type: Number, default: 300 } }

// 避免
this.element.getAttribute("data-delay")
```

**在 disconnect 中清理:**
```javascript
disconnect() {
  clearTimeout(this.timeout)
  this.observer?.disconnect()
  document.removeEventListener("keydown", this.boundHandler)
}
```

**操作过滤器** - `:self` 防止冒泡:
```erb
<div data-action="click->menu#toggle:self">
```

**辅助方法提取** - 在单独模块中共享工具:
```javascript
// app/javascript/helpers/timing.js
export function debounce(fn, delay) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
```

**事件分发** 用于松耦合:
```javascript
this.dispatch("selected", { detail: { id: this.idValue } })
```
</stimulus_best_practices>

<view_helpers>
## 视图辅助方法(Stimulus 集成)

**Dialog 辅助方法:**
```ruby
def dialog_tag(id, &block)
  tag.dialog(
    id: id,
    data: {
      controller: "dialog",
      action: "click->dialog#clickOutside keydown.esc->dialog#close"
    },
    &block
  )
end
```

**自动提交表单辅助方法:**
```ruby
def auto_submit_form_with(model:, delay: 300, **options, &block)
  form_with(
    model: model,
    data: {
      controller: "auto-submit",
      auto_submit_delay_value: delay,
      action: "input->auto-submit#submit"
    },
    **options,
    &block
  )
end
```

**复制按钮辅助方法:**
```ruby
def copy_button(content:, label: "Copy")
  tag.button(
    label,
    data: {
      controller: "copy",
      copy_content_value: content,
      action: "click->copy#copy"
    }
  )
end
```
</view_helpers>

<css_architecture>
## CSS 架构

使用现代功能的原生 CSS,无预处理器。

**CSS @layer** 用于级联控制:
```css
@layer reset, base, components, modules, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

@layer base {
  body { font-family: var(--font-sans); }
}

@layer components {
  .btn { /* 按钮样式 */ }
}

@layer modules {
  .card { /* 卡片模块样式 */ }
}

@layer utilities {
  .hidden { display: none; }
}
```

**OKLCH 颜色系统** 用于感知均匀性:
```css
:root {
  --color-primary: oklch(60% 0.15 250);
  --color-success: oklch(65% 0.2 145);
  --color-warning: oklch(75% 0.15 85);
  --color-danger: oklch(55% 0.2 25);
}
```

**通过 CSS 变量的深色模式:**
```css
:root {
  --bg: oklch(98% 0 0);
  --text: oklch(20% 0 0);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: oklch(15% 0 0);
    --text: oklch(90% 0 0);
  }
}
```

**原生 CSS 嵌套:**
```css
.card {
  padding: var(--space-4);

  & .title {
    font-weight: bold;
  }

  &:hover {
    background: var(--bg-hover);
  }
}
```

**约 60 个最小工具类** vs Tailwind 的数百个。

**使用的现代功能:**
- `@starting-style` 用于进入动画
- `color-mix()` 用于颜色操作
- `:has()` 用于父选择
- 逻辑属性(`margin-inline`、`padding-block`)
- 容器查询
</css_architecture>

<view_patterns>
## 视图模式

**标准部分** - 无 ViewComponents:
```erb
<%# app/views/cards/_card.html.erb %>
<article id="<%= dom_id(card) %>" class="card">
  <%= render "cards/header", card: card %>
  <%= render "cards/body", card: card %>
  <%= render "cards/footer", card: card %>
</article>
```

**片段缓存:**
```erb
<% cache card do %>
  <%= render "cards/card", card: card %>
<% end %>
```

**集合缓存:**
```erb
<%= render partial: "card", collection: @cards, cached: true %>
```

**简单组件命名** - 无严格 BEM:
```css
.card { }
.card .title { }
.card .actions { }
.card.golden { }
.card.closed { }
```
</view_patterns>

<caching_with_personalization>
## 缓存中的用户特定内容

将个性化移至客户端 JavaScript 以保留缓存:

```erb
<%# 可缓存片段 %>
<% cache card do %>
  <article class="card"
           data-creator-id="<%= card.creator_id %>"
           data-controller="ownership"
           data-ownership-current-user-value="<%= Current.user.id %>">
    <button data-ownership-target="ownerOnly" class="hidden">Delete</button>
  </article>
<% end %>
```

```javascript
// 在缓存命中后显示用户特定元素
export default class extends Controller {
  static values = { currentUser: Number }
  static targets = ["ownerOnly"]

  connect() {
    const creatorId = parseInt(this.element.dataset.creatorId)
    if (creatorId === this.currentUserValue) {
      this.ownerOnlyTargets.forEach(el => el.classList.remove("hidden"))
    }
  }
}
```

**提取动态内容** 到单独的 frames:
```erb
<% cache [card, board] do %>
  <article class="card">
    <%= turbo_frame_tag card, :assignment,
          src: card_assignment_path(card),
          refresh: :morph %>
  </article>
<% end %>
```

分配下拉框独立更新而不使父缓存失效。
</caching_with_personalization>

<broadcasting>
## 使用 Turbo Streams 广播

**模型回调** 用于实时更新:
```ruby
class Card < ApplicationRecord
  include Broadcastable

  after_create_commit :broadcast_created
  after_update_commit :broadcast_updated
  after_destroy_commit :broadcast_removed

  private
    def broadcast_created
      broadcast_append_to [Current.account, board], :cards
    end

    def broadcast_updated
      broadcast_replace_to [Current.account, board], :cards
    end

    def broadcast_removed
      broadcast_remove_to [Current.account, board], :cards
    end
end
```

**使用 `[Current.account, resource]` 模式按租户限定作用域。**
</broadcasting>

# Andrew Kane 资源

## 主要文档

- **Gem 模式文章**: https://ankane.org/gem-patterns
  - Kane 对其 gem 中使用模式的文档
  - 涵盖配置、Rails 集成、错误处理

## 按星标排名的热门 Ruby Gems

### 搜索和数据

| Gem | 星标 | 描述 | 源码 |
|-----|-------|-------------|--------|
| **Searchkick** | 6.6k+ | Rails 智能搜索 | https://github.com/ankane/searchkick |
| **Chartkick** | 6.4k+ | Ruby 漂亮图表 | https://github.com/ankane/chartkick |
| **Groupdate** | 3.8k+ | 按天、周、月分组 | https://github.com/ankane/groupdate |
| **Blazer** | 4.6k+ | Rails SQL 仪表板 | https://github.com/ankane/blazer |

### 数据库和迁移

| Gem | 星标 | 描述 | 源码 |
|-----|-------|-------------|--------|
| **PgHero** | 8.2k+ | PostgreSQL 洞察 | https://github.com/ankane/pghero |
| **Strong Migrations** | 4.1k+ | 安全迁移检查 | https://github.com/ankane/strong_migrations |
| **Dexter** | 1.8k+ | 自动索引顾问 | https://github.com/ankane/dexter |
| **PgSync** | 1.5k+ | 同步 Postgres 数据 | https://github.com/ankane/pgsync |

### 安全和加密

| Gem | 星标 | 描述 | 源码 |
|-----|-------|-------------|--------|
| **Lockbox** | 1.5k+ | 应用层加密 | https://github.com/ankane/lockbox |
| **Blind Index** | 1.0k+ | 加密搜索 | https://github.com/ankane/blind_index |
| **Secure Headers** | — | 贡献的模式 | 在 gems 中引用 |

### 分析和机器学习

| Gem | 星标 | 描述 | 源码 |
|-----|-------|-------------|--------|
| **Ahoy** | 4.2k+ | Rails 分析 | https://github.com/ankane/ahoy |
| **Neighbor** | 1.1k+ | Rails 向量搜索 | https://github.com/ankane/neighbor |
| **Rover** | 700+ | Ruby 数据帧 | https://github.com/ankane/rover |
| **Tomoto** | 200+ | 主题建模 | https://github.com/ankane/tomoto-ruby |

### 工具

| Gem | 星标 | 描述 | 源码 |
|-----|-------|-------------|--------|
| **Pretender** | 2.0k+ | 以其他用户身份登录 | https://github.com/ankane/pretender |
| **Authtrail** | 900+ | 登录活动跟踪 | https://github.com/ankane/authtrail |
| **Notable** | 200+ | 跟踪重要请求 | https://github.com/ankane/notable |
| **Logstop** | 200+ | 过滤敏感日志 | https://github.com/ankane/logstop |

## 需要学习的关键源文件

### 入口点模式
- https://github.com/ankane/searchkick/blob/master/lib/searchkick.rb
- https://github.com/ankane/pghero/blob/master/lib/pghero.rb
- https://github.com/ankane/strong_migrations/blob/master/lib/strong_migrations.rb
- https://github.com/ankane/lockbox/blob/master/lib/lockbox.rb

### 类宏实现
- https://github.com/ankane/searchkick/blob/master/lib/searchkick/model.rb
- https://github.com/ankane/lockbox/blob/master/lib/lockbox/model.rb
- https://github.com/ankane/neighbor/blob/master/lib/neighbor/model.rb
- https://github.com/ankane/blind_index/blob/master/lib/blind_index/model.rb

### Rails 集成(Railtie/Engine)
- https://github.com/ankane/pghero/blob/master/lib/pghero/engine.rb
- https://github.com/ankane/searchkick/blob/master/lib/searchkick/railtie.rb
- https://github.com/ankane/ahoy/blob/master/lib/ahoy/engine.rb
- https://github.com/ankane/blazer/blob/master/lib/blazer/engine.rb

### 数据库适配器
- https://github.com/ankane/strong_migrations/tree/master/lib/strong_migrations/adapters
- https://github.com/ankane/groupdate/tree/master/lib/groupdate/adapters
- https://github.com/ankane/neighbor/tree/master/lib/neighbor

### 错误消息(模板模式)
- https://github.com/ankane/strong_migrations/blob/master/lib/strong_migrations/error_messages.rb

### Gemspec 示例
- https://github.com/ankane/searchkick/blob/master/searchkick.gemspec
- https://github.com/ankane/neighbor/blob/master/neighbor.gemspec
- https://github.com/ankane/ahoy/blob/master/ahoy_matey.gemspec

### 测试设置
- https://github.com/ankane/searchkick/tree/master/test
- https://github.com/ankane/lockbox/tree/master/test
- https://github.com/ankane/strong_migrations/tree/master/test

## GitHub 个人资料

- **个人资料**: https://github.com/ankane
- **所有 Ruby 仓库**: https://github.com/ankane?tab=repositories&q=&type=&language=ruby&sort=stargazers
- **RubyGems 个人资料**: https://rubygems.org/profiles/ankane

## 博客文章和文章

- **ankane.org**: https://ankane.org/
- **Gem 模式**: https://ankane.org/gem-patterns (必读)
- **Postgres 性能**: https://ankane.org/introducing-pghero
- **搜索技巧**: https://ankane.org/search-rails

## 设计哲学总结

通过研究 100+ gems,Kane 的一致原则:

1. **尽可能零依赖** - 每个依赖都是维护负担
2. **始终使用 ActiveSupport.on_load** - 永远不直接 require Rails gems
3. **类宏 DSL** - 单个方法配置所有内容
4. **显式优于魔法** - 不使用 method_missing,直接定义方法
5. **仅使用 Minitest** - 简单、足够、无需 RSpec
6. **多版本测试** - 支持广泛的 Rails/Ruby 版本
7. **有用的错误** - 基于模板的消息和修复建议
8. **抽象适配器** - 清晰的多数据库支持
9. **Engine 隔离** - 可挂载 gem 使用 isolate_namespace
10. **最小文档** - 代码自文档化,README 提供示例

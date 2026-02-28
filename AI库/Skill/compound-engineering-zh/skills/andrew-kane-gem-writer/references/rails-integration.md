# Rails 集成模式

## 黄金法则

**永远不要直接 require Rails gems。** 这会导致加载顺序问题。

```ruby
# 错误 - 导致过早加载
require "active_record"
ActiveRecord::Base.include(MyGem::Model)

# 正确 - 延迟加载
ActiveSupport.on_load(:active_record) do
  extend MyGem::Model
end
```

## ActiveSupport.on_load 钩子

常用钩子及其用途:

```ruby
# 模型
ActiveSupport.on_load(:active_record) do
  extend GemName::Model        # 添加类方法(searchkick、has_encrypted)
  include GemName::Callbacks   # 添加实例方法
end

# 控制器
ActiveSupport.on_load(:action_controller) do
  include Ahoy::Controller
end

# 作业
ActiveSupport.on_load(:active_job) do
  include GemName::JobExtensions
end

# 邮件程序
ActiveSupport.on_load(:action_mailer) do
  include GemName::MailerExtensions
end
```

## 使用 Prepend 修改行为

覆盖现有 Rails 方法时:

```ruby
ActiveSupport.on_load(:active_record) do
  ActiveRecord::Migration.prepend(StrongMigrations::Migration)
  ActiveRecord::Migrator.prepend(StrongMigrations::Migrator)
end
```

## Railtie 模式

非可挂载 gem 的最小 Railtie:

```ruby
# lib/gemname/railtie.rb
module GemName
  class Railtie < Rails::Railtie
    initializer "gemname.configure" do
      ActiveSupport.on_load(:active_record) do
        extend GemName::Model
      end
    end

    # 可选: 添加到控制器运行时日志
    initializer "gemname.log_runtime" do
      require_relative "controller_runtime"
      ActiveSupport.on_load(:action_controller) do
        include GemName::ControllerRuntime
      end
    end

    # 可选: Rake 任务
    rake_tasks do
      load "tasks/gemname.rake"
    end
  end
end
```

## Engine 模式(可挂载 Gems)

对于具有 Web 界面的 gem(PgHero、Blazer、Ahoy):

```ruby
# lib/pghero/engine.rb
module PgHero
  class Engine < ::Rails::Engine
    isolate_namespace PgHero

    initializer "pghero.assets", group: :all do |app|
      if app.config.respond_to?(:assets) && defined?(Sprockets)
        app.config.assets.precompile << "pghero/application.js"
        app.config.assets.precompile << "pghero/application.css"
      end
    end

    initializer "pghero.config" do
      PgHero.config = Rails.application.config_for(:pghero) rescue {}
    end
  end
end
```

## Engine 的路由

```ruby
# config/routes.rb (在 engine 中)
PgHero::Engine.routes.draw do
  root to: "home#index"
  resources :databases, only: [:show]
end
```

在应用中挂载:

```ruby
# config/routes.rb (在应用中)
mount PgHero::Engine, at: "pghero"
```

## 支持 ERB 的 YAML 配置

对于需要配置文件的复杂 gem:

```ruby
def self.settings
  @settings ||= begin
    path = Rails.root.join("config", "blazer.yml")
    if path.exist?
      YAML.safe_load(ERB.new(File.read(path)).result, aliases: true)
    else
      {}
    end
  end
end
```

## 生成器模式

```ruby
# lib/generators/gemname/install_generator.rb
module GemName
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)

      def copy_initializer
        template "initializer.rb", "config/initializers/gemname.rb"
      end

      def copy_migration
        migration_template "migration.rb", "db/migrate/create_gemname_tables.rb"
      end
    end
  end
end
```

## 条件功能检测

```ruby
# 检查特定 Rails 版本
if ActiveRecord.version >= Gem::Version.new("7.0")
  # Rails 7+ 特定代码
end

# 检查可选依赖
def self.client
  @client ||= if defined?(OpenSearch::Client)
    OpenSearch::Client.new
  elsif defined?(Elasticsearch::Client)
    Elasticsearch::Client.new
  else
    raise Error, "Install elasticsearch or opensearch-ruby"
  end
end
```

---
name: dhh-rails-style
description: 当以 DHH 独特的 37signals 风格编写 Ruby 和 Rails 代码时，应使用此技能。它适用于编写 Ruby 代码、Rails 应用程序、创建模型、控制器或任何 Ruby 文件。在 Ruby/Rails 代码生成、重构请求、代码审查或用户提及 DHH、37signals、Basecamp、HEY 或 Campfire 风格时触发。体现 REST 纯净性、胖模型、瘦控制器、Current 属性、Hotwire 模式和"清晰胜过巧妙"的哲学。
---

<objective>
将 37signals/DHH Rails 约定应用于 Ruby 和 Rails 代码。此技能提供了从分析生产 37signals 代码库（Fizzy/Campfire）和 DHH 的代码审查模式中提取的全面领域专业知识。
</objective>

<essential_principles>
## 核心哲学

"最好的代码是你不写的代码。第二好的是明显正确的代码。"

**Vanilla Rails 就足够了：**
- 丰富的域模型而非服务对象
- CRUD 控制器而非自定义操作
- 用于横向代码共享的 Concerns
- 作为状态的记录而非布尔列
- 数据库支持一切（无 Redis）
- 在使用 gems 之前构建解决方案

**他们故意避免的：**
- devise（自定义约 150 行身份验证）
- pundit/cancancan（模型中的简单角色检查）
- sidekiq（Solid Queue 使用数据库）
- redis（数据库用于一切）
- view_component（partials 工作正常）
- GraphQL（带有 Turbo 的 REST 就足够了）
- factory_bot（fixtures 更简单）
- rspec（Minitest 随 Rails 附带）
- Tailwind（带有层的原生 CSS）

**开发哲学：**
- 发布、验证、改进 - 从原型质量代码到生产以学习
- 修复根本原因，而非症状
- 写时操作优于读时计算
- 数据库约束优于 ActiveRecord 验证
</essential_principles>

<intake>
您正在处理什么？

1. **控制器** - REST 映射、concerns、Turbo 响应、API 模式
2. **模型** - Concerns、状态记录、回调、作用域、PORO
3. **视图和前端** - Turbo、Stimulus、CSS、partials
4. **架构** - 路由、多租户、身份验证、作业、缓存
5. **测试** - Minitest、fixtures、集成测试
6. **Gems 和依赖** - 使用什么 vs 避免
7. **代码审查** - 根据 DHH 风格审查代码
8. **一般指导** - 哲学和约定

**指定一个数字或描述您的任务。**
</intake>

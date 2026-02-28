---
module: [模块名称或 "CORA" 用于系统范围]
date: [YYYY-MM-DD]
problem_type: [build_error|test_failure|runtime_error|performance_issue|database_issue|security_issue|ui_bug|integration_issue|logic_error]
component: [rails_model|rails_controller|rails_view|service_object|background_job|database|frontend_stimulus|hotwire_turbo|email_processing|brief_system|assistant|authentication|payments]
symptoms:
  - [可观察症状 1 - 特定错误消息或行为]
  - [可观察症状 2 - 用户实际看到/经历的内容]
root_cause: [missing_association|missing_include|missing_index|wrong_api|scope_issue|thread_violation|async_timing|memory_leak|config_error|logic_error|test_isolation|missing_validation|missing_permission]
rails_version: [7.1.2 - 可选]
resolution_type: [code_fix|migration|config_change|test_fix|dependency_update|environment_setup]
severity: [critical|high|medium|low]
tags: [关键词1, 关键词2, 关键词3]
---

# 故障排除: [清晰问题标题]

## 问题
[问题的 1-2 句清晰描述和用户的经历]

## 环境
- 模块: [名称或 "CORA 系统"]
- Rails 版本: [例如, 7.1.2]
- 受影响的组件: [例如, "电子邮件处理模型", "简报系统服务", "身份验证控制器"]
- 日期: [解决此问题的日期 YYYY-MM-DD]

## 症状
- [可观察症状 1 - 用户看到/经历的内容]
- [可观察症状 2 - 错误消息、视觉问题、意外行为]
- [根据需要继续 - 具体]

## 未起作用的方法

**尝试的解决方案 1:** [尝试内容的描述]
- **失败原因:** [技术原因,这为什么没有解决问题]

**尝试的解决方案 2:** [第二次尝试的描述]
- **失败原因:** [技术原因]

[继续所有未起作用的重大尝试]

[如果最初没有尝试其他方法,请写:]
**直接解决方案:** 问题在第一次尝试时就被识别和修复。

## 解决方案

[实际起作用的方法 - 提供具体细节]

**代码更改** (如适用):
```ruby
# 之前 (损坏):
[显示有问题的代码]

# 之后 (修复):
[显示更正后的代码并附带说明]
```

**数据库迁移** (如适用):
```ruby
# 迁移更改:
[显示迁移中更改的内容]
```

**运行的命令** (如适用):
```bash
# 修复的步骤:
[命令或操作]
```

## 为什么这有效

[技术解释:]
1. 问题的根本原因是什么?
2. 为什么解决方案解决了这个根本原因?
3. 底层问题是什么 (API 误用、配置错误、Rails 版本问题等)?

[足够详细,以便未来的开发人员理解 "为什么",而不仅仅是 "什么"]

## 预防

[如何在未来的 CORA 开发中避免此问题:]
- [具体的编码实践、检查或模式要遵循]
- [要注意什么]
- [如何及早发现此问题]

## 相关问题

[如果 docs/solutions/ 中存在类似问题,请链接到它们:]
- 另请参阅: [另一个相关问题.md](../category/another-related-issue.md)
- 类似于: [相关问题.md](../category/related-problem.md)

[如果没有相关问题,请写:]
尚未记录相关问题。

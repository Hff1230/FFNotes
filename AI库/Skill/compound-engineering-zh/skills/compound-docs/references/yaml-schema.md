# YAML Frontmatter 模式

**请参阅 `.claude/skills/codify-docs/schema.yaml` 以获取完整的模式规范。**

## 必填字段

- **module** (字符串): 模块名称 (例如, "EmailProcessing") 或 "CORA" 用于系统范围问题
- **date** (字符串): ISO 8601 日期 (YYYY-MM-DD)
- **problem_type** (枚举): [build_error, test_failure, runtime_error, performance_issue, database_issue, security_issue, ui_bug, integration_issue, logic_error, developer_experience, workflow_issue, best_practice, documentation_gap] 之一
- **component** (枚举): [rails_model, rails_controller, rails_view, service_object, background_job, database, frontend_stimulus, hotwire_turbo, email_processing, brief_system, assistant, authentication, payments, development_workflow, testing_framework, documentation, tooling] 之一
- **symptoms** (数组): 1-5 个特定的可观察症状
- **root_cause** (枚举): [missing_association, missing_include, missing_index, wrong_api, scope_issue, thread_violation, async_timing, memory_leak, config_error, logic_error, test_isolation, missing_validation, missing_permission, missing_workflow_step, inadequate_documentation, missing_tooling, incomplete_setup] 之一
- **resolution_type** (枚举): [code_fix, migration, config_change, test_fix, dependency_update, environment_setup, workflow_improvement, documentation_update, tooling_addition, seed_data_update] 之一
- **severity** (枚举): [critical, high, medium, low] 之一

## 可选字段

- **rails_version** (字符串): X.Y.Z 格式的 Rails 版本
- **tags** (数组): 可搜索的关键词 (小写,连字符分隔)

## 验证规则

1. 所有必填字段必须存在
2. 枚举字段必须完全匹配允许的值 (区分大小写)
3. symptoms 必须是带有 1-5 项的 YAML 数组
4. date 必须匹配 YYYY-MM-DD 格式
5. rails_version (如果提供) 必须匹配 X.Y.Z 格式
6. tags 应该是小写,连字符分隔

## 示例

```yaml
---
module: Email Processing
date: 2025-11-12
problem_type: performance_issue
component: rails_model
symptoms:
  - "加载电子邮件线程时的 N+1 查询"
  - "简报生成需要 >5 秒"
root_cause: missing_include
rails_version: 7.1.2
resolution_type: code_fix
severity: high
tags: [n-plus-one, eager-loading, performance]
---
```

## 类别映射

基于 `problem_type`,文档归档在:

- **build_error** → `docs/solutions/build-errors/`
- **test_failure** → `docs/solutions/test-failures/`
- **runtime_error** → `docs/solutions/runtime-errors/`
- **performance_issue** → `docs/solutions/performance-issues/`
- **database_issue** → `docs/solutions/database-issues/`
- **security_issue** → `docs/solutions/security-issues/`
- **ui_bug** → `docs/solutions/ui-bugs/`
- **integration_issue** → `docs/solutions/integration-issues/`
- **logic_error** → `docs/solutions/logic-errors/`
- **developer_experience** → `docs/solutions/developer-experience/`
- **workflow_issue** → `docs/solutions/workflow-issues/`
- **best_practice** → `docs/solutions/best-practices/`
- **documentation_gap** → `docs/solutions/documentation-gaps/`

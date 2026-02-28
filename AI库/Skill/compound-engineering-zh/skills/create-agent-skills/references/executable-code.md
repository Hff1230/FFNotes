<when_to_use_scripts>
即使 Claude 可以编写脚本，预制脚本也提供优势：
- 比生成的代码更可靠
- 节省 token（无需将代码包含在上下文中）
- 节省时间（无需代码生成）
- 确保跨使用的一致性

<execution_vs_reference>
明确 Claude 应该：
- **执行脚本**（最常见）："运行 `analyze_form.py` 来提取字段"
- **作为参考读取**（用于复杂逻辑）："查看 `analyze_form.py` 了解提取算法"

对于大多数实用脚本，首选执行。
</execution_vs_reference>

<how_scripts_work>
当 Claude 通过 bash 执行脚本时：
1. 脚本代码永远不会进入上下文窗口
2. 只有脚本输出消耗 token
3. 比 Claude 生成等效代码效率高得多
</how_scripts_work>
</when_to_use_scripts>

<file_organization>
<scripts_directory>
**最佳实践**：将所有可执行脚本放在技能文件夹内的 `scripts/` 子目录中。

```
skill-name/
├── SKILL.md
├── scripts/
│   ├── main_utility.py
│   ├── helper_script.py
│   └── validator.py
└── references/
    └── api-docs.md
```

**优点**：
- 保持技能根目录整洁有序
- 文档和可执行代码之间的清晰分离
- 所有技能的一致模式
- 易于引用：`python scripts/script_name.py`

**引用模式**：在 SKILL.md 中，使用 `scripts/` 路径引用脚本：

```bash
python ~/.claude/skills/skill-name/scripts/analyze.py input.har
```
</scripts_directory>
</file_organization>

<utility_scripts_pattern>
<example>
## 实用脚本

**analyze_form.py**：从 PDF 提取所有表单字段

```bash
python scripts/analyze_form.py input.pdf > fields.json
```

输出格式：
```json
{
  "field_name": { "type": "text", "x": 100, "y": 200 },
  "signature": { "type": "sig", "x": 150, "y": 500 }
}
```

**validate_boxes.py**：检查重叠的边界框

```bash
python scripts/validate_boxes.py fields.json
# 返回："OK" 或列出冲突
```

**fill_form.py**：将字段值应用到 PDF

```bash
python scripts/fill_form.py input.pdf fields.json output.pdf
```
</example>
</utility_scripts_pattern>

<solve_dont_punt>
处理错误条件而不是推给 Claude。

<example type="good">
```python
def process_file(path):
    """处理文件，如果不存在则创建。"""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"文件 {path} 未找到，创建默认文件")
        with open(path, 'w') as f:
            f.write('')
        return ''
    except PermissionError:
        print(f"无法访问 {path}，使用默认值")
        return ''
```
</example>

<example type="bad">
```python
def process_file(path):
    # 直接失败，让 Claude 自己想办法
    return open(path).read()
```
</example>

<configuration_values>
记录配置参数以避免"巫术常数"：

<example type="good">
```python
# HTTP 请求通常在 30 秒内完成
REQUEST_TIMEOUT = 30

# 三次重试在可靠性和速度之间取得平衡
MAX_RETRIES = 3
```
</example>

<example type="bad">
```python
TIMEOUT = 47  # 为什么是 47？
RETRIES = 5   # 为什么是 5？
```
</example>
</configuration_values>
</solve_dont_punt>

<package_dependencies>
<runtime_constraints>
技能在具有特定平台限制的代码执行环境中运行：
- **claude.ai**：可以从 npm 和 PyPI 安装包
- **Anthropic API**：没有网络访问和运行时包安装
</runtime_constraints>

<guidance>
在 SKILL.md 中列出所需的包并验证它们是否可用。

<example type="good">
安装所需的包：`pip install pypdf`

然后使用它：

```python
from pypdf import PdfReader
reader = PdfReader("file.pdf")
```
</example>

<example type="bad">
"使用 pdf 库来处理文件。"
</example>
</guidance>
</package_dependencies>

<mcp_tool_references>
如果您的技能使用 MCP（模型上下文协议）工具，始终使用完全限定的工具名称。

<format>ServerName:tool_name</format>

<examples>
- 使用 BigQuery:bigquery_schema 工具来检索表架构。
- 使用 GitHub:create_issue 工具来创建问题。
</examples>

如果没有服务器前缀，Claude 可能无法找到工具，特别是当有多个 MCP 服务器可用时。
</mcp_tool_references>

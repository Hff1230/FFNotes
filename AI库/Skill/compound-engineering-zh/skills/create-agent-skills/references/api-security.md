<overview>
在构建需要凭据（API 密钥、令牌、秘密）进行 API 调用的技能时，遵循此协议以防止凭据出现在聊天中。
</overview>

<the_problem>
带有环境变量的原始 curl 命令会暴露凭据：

```bash
# ❌ 错误 - API 密钥在聊天中可见
curl -H "Authorization: Bearer $API_KEY" https://api.example.com/data
```

当 Claude 执行此命令时，带有展开的 `$API_KEY` 的完整命令会出现在对话中。
</the_problem>

<the_solution>
使用 `~/.claude/scripts/secure-api.sh` - 一个在内部加载凭据的包装器。

<for_supported_services>
```bash
# ✅ 正确 - 没有可见的凭据
~/.claude/scripts/secure-api.sh <service> <operation> [args]

# 示例：
~/.claude/scripts/secure-api.sh facebook list-campaigns
~/.claude/scripts/secure-api.sh ghl search-contact "email@example.com"
```
</for_supported_services>

<adding_new_services>
在构建需要 API 调用的新技能时：

1. **将操作添加到包装器**（`~/.claude/scripts/secure-api.sh`）：

```bash
case "$SERVICE" in
    yourservice)
        case "$OPERATION" in
            list-items)
                curl -s -G \
                    -H "Authorization: Bearer $YOUR_API_KEY" \
                    "https://api.yourservice.com/items"
                ;;
            get-item)
                ITEM_ID=$1
                curl -s -G \
                    -H "Authorization: Bearer $YOUR_API_KEY" \
                    "https://api.yourservice.com/items/$ITEM_ID"
                ;;
            *)
                echo "未知操作：$OPERATION" >&2
                exit 1
                ;;
        esac
        ;;
esac
```

2. **为包装器添加配置文件支持**（如果服务需要多个账户）：

```bash
# 在 secure-api.sh 中，添加到配置文件重新映射部分：
yourservice)
    SERVICE_UPPER="YOURSERVICE"
    YOURSERVICE_API_KEY=$(eval echo \$${SERVICE_UPPER}_${PROFILE_UPPER}_API_KEY)
    YOURSERVICE_ACCOUNT_ID=$(eval echo \$${SERVICE_UPPER}_${PROFILE_UPPER}_ACCOUNT_ID)
    ;;
```

3. **使用配置文件命名将凭据占位符添加到 `~/.claude/.env`**：

```bash
# 检查条目是否已存在
grep -q "YOURSERVICE_MAIN_API_KEY=" ~/.claude/.env 2>/dev/null || \
  echo -e "\n# Your Service - Main profile\nYOURSERVICE_MAIN_API_KEY=\nYOURSERVICE_MAIN_ACCOUNT_ID=" >> ~/.claude/.env

echo "已将凭据占位符添加到 ~/.claude/.env - 用户需要填写它们"
```

4. **在您的 SKILL.md 中记录配置文件工作流**：

```markdown
## 配置文件选择工作流

**关键：** 始终使用配置文件选择以防止使用错误的账户凭据。

### 当用户请求 YourService 操作时：

1. **检查已保存的配置文件：**
   ```bash
   ~/.claude/scripts/profile-state get yourservice
   ```

2. **如果没有保存的配置文件，发现可用的配置文件：**
   ```bash
   ~/.claude/scripts/list-profiles yourservice
   ```

3. **如果只有一个配置文件：** 自动使用它并宣布：
   ```
   "正在使用 YourService 配置文件 'main' 来列出项目..."
   ```

4. **如果有多个配置文件：** 询问用户使用哪一个：
   ```
   "使用哪个 YourService 配置文件：main、clienta 还是 clientb？"
   ```

5. **保存用户的选择：**
   ```bash
   ~/.claude/scripts/profile-state set yourservice <selected_profile>
   ```

6. **在调用 API 之前始终宣布使用哪个配置文件：**
   ```
   "正在使用 YourService 配置文件 'main' 来列出项目..."
   ```

7. **使用配置文件进行 API 调用：**
   ```bash
   ~/.claude/scripts/secure-api.sh yourservice:<profile> list-items
   ```

## 安全 API 调用

所有 API 调用使用配置文件语法：

```bash
~/.claude/scripts/secure-api.sh yourservice:<profile> <operation> [args]

# 示例：
~/.claude/scripts/secure-api.sh yourservice:main list-items
~/.claude/scripts/secure-api.sh yourservice:main get-item <ITEM_ID>
```

**配置文件在会话中持久化：** 选择后，对后续操作使用相同的配置文件，除非用户明确更改它。
```
</adding_new_services>
</the_solution>

<pattern_guidelines>
<simple_get_requests>
```bash
curl -s -G \
    -H "Authorization: Bearer $API_KEY" \
    "https://api.example.com/endpoint"
```
</simple_get_requests>

<post_with_json_body>
```bash
ITEM_ID=$1
curl -s -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @- \
    "https://api.example.com/items/$ITEM_ID"
```

用法：
```bash
echo '{"name":"value"}' | ~/.claude/scripts/secure-api.sh service create-item
```
</post_with_json_body>

<post_with_form_data>
```bash
curl -s -X POST \
    -F "field1=value1" \
    -F "field2=value2" \
    -F "access_token=$API_TOKEN" \
    "https://api.example.com/endpoint"
```
</post_with_form_data>
</pattern_guidelines>

<credential_storage>
**位置：** `~/.claude/.env`（所有技能的全局位置，可从任何目录访问）

**格式：**
```bash
# 服务凭据
SERVICE_API_KEY=your-key-here
SERVICE_ACCOUNT_ID=account-id-here

# 另一个服务
OTHER_API_TOKEN=token-here
OTHER_BASE_URL=https://api.other.com
```

**在脚本中加载：**
```bash
set -a
source ~/.claude/.env 2>/dev/null || { echo "错误：~/.claude/.env 未找到" >&2; exit 1; }
set +a
```
</credential_storage>

<best_practices>
1. **永远不要在技能示例中使用带有 `$VARIABLE` 的原始 curl** - 始终使用包装器
2. **将所有操作添加到包装器** - 不要让用户自己弄清楚 curl 语法
3. **自动创建凭据占位符** - 在创建技能时立即将空字段添加到 `~/.claude/.env`
4. **将凭据保存在 `~/.claude/.env` 中** - 一个中心位置，到处都可以工作
5. **记录每个操作** - 在 SKILL.md 中显示示例
6. **优雅地处理错误** - 检查缺失的环境变量，显示有用的错误消息
</best_practices>

<testing>
在不暴露凭据的情况下测试包装器：

```bash
# 此命令出现在聊天中
~/.claude/scripts/secure-api.sh facebook list-campaigns

# 但 API 密钥永远不会出现 - 它们在脚本内部加载
```

验证凭据已加载：
```bash
# 检查 .env 是否存在
ls -la ~/.claude/.env

# 检查特定变量（不显示值）
grep -q "YOUR_API_KEY=" ~/.claude/.env && echo "API 密钥已配置" || echo "API 密钥缺失"
```
</testing>

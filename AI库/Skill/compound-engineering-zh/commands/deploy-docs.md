---
name: deploy-docs
descripti触发条件: 验证并准备文档以部署到 GitHub Pages
---

# 部署文档命令

验证文档站点并准备将其部署到 GitHub Pages。

## 步骤 1: 验证文档

运行这些检查:

```bash
# 统计组件
echo "代理数: $(ls plugins/compound-engineering-zh/agents/*.md | wc -l)"
echo "命令数: $(ls plugins/compound-engineering-zh/commands/*.md | wc -l)"
echo "技能数: $(ls -d plugins/compound-engineering-zh/skills/*/ 2>/dev/null | wc -l)"

# 验证 JSON
cat .claude-plugin/marketplace.json | jq . > /dev/null && echo "✓ marketplace.json 有效"
cat plugins/compound-engineering-zh/.claude-plugin/plugin.json | jq . > /dev/null && echo "✓ plugin.json 有效"

# 检查所有 HTML 文件是否存在
for page in index agents commands skills mcp-servers changelog getting-started; do
  if [ -f "plugins/compound-engineering-zh/docs/pages/${page}.html" ] || [ -f "plugins/compound-engineering-zh/docs/${page}.html" ]; then
    echo "✓ ${page}.html 存在"
  else
    echo "✗ ${page}.html 缺失"
  fi
done
```

## 步骤 2: 检查未提交的更改

```bash
git status --porcelain plugins/compound-engineering-zh/docs/
```

如果有未提交的更改,警告用户先提交。

## 步骤 3: 部署说明

由于 GitHub Pages 部署需要具有特殊权限的工作流文件,请提供以下说明:

### 首次设置

1. 使用 GitHub Pages 工作流创建 `.github/workflows/deploy-docs.yml`
2. 转到仓库设置 > Pages
3. 将源设置为 "GitHub Actions"

### 部署

合并到 `main` 后,文档将自动部署。或者:

1. 转到 Actions 标签页
2. 选择 "将文档部署到 GitHub Pages"
3. 点击 "运行工作流"

### 工作流文件内容

```yaml
name: 将文档部署到 GitHub Pages

触发条件:
  推送:
    分支: [main]
    路径:
      - 'plugins/compound-engineering-zh/docs/**'
  workflow_dispatch:

权限:
  内容: 读取
  页面: 写入
  id-token: 写入

并发:
  组: "pages"
  取消进行中: 否

作业:
  部署:
    环境:
      名称: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-触发条件: ubuntu-latest
    步骤:
      - 使用: actions/checkout@v4
      - 使用: actions/configure-pages@v4
      - 使用: actions/upload-pages-artifact@v3
        配置:
          路径: 'plugins/compound-engineering-zh/docs'
      - 使用: actions/deploy-pages@v4
```

## 步骤 4: 报告状态

提供摘要:

```
## 部署准备情况

✓ 所有 HTML 页面都存在
✓ JSON 文件有效
✓ 组件计数匹配

### 后续步骤
- [ ] 提交所有待处理的更改
- [ ] 推送到主分支
- [ ] 验证 GitHub Pages 工作流是否存在
- [ ] 在 https://everyinc.github.io/ray-marketplace/ 检查部署
```

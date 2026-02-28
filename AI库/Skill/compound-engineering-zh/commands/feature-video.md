---
name: feature-video
description: 录制功能演示视频并将其添加到 PR 描述中
argument-hint: "[PR 编号或 'current'] [可选：基础 URL，默认为 localhost:3000]"
---

# 功能视频演示

<command_purpose>录制演示功能的视频，上传并将其添加到 PR 描述中。</command_purpose>

## 简介

<role>开发者关系工程师，创建功能演示视频</role>

此命令为 PR 文档创建专业的功能视频演练：
- 使用 Playwright 视频捕获记录浏览器交互
- 演示完整的用户流程
- 上传视频以便轻松共享
- 使用嵌入的视频更新 PR 描述

## 前置要求

<requirements>
- 本地开发服务器正在运行（例如 `bin/dev`、`rails server`）
- Playwright MCP 服务器已连接
- 具有 PR 的 Git 仓库
- 已安装 `ffmpeg`（用于视频转换）
- 已配置 `rclone`（可选，用于云上传 - 参见 rclone 技能）
</requirements>

## 主要任务

### 1. 解析参数

<parse_args>

**参数：** $ARGUMENTS

解析输入：
- 第一个参数：PR 编号或 "current"（默认为当前分支的 PR）
- 第二个参数：基础 URL（默认为 `http://localhost:3000`）

```bash
# 如果需要，获取当前分支的 PR 编号
gh pr view --json number -q '.number'
```

</parse_args>

### 2. 收集功能上下文

<gather_context>

**获取 PR 详细信息：**
```bash
gh pr view [number] --json title,body,files,headRefName -q '.'
```

**获取更改的文件：**
```bash
gh pr view [number] --json files -q '.files[].path'
```

**将文件映射到可测试的路由**（与 playwright-test 相同）：

| 文件模式 | 路由 |
|-------------|----------|
| `app/views/users/*` | `/users`、`/users/:id`、`/users/new` |
| `app/controllers/settings_controller.rb` | `/settings` |
| `app/javascript/controllers/*_controller.js` | 使用该 Stimulus 控制器的页面 |
| `app/components/*_component.rb` | 渲染该组件的页面 |

</gather_context>

### 3. 规划视频流程

<plan_flow>

在录制之前，创建镜头列表：

1. **开场镜头**：主页或起始点（2-3 秒）
2. **导航**：用户如何到达功能
3. **功能演示**：核心功能（主要焦点）
4. **边界情况**：错误状态、验证等（如果适用）
5. **成功状态**：完成的操作/结果

请用户确认或调整流程：

```markdown
**建议的视频流程**

基于 PR #[number]: [title]

1. 开始于：/[starting-route]
2. 导航到：/[feature-route]
3. 演示：
   - [操作 1]
   - [操作 2]
   - [操作 3]
4. 显示结果：[success state]

预计时长：约 [X] 秒

这样看起来可以吗？
1. 是的，开始录制
2. 修改流程（描述更改）
3. 添加特定的交互来演示
```

</plan_flow>

### 4. 设置视频录制

<setup_recording>

**创建 videos 目录：**
```bash
mkdir -p tmp/videos
```

**使用 Playwright MCP 启动浏览器并录制视频：**

注意：将使用 Playwright MCP 的 browser_navigate，我们将使用 browser_run_code 启用视频录制：

```javascript
// 启用视频录制上下文
mcp__plugin_compound-engineering_pw__browser_run_code({
  code: `async (page) => {
    // 视频录制在上下文级别启用
    // MCP 服务器自动处理此操作
    return 'Video recording active';
  }`
})
```

**替代方案：使用浏览器截图作为帧**

如果 MCP 无法进行视频录制，则回退到：
1. 在关键时刻截图
2. 使用 ffmpeg 组合成 GIF

```bash
ffmpeg -framerate 2 -pattern_type glob -i 'tmp/screenshots/*.png' -vf "scale=1280:-1" tmp/videos/feature-demo.gif
```

</setup_recording>

### 5. 录制演练

<record_walkthrough>

执行计划的流程，捕获每个步骤：

**步骤 1：导航到起始点**
```
mcp__plugin_compound-engineering_pw__browser_navigate({ url: "[base-url]/[start-route]" })
mcp__plugin_compound-engineering_pw__browser_wait_for({ time: 2 })
mcp__plugin_compound-engineering_pw__browser_take_screenshot({ filename: "tmp/screenshots/01-start.png" })
```

**步骤 2：执行导航/交互**
```
mcp__plugin_compound-engineering_pw__browser_click({ element: "[description]", ref: "[ref]" })
mcp__plugin_compound-engineering_pw__browser_wait_for({ time: 1 })
mcp__plugin_compound-engineering_pw__browser_take_screenshot({ filename: "tmp/screenshots/02-navigate.png" })
```

**步骤 3：演示功能**
```
mcp__plugin_compound-engineering_pw__browser_snapshot({})
// 识别交互元素
mcp__plugin_compound-engineering_pw__browser_click({ element: "[feature element]", ref: "[ref]" })
mcp__plugin_compound-engineering_pw__browser_wait_for({ time: 1 })
mcp__plugin_compound-engineering_pw__browser_take_screenshot({ filename: "tmp/screenshots/03-feature.png" })
```

**步骤 4：捕获结果**
```
mcp__plugin_compound-engineering_pw__browser_wait_for({ time: 2 })
mcp__plugin_compound-engineering_pw__browser_take_screenshot({ filename: "tmp/screenshots/04-result.png" })
```

**从截图创建视频/GIF：**

```bash
# 创建目录
mkdir -p tmp/videos tmp/screenshots

# 创建 MP4 视频（推荐 - 更好的质量，更小的文件）
# -framerate 0.5 = 每帧 2 秒（较慢的播放速度）
# -framerate 1 = 每帧 1 秒
ffmpeg -y -framerate 0.5 -pattern_type glob -i '.playwright-mcp/tmp/screenshots/*.png' \
  -c:v libx264 -pix_fmt yuv420p -vf "scale=1280:-2" \
  tmp/videos/feature-demo.mp4

# 创建用于预览的低质量 GIF（小文件，用于 GitHub 嵌入）
ffmpeg -y -framerate 0.5 -pattern_type glob -i '.playwright-mcp/tmp/screenshots/*.png' \
  -vf "scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse" \
  -loop 0 tmp/videos/feature-demo-preview.gif

# 将截图复制到项目文件夹以便访问
cp -r .playwright-mcp/tmp/screenshots tmp/
```

**注意：**
- MP4 scale 中的 `-2` 确保高度可被 2 整除（H.264 所需）
- 预览 GIF 使用 640px 宽度和 128 种颜色以保持文件较小（约 100-200KB）

</record_walkthrough>

### 6. 上传视频

<upload_video>

**使用 rclone 上传：**

```bash
# 检查 rclone 是否已配置
rclone listremotes

# 将视频、预览 GIF 和截图上传到云存储
# 使用 --s3-no-check-bucket 避免权限错误
rclone copy tmp/videos/ r2:kieran-claude/pr-videos/pr-[number]/ --s3-no-check-bucket --progress
rclone copy tmp/screenshots/ r2:kieran-claude/pr-videos/pr-[number]/screenshots/ --s3-no-check-bucket --progress

# 列出已上传的文件
rclone ls r2:kieran-claude/pr-videos/pr-[number]/
```

公共 URL（具有公共访问权限的 R2）：
```
Video: https://pub-4047722ebb1b4b09853f24d3b61467f1.r2.dev/pr-videos/pr-[number]/feature-demo.mp4
Preview: https://pub-4047722ebb1b4b09853f24d3b61467f1.r2.dev/pr-videos/pr-[number]/feature-demo-preview.gif
```

</upload_video>

### 7. 更新 PR 描述

<update_pr>

**获取当前 PR 主体：**
```bash
gh pr view [number] --json body -q '.body'
```

**将视频部分添加到 PR 描述：**

如果 PR 已经有视频部分，则替换它。否则，追加：

**重要提示：** GitHub 无法直接嵌入外部 MP4。使用可点击的 GIF 链接到视频：

```markdown
## Demo

[![Feature Demo]([preview-gif-url])]([video-mp4-url])

*点击查看完整视频*
```

示例：
```markdown
[![Feature Demo](https://pub-4047722ebb1b4b09853f24d3b61467f1.r2.dev/pr-videos/pr-137/feature-demo-preview.gif)](https://pub-4047722ebb1b4b09853f24d3b61467f1.r2.dev/pr-videos/pr-137/feature-demo.mp4)
```

**更新 PR：**
```bash
gh pr edit [number] --body "[updated body with video section]"
```

**或作为评论添加（如果首选）：**
```bash
gh pr comment [number] --body "## Feature Demo

![Demo]([video-url])

_此 PR 中更改的自动化演练_"
```

</update_pr>

### 8. 清理

<cleanup>

```bash
# 可选：清理截图
rm -rf tmp/screenshots

# 保留视频以供参考
echo "Video retained at: tmp/videos/feature-demo.gif"
```

</cleanup>

### 9. 摘要

<summary>

展示完成摘要：

```markdown
## 功能视频完成

**PR：** #[number] - [title]
**视频：** [url 或本地路径]
**时长：** 约 [X] 秒
**格式：** [GIF/MP4]

### 捕获的镜头
1. [起始点] - [description]
2. [导航] - [description]
3. [功能演示] - [description]
4. [结果] - [description]

### PR 已更新
- [x] 视频部分已添加到 PR 描述
- [ ] 准备审查

**下一步：**
- 审查视频以确保它准确演示功能
- 与审阅者共享以提供上下文
```

</summary>

## 快速使用示例

```bash
# 为当前分支的 PR 录制视频
/feature-video

# 为特定 PR 录制视频
/feature-video 847

# 使用自定义基础 URL 录制
/feature-video 847 http://localhost:5000

# 为预发布环境录制
/feature-video current https://staging.example.com
```

## 提示

- **保持简短**：对于 PR 演示，10-30 秒是理想的
- **专注于更改**：不要包含不相关的 UI
- **显示前后对比**：如果修复错误，首先显示损坏的状态（如果可能）
- **如果需要添加注释**：为复杂功能添加文本叠加

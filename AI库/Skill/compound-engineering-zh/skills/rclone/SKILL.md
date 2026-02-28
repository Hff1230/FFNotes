---
name: rclone
description: 使用 rclone 跨云存储提供商上传、同步和管理文件。在将文件（图像、视频、文档）上传到 S3、Cloudflare R2、Backblaze B2、Google Drive、Dropbox 或任何 S3 兼容存储时使用。在"上传到 S3"、"同步到云"、"rclone"、"备份文件"、"上传视频/图像到存储桶"或将文件传输到远程存储的请求时触发。
---

# rclone 文件传输技能

## 设置检查（始终首先运行）

在任何 rclone 操作之前，验证安装和配置：

```bash
# 检查是否安装了 rclone
command -v rclone >/dev/null 2>&1 && echo "rclone installed: $(rclone version | head -1)" || echo "NOT INSTALLED"

# 列出已配置的远程
rclone listremotes 2>/dev/null || echo "NO REMOTES CONFIGURED"
```

### 如果未安装 rclone

指导用户安装：

```bash
# macOS
brew install rclone

# Linux（脚本安装）
curl https://rclone.org/install.sh | sudo bash

# 或通过包管理器
sudo apt install rclone  # Debian/Ubuntu
sudo dnf install rclone  # Fedora
```

### 如果未配置远程

引导用户完成交互式配置：

```bash
rclone config
```

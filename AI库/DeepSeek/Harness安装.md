### 第一步：安装依赖工具

#### 1. Node.js（推荐 v20 LTS 或更高）

bash

复制

```
# 检查版本
node -v
npm -v
 
# 如未安装，从 https://nodejs.org 下载 LTS 版本
```

#### 2. pnpm（Monorepo 包管理器）

bash

复制

```
# 全局安装 pnpm
npm install -g pnpm

# 验证
pnpm -v  # 建议使用 v8.x 或更高
```

#### 3. Git

bash

复制

```
git --version
# 如未安装，从 https://git-scm.com 下载
```
4.安装
npm install -g @deepseek-ai/dsh

5.安装插件库
dsh plugin --profile web add dshmarket

6.启动 
dsh web

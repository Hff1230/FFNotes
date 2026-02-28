---
name: gemini-imagegen
description: 当使用 Gemini API（Nano Banana Pro）生成和编辑图像时，应使用此技能。它适用于从文本提示创建图像、编辑现有图像、应用风格转换、生成带文本的徽标、创建贴纸、产品模型或任何图像生成/操作任务。支持文本到图像、图像编辑、多轮优化和从多个参考图像合成。
---

# Gemini 图像生成（Nano Banana Pro）

使用 Google 的 Gemini API 生成和编辑图像。必须设置环境变量 `GEMINI_API_KEY`。

## 默认模型

| 模型 | 分辨率 | 最适用于 |
|-------|--------|----------|
| `gemini-3-pro-image-preview` | 1K-4K | 所有图像生成（默认） |

**注意：** 始终使用此 Pro 模型。仅在明确请求时使用不同的模型。

## 快速参考

### 默认设置
- **模型：** `gemini-3-pro-image-preview`
- **分辨率：** 1K（默认，选项：1K、2K、4K）
- **宽高比：** 1:1（默认）

### 可用宽高比
`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9`

### 可用分辨率
`1K`（默认）、`2K`、`4K`

## 核心 API 模式

```python
import os
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# 基本生成（1K、1:1 - 默认）
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["您的提示在这里"],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
    ),
)

for part in response.parts:
    if part.text:
        print(part.text)
    elif part.inline_data:
        image = part.as_image()
        image.save("output.png")
```

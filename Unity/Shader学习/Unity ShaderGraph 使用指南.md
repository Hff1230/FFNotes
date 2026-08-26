# Unity ShaderGraph 使用指南

## 一、ShaderGraph 概述

ShaderGraph 是 Unity 内置的**可视化节点编辑器**，用于通过连线而非编写代码来创建着色器（Shader）。它适用于所有渲染管线（Built-in、URP、HDRP），是 Unity 实现"无代码着色器创作"的核心工具。

### 核心优势
- **可视化创作**：拖拽、连线完成着色器逻辑，无需手动编写 HLSL/HLSL
- **跨管线兼容**：同一套节点逻辑可导出为 URP 或 HDRP Shader
- **实时预览**：节点编辑时即时查看效果
- **材质驱动**：Graph 编译后生成 Shader，材质（Material）作为实例应用

---

## 二、环境与安装

### 2.1 安装要求

| 项目 | 要求 |
|------|------|
| Unity 版本 | 2019.3+（URP 推荐 2020.3+，HDRP 推荐 2021+） |
| 渲染管线包 | Universal Render Pipeline / High Definition Render Pipeline |
| 图形 API | DirectX 11/12、OpenGL Core、Vulkan、Metal |

### 2.2 安装步骤

1. **打开 Package Manager**：菜单 `Window > Package Manager`
2. **搜索**：`Universal Render Pipeline` 或 `High Definition Render Pipeline`
3. **安装**：点击 Install
4. **设置项目管线**：
   - URP：菜单 `Render > Render Pipeline > Universal Render Pipeline > Install or Migrate`
   - HDRP：菜单 `Render > Render Pipeline > High Definition Render Pipeline > Install or Migrate`
5. **验证**：项目根目录应出现 `Packages/` 文件夹，内含 `com.unity.render-pipelines.universal` 或 `com.unity.render-pipelines.high-definition`

### 2.3 打开 ShaderGraph 编辑器

```
方法一：右键 Project 窗口 → Create → Rendering → Shader → [Universal Render Graph / PBR Shader / Unlit Shader]
方法二：Assets 窗口空白处右键 → Create → Rendering → ShaderGraph
方法三：双击已有的 .shadergraph 文件
```

> **注意**：URP 和 HDRP 的 ShaderGraph 是**不同版本**，不能混用。

---

## 三、核心概念

### 3.1 Graph 与 Shader 的关系

```
.shadergraph（节点图）
    ↓ 编译（自动，或右键 Compile Asset）
.shader（ HLSL 代码）
    ↓ 拖拽到场景物体
Material（材质实例）
```

### 3.2 节点（Node）类型

| 类别 | 说明 | 示例 |
|------|------|------|
| **输入节点** | 从外部获取数据 | Material Property, Vertex Attribute, Fragment Input |
| **数学节点** | 基本运算 | Add, Multiply, Min, Max, Power, Sin, Cos |
| **纹理节点** | UV 和纹理采样 | Sample Texture 2D, Texture Property |
| **颜色节点** | 颜色处理 | Black, White, Ranged Int, Color, Gradient |
| **向量节点** | 向量运算 | One Over One, Lerp, Normalize, Abs |
| **几何节点** | 顶点/面操作 | Position, Normal, Tangent, UV |
| **输出节点** | 定义渲染结果 | PBR, Unlit, Motion Vectors, Face Forward |

### 3.3 端口颜色编码

| 颜色 | 数据类型 |
|------|----------|
| 🟣 紫色 | 标量 (Scalar / Float) |
| 🔵 蓝色 | 二维向量 (Vector 2) |
| 🟢 绿色 | 三维向量 (Vector 3 / RGB) |
| 🔴 红色 | 四维向量 (Vector 4 / RGBA) |
| 🟡 黄色 | 布尔 (Boolean) |
| ⚪ 白色 | 纹理 (Texture) |
| 🟤 棕色 | 枚举 (Enum) |

### 3.4 引脚（Pin）连接规则

- **同一颜色类型可互相连接**
- **隐式转换**：标量 → 向量（标量广播到各通道）；向量 → 标量（需取某个通道如 R/X）
- **不可连接**：颜色类型不匹配（如 RGB 连到 R、或纹理连到标量）

---

## 四、常用节点详解

### 4.1 PBR Shader（标准金属-粗糙度工作流）

这是最常用的 ShaderGraph 模板。核心输出节点：

```
PBR 输出节点
├── Base Color（基础色）  → 物体的固有色
├── Metallic（金属度）    → 0=非金属, 1=金属
├── Smoothness（光滑度）  → 0=粗糙, 1=光滑/高反射
├── Normal（法线）        → 表面法线方向
├── Emission（自发光）    → 自发光颜色
├── Occlusion（遮挡）     → 环境光遮蔽
└── Alpha（透明度）       → 不透明度（Alpha Mode 设为 Transparent 时生效）
```

#### 金属-粗糙度工作流要点
- **金属度（Metallic）**：控制材质是否像金属
  - 非金属（塑料、木材）：Metallic=0，Base Color 决定颜色
  - 金属（铜、铁、金）：Metallic=1，Base Color 决定金属色调
- **光滑度（Smoothness）**：控制高光反射的锐利程度
  - 光滑 = 高反射 = 清晰的倒影
  - 粗糙 = 低反射 = 漫反射为主

### 4.2 Unlit Shader（无光照着色器）

适合 UI、粒子、卡通风格。核心输出：

```
Unlit 输出节点
├── Color（颜色）
└── Alpha（透明度）
```

### 4.3 常用数学节点

```
Add (+)          加法
Subtract (-)     减法（注意顺序：A - B）
Multiply (×)     乘法
Divide (÷)       除法
Power (^)        幂运算（X^Y）
Sin / Cos / Tan  三角函数
Min / Max        取最小/最大值
Abs              绝对值
Sign             符号（正/负）
Floor / Ceil     向下/向上取整
Round            四舍五入
Fract            取小数部分
Lerp             线性插值（从A到B按t插值）
Saturate         钳制到 [0, 1]
Step             阶跃函数
Smoothstep       平滑阶跃
```

---

## 五、标准工作流程

### 5.1 创建第一个 ShaderGraph

**步骤 1**：创建 Graph
```
右键 Assets 目录 → Create → Rendering → Shader → Universal Render Graph → PBR Shader
命名为 "MyPBR"
```

**步骤 2**：打开编辑器
```
双击 MyPBR.shadergraph 文件 → 弹出节点编辑器窗口
```

**步骤 3**：理解默认结构
```
打开后默认包含：
├── Material Properties（自动生成的属性）
├── Sample Texture 2D（主纹理）
├── 基础连接（Color → Metallic → Smoothness → Normal → Emission → Alpha → PBR）
└── PBR 输出节点
```

**步骤 4**：添加自定义属性
```
右键编辑器空白处 → 选择 "Create Property" 或右键搜索 "Property"
设置：
  - Name：显示名称（如 "Roughness"）
  - Property：变量名（如 "_Roughness"，自动加前缀）
  - Type：Float / Range / Color / Vector / Texture
  - Default：默认值
```

**步骤 5**：连接节点
```
1. 从属性节点拖拽到目标节点
2. 或通过右键搜索节点名（输入节点名 + Enter）
3. 点击引脚拖出连线到目标引脚
4. 实时预览区域同步更新效果
```

**步骤 6**：编译与使用
```
1. 点击 "Compile Shader" 按钮（或右键编辑器空白处 → Compile Asset）
2. 回到 Unity 项目窗口 → 创建材质 → 选择刚创建的 Shader
3. 在材质 Inspector 中调整属性值
4. 将材质拖拽到场景物体上
```

### 5.2 完整示例：创建渐变背景

```
目标：创建一个从底部蓝色渐变到顶部白色的材质
```

**步骤**：
1. 创建 PBR Shader → 命名为 "GradientBackground"
2. 打开编辑器，找到 **Position 节点** → 在 "Space" 引脚选择 **Object**
3. 添加 **Lerp 节点**：
   - A 连接白色 (RGB: 1, 1, 1)
   - B 连接蓝色 (RGB: 0, 0, 1)
   - T 连接 Position 节点的 Y 值（或 X 值，取决于渐变方向）
4. Lerp 输出连接 **PBR 节点的 Base Color**
5. 将 **Emission 也连到 Lerp 输出**（使渐变在黑暗中可见）
6. 将 **Alpha 设为 1**（不透明）
7. Compile → 创建材质 → 应用到 Plane 物体
8. 将 Plane 旋转 -90° 使其水平放置

---

## 六、高级功能

### 6.1 自定义函数（Custom Function）

当 ShaderGraph 没有内置节点时：

```
1. 右键 → Custom → Custom Function
2. 编写 HLSL 代码
3. 定义输入/输出引脚
4. 编译后像普通节点一样使用
```

**示例：自定义噪声函数**
```hlsl
// Custom Function 的 HLSL 代码
float SimpleNoise(float2 uv) {
    return frac(sin(dot(uv, float2(12.9898, 78.233))) * 43758.5453);
}
```

### 6.2 Graph Component（图组件）

用于将多个 Graph 模块组合复用：

```
1. 右键 → Graph → Graph Component
2. 创建一个"模块"（如"边缘发光效果"）
3. 在其他 Graph 中通过 "Sample Graph" 节点引用
4. 实现模块化设计，便于团队协作
```

### 6.3 Surface State（表面状态）

控制渲染行为的关键设置：

```
Surface Type（表面类型）：
├── Opaque（不透明）— 默认，标准渲染
├── Transparent（透明）— 支持 Alpha 混合
├── Cutout（裁剪）— 低于 Alpha Clipping 值的像素完全透明
└── Depth Only（仅深度）— 只写入深度缓冲区

Blend Mode（混合模式）：
├── Opaque
├── Alpha（标准 Alpha 混合）
├── Premultiply Alpha（预乘 Alpha）
├── Additive（加法混合 — 常用于粒子）
├── Multiply（乘法混合 — 常用于阴影）
└── Screen（屏幕混合）

Depth Write（深度写入）：关闭后物体不写入深度（常用于透明物体）

Alpha Clipping（Alpha 裁剪）：启用后低于阈值的像素完全剔除
```

### 6.4 Vertex Displacement（顶点位移）

```
1. Surface State → Surface Type 设为 Opaque
2. 找到 "Displacement" 节点（在 Vertex 类别中）
3. 连接 Displacement 到 PBR 输出的 "Displacement" 引脚
4. 在 Inspector 中：Geometry → Displacement → 选择 "Height Map" 并分配高度图
5. 启用 Tesselation（细分）以获得平滑的顶点位移效果
```

### 6.5 Shader Feature 条件编译

```
1. 右键 → Shader Feature
2. 命名 Feature（如 "_SPECULAR_HIGHLIGHTS"）
3. 勾选该 Feature 的节点才会在编译后的 Shader 中包含
4. 在材质 Inspector 中可以通过 Shader Feature 下拉切换
5. 减小最终 Shader 的体积和 Draw Call 数量
```

### 6.6 数据通道（Data Channel）

```
在 Surface State 中可启用：
- Normal：输出法线（用于后处理）
- Velocity：输出运动速度（用于运动模糊）
- Lit Color：输出光照颜色
- Material Depth：输出深度值
```

### 6.7 宏定义与变量

```
在 Graph 顶部可设置：
- Render Queue（渲染队列）：Geometry=-1, AlphaTest=2450, Transparent=3000
- Global Preprocessor Symbols：自定义宏定义
- Custom Surface Input：添加自定义顶点/片段数据
```

---

## 七、调试技巧

### 7.1 可视化调试

```
方法一：将任意标量/向量值连接到 Emission 引脚
       → 在屏幕上以颜色形式显示数值
       → 红色 = X 通道，绿色 = Y 通道，蓝色 = Z 通道

方法二：使用 Color 节点 + Lerp 将结果转为可见颜色
       → Sample Texture 2D 的 UV 输出可连到 Emission 查看 UV 分布

方法三：临时将中间变量连接到输出引脚
       → 确认每个阶段的数值是否正确
```

### 7.2 常见错误排查

| 错误现象 | 可能原因 | 解决方法 |
|---------|---------|---------|
| 连线失败/断开 | 端口类型不匹配 | 检查引脚颜色，使用转换节点 |
| 编译报错 | 未连接的输出引脚 | 将所有输出引脚连接到节点 |
| 编译报错 | 缺少 Surface State 设置 | 检查 Surface Type 和 Geometry 设置 |
| 材质无效果 | Graph 未编译 | 点击 Compile Shader |
| 材质无效果 | 未应用到物体 | 创建材质 → 选 Shader → 拖到物体 |
| 性能差 | 过于复杂的节点链 | 简化逻辑，减少节点数量 |
| 透明物体闪烁 | Z-Fighting | 调整 Render Queue 或开启 Depth Write |

### 7.3 Shader Graph Profiler

```
Unity 2021+ 内置 Shader Graph Profiler：
1. Window → Analysis → Shader Graph Profiler
2. 选择场景中的物体
3. 查看：节点数量、采样次数、指令数
4. 识别性能瓶颈（如过多的纹理采样）
```

---

## 八、最佳实践

### 8.1 命名规范

```
- 节点命名：使用有意义的名称（如 "WaveFrequency" 而非 "Node 12"）
- 属性命名：遵循 Unity 惯例，下划线开头（"_WaveSpeed"）
- 分组命名：使用 Folder 节点对相关节点进行分组
```

### 8.2 性能优化

```
优先级从高到低：

1. 减少纹理采样次数（最多 4-8 个采样是合理的）
2. 使用 Half 精度（在 Surface State 中可选）
3. 避免在片段着色器中进行复杂计算
4. 使用 Shader Feature 移除不需要的代码路径
5. 使用 Vertex Color 代替纹理（减少采样）
6. 使用 1D/2D 纹理代替 3D 纹理（性能更好）
7. 使用 Baked GI 而不是实时光照
8. 减少 Surface Type 的复杂性（Opaque 比 Transparent 快）
```

### 8.3 版本控制

```
- .shadergraph 文件是 YAML 格式，可被 Git 追踪
- 提交前确保 Compile Asset（生成 .shader 文件）
- 注意：YAML 格式在不同 Unity 版本间可能不兼容
- 团队项目建议统一 Unity 版本和渲染管线版本
```

### 8.4 模块化设计

```
- 将通用效果封装为 Graph Component
- 使用自定义函数处理复杂数学逻辑
- 保持 Graph 简洁，通过组合而非复制实现复用
- 为每个 Graph 添加注释节点（右键 → Note）
```

---

## 九、URP vs HDRP ShaderGraph 差异

| 特性 | URP ShaderGraph | HDRP ShaderGraph |
|------|----------------|-----------------|
| 输出节点 | PBR、Unlit | PBR、Unlit、Screen Space Affect |
| 法线空间 | 切线空间/世界空间 | 切线空间/世界空间/局部空间 |
| 顶点位移 | 支持（需 Tesselation） | 支持（更强大的细分） |
| 后处理 | 通过 Data Channel | 更丰富的数据通道 |
| 次表面散射 | 需要 Custom Function | 内置 SSS 节点 |
| 体积光 | 不支持 | 内置 Volume Absorption 节点 |
| 折射 | 不支持 | 内置 Refraction 节点 |
| 粒子 | 标准粒子渲染 | 自定义粒子渲染 |

---

## 十、常用资源与学习路径

### 10.1 官方文档
- Unity ShaderGraph Manual: https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html
- ShaderGraph 节点参考: https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/api/UnityEngine.Rendering.Universal.ShaderGraph.html

### 10.2 学习建议
1. **从模板开始**：使用默认的 PBR Shader 模板，理解每个节点的作用
2. **逐步实验**：每次只修改一个变量，观察效果变化
3. **理解光照模型**：学习 PBR 原理（金属度/粗糙度/法线/自发光）
4. **掌握 UV**：理解 UV 映射和纹理采样的关系
5. **尝试组合**：将多个简单效果组合成复杂效果
6. **阅读社区作品**：查看 ShaderGraph Gallery 中的作品

### 10.3 实用节点组合

#### 边缘发光（Rim Light）
```
Position 节点（World Space） → Normal 节点
→ Dot 节点（法线与视角点积）
→ 1 - Dot → 平滑结果
→ 颜色 × 强度 → Emission
```

#### 扫描线效果
```
Time 节点 → Fraction → 乘以速度
Sin 节点 → 乘以颜色
Sample Texture 2D 的 Alpha 作为遮罩
→ Lerp 到 Base Color
```

#### 水波纹效果
```
Time 节点 → 乘以频率
Position 节点 → Distance 到中心点
Sin 节点（距离 - 时间）
→ 乘以振幅
→ 连到 Displacement 节点
→ 或连到 Wave 颜色变量
```

---

## 十一、常见问题 FAQ

**Q1: ShaderGraph 和 HLSL 编辑器有什么区别？**
A: ShaderGraph 是可视化节点编辑器，HLSL 编辑器是代码编辑器。ShaderGraph 生成的底层代码与手写 HLSL 等效。ShaderGraph 适合快速原型和艺术家协作；HLSL 适合需要精细控制和优化的场景。

**Q2: 可以在 ShaderGraph 中写自定义 HLSL 吗？**
A: 可以。使用 "Custom Function" 节点编写 HLSL 代码，然后在节点编辑器中调用。

**Q3: ShaderGraph 生成的 Shader 性能如何？**
A: 合理使用的情况下，性能与手写 HLSL 相当。过度使用复杂节点或过多采样会导致性能下降。使用 Shader Graph Profiler 分析。

**Q4: 如何将 ShaderGraph 用于粒子系统？**
A: 在 Surface State 中调整 Blend Mode 为 Additive，将 Alpha 连接到粒子控制逻辑（如生命周期）。

**Q5: ShaderGraph 支持 VR/AR 吗？**
A: 支持。URP 和 HDRP 的 ShaderGraph 均可用于 XR 项目。注意在 Surface State 中启用 Stereo Instancing。

**Q6: 如何修改 ShaderGraph 的默认属性？**
A: 打开 Graph Inspector（Window → Rendering → Shader Graph Inspector），可修改渲染队列、渲染类型、全局预处理符号等。

---

*本文档最后更新：2026-08-26*

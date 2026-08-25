# GPUAnimation 模块交接文档

## 1. 模块概述

GPUAnimation 是一个 Unity GPU 动画系统，通过将蒙皮网格动画烘焙到纹理中，在 GPU 上进行顶点动画播放，避免 CPU 骨骼计算开销。

### 1.1 技术优势

| 特性 | 说明 |
|------|------|
| **高性能** | 避免 CPU 骨骼蒙皮计算，动画完全在 GPU 执行 |
| **GPU 实例化** | 支持大量相同模型的独立动画播放 |
| **低 DrawCall** | 相同模型可批处理渲染 |
| **适用场景** | RTS 游戏、大量同质单位（如小兵、怪物） |

### 1.2 技术原理

```
传统骨骼动画流程:
Animator -> CPU骨骼计算 -> SkinnedMeshRenderer -> GPU渲染

GPU动画流程:
烘焙阶段: Animator动画 -> 采样顶点位置 -> 存储到纹理
运行阶段: GPU读取纹理顶点位置 -> 直接渲染（无CPU骨骼计算）
```

---

## 2. 目录结构

```
Assets/DevCodeFM/GpuAnimation/
├── Editor/
│   └── BakeBatchEditor.cs          # 动画烘焙编辑器窗口
├── Resources/
│   └── Shaders/
│       ├── GPUInstance.shader       # 基础实例化Shader
│       └── Unlit_GPUAnimation.shader # GPU动画专用Shader
└── Scripts/
    ├── BakeAniData.cs               # 烘焙数据ScriptableObject
    └── GPUAnimationPlayer.cs        # 运行时动画播放器
```

---

## 3. 快速上手

### 3.1 烘焙动画（图文教程）

#### 步骤1：打开烘焙窗口

打开菜单 `GPUAnimation -> BakeAniData`

#### 步骤2：配置烘焙参数

![[Pasted image 20260323151751.png]]

| 参数 | 说明 |
|------|------|
| **Animator** | 目标动画控制器。如果没有Animator，可创建一个空的Animator组件 |
| **Clips** | 拖拽对应的动画文件进去 |
| **Renders** | 用于多网格模型（如士兵模型和武器是两个网格），需要把Prefab下所有SkinnedMeshRenderer都拖进去 |

#### 步骤3：模型导入设置

![[Pasted image 20260323152125.png]]
![[Pasted image 20260323152146.png]]

**重要**：动画设置的Mask里面要ToggleAll，所有的节点都要勾选

![[Pasted image 20260323152216.png]]

#### 步骤4：生成资源

点击"创建"按钮，烘焙完成后会在以下目录生成资源：

| 资源类型 | 路径格式 | 说明 |
|----------|----------|------|
| 动画数据 | `Assets/Art/GpuAnimation/Data/{ModelName}.asset` | BakeAniData 资源 |
| 位置纹理 | `Assets/Art/GpuAnimation/Textures/{ModelName}/{MeshName}_Pos.png` | 顶点位置纹理 |
| 法线纹理 | `Assets/Art/GpuAnimation/Textures/{ModelName}/{MeshName}_Normal.png` | 顶点法线纹理 |
| 材质 | `Assets/Art/GpuAnimation/Materials/{ModelName}/{MeshName}.mat` | GPU动画材质 |
| 预制件 | `Assets/Art/GpuAnimation/Prefabs/{ModelName}.prefab` | 完整预制件 |

### 3.2 使用预制件

烘焙完成后，在 `Assets/Art/GpuAnimation/Prefabs/` 下找到生成的预制件，直接拖入场景使用即可。

---

## 4. 核心类详解

### 4.1 BakeAniData.cs - 烘焙数据容器

**路径**: `Scripts/BakeAniData.cs`

**类型**: ScriptableObject

**功能**: 存储烘焙后的 GPU 动画数据

#### 数据结构

```csharp
public class BakeAniData : ScriptableObject
{
    public int totalFrame;              // 总帧数
    public int totalVertexNum;          // 顶点总数
    public Vector3 minPos;              // 包围盒最小点（用于归一化）
    public Vector3 measure;             // 包围盒尺寸（用于反归一化）
    public GpuSkinningAnimClip[] clips; // 动画剪辑数组

    // 动画名称到剪辑的字典（懒加载）
    public Dictionary<string, GpuSkinningAnimClip> AnimClipsDict;
}
```

#### GpuSkinningAnimClip - 动画剪辑信息

```csharp
[Serializable]
public class GpuSkinningAnimClip
{
    public string name;        // 动画名称
    public int startFrame;     // 起始帧
    public int endFrame;       // 结束帧
    public float frameRate;    // 帧率

    // 计算属性
    public int Length();               // 帧数 = endFrame - startFrame + 1
    public float GetDuration();        // 时长 = Length / frameRate
    public float GetPerFrameDuration(); // 每帧时长 = 1 / frameRate
}
```

#### GpuMeshRenderAnimClip - MeshRenderer动画信息

```csharp
[Serializable]
public class GpuMeshRenderAnimClip
{
    public Vector3[] localPos;      // 本地位置数组
    public Quaternion[] localRot;   // 本地旋转数组
    public Vector3[] localScale;    // 本地缩放数组
}
```

---

### 4.2 GPUAnimationPlayer.cs - 动画播放器

**路径**: `Scripts/GPUAnimationPlayer.cs`

**类型**: MonoBehaviour 组件

**功能**: 运行时控制 GPU 动画播放

#### 核心属性

```csharp
public class GPUAnimationPlayer : MonoBehaviour
{
    // 配置参数
    public BakeAniData aniData;          // 烘焙数据引用
    public float rate = 120.0f;          // 动画帧率
    public float speed = 1f;             // 播放速度
    public bool loop = true;             // 是否循环
    public Vector4 color = Vector4.one;  // 颜色（用于实例化变色）

    // 运行时状态
    public float runTime;                // 已运行时间
    public float currentFrame;           // 当前帧
    public string currAniName;           // 当前动画名称
    public bool isAniEnd;                // 动画是否结束

    // 事件系统
    public UnityEvent<GPUAnimationPlayer> OnAniBeginEvent;     // 动画开始
    public UnityEvent<GPUAnimationPlayer> OnAniUpdateEvent;    // 动画更新
    public UnityEvent<GPUAnimationPlayer> OnAniEndEvent;       // 动画结束
    public UnityEvent<GPUAnimationPlayer, AnimEventData> OnAniKeyFrameEvent; // 关键帧事件
}
```

#### 核心方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `Play` | `string aniName, bool loop, float speed = 1` | 播放指定动画 |
| `Stop` | - | 停止播放 |
| `ContinuePlay` | - | 继续播放 |
| `SetColor` | `Color color` | 设置颜色（实例化变色） |
| `ContainAnimation` | `string aniName` | 检查是否包含动画 |

#### 关键帧事件系统

```csharp
[System.Serializable]
public class AnimEventData
{
    public string AnimName;     // 动画名称
    public float EventFrame;    // 触发帧数
}

// 使用示例
public List<AnimEventData> AnimEventDatas = new List<AnimEventData>();

// 监听关键帧事件
player.OnAniKeyFrameEvent.AddListener((p, eventData) => {
    Debug.Log($"动画 {eventData.AnimName} 在帧 {eventData.EventFrame} 触发事件");
});
```

#### 编辑器调试

在 Unity 编辑器中，按数字键 0-9 可快速切换播放对应索引的动画。

---

### 4.3 BakeBatchEditor.cs - 烘焙编辑器

**路径**: `Editor/BakeBatchEditor.cs`

**类型**: EditorWindow

**菜单路径**: `GPUAnimation/BakeAniData`

**功能**: 将 Animator 动画烘焙为 GPU 动画数据

#### 烘焙参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `animator` | Animator | 目标动画控制器 |
| `clips` | AnimationClip[] | 要烘焙的动画剪辑数组 |
| `renders` | SkinnedMeshRenderer[] | 要烘焙的蒙皮网格渲染器 |
| `sampleCount` | int | 每个动画的采样帧数（默认100） |

#### 烘焙流程

```
1. 遍历所有动画帧，采样 SkinnedMeshRenderer
2. 计算所有帧的包围盒 (minPos, maxPos)
3. 将顶点位置归一化到 [0,1] 范围并存储到纹理
4. 将法线映射到 [0,1] 范围并存储到纹理
5. 创建 BakeAniData 资源保存动画信息
6. 创建材质并设置动画纹理
7. 创建预制件包含 MeshRenderer + GPUAnimationPlayer
```

#### 纹理格式

| 属性 | 值 |
|------|-----|
| 位置纹理尺寸 | 宽度 = 顶点数，高度 = 总帧数 |
| 法线纹理尺寸 | 宽度 = 顶点数，高度 = 总帧数 |
| 像素格式 | RGBA32 (无压缩) |
| Filter Mode | Point (最近邻采样) |

---

## 5. Shader 详解

### 5.1 Unlit_GPUAnimation.shader

**路径**: `Resources/Shaders/Unlit_GPUAnimation.shader`

**渲染类型**: Unlit（无光照）/ 简单光照

#### Shader 属性

```hlsl
Properties
{
    _MainTex("Texture", 2D) = "white" {}        // 主纹理（贴图）
    _PosTex("PosTex", 2D) = "white" {}          // 顶点位置动画纹理
    _VertexCount("_VertexCount", int) = 6000    // 顶点总数
    _NormalAnimTex("_NormalAnimTex", 2D) = "white" {}  // 法线动画纹理
    _MinPos("_MinPos", Vector) = (0,0,0,0)      // 包围盒最小点
    _MaxMeasure("_MaxMeasure", Vector) = (1,1,1,1) // 包围盒尺寸
    _Factor1("_Factor1", float) = 0.3           // 光照系数1
    _Factor2("_Factor2", float) = 0.7           // 光照系数2
    _MainColor("Color", Color) = (1,1,1,1)      // 主颜色
    _Scale("Scale", float) = 1                  // 缩放因子
}
```

#### 实例化属性

```hlsl
UNITY_INSTANCING_BUFFER_START(Props)
    UNITY_DEFINE_INSTANCED_PROP(float, _TimeOffset)   // 动画时间偏移（核心！）
    UNITY_DEFINE_INSTANCED_PROP(float4, _Color)       // 实例颜色
UNITY_INSTANCING_BUFFER_END(Props)
```

#### 核心顶点着色器逻辑

```hlsl
v2f vert(appdata v, uint vid : SV_VertexID)
{
    UNITY_SETUP_INSTANCE_ID(v);

    // 计算纹理采样坐标
    float x = (float)vid;                              // 顶点ID作为X坐标
    float y = UNITY_ACCESS_INSTANCED_PROP(Props, _TimeOffset); // 时间偏移作为Y坐标

    // 从纹理采样顶点位置
    #if defined(UNITY_COLORSPACE_GAMMA)
        float3 pro = tex2Dlod(_PosTex, float4(x / _VertexCount, y, 0, 0)).xyz;
    #else
        float3 pro = pow(tex2Dlod(_PosTex, float4(x / _VertexCount, y, 0, 0)).xyz, 1/2.2f);
    #endif

    // 反归一化顶点位置
    v.vertex.xyz = pro * _MaxMeasure.xyz + _MinPos.xyz;
    v.vertex.xyz *= _Scale;

    // 从纹理采样法线
    float3 normal = (tex2Dlod(_NormalAnimTex, float4(x / _VertexCount, y, 0, 0)) * 2 - 1).xyz;

    // 转换到世界空间
    o.normal = mul((float3x3)unity_ObjectToWorld, normal);

    return o;
}
```

#### 片段着色器光照

```hlsl
fixed4 frag(v2f i) : SV_Target
{
    fixed4 col = tex2D(_MainTex, i.uv);
    col *= i.color;  // 应用实例颜色

    // 简单方向光照
    col *= dot(normalize(i.normal), normalize(float3(1, 1, 0))) * _Factor1 + _Factor2;

    return col * _MainColor;
}
```

#### ShadowCaster Pass

包含阴影投射 Pass，支持实时阴影渲染。

### 5.2 GPUInstance.shader

**路径**: `Resources/Shaders/GPUInstance.shader`

**功能**: 基础 GPU 实例化示例 Shader

仅支持实例化颜色属性，不包含动画功能。

---

## 6. 代码示例

### 6.1 基础播放

```csharp
public class Enemy : MonoBehaviour
{
    private GPUAnimationPlayer animPlayer;

    void Start()
    {
        animPlayer = GetComponent<GPUAnimationPlayer>();

        // 播放跑步动画，循环播放
        animPlayer.Play("Run", loop: true, speed: 1f);
    }

    void Update()
    {
        // 切换到攻击动画
        if (Input.GetKeyDown(KeyCode.Space))
        {
            animPlayer.Play("Attack", loop: false, speed: 1.5f);
        }
    }
}
```

### 6.2 监听动画事件

```csharp
void Start()
{
    animPlayer = GetComponent<GPUAnimationPlayer>();

    // 监听动画结束
    animPlayer.OnAniEndEvent.AddListener(OnAnimationEnd);

    // 监听关键帧事件
    animPlayer.OnAniKeyFrameEvent.AddListener(OnKeyFrame);
}

void OnAnimationEnd(GPUAnimationPlayer player)
{
    Debug.Log($"动画 {player.currAniName} 播放结束");

    // 攻击结束后切换回待机
    if (player.currAniName == "Attack")
    {
        player.Play("Idle", loop: true);
    }
}

void OnKeyFrame(GPUAnimationPlayer player, GPUAnimationPlayer.AnimEventData eventData)
{
    // 在攻击动画的特定帧触发伤害
    if (eventData.AnimName == "Attack" && eventData.EventFrame == 50)
    {
        DealDamage();
    }
}
```

### 6.3 配置关键帧事件

在 Inspector 中配置 `AnimEventDatas` 列表：
- AnimName: 动画名称
- EventFrame: 触发帧数

### 6.4 实例化变色

```csharp
// 设置颜色（用于区分不同阵营或状态）
animPlayer.SetColor(new Color(1f, 0.5f, 0.5f, 1f)); // 红色（受伤）

// 或直接设置
animPlayer.color = new Vector4(0.5f, 1f, 0.5f, 1f); // 绿色
```

### 6.5 GPU 实例化批量生成

```csharp
using UnityEngine;

public class UnitSpawner : MonoBehaviour
{
    public GameObject prefab;  // GPU动画预制件
    public int count = 1000;

    void Start()
    {
        for (int i = 0; i < count; i++)
        {
            var unit = Instantiate(prefab, RandomPosition(), Quaternion.identity);
            var player = unit.GetComponent<GPUAnimationPlayer>();

            // 随机播放速度，使动画不同步
            player.speed = Random.Range(0.8f, 1.2f);
            player.Play("Walk", loop: true);
        }
    }

    Vector3 RandomPosition()
    {
        return new Vector3(
            Random.Range(-50f, 50f),
            0,
            Random.Range(-50f, 50f)
        );
    }
}
```

### 6.6 检查动画是否存在

```csharp
if (animPlayer.ContainAnimation("Jump"))
{
    animPlayer.Play("Jump", loop: false);
}
else
{
    Debug.LogWarning("该模型没有 Jump 动画");
}
```

---

## 7. 性能优化建议

### 7.1 纹理优化

| 建议项  | 说明                                                     |
| ---- | ------------------------------------------------------ |
| 纹理大小 | 顶点数 × 总帧数，注意不要超过2048限制，如果真超了看手机性能了，现在好像是4096在手机上也可以带的动 |
| 压缩格式 | **禁止压缩**，必须使用无压缩格式（RGBA32）                             |

### 7.2 渲染优化

| 建议项 | 说明 |
|--------|------|
| 批处理 | 相同模型使用 GPU Instancing 可大幅降低 DrawCall |
| LOD | 远距离单位可降低动画帧率或使用简化模型 |

---

## 8. 相关文件清单

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| `Scripts/BakeAniData.cs` | C# Script | 烘焙数据 ScriptableObject |
| `Scripts/GPUAnimationPlayer.cs` | C# Script | 运行时动画播放器 |
| `Editor/BakeBatchEditor.cs` | C# Editor | 烘焙编辑器窗口 |
| `Resources/Shaders/Unlit_GPUAnimation.shader` | Shader | GPU 动画渲染 Shader |
| `Resources/Shaders/GPUInstance.shader` | Shader | 基础实例化示例 Shader |

---

*文档编写: Claude Code*
*最后更新: 2026-03-23*

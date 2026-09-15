# SLG 项目性能优化

> 适用范围：Unity 3D SLG 手游（等距大地图 + 大量单位 + 建筑 + 特效构成）
> 记录时间：2026-09-09

## 一、顶点/面数优化

### 1. 预算与监控

| 场景 | 三角形预算（中端机参考） | 说明 |
|------|--------------------------|------|
| 大地图（等距视角，同屏建筑多） | 30 万~50 万 tri | 建筑重复度高，是主战场 |
| 战斗/城战 | 15 万~30 万 tri | 单位 + 特效叠加 |
| 单帧总 draw call | 100~200 | 比面数更容易先撞墙 |

用 `Stats`（Triangle/Vertices/Draw calls）+ Frame Debugger 先测基线，别凭感觉优化。

### 2. 降面数手段

- **LODGroup**：建筑/单位 3 级 LOD（100% / 50% / 20%）。等距地图相机距离变化不大，LOD 阈值要按**相机高度**而非距离调，否则会"跳"
- **远景合并**：离屏远处的建筑合并成 chunk mesh（静态合批），近景才用独立 prefab
- **减面而非堆模**：低模 + 法线贴图 > 高模。SLG 图标感建筑 300~800 tri 足够
- **特效面数单列预算**：粒子通常比模型更费（overdraw + 面数双杀），粒子用 billboard 别用 3D mesh
- **地形**：hex 格/地块贴图化优先，真正 3D 化的地块做 chunk 合并 + LOD

### 3. 顶点数的隐形成本（大坑）

**顶点数 ≠ 三角面数**。Unity 的顶点成本 = 顶点 × (UV 套数 + normal + tangent)：

- 一个 1000 tri 的模型带 2 套 UV + tangent，动态合批里算 5000 "顶点"
- **动态合批上限 32k 顶点**（不是三角面！），UV2（lightmap UV）会把合批额度吃掉一半——**只给真正烘焙光照的模型留 UV2**
- 法线/切线缺失或冗余（不用法线贴图的模型可去掉 normal 通道）都会影响合批

## 二、Draw Call / 批次优化

### 1. 四条合批路线（URP 下按优先级）

| 路线 | 条件 | 注意 |
|------|------|------|
| **SRP Batcher**（URP 首选） | 所有材质走同一 shader 属性布局 | 自定义 shader 必须把材质属性放进**单个 CBUFFER("UnityPerMaterial")**，否则逐材质 fallback，批次全废 |
| **GPU Instancing** | 重复模型（建筑、树木、地块） | 顶点数有上限（通常 <32k）；shader 要声明 `#pragma multi_compile_instancing`；**非均匀缩放会导致实例法线错误** |
| **Dynamic Batching** | 小单位移动体 | ≤32k 顶点/网格、同材质、不透明；单位多时 CPU 开销别低估 |
| **Static Batching** | 固定场景 | 内存翻倍（合并 mesh 常驻），动态物体勿用 |

### 2. 减 draw call 的运营手段

- **材质合并 + 图集**：同场景建筑共享 1~2 张 2K 图集，材质数从几十降到个位数——这是 SLG 场景最有效的单一手段
- **子网格（submesh）= 隐式 draw call**：一个 mesh 5 个子网格就是 5 次 draw，合模型时顺手合并
- **同屏实例控制**：远景建筑用"1 个 prefab + 贴图换装"，避免每种建筑独立材质
- **剔除**：等距地图的"遮挡"其实是**视野外裁剪**——按 hex 坐标做手动 frustum 剔除比 Occlusion Culling 更可控（Occlusion Culling 对动态建筑无效且烘焙极慢，SLG 里通常不用）
- **避免 SetActive 风暴**：切换场景/建筑进出用对象池，批量开关合并到一帧

## 三、模型侧的坑

1. **非均匀缩放**：最经典坑。破坏法线/切线正确性 → 光照错乱、**直接禁用 dynamic batching 和 instancing**、shadow 变形。建模统一 scale=1
2. **Pivot 与缩放不一致**：LOD 切换时模型"跳一下"，多半是各级 LOD 的 pivot/scale 没对齐
3. **骨骼上限**：移动端 skinned 模型骨骼控制在 20~30，每顶点最多 4 权重；骨骼数直接决定 CPU 蒙皮成本（战斗同屏 50 个单位时这是 CPU 大项）
4. **BlendShape 内存**：每个 blendshape 复制一份顶点缓冲，移动端慎用
5. **Mesh 压缩选项**：有压缩时 Read/Write Enabled 会失效（运行时无法访问顶点数据），做运行时网格合并的别开压缩
6. **UV 重叠/断缝**：lightmap 下 UV 重叠会导致光照烘串；合批不受影响但贴图拼接处容易漏光
7. **重叠共面几何（Z-fighting）**：地砖/屋顶/装饰重叠面闪烁，拉开 Z 或开 polygon offset
8. **法线方向错误**：从 Maya/Max 导入后法线朝内，背面黑穿

## 四、材质/Shader 侧的坑

1. **材质数 = draw call 下限**：同 mesh 不同材质不合并。检查清单：同图集不同材质 → 合；纯色差 → 用 shader 属性/instancing 数据而非新材质
2. **Shader Variant 爆炸**：每个 keyword 组合都编译。移动端（尤其 iOS Metal）variant 缓存上限有限，超了**启动时卡几秒**。自定义 shader 砍掉用不到的 multi_compile，用 shader variant strip 配置
3. **半透明 overdraw**：SLG 里最贵的往往不是模型是**特效 + 半透明 UI/遮罩**。粒子层数、UI 全屏半透明层、选中框/飘字都要查 overdraw（GPU Profiler 看 fillrate）
4. **透明排序**：粒子与透明 UI 穿插会排序错误；特效固定 render queue，别用自动排序
5. **贴图**：
   - 移动端 ASTC 压缩；Mipmap 必须开（LOD 纹理），但 ASTC block 尺寸选 4x4/6x6 平衡
   - **通道浪费**：只用了 RGB 的图若带 alpha 通道会多传 25% 带宽；mask 图（法线+AO 合一张）比拆两张省带宽
   - 同场景 2K 图 × N 材质 → 显存 = N × 20MB，图集化是显存 + 批次双赢
6. **自定义 shader 不兼容 SRP Batcher**：URP 下最常见性能事故——shader 看起来正常，但属性布局不对导致每材质一个 kernel，Frame Debugger 里 SRPBatcher 状态全红
7. **阴影成本按材质计**：每个 cast shadow 的材质多一份 shadow pass。远景建筑/装饰关阴影投射（Rendering Layer 或 shader 里判）
8. **Outline/描边 shader 多 pass**：每个 pass 都是一次 draw，卡通描边 ×2、×3 直接翻倍，SLG 大地图慎用
9. **Lightmap 混合光照**：Baked Indirect / Mixed 模式每材质多一遍光照采样；SLG 建筑全 baked 最省，动态单位用 realtime + 探针

## 五、落地优先级

1. **P0 — 材质/图集审计**：跑一遍场景，统计同屏材质数与贴图显存，建筑图集化（收益最大、风险最低）
2. **P0 — 确认所有自定义 shader 的 SRP Batcher 兼容性**（属性全进 `UnityPerMaterial` CBUFFER）
3. **P1 — 建筑实例化 + 远景 chunk 合并**（等距地图同屏建筑多，instancing/合批收益直接）
4. **P1 — 特效 overdraw 治理**（粒子面数 + 层数预算）
5. **P2 — LOD 体系 + 手动视野剔除**（按 hex 坐标裁剪视野外建筑）

## 附：常用排查工具速查

| 工具              | 看什么                                        |
| --------------- | ------------------------------------------ |
| Stats（游戏内）      | Triangle / Vertices / Draw calls 实时基线      |
| Frame Debugger  | 逐 draw 的批次归属、SRP Batcher 是否命中              |
| GPU Profiler    | fillrate / overdraw（半透明杀手）                 |
| Memory Profiler | 贴图显存、mesh 压缩是否生效                           |
| 编辑器合批日志         | `MeshRenderer.dynamicBatches` 日志确认合批是否真的发生 |

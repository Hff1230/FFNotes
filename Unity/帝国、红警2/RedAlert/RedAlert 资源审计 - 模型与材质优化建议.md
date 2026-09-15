> 归档自项目 `E:\WorkSpace\RedAlert_SuperFormation`
> 审计日期：2026-09-15 ｜ 引擎：Unity 2022.3.62f1
> 数据口径：解析 FBX 二进制节点树 + .mat/.meta/.prefab 原文，离线统计，不依赖 Unity 编辑器
> 原始数据（jsonl / csv / 解析脚本）在项目 `Tools/res_audit/` 下，未随本文档归档
> 关联：[[RedAlert 减面优先级与材质合批建议]]

**■ ResDepends/default 模型与材质优化建议报告**

> **补充（2026-09-15 追加）**：减面与合批的派单细则见同目录[[RedAlert 减面优先级与材质合批建议]]。
> 该文档查明了一条本报告未覆盖的链路：**运行时单位网格实际来自 `Assets/AssetBundles/DayZ/PlatformDefault/Default/Share/Meshes/*.fbx`（39 个，与 ResDepends/default 下同名文件字节完全相同）**，且单位/关卡由 `Config/DataAtlas/{Shot_enemyPlacement,Shot_Round,Shot_hero}.json` 驱动。做减面排期时请以那份文档为准。

- 项目：`E:\WorkSpace\RedAlert_SuperFormation`（Unity 2022.3.62f1，Android/iOS 手游）
- 审计对象：`Assets/ResDepends/default`（3.45 GB，30 626 个文件）
- 审计时间：2026-09-15
- 数据来源：**离线直接解析 FBX 二进制/ASCII 节点树 + OBJ + .mat/.meta/.prefab 原文**，不依赖 Unity 编辑器，全部数字可在 `Tools/res_audit/` 下复核
- 复现命令（在 `Tools/res_audit/` 下）：
  ```
  python fbx_scan.py "…/Assets/ResDepends/default" fbx_scan.jsonl   ＃ 逐模型解析
  python mat_tex_scan.py "…/Assets/ResDepends/default" .            ＃ 材质/贴图/引用
  python global_ref_scan.py                                         ＃ 全 Assets 引用图
  python analyze_fbx.py / analyze_mat_tex.py / analyze_deep.py /
         analyze_scale.py / analyze_final.py / analyze_names.py / analyze_dead_models.py
  ```

> **口径说明（重要）**
> 1. 顶点/面数为 **FBX 源文件真实几何数据**（解压 PolygonVertexIndex 数出多边形，按 n−2 折算三角面），非估算。
> 2. Unity 导入端还会做顶点焊接（`weldVertices=1`）、切线计算等，**运行时真实 `mesh.vertexCount` 需在编辑器复核**（见第 7 节脚本）。报告中对这类结论已标注「待复核」。
> 3. 「未引用/死资产」统计基于 guid 引用图（含 `.meta` 内引用）+ `assetBundleName` 打包标记 + 代码字符串按名加载，**看不到按 AB 名或运行时拼字符串的加载**，因此只作候选，不作删除依据。

---

**▍一、总览（硬数据）**

| 指标 | 数值 |
|---|---|
| 模型文件 | **1 828** 个（FBX 1 717 / OBJ 111），磁盘 **698.8 MB** |
| 网格对象（Mesh） | 3 408 个 |
| 顶点总数 | **5 335 804** |
| 三角面总数 | **2 668 770** |
| 材质槽合计 | 3 375 |
| 骨骼（LimbNode） | 30 630，蒙皮文件 **339**（蒙皮顶点 2 770 881，占 52%） |
| 动画曲线 / 关键帧 | 274 766 条 / **12 084 990 个键** |
| 材质文件 | 3 731 个（5.1 MB） |
| 贴图文件 | 3 162 张（**1 344.1 MB**） |

三角面按目录分布：`Battle` 1 790 115（67.1%）、`RedShoot` 675 670（25.3%）、`KingShot` 145 331（5.4%）、`Particle` 38 127、`WorldMapPiece` 8 499。

---

**▍二、P0：导入设置（改设置即可收益，风险最低）**

> 依据：全部 1 828 个 `*.fbx.meta` 的 ModelImporter 字段统计。

**· 2.1 `meshCompression` 几乎全关（1 823/1 828 = 99.7%）**

| 取值 | 文件数 |
|---|---|
| 0 = Off | **1 823** |
| 1 = Low | 1 |
| 3 = Medium | 4 |

**后果**：网格顶点数据以未量化形式进包/占内存。基础顶点属性估算 `5 335 804 × (pos12+normal12+tangent16+uv8) + 索引 15.3 MB ≈ 259.5 MB`（未压缩口径），开 Medium 经验上可省 **30%～50%**。
**建议**：对**静态场景/道具**（`Battle/Scene*`、`Battle/*/Models`、`WorldMapPiece`、`CityPrefab` 等）批量开 **Low/Medium**；带蒙皮的角色模型建议先在真机看蒙皮形变与包体收益再决定（压缩在加载时解压，代价是加载 CPU 峰值）。可通过分目录打包 + 逐目录灰度验证。

**· 2.2 `isReadable` = 1（Read/Write Enabled）1 288/1 828 = 70.4%**

**后果**：每个网格在 CPU 内存里再保留一份数据（约等于网格体量），全量约数百 MB；移动端是硬内存成本。
**建议**：逐个确认是否真有运行时读取（MeshBaker 烘焙、GPU Animation 采样、碰撞网格生成、导出等）。可先用编辑器脚本列出「读顶点数据的调用方」，其余一律关掉。**这是单项收益最大、最安全的内存优化之一。**

**· 2.3 切线（Tangent）白算：92% 材质根本不用法线贴图**

- `tangentImportMode = 3 (Calculate)`：**1 774** 个文件；`2 (CalculateLegacy)` 44；其余 10。
- 全库 3 731 个材质中，带 `_BumpMap/_NormalMap/_NormalTex` 等法线槽的仅 **308 个（8.3%）**。

**后果**：切线是 16 B/顶点，全库 **81.4 MB** 属于白付；还额外消耗导入/构建时间。
**建议**：没有法线贴图的模型组（按目录/材质批量判断）把 Tangent Space → Tangents 设为 **None**；只在有法线贴图的资源上保留。

**· 2.4 相机 / 灯光 / 可见性 被一起导入（692 个文件）**

`importCameras=1` 692、`importLights=1` 692、`importVisibility=1` 694（仅 19 个关闭）。
**后果**：FBX 里若含相机/灯光，会在预制体层级里多出无意义 GameObject，且打断合批与实例化判定。
**建议**：这 692 个文件统一关掉（除非确有依赖 FBX 内相机/灯光的场景）。

**· 2.5 `importBlendShapes` = 1（724 个文件）但全库实际 BlendShape 数为 0**

解析结果：1 828 个模型的 BlendShape 总数 = 0。
**建议**：这 724 个文件可关掉，减少导入开销与潜在顶点通道占用。

**· 2.6 动画导入设置不统一**

| 设置                     | 分布                                                              |
| ---------------------- | --------------------------------------------------------------- |
| `animationCompression` | Optimal(3) 1 128 / **Keyframe Reduction(1) 698** / Off 2        |
| `animationType`        | Humanoid(3) 1 063 / Generic(2) 490 / None(0) 264 / Legacy(1) 11 |

**建议**：① 全部提到 **Optimal**；② 纯动作 FBX（`Standby/Death/Run/Skill/Atk_*`）绝大多数不需要 Humanoid 重定向，改 **Generic** 可省 Avatar 构建与采样开销——**需先在真机确认没有依赖 Humanoid 重定向的复用**（例如同一套动画喂不同模型）。

**· 2.7 良好的部分（保持）**

`addColliders=0`（1 828/1 828）、`keepQuads=0`（1 826）、`weldVertices=1`（1 828）、`indexFormat=Auto` 703 + Force32 8。

---

**▍三、P0：重复与冗余（磁盘与包体直接减重）**

**· 3.1 `ResDepends/default` 内部内容完全相同的文件：524 组，可回收 218.5 MB**

| 重复模式 | 组数 | 可回收 |
|---|---|---|
| `Battle/*` ↔ `RedShoot/hero/*`（同资产两套目录） | 236 | **145.7 MB** |
| `RedShoot/*` 内部重复 | 247 | 61.0 MB |
| `Battle/*` 内部重复 | 32 | 7.7 MB |
| 其他 | 9 | 4.1 MB |

典型例子：
- `Battle/ShootGameScene/FBX/gunlun.FBX` == `RedShoot/hero/ShootGameScene/FBX/gunlun.FBX`（各 12.03 MB）
- `Battle/ShootGameScene/FBX/changjing.FBX` == `RedShoot/hero/...(changjing.FBX)`（各 8.02 MB）
- `Battle/ShootGameScene/FBX/bantou.FBX` == `RedShoot/hero/...(bantou.FBX)`（各 6.39 MB）
- `Battle/ShootGameScene/MeshBaker/bossScene/BossScene-mat-_MainTex-atlas-0.png` == RedShoot 同名（各 19.74 MB）
- 4 份相同的 `kongbujiqiren.fbx`（Battle / Battle/ShootMonster / RedShoot/hero ×2）
- 6 份相同的 `handgun_death_A.FBX`（武器名不同但内容一致）

**建议**：指定唯一权威目录（建议保留 `Battle/`，`RedShoot/hero/` 只留真正独立的部分），用同一份资产 + 不同引用；一次性回收 **145.7 MB**，同时消除「改了一处忘了另一处」的风险。

**· 3.2 角色「一个动作一个 FBX，且每个 FBX 都带一整套网格/骨骼」：59 组，冗余磁盘 91.1 MB**

| 目录 | 相同网格份数 | 单份（面/顶点/骨骼） | 冗余磁盘 |
|---|---|---|---|
| `Battle/ShootGameGuiWangJiJia/Models` | 7 | 7 889 / 13 674 / 64 | 6.56 MB |
| `Battle/ShootGameNaTaSha/Models` | 7 | 4 947 / 8 202 / 65 | 5.35 MB |
| `Battle/ShootGameJuJiShou/Models` | 7 | 4 392 / 11 133 / 52 | 4.21 MB |
| `Battle/ShootGameCiBaoBubing/Models` | 6 | 3 801 / 6 096 / 51 | 3.47 MB |
| `Battle/ShootGameChaoShiKong/Models` | 6 | 3 235 / 5 643 / 54 | 3.23 MB |
| `Battle/ShootGameBaiHeZi/Models` | 4 | 4 793 / 8 376 / 90 | 3.23 MB |

合计：**冗余顶点 1 316 349、冗余三角面 718 959、冗余磁盘 91.1 MB**。
**后果**：除磁盘/包体外，每个动作文件各自带一套蒙皮网格，实例化时若误加载多份会直接吃内存。
**建议**：改成「一个模型 FBX（网格+骨骼）+ 多个动作 clip」的常规结构（模型 FBX 导出网格，动作 FBX 不带网格或改为 `.anim` 复用）。这是移动端角色资产的行业标准做法。

**· 3.3 另一套资产树与 `ResDepends/default` 有 65 个文件（70.9 MB）字节完全相同**

`Assets/AssetBundles/DayZ/PlatformDefault/Default/Share/Textures/**` 与 `ResDepends/default/RedShoot/hero/**/Textures/**` 内容一致（`jijia_D.png` 4.36 MB、`haibaobudui_D.png` 4.35 MB、`dunpaibing_D.png` 3.88 MB …）。
**建议**：明确两套树的职责（若 `AssetBundles` 是打包暂存，应由脚本从唯一源目录同步，而不是各存一份）。

---

**▍四、P1：几何本身（面数 / 顶点 / 结构）**

**· 4.1 高面数网格 Top 12（移动端单模型建议 3 k～10 k 三角面）**

| 三角面 | 顶点 | 材质槽 | 文件 |
|---|---|---|---|
| 49 978 | 74 931 | 1 | `KingShot/mesh/NPC/NPC_Sniper_A.fbx`（37.2 MB） |
| 46 608 | 70 896 | 1 | `Battle/Scene_guaji/tank_02_lvdai.FBX` |
| 44 681 | 83 424 | 1 | `Battle/Scene_guaji/gundong.FBX` |
| 42 058 | 107 232 | 1 | `Battle/Scene/Scene5.fbx` |
| 34 774 | 66 711 | 1 | `Battle/Scene/Scene4.fbx` |
| 32 924 | 50 004 | 1 | `Battle/Scene_guaji/gundong.FBX` |
| 30 109 | 52 845 | 1 | `Battle/Scene/Scene5.fbx` |
| 25 428 | 94 194 | 2 | `Battle/Scene/Scene2.fbx` |
| 24 089 | 44 067 | 4 | `Battle/Scene/Scene1.fbx` |
| 23 573 | 47 991 | 6 | `Battle/Scene/Scene3.fbx` |
| 23 447 | 46 167 | 1 | `Battle/Scene_guaji/gundong.FBX` |
| 23 211 | 42 057 | 3 | `Battle/Scene/Scene2.fbx` |

- **23 个网格 > 10 000 面**，合计 **557 376 面 = 全库 20.9%**。
- `KingShot/mesh/NPC/` 整批（Sniper_A/Sniper_B/SniperRifle/Mechanic/Drone）单文件 24～37 MB，是「胶片级」精度，若要在手机同屏出现多个 NPC，建议**减面到 1/4～1/6** 或做 LOD。
- **全工程只有 1 个 LOD 模型文件**（`Assets/Game/LastWarRed/Particle/danmulei/moxing/missile_003_lod0.FBX`），场景/角色基本没有 LOD 体系。

**· 4.2 顶点数超 16 位索引阈值（65 535）的 6 个网格**

`Scene5` 107 232 / `Scene2` 94 194 / `gundong` 83 424 / `NPC_Sniper_A` 74 931 / `tank_02_lvdai` 70 896 / `Scene4` 66 711。
**后果**：被迫用 32 位索引（+索引内存），且无法与其他网格合并进同一 16 位批次。
**建议**：优先给这 6 个做拆分或减面。

**· 4.3 顶点冗余比（verts / tris）整体 2.00 —— ⚠️ 待 Unity 复核**

- 全库 `5 335 804 / 2 668 770 = 2.00`；≥1 000 面的 532 个网格里，有 **518 个冗余比 > 1.5**，涉及面数占 **83.3%**。
- 最离谱：`RedShoot/hero/Animated Trees Package/Models/Firs/fir_2.fbx` 4.51、`Battle/PolygonHuanYing/Models/part.fbx` 4.35、`无人机.fbx`（6 个动作副本）4.03。
- 参考：良好焊接的三角网格比约 **0.5～0.7**。

**为什么待复核**：Unity 导入已开 `weldVertices=1`，会合并属性完全相同的顶点，运行时真实值可能低于 FBX 源值。请用第 7 节脚本导出 `mesh.vertexCount` 对照；若确认偏高，根因通常是**硬边（每面独立法线）/UV 接缝/多材质拆分**，对策是在 DCC 里合并平滑组、共享 UV、单材质合并。

**· 4.4 场景 FBX 的网格对象数（实例化后的 renderer/draw call 规模）**

| 网格对象数 | 材质槽合计 | 三角面 | 文件 |
|---|---|---|---|
| **710** | 771 | 45 890 | `Battle/ShootGameScene/FBX/bantou.FBX`（6.4 MB） |
| **171** | 171 | 123 018 | `Battle/ShootGameScene/FBX/changjing.FBX`（8.0 MB） |
| 72 | 72 | 19 195 | `RedShoot/测试角色2/models/ToonSoldiers_armies.FBX` |
| 61 | 61 | 238 | `Battle/ShootGameYaDianNa/Models/Shield.fbx` |
| 33 | 33 | 6 487 | `RedShoot/测试角色/models/ToonSoldiers_Militias.FBX` |

**后果**：这类 FBX 一旦整份实例化，就是 **700+ draw call**；`bantou.FBX` 的 771 个材质槽尤其危险。
**建议**：① 运行时**只用 MeshBaker 烘焙后的图集预制体**，原始 FBX 不进包（工程里已有 `ShootGameScene/MeshBaker/**` 的 4096 图集）；② `Shield.fbx` 61 个网格对象只有 238 个面，属于典型的「碎成 61 块」，应合并成 1 个网格；③ 建立检查：单 FBX 网格对象数 > 50 需走合批流程。

**· 4.5 多材质槽（子网格）拆分**

152 个网格材质槽 ≥2，最多 **8 槽**（`Scene2.fbx` 一个网格 8 槽 / 17 014 面）。单槽 → 1 draw call。
**建议**：≥3 槽的模型优先合并贴图（图集）后合成单槽；`Scene1/2/3` 尤其值得做。

**· 4.6 顶点属性冗余**

- **8 套 UV**：`Particle/FBX/helicopter.FBX`、`Battle/3D_feiji/ZSJ.FBX`（每套 UV = 8 B/顶点）。UV≥3 的网格 29 个。
- **顶点色**：708 个网格带顶点色（4 B/顶点）——若只是 AO，可考虑烘进贴图。
- 额外 UV 套合计成本约 **31.1 MB**。

**· 4.7 骨骼数**

**39 个模型骨骼数 > 60，最多 90**（`Battle/ShootGameBaiHeZi/Models/{Standby,Run,Skill,Death}.fbx` 各 90 骨；`kuangshouren_standby_new.fbx` 77；`YouLi` 系列 70；`guiwang` 系列 64）。
**后果**：骨骼数直接决定蒙皮矩阵计算与 `Skinning` 开销；90 骨在移动端同屏多个单位时极易成为瓶颈。
**建议**：① 减到 ≤ 60（手指/装饰骨合并或去掉）；② 项目已有 `GpuAnimation` 插件，大批同屏单位走 GPU 蒙皮；③ 检查 `maxBonesPerVertex=4` 是否满足（当前全部为 4）。

**· 4.8 动画数据**

- 关键帧合计 **12 084 990**；单文件最高 `Battle/ShootGameGuiWangJiJia/Models/guiwang_standby.fbx` **133 263 键**（1.9 MB）。
- 存在 **60 876 键**的 idle 动画（`测试角色2/3` 的 `*_guard_idle.FBX` 系列），典型的「按 60 fps 逐帧导出」。
- 帧率/冗余双杀：`animationCompression=1 (Keyframe Reduction)` 还有 698 个文件。
**建议**：① 统一 Optimal；② 导出侧把采样率降到 30 fps 并对无关骨骼做剔除；③ 用少量代表性的 clip 做「键数 → 包体」实测，再决定压缩容差。

---

**▍五、P2：材质与贴图**

**· 5.1 材质重复：393 组「shader + 贴图集合完全相同」，涉及 2 167 个材质**

- 最大一组 **175 个副本**（内置 shader + 1 张贴图），其次是 163、115、65、53…（集中在 `Particle/Material/Other`）。
- `Particle/Material/Other` 目录就有 **1 750 个材质**。
**后果**：AB 内重复序列化、破坏 SRP/动态合批的材质一致性判定，也拖慢维护。
**建议**：把「同 shader + 同贴图 + 同参数」的材质合并为共享引用（脚本可自动检测并生成替换映射，先跑 dry-run 出报告）。

**· 5.2 GPU Instancing：3 189/3 731（85.5%）关闭**

开启的 522 个：`KingShot` 391、`RedShoot` 77、`WorldMapPiece` 45、`Battle` 7。
**建议**：对**同材质重复摆放**的静态资源（建筑、树、路、地图块、弹壳、掉落物、粒子）开 `Enable GPU Instancing`，这是最便宜的 draw call 优化。`WorldMapPiece/3D/map_landform`（136 个材质）和 `Battle/*/Models` 是优先批。

**· 5.3 Shader 结构（总体健康）**

- 3 731 个材质用 **83 种 shader**；其中 **2 554 个（68.5%）是 Unity 内置**，且以「单贴图」为主：fileID `10720`（1 605 个）、`200`（321）、`10752`（215）、`10703`（104）、`203`（85）、`7`（66）——属于轻量的 Mobile/Legacy 系列，移动端友好；**Standard（fileID 46）仅 61 个**。
- 88 个材质 **一张贴图都不引用**（纯颜色/参数），可检查是否可合并或删除。

**· 5.4 ⚠️ 159 个 Live2D 材质引用的 shader 在工程内不存在**

| 缺失 shader guid | 材质数 | 典型文件 |
|---|---|---|
| `1e8a610c9e01c3648bac42585e5fc676` | 93 | `Live2D/*/[xxx]_Material.mat` |
| `53efa1d97f5d9f74285d4330cda14e36` | 51 | `Live2D/*/[xxx]_Material-Additive.mat` |
| `4e8caa36c07aacf4ab270da00784e4d9` | 15 | `Live2D/*/[xxx]_Material-Screen.mat` |
| `8bdcdc7ee298e594a9c20c61d25c33b6` | 1 | `Live2D/Hero10029_1/S_tanya_Material-Multiply.mat` |
| `c703e60d8900d33439f4519bed4c745c` | 1 | `Particle/Material/Other/cjb_di.mat` |

工程内既没有 Live2D/Cubism 包（`Packages/manifest.json`、`Library/PackageCache` 均无），`AssetBundles/.../Live2D/Live2DDepends/Shaders/` 下的两个 shader（`Mask.shader`、`Unlit.shader`）guid 与上面的完全不同。
**建议**：**开一个 Live2D 模型看是否显示为粉色**；若确实是缺失 shader，需补 Live2D Cubism SDK 或用现有 Unlit/Mask shader 重指（161 个材质可脚本批量重指）。

**· 5.5 贴图（3 162 张 / 1 344.1 MB）**

| 项目 | 数值 | 说明 |
|---|---|---|
| 3D 通用贴图**关闭 Mipmap** | **830 张 / 147.8 MB** | `Battle/Particle_HJ` 102、`Battle/3D_feiji` 44、`WorldMapPiece/3D` 42、`Battle/Scene` 18… 会远景闪烁/摩尔纹 + minification 采样效率差 |
| Sprite/UI 关闭 Mipmap | 1 260 张 | **正常**，UI 不需要 |
| 非 2 次幂 | **650 张** | 其中「3D + 关 mip」的非 POT 63 张（`Particle/image2` 7、`Battle/Particle_HJ` 4…），最易出现采样问题 |
| 源图尺寸 > maxTextureSize | 24 张 / **268.2 MB** | 如 `hai.png` 5 504×3 072、`Harrier_Fuselage_Color.png` 4 096²；运行时会被缩到 2 048，**仓库里白占 268 MB** |
| Crunch 压缩 | 全库 **未开** | Android 上开启可显著减包（代价：加载解压时间） |
| Streaming Mipmaps | 仅 3 张开 | 大世界场景可考虑 |
| Android 平台覆盖 | 约 **1 430 张**有独立覆盖项（多为 2048 + 压缩格式码 50/51/57），889 张无 Android 条目（走自动） | 建议核对两组是否都符合预期 |
| 最大贴图 | `BossScene-mat-_MainTex-atlas-0.png` 4 096² 19.74 MB；`Meshy_AI_Golden_Ring…` 20 566×22 584（0.52 MB） | |
| 异常 meta | `Image/ads_quan.png` 的 `maxTextureSize: 70224` | 手改残留值，建议修正 |

---

**▍六、疑似死资产（候选，需人工/流水线复核后再删）**

判定口径：guid 全工程无引用 ＋ 未标 `assetBundleName` ＋ 不在 `Resources/` ＋ 完整文件名/名字前缀都未出现在任何配置或代码文本中。

| 类型 | 数量 | 体积 |
|---|---|---|
| 模型（.fbx/.obj） | **615** | **138.9 MB** |
| 材质（仅 ResDepends/default 内 guid 无引用） | 911 | — |
| 贴图（ResDepends/default 内 guid 无引用） | 425 | — |
| 动画 .anim（ResDepends/default 内） | 250 | — |
| prefab（ResDepends/default 内） | 209 | — |

模型部分高度集中在**测试包**：

| 目录 | 数量 | 体积 |
|---|---|---|
| `RedShoot/测试角色2` | 249 | 50.3 MB |
| `RedShoot/测试角色3` | 213 | 48.1 MB |
| `RedShoot/测试角色` | 60 | 13.4 MB |
| `RedShoot/Mesh`（Meshy AI 生成物） | 2 | 16.3 MB |
| `KingShot/mesh` | 34 | 1.5 MB |

明细清单：`Tools/res_audit/candidate_dead_models.txt`
**注意**：`Battle/**/Models/*_standby.fbx` 这类看似无引用的角色模型，实际是**按角色名从 `Config/DataAtlas/*.json` 动态加载**的（已确认 `kuangshouren` 出现在 `Inner_city_monster.json`、`Shot_hero.json` 等），**不要按 guid 无引用直接删**。删除前请用真机/编辑器跑一遍资源加载日志。

---

**▍七、复核与落地脚本**

目录 `Tools/res_audit/`（在 `Assets/` 之外，不会被 Unity 导入）：

| 文件 | 用途 |
|---|---|
| `fbx_scan.jsonl` / `materials.jsonl` / `textures.jsonl` / `textures_settings.jsonl` / `guids.json` / `global_guids.json` | 全部原始数据（含每个模型的 meta 设置） |
| `明细_模型清单.csv`（1 828 行） | 顶点/面/材质槽/UV/骨骼/动画关键帧 + 导入设置 + 顶点冗余比，可直接 Excel 排序排期 |
| `明细_材质清单.csv`（3 742 行） | shader / instancing / 贴图数 / 同参数副本数 |
| `明细_贴图清单.csv`（3 162 行） | 尺寸 / maxSize / mipmap / Android 覆盖 |
| `candidate_dead_models.txt` | 疑似死模型清单 |
| `unity_scripts/ModelStatsDump.cs` | 编辑器脚本：导出 Unity 侧真实 `vertexCount` / `subMeshCount` / 内存估算（**只读**） |
| `unity_scripts/ImportSettingBatchFix.cs` | 编辑器脚本：批量修导入设置（**默认 dry-run，只出报告不改文件**，`AlsoFixIsReadable` 为显式开关） |
| `unity_scripts/compilecheck/` | 上述两个脚本的**离线编译校验**工程（引用 Unity 2022.3.62f1 真实托管程序集，`dotnet build` → 0 error / 0 warning） |

> 两个 `.cs` 已用 `C:\Program Files\Unity 2022.3.62f1\Editor\Data\Managed\UnityEngine\{UnityEngine,UnityEditor}.CoreModule.dll` 离线编译通过（0 错误 0 警告），但**尚未在编辑器里实际执行过**——请先跑 `ModelStatsDump`（只读）与 `ImportSettingBatchFix - 预演`，确认 CSV 无误后再考虑应用。

---

**▍八、建议执行顺序（按「收益 ÷ 风险」排序）**

| 优先级 | 动作 | 量化收益 | 风险/前提 |
|---|---|---|---|
| **P0-1** | 关掉 `isReadable`（1 288 个文件，先确认无运行时读网格的调用方） | 省数百 MB CPU 内存 | 低（需先查调用方） |
| **P0-2** | 静场资源开 `meshCompression=Low/Medium` | 网格内存/包体 **−30%～50%** | 低（可逐目录灰度） |
| **P0-3** | 无用法线贴图的模型把 Tangents 设为 None | **约 81 MB** 顶点属性 | 低 |
| **P0-4** | 关 `importCameras/importLights/importVisibility`（692 个文件）、关 `importBlendShapes`（724 个） | 层级更干净，减少无谓对象 | 低 |
| **P0-5** | 去重 `Battle` ↔ `RedShoot/hero` 与 `RedShoot` 内部重复 | **−145.7 MB / −218.5 MB（总量）** | 中（需确认 AB 归属与引用改指） |
| **P0-6** | 角色改「1 网格 FBX + N 动作」 | **−91.1 MB** 磁盘、−131 万冗余顶点 | 中（需美术配合重导） |
| **P1-1** | `KingShot/NPC` 整批减面 + 引入 LOD（当前全工程 1 个 LOD） | 同屏 NPC 数量上限提升 | 中 |
| **P1-2** | 场景 FBX 走 MeshBaker 图集，原始 FBX 不进包；`Shield.fbx` 等碎网格合并 | draw call 从 700+ 降到个位/十位 | 中 |
| **P1-3** | 6 个 >65 k 顶点网格拆分/减面 | 去掉 32 位索引 | 中 |
| **P1-4** | 动画统一 Optimal + 抽样降帧 | 关键帧 1 208 万 → 可显著下降 | 低 |
| **P1-5** | 骨骼 90/77/70 的模型减到 ≤60 或走 GPU 蒙皮 | 蒙皮开销线性下降 | 中 |
| **P2-1** | 静态重复资源开 GPU Instancing（当前 85.5% 关闭） | draw call 显著下降 | 低 |
| **P2-2** | 合并 393 组重复材质（2 167 个 → 约 1 957 个唯一） | AB 体积 + 合批判定 | 低（脚本可做映射） |
| **P2-3** | 3D 贴图 830 张补 mipmap；650 张非 POT 规范化；24 张源图降采样 | 观感 + 268 MB 仓库体积 | 低 |
| **P2-4** | 排查 159 个 Live2D 材质的缺失 shader | 避免粉色/错误渲染 | 需确认 SDK |

---

*报告由离线解析脚本生成，所有数字可在 `Tools/res_audit/` 下的 jsonl/csv 中逐条回溯核对。*

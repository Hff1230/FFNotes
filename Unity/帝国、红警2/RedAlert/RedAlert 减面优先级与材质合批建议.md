> 归档自项目 `E:\WorkSpace\RedAlert_SuperFormation`
> 审计日期：2026-09-15 ｜ 引擎：Unity 2022.3.62f1
> 数据口径：Config/DataAtlas 生成配置 + prefab 装配引用 + FBX 真实几何，全链路打通
> 原始数据（jsonl / csv / 解析脚本）在项目 `Tools/res_audit/` 下，未随本文档归档
> 关联：[[RedAlert 资源审计 - 模型与材质优化建议]]

**■ 减面优先级 + 材质合批建议（美术/程序协同排期）**

- 项目：RedAlert_SuperFormation（Unity 2022.3.62f1 手游）
- 生成时间：2026-09-15
- 数据来源：`Config/DataAtlas/*.json` 生成配置 + `prefab` 装配引用 + FBX 二进制真实几何，全部可回溯（脚本与 CSV 见文末）

---

**▍一、为什么不能"只按面数"排优先级**

移动端的真实成本 ≈ **同屏数量 × 单模型面数 × 蒙皮开销**，所以排序用的是「**生成次数 × 单模型面数**」这个加权值。

数据链（本次已全链路打通）：

```
Shot_enemyPlacement.json (投放→round列表)
        └─ Shot_Round.json  Composition = "角色ID;单位ID;数量"
                └─ Shot_hero.json   id → model 路径 (如 Game/KingShot/Models/Enemy_KongBuJiQiRen)
                        └─ *.prefab  → 引用的 FBX
                                └─ 被核对的三角面 / 顶点 / 骨骼数
```

> ⚠️ **重要范围修正**：运行时实际加载的单位网格位于
> `Assets/AssetBundles/DayZ/PlatformDefault/Default/Share/Meshes/*.fbx`（共 39 个，141,280 面），
> `ResDepends/default` 下的是**字节完全相同的副本**（已用 md5 逐个核对：Baihezi / GuangLeng / HaiHaboBudui / guiwang / kuangshouren / Dongyuanbing 全部一致）。
> 所以**改一处必须同步另一处**，否则改了没生效或两边不一致。

**· 实测：一次"投放"（一个关卡批次的敌人配置）**

| 投放 id | round 数 | 敌人总数 | 按配置累计三角面 | 累计顶点 |
|---|---|---|---|---|
| **10 / 11 / 12** | 166 | **308** | **1 854 572** | 3 129 303 |
| 111 | 27 | 51 | 325 227 | 553 356 |
| 110 | 45 | 45 | 299 982 | 499 767 |
| 7 / 8 / 9 | 71 | 71 | 268 778 | 491 832 |
| 13 | 34 | 34 | 192 819 | 352 836 |

**最大的投放 id=10/11/12 的完整构成（308 个单位 / 1 854 572 面）：**

| 单位 | 数量 | 单模型面数 | 小计面数 | 占比 |
|---|---|---|---|---|
| `KongBuJiQiRen` | 109 | 4 820 | 525 380 | 28.3% |
| `KuangShouRen` | 66 | 7 582 | 500 412 | 27.0% |
| `Soldier` | 59 | 6 879 | 405 861 | 21.9% |
| `GuiWangJiJia` | 32 | 7 889 | 252 448 | 13.6% |
| `FuSheGongBing` | 31 | 5 085 | 157 635 | 8.5% |
| `HugeZombie` / `JiaTeLin` / `BOSS_Enemy` | 6 / 4 / 1 | — | 12 836+ | <1% |

**这 5 个模型合计 1 841 736 面 = 投放总量的 99.3%**，其余 42 个单位（HugeZombie / BOSS_Enemy 等）合计不到 1%。**改这 5 个 = 改掉整个投放的面数**，比零散优化 100 个小模型有效得多。

> 口径说明：本表的"单模型面数"是 **prefab 内全部网格合计**（含挂载的阴影/底纹件，如 `biantai(masked_weighted).fbx`）；下面 P0 派单表用的是**该单位主网格自身**的面数（如 KuangShouRen 4 878 vs 7 582）。两者相差的就是附属件，减面时两者都要看。

生成节奏：每 0.1 秒生成 1 个（`PlayerManager.cs:343`），所以上表是**一次投放的累计量**，同屏存活数取决于击杀速度——建议在真机 HUD 上量一次实际同屏数，作为最终预算依据。

---

**▍二、减面优先级（直接可按此派单）**

**· 面数预算（移动端经验值，可按机型再收紧）**

| 类型 | 同屏规模 | 三角面目标 | 骨骼目标 |
|---|---|---|---|
| 杂兵 / 通用单位 | 数十个 | **1 500 ～ 2 000** | ≤ 30 |
| 中频单位 | 10 个上下 | **2 500 ～ 3 000** | ≤ 45 |
| 精英 / BOSS | 1 ～ 3 | **3 000 ～ 4 000** | ≤ 60 |
| 英雄 / 主角 | 1 | 8 000 ～ 10 000 | ≤ 70 |
| 坦克 / 载具 | 数个 | 3 000 ～ 4 000 | ≤ 20 |
| 场景静态块 | 每块 | ≤ 30 000 且**必须有 LOD** | — |

**· P0 —— 先做这 6 个（收益最大）**

（面数口径 = prefab 内全部网格合计，含挂载的阴影/底纹件；下表的"实际网格"列给出主网格面数）

| 优先级 | 单位 | 主网格文件（面数/骨骼） | 现面数 | 顶点 | 骨骼 | 投放内次数 | 关卡累计 | **目标** | 可省 |
|---|---|---|---|---|---|---|---|---|---|
| **P0-1** | `Enemy` | `GuangLeng.fbx`(5 843/10) | 5 843 | 10 692 | 10 | 46 | **390** | **1 800** | **−69%** |
| **P0-2** | `KongBuJiQiRen` | `kongbujiqiren.fbx`(4 820/17) | 4 820 | 8 469 | 17 | **109** | 7 | 1 800 | −63% |
| **P0-3** | `KuangShouRen` | `kuangshouren.fbx`(4 878/64) | 7 582 | 12 126 | 64 | **66** | 5 | 2 500 | −67% |
| **P0-4** | `GuiWangJiJia` | `guiwang.fbx`(7 889/64) | 7 889 | 13 674 | 64 | **32** | 8 | 2 500 | −68% |
| **P0-5** | `Soldier` | `Dongyuanbing.fbx`(4 175/43) | 6 879 | 11 316 | 43 | **59** | 16 | 2 500 | −64% |
| **P0-6** | `FuSheGongBing` | `fushebubing.fbx`(5 085/46) | 5 085 | 8 790 | 46 | **31** | 10 | 2 500 | −51% |

> **P0-1 单独说明**：`Enemy` 是**默认通用敌人**，462 个关卡累计生成 390 次，加权面数 228 万 —— 占全部单位加权总量（2 847 891）的 **80.0%**。它只有 10 根骨骼（坦克件），减面阻力最小、收益最大，**第一个就该动它**。
> **P0-3 / P0-5 附注**：`KuangShouRen`、`Soldier` 的 prefab 面数含共用底纹件 `biantai(masked_weighted).fbx`（2 704 面 / 24 骨），主网格本体分别只有 4 878 / 4 175 面 —— 底纹件是多个单位共用的，改它一次收益覆盖全部单位。

按目标值做完：
- `Enemy` 加权面数 2 278 770 → **702 000（−69%）**
- 最大投放（308 个单位）累计面数 1 854 572 → **678 200（−63%）**

**· P1 —— 中频单位（有明确收益，第二批，共 5 个）**

| 单位 | 主网格文件 | 现面数 | 骨骼 | 投放内 | 关卡累计 | 目标 | 可省 |
|---|---|---|---|---|---|---|---|
| `Friend` | `HaiHaboBudui.fbx` | 4 986 | 43 | 0 | 13 | 3 000 | −40% |
| `DuoGongNeng` | `DuoGongNengPaoTa.fbx`(3 242) + `DuoGongNengCheTi.fbx`(2 451) | 5 693 | 7 | 0 | 11 | 3 000 | −47% |
| `V3` | `v3.fbx` | 4 657 | 6 | 6 | 6 | 3 000 | −36% |
| `MeiGuoDaBing` | `meiguodabing.fbx`(2 494) + 共用底纹件 | 5 198 | 42 | 0 | 5 | 3 000 | −42% |
| `XiNiu` | `xiniutank.fbx` | 4 625 | 11 | 8 | 2 | 3 000 | −35% |

**· P2-① —— 低频单位 / 精英 BOSS（收尾批次）**

| 单位 | 现面数 | 骨骼 | 投放内 | 目标 | 说明 |
|---|---|---|---|---|---|
| `WeiLaiTanKe`（车体 2 618 + 炮塔 3 229） | 5 847 | 9 | 0 | 3 000 | 两件套 |
| `TianQi`（车体 3 592 + 炮塔 1 344） | 4 936 | 11 | 0 | 3 000 | |
| `YouLi` | 10 638 | **70** | 1 | 4 000 | 面数+骨骼双高，需一并处理 |
| `Friend_GuangLeng` | 5 843 | 10 | 0 | 3 000 | 与 `Enemy` 同一网格（GuangLeng.fbx），**做 P0-1 时自动受益** |
| `JiLuoFu` | 4 438 | 0 | 1 | 3 000 | 静态件，可直接套 P3 手段 |
| `JiaTeLin`（车体 2 000 + 炮塔 1 209） | 3 209 | 7 | 4 | 3 000 | 已接近目标，只做顶点清理 |
| `TanYa` / `HuiXiong` / `ZhanXiong` | 3 689 / 3 631 / 2 326 | 42 / 11 / 28 | 各 ≤1 | 3 000 | 低频，最后处理 |

> 💡 `Friend_GuangLeng`、`Friend`、`Soldier` 等多个单位共用同一批网格（GuangLeng / HaiHaboBudui / Dongyuanbing），**做 P0 时顺带覆盖它们**，不需要重复派单。

**· P2-② —— 减面同时必须减骨骼（64～90 骨的模型）**

| 模型 | 面数 | **骨骼** | 建议 |
|---|---|---|---|
| `Baihezi.fbx`（BaiHeZi 4 个动作副本） | 4 793 | **90** | 减到 ≤ 60，或走 GpuAnimation（工程已有插件） |
| `YouLi.fbx` | 3 900 | **70** | 同上 |
| `kuangshouren.fbx` / `guiwang.fbx` / `JuJiShou.fbx` / `NaTaSha` / `DunPaibing` | 4 392～7 889 | **52 ～ 65** | 合并手指/装饰骨，目标 ≤ 60 |

骨骼数直接决定每帧蒙皮矩阵计算量；**90 骨的模型同屏 3 个就等于 270 骨**，比减 1 000 个面更值钱。

**· P3 —— 场景静态资产：不要整体减面，改做拆块 + LOD + 图集**

| 资产 | 规模 | 正确处理方式 |
|---|---|---|
| `ShootGameScene/FBX/changjing.FBX` | 123 018 面 / 230 658 顶点 / 171 个网格对象 | 走 MeshBaker 图集 + 按镜头可见距离拆块；原 FBX 不进包 |
| `ShootGameScene/FBX/bantou.FBX` | **710 个网格对象** / 45 890 面 | 碎件合并成少量网格后图集化；710 个 renderer 是 draw call 灾难 |
| `Scene_guaji/gundong.FBX` | 113 288 面 / 83 424 顶点 | 拆块 + 远景 LOD；顶点数已超 65 535，被迫 32 位索引 |
| `Scene/Scene1~5.fbx` | 单网格 20 k～42 k 面，Scene1/2/3 有 3～8 材质槽 | 图集化到单槽 + LOD；Scene5 顶点 107 232 需拆分 |
| `WorldMapPiece`（树/路/河 OBJ） | 单件面数低但实例数 400～1 240 | **不减面**，做 LOD0/1/2 + 开 Instancing（见第三节） |

**· P4 —— 比减面更划算：这些根本不该进包**

| 资产 | 规模 | 建议 |
|---|---|---|
| `RedShoot/测试角色{,2,3}` | 462 个模型 / 112.4 MB | Toon Soldiers 测试包，三重引用匹配全无命中 → 移出仓库 |
| `MapEditor/MapEditorSevenKing.unity` | **26 762 renderer** / 38.5 MB | 编辑器场景，不进包 |
| `MapEditor/InnerMapDungeonMapEditor.unity` | 39.4 MB | 同上 |
| `AssetBundles/.../TS_Armies_sample_scene.unity` | 1 570 renderer（其中 1 512 蒙皮）/ 4 材质 | Sample 场景，不进包 |
| `Battle/ShootGameScene/MeshBaker/**` 的原始 FBX | 与图集版并存（gunlun 12 MB、changjing 8 MB、bantou 6.4 MB…） | 只让图集版进包 |

---

**▍三、材质合批建议（按"投入产出比"排序）**

**· 3.1 GPU Instancing —— 最便宜的一刀（先做）**

**现状：被 ≥100 个 renderer 实例引用的 35 个热门材质里，只有 6 个开了 Instancing，29 个关着。**

| 材质 | 渲染器实例数 | 出现 prefab | 当前 Instancing | 贴图数 |
|---|---|---|---|---|
| `WorldMapPiece/3D/map_landform/materials/**APR_map_tree.mat**` | **10 624** | 20 | **关** | 2 |
| `Battle/ShootGameScene/Materials/vray_green1.mat` | 2 352 | 4 | 关 | 1 |
| `WorldMapPiece/.../APR_worldmap_road_3.mat` | 2 230 | 15 | 关 | 2 |
| `WorldMapPiece/.../APR_worldmap_road_4.mat` | 2 142 | 15 | 关 | 2 |
| `WorldMapPiece/.../APR_worldmap_road_1.mat` | 1 719 | 15 | 关 | 2 |
| `WorldMapPiece/.../APR_worldmap_road_2.mat` | 1 445 | 15 | 关 | 2 |
| `WorldMapPiece/.../river_reflection.mat` | 889 | 16 | 关 | 1 |
| `WorldMapPiece/.../APR_MAP_ground.mat` / `_lod3` | 730 / 730 | 2 / 2 | 关 | 1 |
| `.../mountain_snow.mat` / `mountain_grass.mat` | 422 / 201 | 5 / 5 | 关 | 1 |
| `land_river/materials/meterial_land_river_T_1.mat`（及 _edge/_2/_3） | 420 / 418 / 188 / 298 | 7～9 | 关 | 1 |

**只开上面这 6 个最热的材质，就有约 19 000 个渲染器实例从「一实例一 draw call」变成「同网格同材质合 1 个」。**

操作：材质 Inspector 勾 **Enable GPU Instancing**；确认 shader 里带 `pragma multi_compile_instancing`（Unity 编译指令，行首带井号）（自定义 shader 需要补）。

⚠️ **会打破 Instancing 的情况**（美术/程序都要注意）：
1. 每实例用 `MaterialPropertyBlock` 单独改值（受击闪白、队伍换色、描边宽度、进度条）——引擎会**放弃合批**；
2. 同材质但网格不同（如树的多个变体 Grove_S_1…_7 是 7 个不同 mesh）——此时要靠 **LOD + 减少 mesh 变体**，或把变体做成同网格 + 顶点动画；
3. 材质上挂了不同贴图实例（同一 shader 多份材质）——需合并材质。

**· 3.2 静态合批（标记 Static）—— 地图块的主力手段**

| prefab / scene | 渲染器数 | 唯一材质 M | 唯一(网格+材质) K | 标 Static 后 draw call 上限 | 开 Instancing 后上限 |
|---|---|---|---|---|---|
| `WorldMapPiece/3D/map_landform/**APR_road_LOD3(19).prefab**` | 3 733 | 18 | 47 | **≈18** | ≈47 |
| `WorldMapPiece/3D/map_landform/**WorldThirdGroup.prefab**` | 3 456 | 12 | 36 | ≈12 | ≈36 |
| `WorldMapPiece/3D/map_landform/**layer_road_lod3(23).prefab**` | 2 644 | **4** | 20 | **≈4** | ≈20 |
| `WorldMapPiece/3D/map_landform/layer_custom_lod3/lod4` | 888 / 888 | 4 | 20 | ≈4 | ≈20 |
| `Battle/ShootGameScene/Prefab/**GameScene.prefab**` | 1 762 | 49 | 50 | ≈49（已 MeshBaker） | ≈50 |
| `Battle/ShootGameScene/Prefab/**bantou.prefab**` | 1 420 | **5** | 6 | ≈5（已烘焙） | ≈6 |
| `RedShoot/RPGground02.prefab` | 368 | 17 | 34 | ≈17 | ≈34 |

**做法**：地图块/地形/道路/建筑这些不会动的对象，在 Inspector 勾 **Static**（Contribute GI 视烘焙需要单列），让 Unity 做静态合批——**同一材质的不同网格也能合**，这是它比 Instancing 更适合地图的原因。
**注意**：勾了 Static 就不能再移动/缩放（会影响光照贴图），运行时动态生成的地图块需要走另一套（预先生成 prefab 或改用 Instancing）。

**· 3.3 图集与材质合并 —— 把材质种类数压下来**

| 目标 | 现状 | 建议 |
|---|---|---|
| `GameScene.prefab` | 1 762 个 renderer / **49 个材质** | 已有 MeshBaker 管线（4096×4096 图集），把剩余零散材质也并入，目标 **≤ 10** |
| `changjing.prefab` | 342 renderer / **43 个材质** | 同上 |
| `Free_Boss_Scene_Chengzhen.prefab` | 1 224 renderer / **40 个材质** | 同上 |
| 多材质槽网格 | **152 个网格材质槽 ≥2，最多 8 槽**（`Scene2.fbx` 一个网格 8 槽） | 图集化后合成单槽；单槽 = 单 draw call |
| 重复材质 | **393 组**参数完全相同，涉及 **2 167 个材质**（最大一组 175 个副本），集中在 `Particle/Material/Other`（1 750 个） | 合并为共享引用：2 167 → 1 957；顺带提高 Instancing 命中率 |
| 零贴图材质 | 88 个 | 检查是否可合并或删除 |

**· 3.4 贴图侧配合（合批的前置条件）**

- 图集尺寸从 **2048 起**，单张不超过 4096（现有 4 张 4096 图集：BossScene 19.74 MB、Free_Boss 15.56 MB、Scene_Chengzhen 17.82 MB、GameScene 12.80 MB —— 注意 4096 在部分中低端机上是 16 MB 显存起步）；
- **3D 通用贴图有 830 张关闭了 Mipmap**（147.8 MB），合批后同屏密度更高，不补 mipmap 会明显闪烁 → 这部分随合批一起补；
- `Crunch` 全库未开，Android 上开可再压包体（代价是加载解压时间）；
- Android 平台覆盖约 1 430 张已有独立设置，与 889 张走自动的**分两组核对**，避免同类贴图两种格式。

---

**▍四、交付与验收**

**· 美术交付要求（每个单位/模型）**
1. 三角面、顶点数、骨骼数达标（对照第二节目标表）；
2. **单网格 1 个材质槽**（不达标需说明原因）；
3. UV 不超过 2 套（现有 `helicopter.FBX`、`ZSJ.FBX` 有 **8 套 UV**）；
4. 无冗余硬边/UV 缝合导致的顶点膨胀 —— 交付时给出 `顶点/三角面` 比值，**目标 ≤ 0.7**（当前全库 2.00，`fir_2.fbx` 4.51、`无人机.fbx` 4.03 属异常）；
5. LOD0/1/2 命名规范（当前全工程只有 1 个 LOD 文件）。

**· 程序侧核查**
- 跑 `Tools/res_audit/unity_scripts/ModelStatsDump.cs`（只读）导出 Unity 侧真实 `vertexCount`，与 `Tools/res_audit/明细_模型清单.csv` 的 FBX 源值对照；
- 用 `Tools/res_audit/排期_减面优先级.csv` 逐条打勾（含当前值/目标值/可省比例/实际网格文件路径）；
- 用 `Tools/res_audit/排期_合批待办.csv` 跟踪 Instancing 与静态合批的落地；
- 真机上用 Frame Debugger 看：**同屏敌人生成时的 draw call 与三角面峰值**，与本文的 308 单位 / 185 万面口径对齐。

**· 配套文件（`Tools/res_audit/`）**
| 文件 | 内容 |
|---|---|
| `排期_减面优先级.csv` | 按档位的减面工单（单位 + 场景 + 高骨骼角色），含目标面数与可省比例 |
| `排期_合批待办.csv` | Instancing / 图集 / 静态合批待办，含实例数与 prefab 数 |
| `spawn_cost.json` / `poly_priority.json` | 生成配置 → 模型的完整链路数据 |
| `render_load.json` / `batch_opportunity.json` | 渲染器实例数、每 prefab 的 M/K 合批上限 |
| `明细_模型清单.csv` / `明细_材质清单.csv` / `明细_贴图清单.csv` | 全量明细（可 Excel 排序） |

*本文所有数字均由离线解析生成，脚本见 `Tools/res_audit/*.py`，可逐条复算。*

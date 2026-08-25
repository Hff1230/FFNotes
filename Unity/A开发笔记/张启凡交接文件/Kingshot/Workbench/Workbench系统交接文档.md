# Workbench（制作台）系统交接文档

## 一、系统概述

Workbench（制作台）系统是游戏中的装备制造系统，玩家可以通过解锁蓝图、消耗材料来制造各类装备（武器、防具、弹药、配件等）。

### 核心特性
- **蓝图系统**：蓝图是解锁的配方，解锁后只要资源足够可以无限生产
- **多槽位并行**：同一个蓝图可以同时有多个生产任务（只要槽位够且资源够）
- **实时进度**：生产任务实时更新，支持进度条显示
- **类型筛选**：支持按物品类型（武器、装备、治疗类等）筛选蓝图
- **网络同步**：所有操作都与服务器同步，确保数据一致性

---

## 二、文件结构

### 代码目录
```
Assets/KShootCode/
├── Game/KingShot/Game/Workbench/           # 核心逻辑
│   ├── KSWorkbenchManager.cs               # 核心管理器（单例）
│   ├── KSBlueprint.cs                      # 蓝图数据类
│   ├── KSManufacturingTask.cs              # 生产任务类
│   └── KSBlueprintMaterial.cs              # 材料需求类
│
├── Game/KingShot/Game/UI/                  # UI视图
│   └── KSWorkbenchView.cs                  # 工作台主视图
│
├── Game/KingShot/Game/UI/Component/WorkBenchDetail/  # UI组件
│   ├── WorkBenchEquipChooseComponent.cs    # 装备选择组件（左侧）
│   ├── WorbenchMadePreviewComponent.cs     # 制造预览组件（中间）
│   ├── MakeListItem.cs                     # 制造列表项（右侧）
│   └── WorkBenchInfoItem.cs                # 蓝图列表项
│
└── IF/DayZClasses/Net/command/KingShot/    # 网络通信
    └── KSWorkbenchCommand.cs               # 工作台网络命令
```

---

## 三、类关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                        继承关系                                  │
├─────────────────────────────────────────────────────────────────┤
│  KSWorkbenchManager : Singleton<KSWorkbenchManager>             │
│  KSWorkbenchView : PopupBaseView                                │
│  WorkBenchEquipChooseComponent : GComponent                     │
│  WorbenchMadePreviewComponent : GComponent                      │
│  MakeListItem : GComponent                                      │
│  WorkBenchInfoItem : GComponent                                 │
│  KSWorkbenchCommand : CommandBase                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        依赖关系                                  │
├─────────────────────────────────────────────────────────────────┤
│  KSWorkbenchManager（核心管理器）                                │
│  ├── 依赖 → KSBlueprint（蓝图数据）                              │
│  ├── 依赖 → KSManufacturingTask（生产任务）                      │
│  ├── 依赖 → KSWorkbenchCommand（网络通信）                       │
│  └── 被依赖 → 所有UI组件                                         │
│                                                                  │
│  KSManufacturingTask                                             │
│  ├── 依赖 → KSBlueprint                                          │
│  ├── 依赖 → KSWorkbenchCommand                                   │
│  └── 被依赖 → MakeListItem                                       │
│                                                                  │
│  KSBlueprint                                                     │
│  ├── 依赖 → KSBlueprintMaterial[]                                │
│  └── 被依赖 → 所有相关类                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、核心类详解

### 4.1 KSWorkbenchManager（核心管理器）

**文件路径**：`KShootCode/Game/KingShot/Game/Workbench/KSWorkbenchManager.cs`

**继承关系**：`Singleton<KSWorkbenchManager>`

**职责**：管理工作台的所有状态和蓝图系统

#### 主要数据成员
| 成员名 | 类型 | 说明 |
|--------|------|------|
| `blueprints` | `Dictionary<string, KSBlueprint>` | 所有已解锁的蓝图列表 |
| `manufacturingTasks` | `List<KSManufacturingTask>` | 当前正在生产的任务列表 |
| `maxSlotCount` | `int` | 已解锁的最大生产槽位数量 |
| `allSlotCount` | `int` | 所有生产槽位数量 |

#### 主要方法
| 方法名                                                | 参数                     | 返回值                         | 说明                  |
| -------------------------------------------------- | ---------------------- | --------------------------- | ------------------- |
| `Initialize()`                                     | -                      | void                        | 初始化，启动更新协程，监听建筑升级事件 |
| `OnUpdate(float dt)`                               | dt: 时间间隔               | void                        | 每帧更新所有生产任务          |
| `GetAllBlueprints()`                               | -                      | `List<KSBlueprint>`         | 获取所有已解锁的蓝图          |
| `GetBlueprint(string)`                             | blueprintId: 蓝图ID      | `KSBlueprint`               | 根据ID获取蓝图            |
| `GetManufacturingSlots()`                          | -                      | `List<KSManufacturingTask>` | 获取正在生产的任务列表         |
| `GetAvailableSlotCount()`                          | -                      | int                         | 获取剩余可用槽位数量          |
| `HasAvailableSlot()`                               | -                      | bool                        | 是否有空闲生产槽位           |
| `StartManufacturing(string, UnityAction<bool>)`    | blueprintId, callback  | void                        | 开始生产                |
| `CollectProduct(string, UnityAction<bool>)`        | taskId, callback       | void                        | 领取生产完成的物品           |
| `UnlockBlueprint(List<string>, UnityAction<bool>)` | blueprintIds, callback | void                        | 解锁新蓝图               |
| `UpgradeSlotCount()`                               | -                      | void                        | 升级生产槽位数量            |
| `OpenWorkBenchView()`                              | -                      | void                        | 打开工作台UI             |
| `GetWorkbenchInfo(UnityAction)`                    | successAction          | void                        | 从服务器获取所有工作台信息       |

#### 事件监听
- `Global.BUILD_STATE_UPGRADE_END`：建筑升级完成事件
- `KSScienceEvent.OnResearchCompleted`：科技研究完成事件

---

### 4.2 KSBlueprint（蓝图类）

**文件路径**：`KShootCode/Game/KingShot/Game/Workbench/KSBlueprint.cs`

**职责**：管理单个蓝图的配置和材料需求

#### 主要属性
| 属性名 | 类型 | 说明 |
|--------|------|------|
| `ID` | `string` | 蓝图ID |
| `GoodsID` | `string` | 产出道具ID |
| `ManufacturingTime` | `float` | 生产时间（秒） |
| `OutputQuantity` | `int` | 产出数量 |
| `GoodType` | `KSGoodType` | 产出物品的类型 |
| `Materials` | `KSBlueprintMaterial[]` | 材料需求列表 |

#### 主要方法
| 方法名 | 返回值 | 说明 |
|--------|--------|------|
| `HasAllMaterials()` | bool | 检查是否拥有所有所需材料 |
| `GetInsufficientMaterials()` | `List<KSBlueprintMaterial>` | 获取材料不足的列表 |

#### 配置数据来源
- 配置表：`KSBlueprintConfig`
- 通过 `DataAtlasManager.Instance.GetDataWithTypeById<KSBlueprintConfig>(blueprintId)` 获取

---

### 4.3 KSManufacturingTask（生产任务类）

**文件路径**：`KShootCode/Game/KingShot/Game/Workbench/KSManufacturingTask.cs`

**职责**：每个生产任务独立管理自己的状态和进度

#### 状态枚举 `KSManufacturingState`
| 值 | 说明 |
|----|------|
| `Manufacturing` | 生产中 |
| `Completed` | 已完成（待领取） |

#### 主要属性
| 属性名 | 类型 | 说明 |
|--------|------|------|
| `TaskId` | `string` | 任务唯一ID（GUID） |
| `Blueprint` | `KSBlueprint` | 对应的蓝图 |
| `State` | `KSManufacturingState` | 当前生产状态 |
| `RemainingTime` | `float` | 剩余生产时间（秒） |
| `Progress` | `float` | 生产进度（0-1） |

#### 主要方法
| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `Update()` | - | void | 更新生产状态（每帧调用） |
| `CollectProduct(UnityAction<bool>)` | callback | void | 领取生产完成的物品 |
| `CancelManufacturing(UnityAction<bool>)` | callback | void | 取消生产（返还材料） |
| `SyncState(long)` | startTime | void | 同步服务器生产状态 |
| `AddOnTaskCompleted(Action<KSManufacturingTask>)` | callback | void | 添加任务完成回调 |
| `RemoveOnTaskCompleted(Action<KSManufacturingTask>)` | callback | void | 移除任务完成回调 |

---

### 4.4 KSBlueprintMaterial（材料需求类）

**文件路径**：`KShootCode/Game/KingShot/Game/Workbench/KSBlueprintMaterial.cs`

**职责**：表示生产所需的一种材料及其数量

#### 资源类型枚举 `BlueResourceType`
| 值 | 说明 |
|----|------|
| `Item` | 物品类型（背包/仓库中的物品） |
| `Resource` | 资源类型（游戏基础资源） |

#### 主要属性
| 属性名 | 类型 | 说明 |
|--------|------|------|
| `MaterialID` | `string` | 材料道具ID |
| `RequireCount` | `int` | 所需数量 |
| `BlueResourceType` | `BlueResourceType` | 资源类型 |
| `Name` | `string` | 材料名称 |

#### 主要方法
| 方法名 | 返回值 | 说明 |
|--------|--------|------|
| `ParseFromConfig(string, BlueResourceType)` | `KSBlueprintMaterial[]` | 从配置字符串解析材料需求 |
| `HasEnoughMaterial()` | bool | 检查玩家是否拥有足够的该材料 |
| `GetCurrentCount()` | int | 获取玩家当前拥有的材料数量 |

#### 配置格式
```
格式：道具ID,数量;道具ID,数量
示例："1001,5;1002,10" 表示需要ID为1001的道具5个，ID为1002的道具10个
```

---

## 五、UI类详解

### 5.1 KSWorkbenchView（主视图）

**文件路径**：`KShootCode/Game/KingShot/Game/UI/KSWorkbenchView.cs`

**继承关系**：`PopupBaseView`

**职责**：工作台主视图，协调各个子组件

#### 布局结构
```
┌──────────────────────────────────────────────────────────────┐
│                     KSWorkbenchView                          │
├────────────────┬─────────────────────────┬──────────────────┤
│     left       │          n0             │      right       │
│ 装备选择组件    │     制造预览组件         │   制造队列界面    │
│ EquipChoose    │   MadePreviewComponent  │   makeListView   │
└────────────────┴─────────────────────────┴──────────────────┘
```

#### 组件说明
| 组件 | 类型 | 说明 |
|------|------|------|
| `workBenchEquipChooseComponent` | `WorkBenchEquipChooseComponent` | 装备选择组件（左侧） |
| `worbenchMadePreviewComponent` | `WorbenchMadePreviewComponent` | 制造预览组件（中间） |
| `makeListView` | `GComponent` | 制造队列界面（右侧） |
| `makeList` | `GList` | 制造队列列表 |
| `moneyCom` | `GComponent` | 钞票显示组件 |

#### 通知事件
```csharp
public static readonly string REFRESH_KSWorkbenchView = "REFRESH_KSWorkbenchView";
```

#### 主要方法
| 方法名 | 说明 |
|--------|------|
| `Create()` | 静态创建方法 |
| `InitializeFairyComponents()` | 初始化FairyGUI组件 |
| `RefreshUI()` | 刷新UI |
| `RefreshMakeListNumsText()` | 刷新生产队列数量显示 |
| `RefreshMoneyText()` | 刷新钞票显示 |

---

### 5.2 WorkBenchEquipChooseComponent（装备选择组件）

**文件路径**：`KShootCode/Game/KingShot/Game/UI/Component/WorkBenchDetail/WorkBenchEquipChooseComponent.cs`

**继承关系**：`GComponent`

**职责**：显示和筛选蓝图列表

#### 支持的物品类型筛选
| 类型 | 枚举值 | 显示名称 |
|------|--------|----------|
| 全部 | `ALL_TYPE = -1` | 全部 |
| 武器 | `KSGoodType.Weapon` | ?武器 |
| 装备 | `KSGoodType.Equip` | ?装备 |
| 治疗类 | `KSGoodType.Recovery` | ?治疗类 |
| 零件材料 | `KSGoodType.Material` | ?零件材料 |
| 手雷 | `KSGoodType.Grenade` | ?手雷 |
| 配件 | `KSGoodType.Attachment` | ?配件 |
| 子弹 | `KSGoodType.Bullet` | ?子弹 |

#### 主要属性
| 属性名 | 类型 | 说明 |
|--------|------|------|
| `CurrentSelectedType` | `KSGoodType` | 当前选中的物品类型 |
| `IsSelectedAll` | `bool` | 是否选中了"全部" |
| `SelectedBlueprint` | `KSBlueprint` | 当前选中的蓝图 |

#### 主要方法
| 方法名 | 说明 |
|--------|------|
| `FilterBlueprintsByType(KSGoodType?)` | 根据物品类型筛选蓝图 |
| `SelectBlueprint(KSBlueprint)` | 选中蓝图 |
| `AddBlueprintSelectedListener(Action<KSBlueprint>)` | 添加蓝图选中事件监听 |
| `RemoveBlueprintSelectedListener(Action<KSBlueprint>)` | 移除蓝图选中事件监听 |

---

### 5.3 WorbenchMadePreviewComponent（制造预览组件）

**文件路径**：`KShootCode/Game/KingShot/Game/UI/Component/WorkBenchDetail/WorbenchMadePreviewComponent.cs`

**继承关系**：`GComponent`

**职责**：显示选中蓝图的详细信息和制造按钮

#### 主要组件
| 组件 | 类型 | 说明 |
|------|------|------|
| `madeBtn` | `GButton` | 开始制造按钮 |
| `madeInfoList` | `GList` | 制造需求材料列表 |
| `attrList` | `GList` | 装备属性列表 |
| `equipTagList` | `GList` | 装备状态标签 |
| `weaponInfoComponent` | `GComponent` | 装备信息界面 |

#### 属性显示映射 `attrMap`
```csharp
public static Dictionary<KS_Attr_type, AttDisplayInfo> attrMap = new Dictionary<KS_Attr_type, AttDisplayInfo>()
{
    { KS_Attr_type.Hp, new AttDisplayInfo("YKFIcon_shengming", "103605") },         // 生命
    { KS_Attr_type.Def, new AttDisplayInfo("YKFIcon_fangyu", "102140") },           // 防御
    { KS_Attr_type.MoveSpeed, new AttDisplayInfo("YKFIcon_yidongsudu", "KS10512") },// 移动速度
    { KS_Attr_type.Damage, new AttDisplayInfo("YKFIcon_gongjili", "90400084") },    // 伤害
    { KS_Attr_type.Critical, new AttDisplayInfo("YKFIcon_baojishanghai", "220032") },// 暴击
    // ... 更多属性映射
};
```

#### 主要方法
| 方法名 | 说明 |
|--------|------|
| `SetData(KSBlueprint)` | 设置蓝图数据 |
| `RefreshUI()` | 刷新UI |
| `SetAttrDataList()` | 设置属性列表数据 |
| `GenAttrDataList()` | 根据物品类型生成属性列表 |

#### 制造按钮点击处理
```csharp
private void MadeOnClick(EventContext context)
{
    KSWorkbenchManager.Instance.StartManufacturing(ksBlueprint.ID, (success) =>
    {
        Global.POST_SAFE_NOTIFY(KSWorkbenchView.REFRESH_KSWorkbenchView);
    });
}
```

---

### 5.4 MakeListItem（制造列表项）

**文件路径**：`KShootCode/Game/KingShot/Game/UI/Component/WorkBenchDetail/MakeListItem.cs`

**继承关系**：`GComponent`

**职责**：显示单个生产槽位的状态

#### 状态枚举 `MakeListItemState`
| 值 | 索引 | 说明 |
|----|------|------|
| `Locked` | 0 | 未解锁 |
| `Idle` | 1 | 空闲 |
| `Manufacturing` | 2 | 制造中 |
| `Completed` | 3 | 完成 |

#### 主要组件
| 组件 | 类型 | 说明 |
|------|------|------|
| `controller` | `Controller` | 状态控制器 |
| `timeBar` | `GProgressBar` | 倒计时进度条 |
| `receiveBtn` | `GButton` | 领取奖励按钮 |
| `itemIcon` | `GLoader` | 物品图标 |
| `speedBtn` | `GButton` | 加速按钮（当前版本隐藏） |

#### 主要方法
| 方法名 | 说明 |
|--------|------|
| `SetData(int)` | 设置槽位数据 |
| `SetTimeBar(KSManufacturingTask)` | 设置时间进度条 |
| `ReceiveReward(KSManufacturingTask)` | 领取生产奖励 |
| `SetState(MakeListItemState)` | 设置制造状态 |

#### 定时更新
```csharp
// 每0.1秒更新一次进度条
Scheduler.Instance.schedule(OnTimerUpdate, this, 0.1f, false);
```

---

### 5.5 WorkBenchInfoItem（蓝图列表项）

**文件路径**：`KShootCode/Game/KingShot/Game/UI/Component/WorkBenchDetail/WorkBenchInfoItem.cs`

**继承关系**：`GComponent`

**职责**：显示单个蓝图的基本信息

#### 主要组件
| 组件 | 类型 | 说明 |
|------|------|------|
| `nameText` | `GTextField` | 名称文本 |
| `timeText` | `GTextField` | 制造时间文本 |
| `numText` | `GTextField` | 产出数量文本 |
| `iconLoader` | `GLoader` | 图标加载器 |

---

## 六、网络通信

### 6.1 KSWorkbenchCommand（网络命令类）

**文件路径**：`KShootCode/IF/DayZClasses/Net/command/KingShot/KSWorkbenchCommand.cs`

**继承关系**：`CommandBase`

**协议地址**：`kingshoot.workbench.operate`

#### 操作类型枚举 `KSWorkbenchOperate`
| 值 | 说明 |
|----|------|
| `None` | 无操作 |
| `GetBlueprint` | 获取蓝图 |
| `Info` | 查询工作台状态 |
| `Manufacture` | 制造 |
| `Check` | 检查制造情况 |
| `Finish` | 领取奖励 |
| `Upgrade` | 升级槽位 |

#### 构造方法重载
```csharp
// 1. 升级卡槽数量
public KSWorkbenchCommand(KSWorkbenchOperate kSBlackMarketOperate)

// 2. 领取生产物品
public KSWorkbenchCommand(int index, KSWorkbenchOperate operate)

// 3. 查询制造情况
public KSWorkbenchCommand(int index)

// 4. 获取蓝图/制造协议
public KSWorkbenchCommand(KSWorkbenchOperate oderOperator, string buleprintID)

// 5. 获取所有制造信息
public KSWorkbenchCommand()
```

#### 协议参数说明
| 操作类型 | 参数 | 说明 |
|----------|------|------|
| `Info` | `operateType` | 获取所有制造信息 |
| `GetBlueprint` | `operateType`, `bluePrintId` | 获取/解锁蓝图 |
| `Manufacture` | `operateType`, `bluePrintId` | 开始制造 |
| `Check` | `operateType`, `pos` | 检查指定位置的制造情况 |
| `Finish` | `operateType`, `pos` | 领取指定位置的奖励 |
| `Upgrade` | `operateType` | 升级槽位 |

#### 服务器返回数据结构
| 字段 | 类型 | 说明 |
|------|------|------|
| `bluePrints` | `CCArray` | 已解锁的蓝图ID列表 |
| `availableQueueNum` | `int` | 已解锁的最大槽数 |
| `queueLimit` | `int` | 所有生产槽位数量 |
| `queues` | `object` | 生产队列信息（待实现） |
| `bluePointId` | `string` | 制造成功返回的蓝图ID |
| `finishTime` | `string/int` | 完成时间 |

---

## 七、核心工作流程

### 7.1 打开工作台流程
```
1. FunBuildPart.OnHand()
   ↓
2. OpenUI() → BuildUIType.Maker
   ↓
3. KSWorkbenchManager.Instance.OpenWorkBenchView()
   ↓
4. GetWorkbenchInfo() → 发送网络请求（KSWorkbenchOperate.Info）
   ↓
5. 服务器返回数据（蓝图列表、槽位信息、生产队列）
   ↓
6. KSWorkbenchView.Create() → 创建UI视图
```

### 7.2 开始生产流程
```
1. 选择蓝图 → WorkBenchEquipChooseComponent.SelectBlueprint()
   ↓
2. 点击制造按钮 → WorbenchMadePreviewComponent.MadeOnClick()
   ↓
3. KSWorkbenchManager.StartManufacturing(blueprintId)
   ├── 检查是否有空闲槽位
   ├── 检查蓝图是否存在
   ├── 检查材料是否足够
   ↓
4. 发送网络请求（KSWorkbenchOperate.Manufacture）
   ↓
5. 服务器返回成功
   ↓
6. 创建 KSManufacturingTask 并添加到生产队列
   ↓
7. 发送通知刷新UI → REFRESH_KSWorkbenchView
```

### 7.3 生产更新流程
```
1. KSWorkbenchManager.OnUpdate() 每0.1秒执行
   ↓
2. 遍历所有 manufacturingTasks
   ↓
3. KSManufacturingTask.Update()
   ├── 更新剩余时间
   ├── 检查是否完成
   ↓
4. 完成时发送网络请求（KSWorkbenchOperate.Check）
   ↓
5. 服务器返回完成状态
   ↓
6. 更新状态为 KSManufacturingState.Completed
   ↓
7. 触发 onTaskCompleted 回调
```

### 7.4 领取奖励流程
```
1. 点击领取按钮 → MakeListItem.ReceiveOnClick()
   ↓
2. KSWorkbenchManager.CollectProduct(taskId)
   ↓
3. KSManufacturingTask.CollectProduct()
   ├── 检查状态是否为 Completed
   ↓
4. 发送网络请求（KSWorkbenchOperate.Finish, pos）
   ↓
5. 服务器返回成功
   ↓
6. 从生产队列移除任务
   ↓
7. 发送通知刷新UI → REFRESH_KSWorkbenchView
```

---

## 八、配置表依赖

### 8.1 KSBlueprintConfig（蓝图配置表）
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 蓝图ID |
| `goodsID` | `string` | 产出道具ID |
| `manufacturing_time` | `float` | 生产时间（秒） |
| `output_quantity` | `int` | 产出数量 |
| `material_goods` | `string` | 物品材料需求（格式：ID,数量;ID,数量） |
| `material_resource` | `string` | 资源材料需求（格式：ID,数量;ID,数量） |

### 8.2 KSGoodsConfig（物品配置表）
通过 `KSGoodsConfigInfo` 类访问，包含：
- `baseInfo`：基础信息（名称、图标、品质等）
- `extensionInfo`：扩展信息（重量、标签等）
- 根据类型可获取：`Shot_weapon`、`Shot_equip`、`Shot_Ammo`、`Shot_Attachment` 等

---

## 九、调试快捷键

在 `GameRoot.cs` 中定义的调试快捷键：

| 快捷键 | 功能 |
|--------|------|
| `B键` | 解锁蓝图 |
| `V键` | 打开工作台视图 |
| `C键` | 升级槽位 |

---

## 十、待完成/TODO项

### 10.1 KSWorkbenchManager.cs
```csharp
// TODO: 这里应该从服务器返回的数据中获取实际的生产任务信息
if (dict.TryGetValue("queues", out object queues))
{
    // 需要实现生产队列数据解析
}

// TODO: 替换为服务器返回的实际剩余时间
float remainingTime = 0;
```

### 10.2 KSManufacturingTask.cs
```csharp
// TODO: 这里需要向服务器请求取消生产并返还材料
public void CancelManufacturing(UnityAction<bool> callback)
{
    // 取消生产功能待实现
}
```

### 10.3 MakeListItem.cs
```csharp
// 策划说这版本先不做加速，按钮隐藏
speedBtn.visible = false;
```

---

## 十一、注意事项

1. **材料检查**：`KSBlueprint.HasAllMaterials()` 会检查背包和仓库中的物品，以及玩家资源
2. **槽位管理**：`maxSlotCount` 是已解锁的槽位，`allSlotCount` 是总槽位，超过 `maxSlotCount` 的槽位显示为锁定状态
3. **任务完成回调**：`KSManufacturingTask` 使用 `AddOnTaskCompleted` 添加回调，同一回调会自动去重
4. **UI刷新**：通过 `Global.POST_SAFE_NOTIFY(KSWorkbenchView.REFRESH_KSWorkbenchView)` 刷新整个工作台UI
5. **定时器**：`MakeListItem` 使用 `Scheduler.Instance.schedule` 实现0.1秒定时更新进度条

---

## 十二、扩展阅读

相关系统文档：
- 物品系统：`KSGoodsController`、`KSGoodsConfigInfo`
- 建筑系统：`FunBuildPart`、`FunBuildInfo`
- 科技系统：`KSScienceManager`
- 属性系统：`KS_Attr_type`、`KS_Attr_Info`
- 配件系统：`KSAttachmentHelper`

---

*文档生成时间：2026-03-24*

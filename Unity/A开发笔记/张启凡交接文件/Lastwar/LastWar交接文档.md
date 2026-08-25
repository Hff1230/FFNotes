# LastWar 模块交接文档

### 1.2 关卡类型 (ELevelType)
| 类型 | 说明 |
|------|------|
| `Soldier` | 小兵关卡 |
| `Hero` | 英雄关卡 |
| `Guard` | 防守关卡（敌方向我方进攻） |
| `GuardBoss` | 防守关卡+Boss战 |
| `Run` | 巷关关卡（我方向前方进攻） |
| `RunBoss` | 混关关卡+Boss战 |
| `FreeBoss` | 自由场景Boss战斗 |

---

## 2. 目录结构

```
Scripts/
├── Audio/                    # 音频系统
├── Editor/                   # Unity编辑器扩展
├── Game/                    # 游戏核心逻辑
│   ├── Animation/           # 动画系统
│   ├── Base/                # 基础类
│   ├── Buff/                # Buff系统
│   │   ├── BarrelBuff/      # 桶类Buff
│   │   └── SkillBuff/        # 技能Buff
│   ├── Interface/            # 接口定义
│   ├── Monster/              # 怪物系统
│   │   ├── MonsterSkill/     # 怪物技能
│   │   │   ├── Skill/        # 具体技能实现
│   │   │   └── SkillEffect/  # 技能效果
│   ├── Player/               # 玩家系统
│   │   ├── Fly/              # 飞行单位
│   │   ├── Hero/             # 英雄实现（25个英雄）
│   │   ├── Skill/            # 玩家技能
│   │   └── Stat/             # 玩家属性
│   └── Tools/                # 工具类
│       └── QuadTreeNode/     # 四叉树结构
├── Scene/                   # 场景管理
└── UI/                      # 用户界面
    └── Component/            # UI组件
```

---

## 3. 核心类详解

### 3.1 基础类 (Base)

#### Unit.cs - 单位基类
**路径**: `Scripts/Game/Base/Unit.cs`

**继承关系**: `Unit` -> `NoDisableMono` -> `IDestroy`

**核心功能**:
- 所有游戏单位（玩家、怪物、障碍物等）的基类
- 实现有限状态机（FSM）管理单位行为状态
- 管理单位属性（UnitStat）
- 处理伤害计算和受击逻辑
- 管理单位实例ID和碰撞体映射

**行为状态枚举** (BehaviorState):
```csharp
public enum BehaviorState {
    None,
    Idle,           // 空闲
    Run,            // 奔跑
    Attack,         // 攻击
    ActiveSkill,    // 主动技能
    PassiveSkill,   // 被动技能
    EquipSkill,     // 装备技能
    Show,            // 展示，这个字段暂时用不上了，曾经做传送门的时候做的
    Dead,            // 死亡
}
```

**单位类型枚举** (UnitType):
```csharp
public enum UnitType {
    Player = 1,
    Hero,            // 英雄
    Solider,         // 士兵
    HeroShootPlayer, // 特殊英雄
    Warplane,        // 飞机
    Mech,            // 机甲
    Monster = 100,
    MonsterCount = 199,
    Door = 200,
    Barrel = 201,       //油桶，收到次数伤害，无论伤害多少打一次扣一次
    Obstacle = 202,
    AwardDoor = 203,
    Juma = 204,
    Qiuche = 205,
    BarrelHp = 206,     //油桶，但是收到血量伤害而不是打一次扣一个次数
}
```

**关键方法**:
| 方法 | 说明 |
|------|------|
| `SetData(DataBase)` | 设置配置数据 |
| `Init()` | 初始化单位 |
| `SetState(BehaviorState)` | 切换状态（FSM核心） |
| `OnDamage(Unit, bool)` | 对目标造成伤害 |
| `OnHurt(Unit, bool, float)` | 受到伤害 |
| `GetDamage(Unit, out bool, float)` | 计算伤害值 |
| `DestroySelf()` | 销毁自身 |

**静态方法**:
- `Unit.GetUnit(uint instanceID)`: 通过实例ID获取单位
- `Unit.Clear()`: 清理所有单位静态数据

---

#### UnitStat.cs - 单位属性
**路径**: `Scripts/Game/Base/UnitStat.cs`
管理单位的属性（HP、攻击力、防御力、暴击等）。
里面有三个调试方法
CauseDamage                            这个是产生伤害的函数，里面实现是调用下面两个函数
CauseDamageLogic                   这个是纯逻辑函数，关闭了伤害日志
CauseDamageLog                      这个添加了伤害日志显示
大量打印Log消耗性能，所有目前都是CauseDamageLogic，如果需要调试bug显示日志把函数改成CauseDamageLog即可

---

### 3.2 玩家系统 (Player)

#### Player.cs - 玩家基类
**路径**: `Scripts/Game/Player/Player.cs`

**继承关系**: `Player` -> `Unit`

**核心功能**:
- 管理玩家技能（普攻、主动技能、被动技能、专武技能）
- 技能释放队列管理
- 战力修正伤害计算
- 攻击方向管理

**技能组件**:
```csharp
protected SkillBuff normalAttack;      // 普通攻击
protected SkillBuff activeSkill;       // 主动技能
protected SkillBuff passiveSkill;      // 被动技能
protected SkillBuff specialEquipSkill; // 专武技能
```

**关键属性**:
| 属性 | 说明 |
|------|------|
| `totalDamage` | 造成的总伤害 |
| `totalndureinjury` | 总承伤 |
| `isCanbeFind` | 是否可被敌人锁定 |

**关键方法**:
| 方法 | 说明 |
|------|------|
| `ExcuteSkill()` | 执行技能切换逻辑 |
| `AttackBackMonster()` | 攻击后方敌人（转向） |
| `GetDamage()` | 计算伤害（含战力修正） |
| `RefreshHP()` | 刷新血条信息 |

---

#### Hero.cs - 英雄基类
**路径**: `Scripts/Game/Player/Hero/Hero.cs`

**继承关系**: `Hero` -> `Player` -> `Unit`

---

#### ShootPlayer.cs - 射击玩家（小兵）
**路径**: `Scripts/Game/Player/ShootPlayer.cs`

**继承关系**: `ShootPlayer` -> `Player` -> `Unit`

小兵单位实现，使用CrowdAgent进行群体移动。
需要在小兵单位上挂载这个脚本
![[Pasted image 20260324111413.png]]
---

### 3.3 怪物系统 (Monster)

#### Monster.cs - 怪物基类
**路径**: `Scripts/Game/Monster/Monster.cs`

**继承关系**: `Monster` -> `Unit`

**核心功能**:
- 怪物移动逻辑
- 视野检测（优化渲染）
- 自动死亡检测（到达边界）
- RVO动态避障集成

**关键属性**:
| 属性 | 说明 |
|------|------|
| `moveSpeed` | 移动速度 |
| `chaseSpeed` | 追击速度 |
| `roadBelong` | 所属道路（左/中/右） |
| `isInCheckArea` | 是否在检测区域 |

**派生类**:
| 类 | 说明 |
|------|------|
| `AttackMonster` | 攻击型怪物 |
| `RangeAttackMonster` | 远程攻击怪物 |
| `RushMonster` | 冲锋怪物 |
| `Boss` | Boss基类 |
| `RangeBoss` | 远程Boss |
| `Barrel` | 油桶 |
| `Obstacle` | 障碍物 |
| `Juma` | 拒马 |
| `Qiuche` | 秋车 |
| `SiegeCrossbow` | 攻城弩 |
| `Door` | 门 |

---

### 3.4 技能系统 (Skill)

#### SkillBuff.cs - 技能Buff
**路径**: `Scripts/Game/Buff/SkillBuff/SkillBuff.cs`

**继承关系**: `SkillBuff` -> `BuffBase`

**核心功能**:
- 技能冷却管理
- Buff效果应用（属性提升）
- Buff目标选择（自身/士兵/英雄/全体）

**Buff类型**:
| typeid | 说明 |
|--------|------|
| 1 | 百分比提升 |
| 2 | 固定数值提升 |

**Buff目标** (BuffTarget):
| 目标 | 说明 |
|------|------|
| `Owner` | 自身 |
| `Solider` | 士兵 |
| `Hero` | 英雄 |
| `All` | 全体 |

---

#### LastWarSkillGenteror.cs - 技能生成器
**路径**: `Scripts/Game/Player/Skill/LastWarSkillGenteror.cs`

**核心功能**:
根据技能配置创建不同类型的技能特效

**技能移动类型** (EFlyType):
| 类型 | 说明 |
|------|------|
| `Straight` | 直线飞行 |
| `Parabola` | 抛物线 |
| `Area` | 区域技能 |
| `ShotgunShape` | 散弹 |
| `Melee` | 近战 |
| `Track` | 追踪 |
| `RotationFire` | 旋转开火 |
| `Avatar` | 分身 |
| ... | 其他类型 |

---

### 3.5 管理器类 (Manager)

#### GameManager.cs - 游戏管理器
**路径**: `Scripts/Scene/GameManager.cs`

**继承关系**: `GameManager` -> `SingletonMono<GameManager>`

**核心功能**:
- 游戏状态管理
- 关卡胜负判定
- 战力检测
- RVO避障系统初始化
- 游戏结算流程

**游戏状态** (GameStateType):
| 状态 | 说明 |
|------|------|
| `None` | 无状态 |
| `StartGameAni` | 开始游戏动画 |
| `WaitFirstStartGame` | 等待第一关点击开始 |
| `ChooseHero` | 选择英雄状态 |
| `OpeningShow` | 播放开场动画 |
| `GameRunning` | 游戏正常运行 |
| `GamePause` | 游戏暂停 |
| `GameOver` | 游戏结束 |

**战力状态** (EFighting):
| 状态 | 伤害修正 |
|------|----------|
| `PowerCrushing` | 玩家1.3倍伤害，0.7倍承伤 |
| `Equal` | 1倍伤害，1倍承伤 |
| `Insufficient` | 0.7倍伤害，1.3倍承伤 |

**关键方法**:
| 方法 | 说明 |
|------|------|
| `InitGame(Lastwar_scene)` | 初始化游戏 |
| `StartBattle(UnityAction)` | 开始战斗 |
| `UpdateEFighting()` | 更新战力状态 |
| `ClearAll()` | 清理所有游戏数据 |

---

#### PlayerManager.cs - 玩家管理器
**路径**: `Scripts/Scene/PlayerManager.cs`

**继承关系**: `PlayerManager` -> `SingletonMono<PlayerManager>`

**核心功能**:
- 玩家创建和管理
- 队伍移动控制
- 士兵升级
- 机甲变身
- 战机系统

**关键属性**:
| 属性 | 说明 |
|------|------|
| `mPlayers` | 所有玩家列表 |
| `heros` | 英雄列表 |
| `soliders` | 士兵列表 |
| `moveSpeed` | 队伍移动速度 |
| `PlayerMaxNum` | 士兵最大数量 |

**关键方法**:
| 方法 | 说明 |
|------|------|
| `AddSolider(int, Lastwar_hero)` | 添加士兵 |
| `RemoveHeros(int)` | 移除角色 |
| `UpgradeSolider()` | 升级士兵 |
| `CreateMech(Lastwar_hero)` | 创建机甲 |
| `CreateWarplane(Lastwar_hero)` | 创建战机 |
| `MoveHeros(float)` | 移动队伍 |
| `ResetAllHeroPos()` | 重置所有角色位置 |

---

#### MonsterManager.cs - 怪物管理器
**路径**: `Scripts/Scene/MonsterManager.cs`

**继承关系**: `MonsterManager` -> `SingletonMono<MonsterManager>`

**核心功能**:
- 怪物生成和管理
- 波次出怪（Boss战）
- 四叉树索引更新

**关键属性**:
| 属性 | 说明 |
|------|------|
| `mMonsters` | 所有怪物列表 |
| `attackMonsters` | 攻击型怪物列表 |
| `boss` | 当前Boss引用 |

**关键方法**:
| 方法 | 说明 |
|------|------|
| `Init(UnityAction)` | 初始化怪物系统 |
| `ShowMonster()` | 显示怪物 |
| `GetMonsterCount()` | 获取怪物数量 |
| `HasBoss()` | 是否存在Boss |

---

#### LevelManager.cs - 关卡管理器
**路径**: `Scripts/Scene/LevelManager.cs`

**继承关系**: `LevelManager` -> `SingletonMono<LevelManager>`

**核心功能**:
- 关卡类型解析
- 边界管理
- 世界坐标转换

**关键属性**:
| 属性 | 说明 |
|------|------|
| `herolevelType` | 英雄/士兵关卡类型 |
| `levelTypeMode` | 关卡模式类型 |
| `Edges` | 场景边界 |

---

### 3.6 UI系统

#### LastWarMainView.cs - 主界面
**路径**: `Scripts/UI/LastWarMainView.cs`

**核心功能**:
- 主界面显示
- 滑动手势处理
- Boss血条显示
- 倒计时显示

**UI组件**:
| 组件 | 说明 |
|------|------|
| `HealthComponent` | 血条组件 |
| `FormationHealthBar` | 编队血条 |
| `HurtNumComponent` | 伤害数字 |
| `CriticalHurtNumComponent` | 暴击伤害数字 |

**其他UI视图**:
| 视图 | 说明 |
|------|------|
| `LastWarWinView` | 胜利界面 |
| `LastWarFailView` | 失败界面 |
| `LastWarPauseView` | 暂停界面 |
| `LastWarSelectHeroView` | 选择英雄界面 |
| `LastWarFormationView` | 编队界面 |

---

## 4. 消息系统

### 4.1 消息常量 (LastWarHelper.cs)

```csharp
// 伤害和血量相关
LASTWAR_MSG_REDUCE_HP          // 减少HP
LASTWAR_MSG_Add_HP            // 增加HP
LASTWAR_MSG_REMOVEHEALTHBAR   // 移除血条

// 单位相关
LASTWAR_MSG_UNIT_ADD          // 单位添加
LASTWAR_MSG_UNIT_DEAD         // 单位死亡

// 游戏流程相关
LASTWAR_MSG_GameOver          // 游戏结束
LASTWAR_MSG_SUCCESS_Run       // 胜利后奔跑
LASTWAR_MSG_CheckGameOver     // 检查游戏结束
LASTWAR_MSG_CLEARALL          // 清理所有

// Boss相关
LASTWAR_MSG_BOSS_APPEAR       // Boss出现
LASTWAR_MSG_BOSS_DEATH        // Boss死亡
LASTWAR_MSG_BOSS_REDUCE_HP    // Boss血量变化

// 英雄相关
LASTWAR_MSG_HERO_DROP_DOWN    // 英雄下阵
LASTWAR_MSG_HERO_ENTERFREEBOSSAREA  // 进入自由Boss区域
```

### 4.2 消息使用示例

```csharp
// 发送消息
Global.POST_SAFE_NOTIFY(LastWarHelper.LASTWAR_MSG_REDUCE_HP, parms);

// 监听消息
Global.addNotifyObserver(this, OnDamageHandler, LastWarHelper.LASTWAR_MSG_REDUCE_HP);
```

---

## 5. 对象池系统

### 5.1 获取对象

```csharp
// 获取对象（会禁用后再启用）
GameObject obj = LastWarHelper.GetGameObject(path, position, rotation);

// 获取对象（不会禁用）
GameObject obj = LastWarHelper.GetGameObjectNoDisable(path, position, rotation);
```

### 5.2 回收对象

```csharp
// 回收对象（会禁用）
LastWarHelper.RecycleGameObject(obj, path);

// 回收对象（不会禁用）
LastWarHelper.RecycleGameObjectNoDisable(obj, path);
```

### 5.3 预加载

```csharp
// 协程预加载
StartCoroutine(LastWarHelper.IEPreLoadGameObjectNoDisable(path, count, frameNums, parent));
```

---

## 6. 配置表依赖

### 6.1 核心配置表

| 配置表类 | 说明 |
|----------|------|
| `Lastwar_scene` | 关卡配置 |
| `Lastwar_hero` | 英雄配置 |
| `Lastwar_monster` | 怪物配置 |
| `Lastwar_skill` | 技能配置 |
| `Lastwar_buff` | Buff配置 |

### 6.2 获取配置数据

```csharp
// 通过ID获取配置
Lastwar_hero config = LastWarHelper.GetDataWithTypeById<Lastwar_hero>(heroId);
```

---

## 7. 工具类

### 7.1 Tools.cs
**路径**: `Scripts/Game/Tools/Tools.cs`

提供各种静态工具方法：
- 英雄位置计算
- 士兵位置计算
- 怪物位置偏移计算

### 7.2 QuadTreeManager.cs
**路径**: `Scripts/Game/Tools/QuadTreeNode/QuadTreeManager.cs`

四叉树空间索引，用于快速查找范围内的怪物。

---

## 8. 扩展指南

### 8.1 添加新英雄

1. 在 `Scripts/Game/Player/Hero/` 下创建新英雄类，继承 `Hero` 或 `Player`
2. 重写需要自定义的方法
3. 创建对应的预制体，挂载脚本
4. 配置 `Lastwar_hero` 表

### 8.2 添加新怪物

1. 在 `Scripts/Game/Monster/` 下创建新怪物类，继承 `Monster`
2. 重写移动、攻击等方法
3. 创建对应的预制体，挂载脚本
4. 配置 `Lastwar_monster` 表

### 8.3 添加新技能

1. 配置 `Lastwar_skill` 表
2. 创建技能特效预制体，挂载 `LastWarFlySkill` 组件
3. 配置技能移动类型和伤害类型

### 8.4 添加新关卡

1. 配置 `Lastwar_scene` 表
2. 设置关卡类型 (`levelType`)
3. 配置怪物生成 (`leftmonster`, `rightmonster`, `middlemonster`)
4. 创建关卡场景

---

## 9. 注意事项

### 9.1 性能优化

1. **分帧加载**: 大量对象创建时使用分帧加载
   ```csharp
   StartCoroutine(IEPreLoadGameObjectNoDisable(path, count, frameNums, parent));
   ```

2. **对象池**: 所有频繁创建/销毁的对象必须使用对象池

3. **四叉树**: 怪物查找使用四叉树优化

4. **视野剔除**: 怪物渲染根据距离相机位置动态开关


路径
![[Pasted image 20260323153848.png]]
音频资源放在Audio里面，
模型放在Models里面
技能和粒子放在Particles里面
场景放在Scenes里面
技能需要挂载LastWarFlySkill组件
粒子需要挂载ParticleBase组件
声音需要挂载PlaySound组件
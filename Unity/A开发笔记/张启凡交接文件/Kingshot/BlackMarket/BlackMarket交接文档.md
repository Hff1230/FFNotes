# Kingshot 黑市系统（BlackMarket）交接文档

## 一、系统概述

黑市系统是游戏内的交易系统，玩家可以在黑市中出售指定物品获得金币奖励，并通过累计完成订单数获取额外奖励。

---

## 二、文件结构

### 1. 核心逻辑文件
| 文件路径 | 说明 |
|---------|------|
| `KShootCode\Game\KingShot\Game\BlackMarket\KSBlackMarket.cs` | 黑市数据类 |
| `KShootCode\Game\KingShot\Game\BlackMarket\KSBlackMarketManager.cs` | 黑市管理器（单例） |
| `KShootCode\Game\KingShot\Game\BlackMarket\KSOrder.cs` | 订单运行时数据 |
| `KShootCode\Game\KingShot\Game\BlackMarket\KSOrderItem.cs` | 订单物品运行时数据 |
| `KShootCode\Game\KingShot\Game\BlackMarket\KSBlackMarketShopItem.cs` | 商店物品（未实现） |

### 2. UI相关文件
| 文件路径 | 说明 |
|---------|------|
| `KShootCode\Game\KingShot\Game\UI\KSBlackMarketOrderView.cs` | 订单视图 |
| `KShootCode\Game\KingShot\Game\UI\KSBlackMarketShopView.cs` | 商店视图（未实现） |
| `KShootCode\Game\KingShot\Game\UI\Component\KSOrderItemCom.cs` | 订单项UI组件 |
| `KShootCode\Game\KingShot\Game\UI\Component\BlackMarketShopItemComponent.cs` | 商店项UI组件（未实现） |

### 3. 网络通信文件
| 文件路径 | 说明 |
|---------|------|
| `KShootCode\IF\DayZClasses\Net\command\KingShot\BlackMarket\KSBlackMarketCommand.cs` | 网络命令类 |

### 4. 建筑系统文件
| 文件路径 | 说明 |
|---------|------|
| `KShootCode\Game\KingShot\City\KSFunBuild3D_BlackMarket.cs` | 黑市3D建筑类 |

### 5. 配置文件
| 文件路径 | 说明 |
|---------|------|
| `ResDepends\default\Config\DataAtlas\KSBlackMarketConfig.json` | 黑市配置 |
| `ResDepends\default\Config\DataAtlas\KSOrderConfig.json` | 订单配置 |
| `ResDepends\default\Config\DataAtlas\KSOrderReward.json` | 订单奖励配置 |

---

## 三、系统架构

### 类层次结构
```
KSBlackMarketManager (单例管理器)
    └── KSBlackMarket (黑市数据)
        └── List<KSOrder> (订单列表)
            └── KSOrder (单个订单)
                └── KSOrderItem (订单物品)
```

### 核心类说明

#### KSBlackMarketManager（黑市管理器）
**职责：** 单例模式管理整个黑市系统

**核心属性：**
- `completeOrderCount` - 已完成订单数量
- `completeOrderMaxCount` - 当前奖励订单最大值
- `receivedRewardCount` - 累计领取奖励进度
- `refreshCD` - 刷新倒计时

**核心方法：**
- `GetBlackMarket()` - 从服务器获取黑市数据
- `RefreshBlack()` - 刷新黑市订单
- `ReceivedReward()` - 领取奖励
- `UpdateRefreshCD()` - 更新倒计时（每帧调用）

#### KSBlackMarket（黑市数据类）
**核心属性：**
- `lv` - 黑市等级
- `orders` - 订单列表
- `remainRefreshCount` - 剩余刷新次数
- `Mode` - 订单模式（1=固定订单，2=随机订单）

#### KSOrder（订单类）
**核心属性：**
- `orderID` - 订单ID
- `orderItem` - 订单物品
- `index` - 订单索引

**核心方法：**
- `Sell()` - 出售订单
- `IsCanBuy()` - 判断是否可购买
- `GetSoldMoneyByLocal()` - 获取本地计算的价格

#### KSOrderItem（订单物品类）
**核心属性：**
- `itemID` - 物品ID
- `buyCountPerTime` - 每次购买数量
- `requireBuyCount` - 需要购买的总次数
- `completeSubmit` - 剩余购买次数
- `rate` - 价格比率

---

## 四、功能流程

### 1. 黑市初始化流程
```
玩家点击黑市建筑
    ↓
FunBuildPart 检测到 BuildUIType.BlackShop
    ↓
创建 KSBlackMarketOrderView
    ↓
调用 KSBlackMarketManager.Instance.GetBlackMarket()
    ↓
获取建筑等级（通过 FunBuildController）
    ↓
发送网络命令 KSBlackMarketCommand(level, GetInfo)
    ↓
服务器返回数据，解析创建 KSBlackMarket 对象
    ↓
刷新UI显示
```

### 2. 订单出售流程
```
玩家点击订单项的"出售"按钮
    ↓
KSOrderItemCom.SellOnClick() 触发
    ↓
调用 KSOrder.Sell() → KSOrderItem.Sell()
    ↓
发送网络命令
    ↓
服务器处理返回结果
    ↓
更新剩余购买次数、累计完成进度
    ↓
刷新UI，发送任务进度通知
```

### 3. 刷新流程
```
玩家点击刷新按钮
    ↓
KSBlackMarketOrderView.RefreshOnClick()
    ↓
调用 KSBlackMarketManager.RefreshBlack()
    ↓
发送网络命令刷新订单
    ↓
服务器返回新订单数据
    ↓
更新本地数据和UI，启动刷新CD倒计时
```

### 4. 奖励领取流程
```
玩家点击奖励按钮
    ↓
检查是否达到领取条件
    ↓
可领取：调用 ReceivedReward() → 服务器发放奖励
不可领取：调用 GetNextReceivedReward() → 显示奖励预览
```

---

## 五、配置数据结构

### 1. KSBlackMarketConfig（黑市配置）
```json
{
  "id": "1",
  "lv": 1,                          // 黑市等级
  "mode": 1,                        // 1=固定订单，2=随机订单
  "orderGroupIDs": "1,2,3,4|5,6,7,8", // 订单组ID（|分隔多组）
  "maxRefreshCount": 3,             // 最大刷新次数
  "refreshRecoverHours": 0          // 刷新恢复时间（小时）
}
```

**模式说明：**
- **Mode 1（固定订单）**：隐藏刷新按钮，订单固定
- **Mode 2（随机订单）**：显示刷新按钮，可以手动刷新

### 2. KSOrderConfig（订单配置）
```json
{
  "id": "1",
  "itemIDs": "500001;701001",       // 可选物品ID（分号分隔）
  "rate": "1.5;1.5",                // 销售价格比率
  "requireBuyCount": "3;4",         // 需要购买次数
  "buyCountPerTime": "1;1"          // 每次购买数量
}
```

### 3. KSOrderReward（订单奖励配置）
```json
{
  "id": "1",           // 奖励等级
  "sum_count": "8",    // 累计完成订单数要求
  "reward": "100001"   // 奖励物品ID
}
```

### 4. 网络协议数据结构
```json
{
  "refreshTimes": int,
  "receivedRewardLevel": int,
  "rewardRequireNum": int,
  "refreshCountdown": float,
  "completeNums": int,
  "orders": [
    {
      "pos": int,
      "orderId": string,
      "itemId": string,
      "requireNum": int,
      "submitNum": int
    }
  ]
}
```

---

## 六、UI系统

### 1. KSBlackMarketOrderView（订单视图）
**UI组件：**
- `orderList` - 订单列表（GList）
- `totalMoney` - 总金额显示
- `completeOrderSlider` - 累计订单进度条
- `refreshBtn` - 刷新按钮
- `refreshCountText` - 刷新次数文本
- `awardBtn` - 奖励按钮

**UI配置（UIConfigs.json）：**
```json
{
  "className": "KSBlackMarketOrderView",
  "packageName": "GTA_SDC",
  "compoentName": "Main_BlackMarketOrder_YKF"
}
```

### 2. KSOrderItemCom（订单项组件）
**UI组件：**
- `title` - 物品名称
- `num` - 进度显示（已完成/总数）
- `money` - 价格
- `own` - 拥有数量
- `sellBtn` - 出售按钮
- `kSGoodsItem` - 物品图标组件

**状态控制器（c1）：**
- 索引0：可出售状态
- 索引1：已完成状态
- 索引2：物品不足状态

---

## 七、系统集成

### 1. 建筑系统集成
```csharp
Global.FUN_BUILD_KS_BLACK_MARKET = 724000
```
- `FunBuild3DFactory` - 工厂模式创建黑市建筑
- `FunBuildPart` - 建筑UI触发（BuildUIType.BlackShop）

### 2. 物品系统集成
- `KSGoodsController.Instance.CreateGoods()` - 创建黑市物品
- `GoodsLocalType.INBlackMarket` - 黑市物品位置标记
- `BagContainer.FindAllCount()` - 检查背包物品数量

### 3. 任务系统集成
```csharp
Global.POST_SAFE_NOTIFY(KSQuestEvent.QUEST_PROGRESS, new QuestNotify()
{
    qtype = KSDataType.Trade,
    paras = KSBlackMarketManager.Instance.GetCompleteOrderCount()
});
```

### 4. 网络系统集成
- 协议名：`kingshoot.blackMarket.operate`
- 操作类型：
  - `GetInfo` - 获取信息
  - `Rresh` - 刷新
  - `Sell` - 出售
  - `CheckRefresh` - 检查刷新
  - `Award` - 领取奖励

---

## 八、系统特色功能

### 1. 刷新CD系统
- 支持时间倒计时
- 自动刷新机制
- 格式化时间显示（HH:MM:SS）

```csharp
// 在Update中每帧更新
KSBlackMarketManager.Instance.UpdateRefreshCD(Time.deltaTime);
```

### 2. 双模式系统
| 模式 | 说明 |
|-----|------|
| Mode 1（固定订单） | 订单固定不刷新，隐藏刷新按钮 |
| Mode 2（随机订单） | 支持手动刷新，显示刷新按钮和CD |

### 3. 进度奖励系统
- 累计完成订单数追踪
- 分级奖励机制
- 奖励预览功能

---

## 九、代码使用示例

### 打开黑市界面
```csharp
KSBlackMarketOrderView.Create();
```

### 获取当前黑市数据
```csharp
KSBlackMarketManager.Instance.GetBlackMarket((market) => {
    Debug.Log($"当前黑市等级: {market.LV}");
    Debug.Log($"订单数量: {market.Order.Count}");
});
```

### 刷新黑市
```csharp
KSBlackMarketManager.Instance.RefreshBlack((success) => {
    if (success) {
        Debug.Log("刷新成功");
    }
});
```

### 领取奖励
```csharp
if (KSBlackMarketManager.Instance.IsCanReceivedReward()) {
    KSBlackMarketManager.Instance.ReceivedReward((success) => {
        // 处理结果
    });
}
```

---

## 十、未实现功能

以下功能已预留接口，但暂未实现（策划说暂时先不做）：

| 文件 | 说明 |
|-----|------|
| `KSBlackMarketShopView.cs` | 商店视图 |
| `KSBlackMarketShopItem.cs` | 商店物品 |
| `BlackMarketShopItemComponent.cs` | 商店项UI组件 |

---

## 十一、注意事项

1. **配置类位置**：KSBlackMarketConfig、KSOrderConfig等配置类可能在其他地方自动生成
2. **错误处理**：部分配置查找失败只记录日志，建议增加降级处理
3. **建筑ID**：黑市建筑ID为 `724000`
4. **协议名称**：注意刷新命令拼写为 `Rresh`（可能是有意为之或拼写错误）

---

*文档生成时间：2026年3月24日*

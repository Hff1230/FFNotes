```
package com.elex.cok.gameengine.battle;

import com.elex.cok.handlers.requesthandlers.battle.BattleConstants;

/**
 * 游戏效果作用号枚举定义类,后续添加请尽量按照ID递增顺序来添加
 */
public enum GameEffect {
        /**
         * TODO 预计2017.7.1可移除
         * worldmarch数据反序列化需要的部分
         * 所有id增加1000000防止冲突
         */
        COLLECTION_CAR_MINE_FIGHT_DEF_ADD(1002250), // 采集车
        BATTLE_EFFECT_24(1000024),
        DETENTION_ZOMBIE_ATK_ADD1(1002013), // 禁锢攻击比例增加
        DETENTION_ZOMBIE_DEFENSE1(1002033), // 禁锢僵尸防御比例增加
        DETENTION_ZOMBIE_LIFE_ADD(1002053), // 禁锢僵尸

        // New
        ATK(1), // 攻击
        DEF(2), // 防御
        LEAD(3), // 统率
        HP(4), // 生命
        HP_PERCENT(5), // 生命比例
        LEAD_PERCENT(8), // 统率比例

        CATCH_HERO_RATE(14), // 增加英雄抓捕概率**/

        HERO_ESCAPE_RATE(19), // ***增加英雄逃脱几率*/

        MARCH_NEW_SPEED(23,false), // 新行军速度作用号

        AMY_FORMATION_FUNCTION_ON(27,false), // 编队功能开关
        AMY_FORMATION_MAX_COUNT(28,false), // 编队最大个数
        WORLD_DEAD_SOLDIER_MAX(29,false), // 王国伤兵上限增加百分比
        ALLIANCE_CAMP_HIRE_LEVEL_ADD(30,false), // 联盟兵营招募士兵的等级提升
        BATTLEFIELD_PROTECT(31,false), // 进入保护状态-竞技场作用号
        SMOKING(32,false), // 冒烟效果

        SLOW_DOWN_ATK_MARCH(37,false), // 使攻击方减速
        RESOURCE_PROTECT(38,false),
        SKILL_RESOURCE_PROTECT(39,false),

        WOOD_OUTPUT(50,false),
        STONE_OUTPUT(51,false),
        IRON_OUTPUT(52,false),
        FOOD_OUTPUT(53,false),
        SILVER_OUTPUT(54,false),
        WORLD_MARCH_SOLDIER(56,false), // 出征带兵上限
        DEAD_SOLDIER_MAX(57,false), // 伤兵上限增加百分比
        ALLIANCE_HELPER_SPEED(58,false), // 援军速度
        MARCH_SPEED_FIELD_MONSTER(59,false),
        MARCH_SPEED(60,false),

        WORLD_SHIELD(61,false),
        WORLD_AGAIN_SCOUT(62,false), //
        STRAW(63,false), // 稻草人
        ARMY_FOOD_COST(64,false), // 兵营的维护费用降低
		ARMY_FOOD_COST_ADD(6400,false), // 兵营的维护费用增加
        COLLECT_SPEED(65,false), // 采集速度
        MAKE_ARMY_SPEED(66,false), // 造兵速度
        MAKE_FORT_SPEED(67,false), // 造陷阱速度
        BUILDING_SPD(68,false), // 建造速度
        SCIENCE_RESEARCH(69,false), // 科技研究
        VIP_STATUS(70,false), // VIP状态
        WORLD_SILVER_RES_PROTECT(71,false),	
        WORLD_EXCEPT_SILVER_RES_PROTECT(72,false),
        DEAD_SOLDIER_NUM(73,false), // 伤兵上限数量
        ALLIANCE_TRADE_SPEED(74,false), // 联盟交易速度
        ALLIANCE_MUSTER_SPEED(75,false), // 联盟集结速度
        WORLD_LOAD(78,false),
        COLLECT_GOLD_SPEED(79,false),
        EXP(80,false),
        GENERAL_TRAIN_EXP(86,false), // 武将训练所得经验
        WORLD_PLUNDER_LOAD(87,false),
        FORT_MAX(88,false), // 战争堡垒的上限
        SCOUT_MARCH_SPEED(94,false), // 侦查行军速度
        MARCH_SPEED_CITY(95,false),
        MARCH_SPEED_OTHER(96,false),
        MARCH_SPEED_RESOURCE(97,false),
        MARCH_SPEED_MONSTER(98,false),
        GOLD_ADD(100,false),
        WOOD_ADD(101,false),
        STONE_ADD(102,false),
        IRON_ADD(103,false),
        FOOD_ADD(104,false),
        SILVER_ADD(105,false),
        WORLD_STAMINA(106,false),
        ADD_STAMINA(107,false),
        CURE_RESOURCE_REDUCE(108,false),
        EXP_ADD(109,false),
        VIP_ATTRIBUTE(110,false), // vip点数
        HERO_EXP_ADD_NOT_ITEM_RARE(111,false),//英雄加经验 道具不加
        F_SOLDIER_ADD_SPEED(113,false), //勇士造兵速度
        R_SOLDIER_ADD_SPEED(114,false), // 改装车造兵速度
        B_SOLDIER_ADD_SPEED(115,false), // 射手造兵速度
        C_SOLDIER_ADD_SPEED(116,false), //丧尸兵造兵速度
        CURE_SOLDIER_TIME(121,false), // 治疗伤兵的时间缩短
        CITY_DEF_SPD(122,false), // 着火损失的城防值
        CITY_DEF_VALUE(125,false), // 城防值
        SILVER_PROTECT_PERCENT(128,false), // 银币保护数量百分比
        ARM_ADD_MAX_PER(131,false), // 单次造兵数上限增加
        RESOURCE_MAX_VALUE(132,false), // 资源存储上限
        ALL_SOLIDER_LOAD(133,false),//都是部队负重增加
        ALLIANCE_TRADE_RATE(139,false), // 降低交易税率
        ALLIANCE_TRADE_WEIGHT(140,false), // 提高交易负重
        ALLIANCE_HELPER_ADD(141,false), // 援军上限
        ALLIANCE_HELP_TIME(142,false), // 联盟帮助时间
        TEAM_BATTLE_ADD(143,false), // 组队战斗的队员位置增加
        BATTLE_TROOPS_NUM(144,false), // 战争大厅集结部队的数量
        ALLIANCE_PROGRESS_DOUBLE(145,false), // 联盟捐献时，获得双倍进度的概率
        ALLIANCE_CONTRIBUTE_DOUBLE(146,false), // 联盟捐献时，获得双倍联盟贡献的概率
        WOOD_COLLECT_SPEED(153,false),
        FOOD_COLLECT_SPEED(154,false),
        IRON_COLLECT_SPEED(155,false),
        STONE_COLLECT_SPEED(156,false),
        STEEL_ADD(158,false), // 增加钢材
        CHIP_ADD(159,false), // 增加筹码
        DIAMOND_ADD(160,false), // 增加金筹码
        ALLIANCE_HELP_ADD(161,false),
        BUILD_TRAP_NUM_ADD(162,false), // 每次造陷阱的数量增加 数值
        COLLECT_RATE(164,false), // 采集获得的资源量提升 百分比
        CHIP_ACC_ADD(165,false), // 提高芯片产量作用号
        GOLD_COIN_ACC_ADD(166,false), // 提高金币产量作用号
        TRAIN_SOLDIER(167,false), // 训练士兵消耗资源
        Recruit_More_Warrior(168,false), /// **单次招募更多勇士*/
        Recruit_More_Shooter(169,false), /// **单次招募更多射手*/
        Recruit_More_Car(170,false), /// **单次招募更多车*/
        Recruit_More_Zombie(171,false), /// **单次招募更多丧尸*/
        Recruit_More_TacticalSoldier(172,false), // **特种兵拥有更多更多*/
        Recruit_More_TacticalSoldier_Rate(173,false), // **特种兵拥有更多 百分比*/
        AIR_SUPPORT_RESOURCE_FUEL_BASE_ADD(180,false), // 援助中心燃料基础值增加
        AIR_SUPPORT_RESOURCE_FOOD_BASE_ADD(181,false), // 援助中心粮食基础值增加
        AIR_SUPPORT_RESOURCE_IRON_BASE_ADD(182,false), // 援助中心钢铁基础值增加
        AIR_SUPPORT_RESOURCE_METAL_BASE_ADD(183,false), // 援助中心合金基础值增加
        AIR_SUPPORT_RESOURCE_DAILY_FREE_NUM_ADD(184,false), // 援助中心免费次数增加
        SCIENCE_COST_FUEL_RATE(185,false), // 科技研究消耗燃油
        SCIENCE_COST_FOOD_RATE(186,false), // 科技研究消耗食物
        SCIENCE_COST_IRON_RATE(187,false), // 科技研究消耗钢铁
        SCIENCE_COST_METAL_RATE(188,false), // 科技研究消耗合金
        SCIENCE_COST_ALL_RATE(189,false), // 科技研究所有消耗
        CURE_SOLDIER_NOW(192,false), // 立即治疗XX士兵
        MAKE_RANDOM_ARMY(193,false), // 立即招募xx个随机等级的勇士
        ALL_HERO_EXP_UP(194,false), // 所有英雄立即获得XX经验
        LOW_SOLDIER_UP(195,false), // 使XX名最低等级的士兵提升一个级别
        DEFEND_HERO_CAPTURE_RATE(197), // 守城军官不被抓铺的概率
        SCIENCE_REDUCE_COST_ALL_RATE(199,false), // 减少所有科技研究所有消耗
        WORLD_POISONING(200,false), // 世界地图中毒
        WORLD_CANNOT_MOVE(201,false), // 世界地图不能移动

        CURE_LEVEL1_7_SOLDIER_TIME(206,false), // 治疗7级以下伤兵速度
        CURE_LEVEL8_9_SOLDIER_TIME(207,false), // 治疗8-9级伤兵速度
        CURE_LEVEL10_SOLDIER_TIME(208,false), // 治疗10级伤兵速度
        CURE_LEVEL1_7_SOLDIER_RES_COST(209,false), // 治疗7级以下伤兵资源
        CURE_LEVEL8_9_SOLDIER_RES_COST(210,false), // 治疗8-9级以下伤兵资源
        CURE_LEVEL10_SOLDIER_RES_COST(211,false), // 治疗10级以下伤兵资源
        CURE_RESOURCE_REDUCE2(212,false), // 治疗伤兵资源降低2
        CURE_RESOURCE_REDUCE3(213,false), // 治疗伤兵资源降低3
        CURE_RESOURCE_REDUCE4(214,false), // 治疗伤兵资源降低4
        CURE_RESOURCE_REDUCE5(215,false), // 治疗伤兵资源降低5
        BUILDING_COST_RESOURCE(216,false), // 建筑资源减耗
        DEFENSE_ITEM_COST_RESOURCE(217,false), // 防御武器资源减耗
        ARMY__COST_RESOURCE(218,false), // 士兵训练消耗

        MERGE_BUILDING_COLLECT_RES_RANDOM_RATE(219,false), // **合服建筑采集掉落概率*/
        REWARD_LIMIT_KINGDOM_LEGEND_STEP_TARGET_REWARD(220,false), // 最强要塞解锁更高级奖励
        IMMEDIATE_RESEARCH(221,false), // **获得立即研究时间 当研究剩余时间时间<【221】时，在科研中心上面增加免费按钮（与建筑相同），点击免费后立即研究成功。*/
        IMMEDIATE_BUILDING(222,false), // **立即建筑时间增加 增加免费建造时间，和VIP叠加*/

        SCORE_BUFF_KINGDOM_LEGEND_COLLECT_RESOURCE(223,false), // 采集增加的最强要塞积分提高
        SCORE_BUFF_KINGDOM_LEGEND_RISE_POWER_BUILDING(224,false), // 建造增加的最强要塞积分提高
        SCORE_BUFF_KINGDOM_LEGEND_RISE_POWER_SCIENCE(225,false), // 研究增加的最强要塞积分提高
        SCORE_BUFF_KINGDOM_LEGEND_KILL_MONSTER(226,false), // 消灭丧尸增加的最强要塞积分提高
        SCORE_BUFF_KINGDOM_LEGEND_KILL_SOLDIERS(227,false), // 击杀士兵增加的最强要塞积分提高
        SCORE_BUFF_KINGDOM_LEGEND_ALL_ACTION(228,false), // 所有的最强要塞积分提高
        SCORE_BUFF_KINGDOM_LEGEND_KILL_OTHER_SERVER_POSITIVE_POSITION_SOLDIERS(229,false), // 击杀它服带有正面官职的敌人士兵增加的最强要塞积分提高
        SCORE_BUFF_KINGDOM_LEGEND_KILL_OTHER_SERVER_KING_SOLDIERS(230,false), // 击杀它服总统的士兵增加的最强要塞积分提高
        REWARD_RATE_DOUBLE_REWARD(231,false), // 几率获得双倍个人奖励
        SCIENCE_RESEARCH_ITEM_REDUCE(232,false), // 研究科技物品消耗减少
        ExtraRemedy(233,false), // **即使急救帐篷已满，也可以收治{0}%的伤兵*/
        ZOMBIE_TRANSFORM(234), // **战斗时死兵转化丧尸比例 战斗结束后，死亡的士兵转化成同等级的丧尸。转化是在部队回程时产生，如果是守城死兵，就会直接转化。转化成功后给玩家发一封邮件。 阵亡部队数量：{0} 转化数量：{1}
        // 转化数量=死亡士兵*【234】/100*/
        SCORE_BUFF_KINGDOM_LEGEND_TRAIN_SOLDIERS(237,false), // 训练获得的最强要塞积分提高
        SCORE_BUFF_KINGDOM_LEGEND_CROSS_FIGHT_TIME(238,false), // 占领敌方土地获得的最强要塞积分提高
        WORLD_SCORE_BUFF_KINGDOM_LEGEND_ALL_ACTION(239,false), // 所有的最强要塞积分提高（王国）
        KILL_MONSTER_REWARD_MORE(240,false), // 杀怪奖励提高
        TRAIN_SOLDIER_RATE(242,false), // 训练士兵上限
        PAY_GET_GOLD_RATE(243,false), // 购买获得钻石提高，只生效一次
        //AMY_DEFENSE_FORMATION_ADD(244,false), // VIP福利-防守队列
        MARCH_COUNT_REINFORCE(247,false), // 增加玩家可援助玩家部队队列数
        MARCH_COUNT_TRADE(248,false), // 增加玩家可援助玩家资源（黑市）队列数
        TRADE_CARRY(249,false), // 增加玩家援助资源的负重百分比
        TRADE_TAX_RATE(250,false), // 降低玩家资源援助的税率


        RESCUECENTER_VALUME(254,false), // **254救护中心容量数值 容量=（基础值+【254】）*（1+【255】/100)*/
        RESCUECENTER_VALUME_RATE(255), // **255救护中心容量%百分比*/
        RESCUECENTER_SPEED_RATE(256), // **256救护中心的救治速度百分比 救治时间=基础时间/(1+【256】/100）*/
        RESCUECENTER_HEAL2_RATE(257), // **257救护中心伤兵转化率百分比*/
        RESCUECENTER_DEAD2_RATE(258), // **258救护中心死兵转化率百分比*/

        /**
         * 导弹相关作用号
         */
        MISSILE_STORAGE_MAX(274,false),
        MISSILE_LAUNCH_MAX(275,false),
        MISSILE_PRODUCE_SPEED(276,false),
        MISSILE_ANTI(277,false),
        MISSILE_CITY_DEF(278,false),
        MISSILE_GAS_HURT(279,false),
        MISSILE_SPEED(280,false), // 导弹发射速度
        MAD_SCIENTIST_SPEED_RESEARCH(281,false),
        ANTI_ENERGY_LIMIT(282,false), // 激光能量上限提高
        ANTI_ENERGY_SPEED(283,false), // 激光能量恢复速度提高
        ANTI_ENERGY_ADD(284,false), // 激光能量恢复
        MISSILE_SKILL_CD(285,false), // 增加技能冷却CD的效果
        MISSILE_STRENGTHEN_SCOUT(288,false), // 超级侦查(被侦查时,自己的反侦察状态和保护罩暂时失效)
        VIP_STORE_REFRESH_TIMES(293,false), // **293 VIP商店商品每天刷新次数*/
        MISSILE_ADD_ATK_VALUE(294,false), // 增强导弹破坏力(atk_value)
        CITY_DEF_INCR_LIMIT(297,false), // **297 城防值自动恢复上限*/
        // VIP_STORE_SHOW_ITEM_AMOUNT(298,false), // **298 增加VIP商店商品显示数量*/
        // USER_TROOP_TRAN_LV_LIMIT(299,false), // **299 增加兵种改造等级上限*/
        ARMY_TRUCK_ADD_SOLDIER_NUM(300,false), // 运兵车增加出征上限
        MISSILE_DEL_CD(301,false), // 减少导弹发射CD

        BLASTING_MISSILE_TIME_REDUCE(677,false),//爆破飞弹生产时间减少
        FIRE_MISSILE_TIME_REDUCE(678,false),//燃烧飞弹
        ILLUMINATION_MISSILE_TIME_REDUCE(679,false),//照明飞弹
        POISON_MISSILE_TIME_REDUCE(680,false),//毒气飞弹
        FREEZE_MISSILE_TIME_REDUCE(681,false),//急冻飞弹
        ANTI_MISSILE_TIME_REDUCE(860,false),//反导导弹
        BLASTING_MISSILE_RESOURCE_REDUCE(682,false),//爆破飞弹生产资源减少
        FIRE_MISSILE_RESOURCE_REDUCE(683,false),//燃烧飞弹
        ILLUMINATION_MISSILE_RESOURCE_REDUCE(827,false),//照明飞弹
        POISON_MISSILE_RESOURCE_REDUCE(828,false),//毒气飞弹
        FREEZE_MISSILE_RESOURCE_REDUCE(829,false),//急冻飞弹
        ANTI_MISSILE_RESOURCE_REDUCE(899,false),//反导导弹
        MISSILE_MONEY_REDUCE(831,false),//所有导弹钞票消耗减少
        MISSILE_CHIP_REDUCE(839,false),//所有导弹芯片消耗减少



        // AMY_FORMATION_MARCH_LIMIT(303,false), // 高级编队-出征上限配置开关
        // AMY_FORMATION_ATTACK(304,false), // 高级编队-攻防状态配置开关
        // AMY_FORMATION_SKILL(305,false), // 高级编队-技能配置开关
        // AMY_FORMATION_EQUIP(306,false), // 高级编队-装备配置开关
        // AMY_FORMATION_MARCH_SPEED(307,false), // 高级编队-行军加速配置开关
        VIP_CREATE_CHAT_ROOM_COUNT(310,false), // VIP创建聊天室数量是权限
        MERGE_BUIlDING_ADD_SOLDIER_NUM(311,false), // 合服建筑增加出征上限 加在最后,不受百分比加成

        HELP_ALLIANCE_MEMBER_MARCH_ADD_SOLDIER(319,false), // 援助盟友时,出征上限提高
        ASSEMBLY_MARCH_ADD_SOLDIER(320,false), // 参与集结时,出征上限提高
        ASSEMBLY_MARCH_ADD_SPEED(325), // 集结行军速度
        HELP_ALLIANCE_MEMBER_MARCH_ADD_SPEED(326,false), // 援助盟友行军速度
        ALLIANCE_HELP_ADD_2(327,false), // 帮助次数
        ALLIANCE_HELP_REDUCE_CD(328,false), // 帮助减少时间
        ALLIANCE_HELP_ARMY_CAPACITY(329,false), // 援兵容量

        ADD_RESOURCE_POINT_SHIELD(557,false), // 加资源点保护罩 目前合服专用
        ADD_DESERT_TALENT_EXP(331,false), // 沙漠天赋经验

        DESERT_SCORE_ACTIVITY_SCORE_ADD(332,false), // 沙漠竞赛积分获取速度
        DESERT_SCORE_ACTIVITY_AWARD_SUBLIMATE(333,false), // 沙漠竞赛奖励内容替换
        DESERT_SCORE_ACTIVITY_AWARD_MORE(334,false), // 沙漠竞赛奖励解锁奖励段位
        DESERT_GOLD_CHARGED_RATE(335,false), // 金币获取量提高
        UNLOCK_MORE_LEVEL_RESOURCE_POINT(336,false), // 解锁更高级的资源田
        UNLOCK_MORE_LEVEL_MONSTER(337,false), // 解锁更高级的怪物
        TRANSPORT_FORCES_CAMP_BUILD_TIME_REDUCE(338,false), // 运输部队营地 建造时间减少
        TRANSPORT_FORCES_CAMP_GOLD_ITEM_REDUCE(339,false), // 运输部队营地 建造金币减少
        TRANSPORT_FORCES_CAMP_BUILD_RES_REDUCE(340,false), // 运输部队营地 建造资源减少
        TRANSPORT_FORCES_CAMP_MAX_LEVEL_ADD(342,false), // 运输部队营地 建筑最大等级提升
        TRANSPORT_FORCES_CAMP_BUILD_NUM(343,false), // 运输部队营地 建筑数量

        TRANSPORT_FORCES_CAMP_BUILD_CLUSTER(344,false), // 运输部队营地 6连效果激活
        GOLD_FACTORY_BUILD_CLUSTER(345,false), // 金币铸造厂6连效果激活
        ARCHEOLOGY_CAMP_BUILD_CLUSTER(346,false), // 考古队员营地6连效果激活
        DESERT_COMBAT_BASE_BUILD_CLUSTER(347,false), // 沙漠作战基地6连效果激活
        DESERT_PLATFORM_BUILD_CLUSTER(348,false), // 沙漠运兵平台6连效果激活
        DESERT_WARS_FORTRESS_BUILD_CLUSTER(349,false), // 沙漠战争堡垒6连效果激活
        OASIS_HOSPITAL_BUILD_CLUSTER(350,false), // 绿洲医院6连效果激活

        DESERT_EXP_ADD_RATE(352,false), // 沙漠经验获取加成
        GOLD_FACTORY_BUILD_TIME_REDUCE(353,false), // 金币铸造厂 建造时间减少
        GOLD_FACTORY_GOLD_ITEM_REDUCE(354,false), // 金币铸造厂 建造金币减少
        GOLD_FACTORY_BUILD_RES_REDUCE(355,false), // 金币铸造厂 建造资源减少
        GOLD_FACTORY_MAX_LEVEL_ADD(356,false), // 金币铸造厂 建筑最大等级提升
        GOLD_FACTORY_BUILD_NUM(357,false), // 金币铸造厂 建筑数量

        DESERT_COMBAT_BASE_BUILD_TIME_REDUCE(358,false), // 沙漠作战基地 建造时间减少
        DESERT_COMBAT_BASE_GOLD_ITEM_REDUCE(359,false), // 沙漠作战基地 建造金币减少
        DESERT_COMBAT_BASE_BUILD_RES_REDUCE(360,false), // 沙漠作战基地 建造资源减少
        DESERT_COMBAT_BASE_MAX_LEVEL_ADD(361,false), // 沙漠作战基地 建筑最大等级提升
        DESERT_COMBAT_BASE_BUILD_NUM(362,false), // 沙漠作战基地 建筑数量

        DESERT_PLATFORM_BUILD_TIME_REDUCE(363,false), // 沙漠运兵平台 建造时间减少
        DESERT_PLATFORM_GOLD_ITEM_REDUCE(364,false), // 沙漠运兵平台 建造金币减少
        DESERT_PLATFORM_BUILD_RES_REDUCE(365,false), // 沙漠运兵平台 建造资源减少
        DESERT_PLATFORM_MAX_LEVEL_ADD(366,false), // 沙漠运兵平台 建筑最大等级提升
        DESERT_PLATFORM_BUILD_NUM(367,false), // 沙漠运兵平台 建筑数量

        DESERT_WARS_FORTRESS_BUILD_TIME_REDUCE(368,false), // 沙漠战争堡垒 建造时间减少
        DESERT_WARS_FORTRESS_GOLD_ITEM_REDUCE(369,false), // 沙漠战争堡垒 建造金币减少
        DESERT_WARS_FORTRESS_BUILD_RES_REDUCE(370,false), // 沙漠战争堡垒 建造资源减少
        DESERT_WARS_FORTRESS_MAX_LEVEL_ADD(371,false), // 沙漠战争堡垒 建筑最大等级提升
        DESERT_WARS_FORTRESS_BUILD_NUM(372,false), // 沙漠战争堡垒 建筑数量

        OASIS_HOSPITAL_BUILD_TIME_REDUCE(373,false), // 绿洲医院 建造时间减少
        OASIS_HOSPITAL_GOLD_ITEM_REDUCE(374,false), // 绿洲医院 建造金币减少
        OASIS_HOSPITAL_BUILD_RES_REDUCE(375,false), // 绿洲医院 建造资源减少
        OASIS_HOSPITAL_MAX_LEVEL_ADD(376,false), // 绿洲医院 建筑最大等级提升
        OASIS_HOSPITAL_BUILD_NUM(377,false), // 绿洲医院 建筑数量

        ARCHEOLOGY_CAMP_BUILD_TIME_REDUCE(378,false), // 考古营地 建造时间减少
        ARCHEOLOGY_CAMP_GOLD_ITEM_REDUCE(379,false), // 考古营地 建造金币减少
        ARCHEOLOGY_CAMP_BUILD_RES_REDUCE(380,false), // 考古营地 建造资源减少
        ARCHEOLOGY_CAMP_MAX_LEVEL_ADD(381,false), // 考古营地 建筑最大等级提升
        ARCHEOLOGY_CAMP_BUILD_NUM(382,false), // 考古营地 建筑数量
        MERGE_BUILDING_SPEED_UP(383,false), // 沙漠限时建筑建造速度提升

        DEFWIN_HURT_TO_DEAD(384, false),//单人攻城失败后，守城方伤转死（百分比）
        ATTWIN_HURT_TO_DEAD(385, false),//单人攻城胜利后，守城方伤转死（百分比）

        SIEGE_HOSPITAL_SPEED_RATE(386,false), // 攻城掠地医院治疗速度
        SIEGE_HOSPITAL_RESOURCE_RATE(387,false), // 攻城掠地医院资源消耗
        AL_ROULETTE_FUNCTION(390,false), // 联盟资源转盘开关作用号
        SCIENCE_RESEARCH_SILVER_REDUCE(391,false), //科技消耗白银奖章数减少
        DRAWING_REDUCE(392,false), //副岛消耗图纸减少
        ACTIVITY_AL_SCORE_ADD(393,false), //联盟军备竞赛积分百分比增加
        ALLIANCE_CAMP_RELIVE_RATE_5TO7(394,false), // 联盟庇护所-5-7级士兵救治比例 % 提升此属性，可以提升联盟庇护所救治5-7级士兵的比例。 黄宁
        ALLIANCE_CAMP_RELIVE_RATE_8TO9(395,false), // 联盟庇护所-8-9级士兵救治比例 % 提升此属性，可以提升联盟庇护所救治8-9级士兵的比例。 黄宁
        ALLIANCE_CAMP_RELIVE_RATE_10(396,false), // 联盟庇护所-10级士兵救治比例 % 提升此属性，可以提升联盟庇护所救治10级士兵的比例。 黄宁
        ALLIANCE_CAMP_RELIVE_UPLIMIT(397,false), // 联盟庇护所-伤兵救治上限 数值 提升此属性，可以提升联盟兵营的伤兵上限。 黄宁

        SPEED_MARCH_BY_MISSILE(398,false), // 其他人向作用号持有者行军时，行军速度增加
        ADD_LOAD_BY_MISSILE(399,false), // 其他人向作用号持有者行军时，部队负重增加
        PERSONAL_ACTIVITY_STEP_REWARD_UPGRADE(400,false), // 军备竞赛解锁更多奖励
        PERSONAL_ACTIVITY_DOUBLE_SCORE(401,false), // 个人军备双倍积分

        // MATERIAL_RESEARCH_402(402), //出征时每增加一个兵种，全体攻击
        // MATERIAL_RESEARCH_403(403),//进攻时所有兵种概率攻击后排
        MATERIAL_RESEARCH_404(404,false),//新作用 提升能源核心生产速度
        MATERIAL_RESEARCH_405(405,false),//稀有装备材料生产时间减少
        MATERIAL_RESEARCH_406(406,false),//装备材料生产时间减少
        MATERIAL_RESEARCH_407(407,false),//武器装备生产时间减少
        MATERIAL_RESEARCH_408(408,false),//武器装备生产所需聚变核心减少
        MATERIAL_RESEARCH_409(409,false),//头部装备生产时间减少
        MATERIAL_RESEARCH_410(410,false),//头部装备生产所需聚变核心减少
        MATERIAL_RESEARCH_411(411,false),//衣服装备生产时间减少
        MATERIAL_RESEARCH_412(412,false),//衣服装备生产所需聚变核心减少
        MATERIAL_RESEARCH_413(413,false),//鞋子装备生产所需时间减少
        MATERIAL_RESEARCH_414(414,false),//鞋子装备生产所需聚变核心减少
        MATERIAL_RESEARCH_415(415,false),//饰品装备生产所需时间减少
        MATERIAL_RESEARCH_416(416,false),//饰品装备生产所需聚变核心减少
        MATERIAL_RESEARCH_417(417,false),//生产所有装备的所需时间减少
        MATERIAL_RESEARCH_418(418,false),//生产所有装备所需聚变核心减少

        MATERIAL_RESEARCH_419(419,false),//解锁绿色装备材料
        MATERIAL_RESEARCH_420(420,false),//解锁材料生产格子
        MATERIAL_RESEARCH_421(421),//配件分解获得能源核心增加
        MATERIAL_RESEARCH_422(422),//材料可分解为能源核心 默认为0代表关闭，1代表功能开启，通过科技解锁
        //MATERIAL_RESEARCH_423(423,false),//同时进材料生产和装备生产
        MATERIAL_RESEARCH_424(424,false),//装备材料拆解成聚变核心
        MATERIAL_RESEARCH_425(425,false),// 额外2个能源工厂	数值(0、1、2)
        //MATERIAL_RESEARCH_426(426,false),//生产白色稀有材料获得双倍
        //MATERIAL_RESEARCH_427(427,false),//生产白色材料获得双倍


        AL_RES_FUEL_LIMIT(428,false), // 增加联盟燃料田放置数量
        AL_RES_FOOD_LIMIT(429,false), // 增加联盟粮食田放置数量
        AL_RES_IRON_LIMIT(430,false), // 增加联盟钢铁田放置数量
        AL_RES_METAL_LIMIT(431,false), // 增加联盟合金田放置数量
        //MATERIAL_RESEARCH_432(432,false),//解锁蓝色装备材料

        //AMY_FORMATION_MARCH_TOGETHER_ON(433,false), // 联合行军开关
        //AMY_FORMATION_MARCH_TOGETHER_MORE(434,false), // 联合行军额外部队数量
        //AMY_FORMATION_MARCH_TOGETHER_COUNT(435,false), // 联合行军可存储编队个数

        // 第八件装备
        EQUIP_ADD_EFFECT_POS1(436,false), // 强化本套装部位=1的装备
        EQUIP_ADD_EFFECT_POS2(437,false), // 强化本套装部位=2的装备
        EQUIP_ADD_EFFECT_POS3(438,false), // 强化本套装部位=3的装备
        EQUIP_ADD_EFFECT_POS4(439,false), // 强化本套装部位=4的装备
        EQUIP_ADD_EFFECT_POS5(440,false), // 强化本套装部位=5的装备
        EQUIP_ADD_EFFECT_POS6(441,false), // 强化本套装部位=6的装备
        EQUIP_ADD_EFFECT_POS7(442,false), // 强化本套装部位=7的装备
        SUIT_EQUIP3_ADD_EFFECT(443,false), // 强化本套装3件套的效果
        SUIT_EQUIP5_ADD_EFFECT(444,false), // 强化本套装5件套的效果
        SUIT_EQUIP7_ADD_EFFECT(445,false), // 强化本套装7件套的效果
        SUIT_EQUIP3_NUM_REDUCE(446,false), // 激活3件套的效果所需装备数量-1
        SUIT_EQUIP5_NUM_REDUCE(447,false), // 激活5件套的效果所需装备数量-1
        SUIT_EQUIP7_NUM_REDUCE(448,false), // 激活7件套的效果所需装备数量-1
        MATERIAL_RESEARCH_449(449,false), //解锁材料生产格子第7个
        BF_SCORE_ACTIVITY_AWARD_MORE(451,false), // 竞技场解锁更多档奖励(废弃,直接显示9档奖励)
        BF_SCORE_ACTIVITY_SCORE_ADD(454,false), // 竞技场积分百分比增加(单次作用)

        WATCHTOWER_TROOPTRAN(455,false), // ** 雷达作用: 查看兵种改造等级 */
        OPEN_DISCOVERY(457,false), // 可以使用探索
        RESOURCE_GET_DESERT_TALENT_EXP(458,false), // 采集获沙漠天赋经验
        MONSTER_GET_DESERT_TALENT_EXP(459,false), // 打怪获沙漠天赋经验
        ACTIVE_DESERT_SKILL_ADD_DESERT_TALENT_EXP(460,false), // 主动技能：获得加经验技能开关
        BUILDING_DESERT_EXP_CRIT(461,false), // 升级建筑时有一定几率获得双倍经验
        ACTIVE_DESERT_SKILL_ADD_DESERT_SCORE(462,false), // 主动技能：获得充值积分技能开关
        TRANSPORT_FORCES_BUILD_ADD_DESERT_EXP(463,false), // 运输部队营地建造加经验
        ARCHEOLOGY_CAMP_BUILD_ADD_DESERT_EXP(464,false), // 考古队员营地建造加经验
        GOLD_FACTORY_ADD_DESERT_EXP(465,false), // 金币铸造厂建造加经验
        DESERT_COMBAT_BASE_ADD_DESERT_EXP(466,false), // 沙漠作战平台建造加经验
        DESERT_PLATFORM_ADD_DESERT_EXP(467,false), // 沙漠运兵平台建造加经验
        DESERT_WARS_FORTRESS_ADD_DESERT_EXP(468,false), // 沙漠战争堡垒建造加经验
        OASIS_HOSPITAL_ADD_DESERT_EXP(469,false), // 绿洲医院建造加经验
        TRANSPORT_FORCES_BUILD_SPEED(470,false), // 建造运输部队营地的速度
        ARCHEOLOGY_CAMP_BUILD_SPEED(471,false), // 建造考古队员营地的速度
        GOLD_FACTORY_SPEED(472,false), // 建造金币铸造厂的速度
        DESERT_COMBAT_BASE_SPEED(473,false), // 建造沙漠作战基地的速度
        DESERT_PLATFORM_SPEED(474,false), // 建造沙漠运兵平台的速度
        DESERT_WARS_FORTRESS_SPEED(475,false), // 建造沙漠战争堡垒的速度
        OASIS_HOSPITAL_SPEED(476,false), // 建造绿洲医院的速度

        DESERT_SCORE_COLLECT_RESOURCE(484,false), // 沙漠竞赛采集获得的积分
        DESERT_SCORE_MONSTER(485,false), // 沙漠竞赛消灭丧尸获得的积分
        DESERT_SCORE_SCIENCE(486,false), // 沙漠竞赛研究科技获得的积分
        DESERT_SCORE_BUILDING(487,false), // 沙漠竞赛建造获得的积分
        DESERT_SCORE_TRAIN_SOLIDER(488,false), // 沙漠竞赛训练士兵获得的积分
        DESERT_SCORE_KILL_OTHER_SERVER_ARMY(489,false), // 沙漠竞赛击败敌人获得的积分
        NOT_COLLECT_RESOURCE(490,false), // 不能采集
        ALLIANCE_CAMP_RELIVE_RATE_1TO4(491,false), // 联盟庇护所-1-4级士兵救治比例 % 提升此属性，可以提升联盟庇护所救治1-4级士兵的比例。 黄宁
        DESERT_BUILDING_RES_REDUCE(493,false), // 降低沙漠建筑消耗的资源
        DESERT_BUILDING_GOLD_ITEM_REDUCE(494,false), // 降低沙漠建筑消耗的金币
        DESERT_BUILDING_MAX_NUM_ADD(495,false), // 所有沙漠建筑数量上限+1
        DESERT_BUILDING_LEVEL_LIMIT_ADD(496,false), // 所有沙漠建筑等级数量上限

        ALL_DESERT_BUILDING_ADD_DESERT_TALENT_EXP(497,false), // 所有建筑沙漠建筑天赋经验加成

        ALLIANCE_EXPAND(500,false), // 联盟成员上限增加
        //TOWER_KILL_SCOUT_ARMY(503), // 哨塔击杀侦察兵比例
        ALLIANCE_RESEARCHER_SPEED(510,false), // 增加联盟科技研究速度
        RECORD_LAST_DISPATCH_ARMY(511,false), // 记录玩家上次出征部队的作用号
        HERO_SKILL_INCREASE_TRUNK_WEIGHT(512,false),//增加运输车的负重

        //INCREASE_HERO_SKILL_STRENGH_AMOUNT(518,false), //** 增加每天的使用碎片强化的最大值效果 */
        //EQUIP_EXPERT_TRAN(519,false), // VIP解锁第八件装备专家改良

        MISSILE_CHIP_RECOVER(520,false), // 发射导弹回收芯片比例
        MISSILE_DEF_ATK_ADD(521), // 爆破弹城防值伤害提升
        MISSILE_GAS_ATK_ADD(522,false), // 毒气弹毒伤士兵死亡比例
        MISSILE_RES_ATK_LIMIT_ADD(523,false), // 地狱火导弹烧毁资源上限提升
        MISSILE_CHIP_ATK_LIMIT_ADD(524,false), // 地狱火导弹烧毁芯片上限提升
        MISSILE_FREEZE_TIME_REDUCE(525,false), // 急冻持续时间降低
        MISSILE_TITAN_CD_REDUCE(526,false), // 泰坦导弹发射间隔降低
        MISSILE_REMOTE_TITAN_CD_REDUCE(527,false), // 远程泰坦导弹发射间隔降低
        MISSILE_SHOCK_TIME_REDUCE(528,false), // 震荡炸弹持续时间降低
        MISSILE_DEFENDER_LIMIT_ADD(529,false), // 防卫者飞弹死兵上限提升
        MISSILE_MINE_ATK_ADD(530,false), // 幽影地雷伤兵伤害提升
        MISSILE_MINE_TIME_ADD(531,false), // 幽影地雷存在时间提升
        MISSILE_SIGN_TIME_ADD(532,false), // 提升标定持续时间
        MISSILE_GAS_ATK_REDUCE(533), // 被毒气弹攻击时，伤兵伤害降低
        MISSILE_ANTI_TIME_ADD(534,false), // 极限反导时间提升
        MATERIAL_RESEARCH_535(535,false),//制造勋章所需聚变核心数量减少    %
        MATERIAL_RESEARCH_536(536,false),//  改良勋章所需聚变核心数量减少    %  影响所有的改良类型
        VIP_EFFECT_537(537,false),//  玩家城市援助编队补兵
        HERO_SKILL_INCREASE_APC_WEIGHT(538,false),//装甲运兵车的携带上限+1000
        HERO_SKILL_INCREASE_AMOR(539,false),//装甲运兵车的载具效果+20%

//        SUIT_EQUIP3_ATTACK(540,false), // 穿戴本套装3件套时，部队攻击提高

        COLLECT_ADD_HERO_EXP(540,false),//采集给英雄增加经验，公式：每分钟增加经验 =  540/60
        SUIT_EQUIP5_ATTACK(541,false), // 穿戴本套装5件套时，部队攻击提高
        SUIT_EQUIP7_ATTACK(542,false), // 穿戴本套装7件套时，部队攻击提高
        SUIT_EQUIP3_DEFEND(543,false), // 穿戴本套装3件套时，部队防御提高
        SUIT_EQUIP5_DEFEND(544,false), // 穿戴本套装5件套时，部队防御提高
        SUIT_EQUIP7_DEFEND(545,false), // 穿戴本套装7件套时，部队防御提高

        MATERIAL_RESEARCH_546(546,false), // 生产普通材料获得双倍    %  goods表中type字段为7，para1字段为1的
        MATERIAL_RESEARCH_547(547,false), //生产稀有材料获得双倍    %  goods表中type字段为7，para1字段为2的
        MATERIAL_RESEARCH_548(548,false), //锁定改良所消耗的聚变核心减少    %

        ADD_DISCOVERY_DAILY_NUM(549,false), //每日探索次数增加
        DESERT_TALENT_PAGE_OPEN_2(550,false), //沙漠天赋页 解锁 2
        SUCCESSIVE_UPDATE_BUILDING_LEVEL(551,false),//建筑连续升级开关
        DESTROY_DESERT_BUILDING_ATTENUATION(552,false), //拆沙漠建筑得分衰减
        COMMANDO_HIDE_MORE(553,false), //特种战备兵营进驻上限
        COMMANDO_HIDE_MARCH(554,false), //解锁特种战备兵营可出征
        COMMANDO_DEFEND_LOCK(555,false), //解锁守城特种兵锁定功能
        COMMANDO_HIDE_AUTO(556,false), //解锁特种兵自动藏兵
        //VIP_STORE_LONG_MAIL(558,false),//vip特权：获得图片的长邮件内容
        VIP_GIVE_GIFT_SWITCH(558, false), // 针对类型79的道具赠送做限制

        HERO_SKILL_REDUCE_BLACK_EARTH_BURN_TIME(564,false),//军官技能,减少黑土地城墙燃烧速度
        HERO_SKILL_SPEED_UP_BLACK_EARTH_MARCH(565,false),//军官技能,增加黑土地行军速度
        
        HERO_SKILL_AIRPLANE_RECRUIT(567,false),//军官技能,空降招募令

        VIP_ALLIANCE_FAST_DONATE_OPEN(570,false), // 联盟科技一键捐献VIP特权功能开关:数值  1开0关

        GAME_EFFECT_878_ADD(586,false), // 878作用号效果提升 百分比格式 878作用值=原作用值*（1+【586】/100）刘文

        DESERT_TALENT_PAGE_OPEN_3(600,false), //沙漠天赋页 解锁 3
        DESERT_TALENT_PAGE_OPEN_4(601,false), //沙漠天赋页 解锁 4
        THRONE_TEAM_SOLDIER_NUM(605,false),   // 集结发射中心兵力上限
        FORMATION_SOLDIER_MAX(617,false),     // 带兵数量 百分比

        TREBUCHET_ATTACK_THRONE_RATE(634), // 炮台攻击发射中心伤害比例
        WORLD_FORTRESS_LASTTIME_INCREASE(635,false), // 增加放置堡垒持续时间
        WORLD_FORTRESS_COOLDOWN_REDUCE(636,false), // 减少放置堡垒冷却时间
        WORLD_FORTRESS_COST_REDUCE(637,false), // 减少放置堡垒消耗百分比
        TEAM_SOLDIER_NUM(638,false), // 集结兵力上限

        WORLD_FORTRESS_CAPTURE_POSITION(653,false), // 增加当前抓捕战争堡垒中空位
        WORLD_FORTRESS_CAPTURE_KILL_TIME(654,false), // 减少处决时间
        WORLD_FORTRESS_CAPTURE_ATT_CITY_WIN_CAPTURE_CSB(657),//最强要塞期间，攻城胜利后抓捕几率提高%
        WORLD_FORTRESS_CAPTURE_DEF_CITY_WIN_CAPTURE_CSB(658),//最强要塞期间，守城胜利后抓捕几率提高%
        WORLD_FORTRESS_CAPTURE_ATT_CITY_FAIL_ESCAPE_CSB(659),//最强要塞期间，攻城失败后逃脱几率提高%
        WORLD_FORTRESS_CAPTURE_DEF_CITY_FAIL_ESCAPE_CSB(672),//最强要塞期间，守城失败后逃脱几率提高%
        WORLD_FORTRESS_CAPTURE_DEF_WORLD_FORTRESS_WIN_CAPTURE_CSB(673),//最强要塞期间，守堡垒胜利后抓捕几率提高%
        WORLD_FORTRESS_CAPTURE_ATT_CITY_WIN_CAPTURE_DESERT(662),//沙漠活动期间，攻城胜利后抓捕几率提高%
        WORLD_FORTRESS_CAPTURE_DEF_CITY_WIN_CAPTURE_DESERT(663),//沙漠活动期间，守城胜利后抓捕几率提高%
        WORLD_FORTRESS_CAPTURE_ATT_CITY_FAIL_ESCAPE_DESERT(664),//沙漠活动期间，攻城失败后逃脱几率提高%
        WORLD_FORTRESS_CAPTURE_DEF_CITY_FAIL_ESCAPE_DESERT(665),//沙漠活动期间，守城胜利后逃脱几率提高%
        WORLD_FORTRESS_CAPTURE_DEF_WORLD_FORTRESS_WIN_CAPTURE_DESERT(666),//沙漠活动期间，守堡垒胜利后抓捕几率提高%
        WORLD_FORTRESS_CAPTURE_ATT_CITY_WIN_CAPTURE_UKINDOM(667),//大帝期间，攻城胜利后抓捕几率提高%
        WORLD_FORTRESS_CAPTURE_DEF_CITY_WIN_CAPTURE_UKINDOM(668),//大帝期间，守城胜利后抓捕几率提高%
        WORLD_FORTRESS_CAPTURE_ATT_CITY_FAIL_ESCAPE_UKINDOM(669),//大帝期间，攻城失败后逃脱几率提高%
        WORLD_FORTRESS_CAPTURE_DEF_CITY_FAIL_ESCAPE_UKINDOM(670),//大帝期间，守城胜利后逃脱几率提高%
        WORLD_FORTRESS_CAPTURE_DEF_WORLD_FORTRESS_WIN_CAPTURE_UKINDOM(671),//大帝期间，守堡垒胜利后抓捕几率提高%


        COLLECT_SPEED_DOWN(650,false), // 采集速度降低
        COLLECT_TROOP_LOAD(651,false), /// ** new attr 采集部队负重 */


        NEW_MAKE_ARMY_SPEED(660,false), // 新造兵速度

        VIP_ALLIANCE_TEAM_MARCH(559,false), // 高级集结
        WATER_COST_REDUCE(571,false), //净水消耗减少
        ELECTRICITY_COST_REDUCE(572,false),//电力消耗减少

        WATER_PRODUCT_REDUCE(573,false), //净水生产效率降低，百分比格式
        ELECTRICITY_PRODUCT_REDUCE(574,false), //电生产效率降低，百分比格式
        PEOPLE_PRODUCT_REDUCE(575,false), //人口产出降低
		 PEOPLE_LIMIT_REDUCE(576,false), //民居人口上限降低，百分比格式
        MONEY_PRODUCT_REDUCE(577,false), // 钱产出降低
        OIL_PRODUCT_REDUCE(578,false), // 油产出降低
        FOOD_PRODUCT_REDUCE(579,false), //粮食产出降低
        IRON_PRODUCT_REDUCE(580,false), // 铁产出降低
        METAL_PRODUCT_REDUCE(581,false), // 合金产出降低

        IRON_SUPER_TURBOMODE(587,false),   // 钢铁超级急速 百分比

        MONEY_PRODUCT_ADD(588,false), // 钞票产量追加 数值  钞票产量=每小时产量+【588】（这个作用号放在最外面，不受百分比加成影响）    刘文

		VIP_COMPOUND_EQUIP(602,false),      // 融合装备特权
        TREBUCHET_ATTACK_ADD(612),    // 炮台对敌国 士兵伤害增加

       	ATTACK_CITY_ADD_ARMY_LIMIT(603,false),//单人攻城增加一定量出征上限

        CITY_SMOKING_EFFECT1(569),//冒烟 减少防御 附带效果
        CITY_SMOKING_EFFECT2(591),//冒烟 减少攻击 附带效果

       	COLLECT_RESOURCE_DOWN(610,false), // 资源田没采完时，获得资源减少
        COLLECT_RESOURCE_ADD(611,false),  // 采集完资源田，额外获得资源
        ALLIANCE_SCIENCE_SPEED_DOWN(613,false), // 联盟科技研究速度降低
        ALLIANCE_BUILD_SPEED_DOWN(614,false), // 联盟建筑建造,维修速度降低
		
		VIP_SEARCH_POWER_RANK(606,false),//VIP查询其他服务器战力排行

        FOOT_SOILDIER_MAXLEVEL_ADD(720,false),  // 获得最高级 勇士
        BOW_SOILDIER_MAXLEVEL_ADD(721,false),  // 获得最高级 勇士
        RIDE_SOILDIER_MAXLEVEL_ADD(722,false),  // 获得最高级 勇士

        HERO_GETEXP_SCIENCE(723,false),           // 每完成一个科技有这个技能的英雄得到经验 数值
        NORMAL_SCIENCE_RESEARCH_TIME(724,false),  // 发展科技速度提升  百分比
        CAR_SCIENCE_RESEARCH_TIME(725,false),     // 发展科技速度提升  百分比
        SOILDER_SCIENCE_RESEARCH_TIME(726,false), // 兵种科技速度提升  百分比
        SCIENCE_RESEARCH_MONEY_COST(727,false),   // 科技消耗钞票减少 百分比

        CURE_SOLDIERS_COST_MONEY(750,false), // 百分比  消耗钞票=消耗钞票/(1+【750]/100)，治疗消耗钞票不受其他作用号影响    刘文

        SCORE_BUFF_KINGDOM_LEGEND_LOTTERY_HERO(785, false),    //最强要塞期间，招募英雄增加的积分提高    百分比  基础积分*（100+【785】+【228】）/100
        SCORE_BUFF_KINGDOM_LEGEND_MATERIAL_ACTION( 786 , false), // 百分比  基础积分*（100+【786】+【228】）/100 兑换获得和消耗智慧勋章积分增加
        SCORE_BUFF_KINGDOM_LEGEND_HERO_LEVELUP(787, false),  // 787  英雄升级和解锁技能积分增加    百分比  基础积分*（100+【787】+【228】）/100


        UNFORMATION_ARMY_DEL_HURT(789,false),//789 作用号
        UNFORMATION_ARMY_ADD_HURT(790,false),//790 作用号


        DOMAIN_GIVE_UP_TIME_DEC(791,false),//791 地块放弃时间减少
        DOMAIN_NEW_HOSPITAL_SPEED_ADD(792,false),//792  治疗速度提升

        MISSILE_ANTI_LIMIT_ADD(798,false),//反导飞弹容量上限增加

        MISSILE_ATK_ADD_EFFECT_799(799,false), // 爆破飞弹反导消耗数量增加
        MISSILE_ATK_ADD_EFFECT_817(817,false), // 燃烧飞弹反导消耗数量增加
        MISSILE_ATK_ADD_EFFECT_818(818,false),  //照明飞弹反导消耗数量增加
        MISSILE_ATK_ADD_EFFECT_819(819,false),  //毒气飞弹反导消耗数量增加
        MISSILE_ATK_ADD_EFFECT_821(821,false),  //冰冻飞弹反导消耗数量增加


        UNLOCK_TURBOMODE_FARM(801,false),//  解锁农田急速模式    0为假，1为真
        UNLOCK_TURBOMODE_WATER(802,false), //   解锁净水处理站急速模式    0为假，1为真
        UNLOCK_TURBOMODE_WOOD(803,false),  // 解锁油井急速模式    0为假，1为真
        UNLOCK_TURBOMODE_POWER(804,false), //   解锁燃油发电厂急速模式    0为假，1为真
        UNLOCK_TURBOMODE_MINE(805,false), //  解锁钢材厂急速模式    0为假，1为真
        UNLOCK_TURBOMODE_STONE(806,false), //  解锁合金矿场急速模式    0为假，1为真
        UNLOCK_TURBOMODE_MONEY(589,false), //  解锁钞票急速模式    0为假，1为真
        
                MONEY_TURBOMODE_ADD_RATE(590,false), // 钞票急速获得=原获得*（1+【590】/100）    刘文
        FARM_TURBOMODE_ADD_RATE(807,false), //   农田急速模式获得粮食增加    百分比格式
        WATER_TURBOMODE_ADD_RATE(808,false), //  净水处理站急速模式获得净水增加    百分比格式
        WOOD_TURBOMODE_ADD_RATE(809,false), //   油井急速模式获得燃油增加    百分比格式
        POWER_TURBOMODE_ADD_RATE(810,false), //    燃油发电厂急速模式获得电力增加    百分比格式
        MINE_TURBOMODE_ADD_RATE(811,false), //    钢材厂急速模式获得钢材增加    百分比格式
        STONE_TURBOMODE_ADD_RATE(812,false), //  合金矿场急速模式获得合金增加    百分比格式
        TURBOMODE_SUCCESS_ADD(813,false), //   增加初始成功率    数值
        TURBOMODE_FIRST_SUCCESS(814,false), //   每类建筑，每天首次急速模式必成功    0为假，1为真
        TURBOMODE_ADDEX_MONEY(815,false),  //  急速模式成功额外获得N个心跳的钞票    数值
        TURBOMODE_UPGRADE_RESUME(816,false),  //  建筑升级，急速概率恢复。  0为假，1为真

        MATERIAL_DROP_GET(820,false),          // 勇气勋章怪物掉落获得 0为假，1为真
        //RESOURCE_DROP_GET(821),         // 资源怪物死亡资源获得 0为假，1为真
        HERO_EXP_DROP_GET(822,false),         // 怪物死亡军官经验获得 百分比


        ARMY_WARRIOR_COST_RESOURCE(824,false), // 勇士训练消耗
        ARMY_TRUCK_COST_RESOURCE(825,false), // 车兵训练消耗
        ARMY_SHOOTER_COST_RESOURCE(826,false), // 射手训练消耗



        KINGDOM_CONTRIBUTION(830,false),// 要塞功勋

        REWARD_DROP_ADDRATE_WOOD(832,false),   // 832  攻击僵尸，获得燃料数量提升    百分比格式  field_monster中，reward第一个参数对应的reward的wood列数值
        REWARD_DROP_ADDRATE_STONE(833,false), //  攻击僵尸，获得合金数量提升    百分比格式  field_monster中，reward第一个参数对应的reward的stone列数值
        REWARD_DROP_ADDRATE_IRON(834,false), //834  攻击僵尸，获得钢铁数量提升    百分比格式  field_monster中，reward第一个参数对应的reward的iron列数值
        REWARD_DROP_ADDRATE_FOOD(835,false), //835  攻击僵尸，获得食物数量提升    百分比格式  field_monster中，reward第一个参数对应的reward的food列数值
        REWARD_DROP_ADDRATE_WATER(836,false), //836  攻击僵尸，获得净水数量提升    百分比格式  field_monster中，reward第一个参数对应的reward的water列数值
        REWARD_DROP_ADDRATE_POWER(837,false), //837  攻击僵尸，获得电力数量提升    百分比格式  field_monster中，reward第一个参数对应的reward的power列数值
        REWARD_DROP_ADDRATE_MONEY(838,false), //838  攻击僵尸，获得钞票数量提升    百分比格式  field_monster中，reward第一个参数对应的reward的money列数值

        /*vvvvvvvvvvvvvvvvvvvvvv运兵车专属的属性vvvvvvvvvvvvvvvvvvvvvv*/
        ARMY_BUS_HERO_POS_ONE(840,false),              // 运兵车第一个英雄
        ARMY_BUS_HERO_POS_TWO(841,false),              // 运兵车第一个英雄
        ARMY_BUS_HERO_POS_THREE(842,false),            // 运兵车第一个英雄
        ARMY_BUS_OIL_COST_DEL(843,false),     // 运兵车油耗降低  百分比格式
        ARMY_BUS_CARRYUP(844,false),          // 运兵车负重 百分比格式
        ARMY_BUS_CAN_SPEEDUP(845,false),      // 运兵车可加速 1,0
        ARMY_BUS_CAN_GOHOME(846,false),       // 运兵车可召回 1,0
        ARMY_BUS_SPEEDUP(847,false),          // 运兵车可加速 百分比格式
        ARMY_BUS_MOVE_MAXDIST(848,false),     // 运兵车最大距离 百分比格式
        ARMY_BUS_REPAIR_SPEED(849,false),     // 运兵车修理速度 百分比格式
        /*^^^^^^^^^^^^^^^^^^^^^^运兵车专属的属性^^^^^^^^^^^^^^^^^^^^^^*/

        /*vvvvvvvvvvvvvvvvvvvvvv英雄专属属性vvvvvvvvvvvvvvvvvvvvvv*/
        WATER_OUTPUT_ADD(856,false),  //   水产量增加    百分比
        POWER_OUTPUT_ADD(857,false),  //   电产量增加    百分比
        MONEY_OUTPUT_ADD(858,false),  //   金币产量增加  百分比
        FARM_SUPER_TURBOMODE(859,false),   // 超级急速模式,英雄收获 百分比
        COLLECT_HERO_EXP_ADD(861,false), // 采集获得军官经验  百分比
        FOOD_SELL_PRICE_ADD(862,false),  // 粮食卖出价格  百分比
        PLUNDERING_MONEY(863,false), // 掠夺者(职业)可以抢钱 开关 1开0关
        RESTORE_STAMINA(864,false),   // 攻城成功后归还运兵车体力
        HERO_MATERIAL_DROP_GET(865,false),   // 英雄获得勇气勋章掉落几率  百分比

               /*^^^^^^^^^^^^^^^^^^^^^^英雄专属属性^^^^^^^^^^^^^^^^^^^^^^^^^^*/
/*
        SOLDIER_RIDE_UPGRADE(866,false),      // 车晋级  等级数
        SOLDIER_RIDE_STRONG(867,false),       // 车加强  等级数
        SOLDIER_FOOT_UPGRADE(870,false),       // 步兵勇士晋级  等级数
        SOLDIER_FOOT_STRONG(871,false),        // 步兵勇士加强  等级数
        SOLDIER_BOW_UPGRADE(874,false),         // 射手晋级  等级数
        SOLDIER_BOW_STRONG(875,false),          // 射手加强  等级数
*/
        HERO_STATION_FOOD_OUTPUT(878,false), // 英雄驻扎  粮食每小时产量增加    数值  每小时产量=原产量+[878]
        EXCHANGE_METAL_ADD(879,false),     // 智慧勋章兑换比例提升  百分比 兑换比例=原兑换比例*(1+【879】/100）
        EXCHANGE_METAL_DAYLY_MAX(880,false),    // 每日最大兑换数量提升  每日兑换次数=原兑换次数+[880]
        EXCHANGE_METAL_MONEYCOST(881,false),    // 兑换智慧勋章消耗钞票减少  百分比  钞票消耗=原消耗*(1-[881]/100)

        WOOD_SELL_PRICE_ADD(882,false),      // 油卖出价格  百分比
        IRON_SELL_PRICE_ADD(883,false),      // 钢铁出价格  百分比
        STONE_SELL_PRICE_ADD(884,false),     // 合金出价格  百分比
        WATER_SELL_PRICE_ADD(885,false),     // 水出价格  百分比
        POWER_SELL_PRICE_ADD(886,false),    // 电出价格  百分比

        HERO_STATION_FOOT_STRONG_COST(887,false), // 强化步兵消耗降低  百分比
        HERO_STATION_BOW_STRONG_COST(888,false),  // 强化射手消耗降低 百分比
        HERO_STATION_RIDE_STRONG_COST(889,false), // 强化车兵消耗降低 百分比

        HERO_STATION_WOOD_OUTPUT(890,false),   // 油每小时产出 数值每小时产量增加    数值  每小时产量=原产量+
        HERO_STATION_IRON_OUTPUT(891,false),   // 钢铁每小时产出 数值每小时产量增加    数值  每小时产量=原产量+
        HERO_STATION_STONE_OUTPUT(892,false),  // 合金每小时产出 数值每小时产量增加    数值  每小时产量=原产量+
        HERO_STATION_WATER_OUTPUT(893,false),  // 水每小时产出 数值每小时产量增加    数值  每小时产量=原产量+
        HERO_STATION_POWER_OUTPUT(894,false),  // 电每小时产出 数值每小时产量增加    数值  每小时产量=原产量+

        HERO_STATION_FOOD_RESLOAD(895,false),  //  粮食采集负重  百分比
        HERO_STATION_WOOD_RESLOAD(896,false),  //  油采集负重   百分比
        HERO_STATION_IRON_RESLOAD(897,false),  //  钢铁采集负重 百分比
        HERO_STATION_STONE_RESLOAD(898,false),  // 合金采集负重 百分比

        //HERO_BEGINATTACK_SPEED(901),    // 英雄出手速度 决定值速度数
        /*VVVVVVVVVVVVVVVVVVVVVVVV英雄技能VVVVVVVVVVVVVVVVVVVVVVVVVVV*/ 
        FIELDMONSTER_HURT_ADD(904,false),    // 技能伤害，只对野怪生效（类似151）
        /*^^^^^^^^^^^^^^^^^^^^^^^^^英雄技能^^^^^^^^^^^^^^^^^^^^^^^^^^*/
        RESOURCE_LIMIT_ADD(905,false),          // 除人口的资源仓库上限

        TERRITORY_BUILDING_SPEED_UP(906,false), //领地建造速度加快
        PLACE_RESOURCE_LEVEL_UP(907,false),//放田的等级
        PLACE_RESOURCE_ADD_NUMBER(908,false),//放田的数量
        NORMAL_SOLDIER_CURE_REDUCE(970,false),  // 普通兵治疗速度降低 百分比
        STRONG_SOLDIER_CURE_REDUCE(971,false),  // 加强兵治疗速度降低 百分比
        BOW_CURE_RESOURCE_REDUCE(972,false),    // 射手  治疗消耗降低 百分比
        FOOT_CURE_RESOURCE_REDUCE(973,false),   // 步兵  治疗消耗降低 百分比
        RIDE_CURE_RESOURCE_REDUCE(974,false),   // 车兵  治疗消耗降低 百分比

        ALL_DEF_DOWN(1039), //// 新技能全体防御降低 百分比
        RIDE_ARMY_HARM_ADD1(101010), // 骑兵伤害增加1
        RIDE_ARMY_HARM_ADD2(101011),// 骑兵伤害增加2
        ADD_WATER(2001,false),// 增加净水资源
        ADD_ELECTRICITY(2002,false),// 增加电力资源
        ADD_MONEY(2003,false),// 增加钞票
        
        //===================新英雄职业天赋作用号===================
        FARMER_BUILDING(708,false), // 农民专属建筑开关 生产中心 开关 1开0关
        SOLDIER_BUILDING(709,false), // 解锁掠夺者专有建筑——战斗大厅 开关 1开0关
        TRADER_BUILDING(710,false), // 解锁商人专有建筑——黑市 开关 1开0关
        TRADER_CENTER_PRICE_ADD(711,false), // 交易中心资源出售价增加 百分比 资源出售价=原出售价*（1+【711】/100）
        SOLDIER_CURE_REDUCE(712,false), // 伤兵治疗速度降低 百分比 治疗时间=治疗时间*（1+【712】/100)
        RESOURCE_PRODUCT_LIMIT(713,false), // 原始仓库保护上限 百分比  保护上限=仓库上限*【713】/100
        MONEY_PLUNDER_RATE(714,false), // 钞票掠夺比例    百分比  掠夺比例=min(1-资源掠夺比例,基础掠夺比例*(1+【714】/100))
        //===================新英雄职业天赋作用号===================

        //===================极速模式成功,对应的英雄获得的经验========================
        FOOD_SUCCESS_HERO_EXP_ADD(715,false), // 农田极速模式成功,对应的英雄获得经验率追加
        OIL_SUCCESS_HERO_EXP_ADD(716,false), // 油井极速模式成功,对应的英雄获得经验率追加
        IRON_SUCCESS_HERO_EXP_ADD(717,false), // 钢材厂极速模式成功,对应的英雄获得经验率追加
        STONE_SUCCESS_HERO_EXP_ADD(718,false), // 合金矿厂极速模式成功,对应的英雄获得经验率追加
        MOENY_SUCCESS_HERO_EXP_ADD(719,false), // 钞票急速模式成功后，对应的英雄获得经验
        //===================极速模式成功,对应的英雄获得的经验========================

        //===================极速模式成功率追加========================
        FOOD_SUCCESS_ADD(733,false), // 农田极速模式成功率追加
        OIL_SUCCESS_ADD(734,false), // 油井极速模式成功率追加
        IRON_SUCCESS_ADD(735,false), // 钢材厂极速模式成功率追加
        STONE_SUCCESS_ADD(736,false), // 合金矿厂极速模式成功率追加
        WATER_SUCCESS_ADD(737,false), // 净水站极速模式成功率追加
        ELECTRICITY_SUCCESS_ADD(738,false), // 燃油发电厂极速模式成功率追加
        //===================极速模式成功率追加========================

        BUILD_CENTER_UP_SPEED(739,false), //  建设中心升级速度 百分比  升级时间=原升级时间/(1+作用号/100)
        BUILD_CENTER_RES_REDUCE(740,false), //  建设中心升级速度 建设中心升级消耗资源减少（不包含钞票）    百分比  升级资源=资源*(1-作用号/100)
        BUILD_CENTER_HERO_EXP_ADD(741,false), //  驻扎建设中心时，每升级一次建筑，获得经验    数值  英雄获得经验=作用号
        BUILD_CENTER_UP_MONEY_REDUCE(742,false), // 建设中心升级消耗钞票减少    百分比  升级钞票=钞票*(1-作用号/100)
        BUILD_CENTER_EFFECT_ADD(743,false), // 建设中心效果增加    百分比  【747】*(1+【743】/100）
        PLANE_LOAD_ADD(744,false), // 直升机负重增加    百分比  直升机负重=负重*(1+作用号/100)
        PLANE_CD_REDUCE(745,false), // 直升机到来时间减少    数值  到来时间-作用号（秒)
        BUY_RES_PRICE_REDUCE(746,false), // 直升机到来时间减少    百分比  到来时间=时间/(1+作用号/100)
        BUILD_CENTER_EFFECT(747,false), // 建设中心专用建造速度    百分比  与[68]相同，只建设中心使用

        RESISTIVITY_ADD_VALUE(751), // 抗性固定值增加
        RESISTIVITY_ADD_RARE(752), //抗性百分比增加
        DOMAIN_MARCH_SPEED(753,false), //部队攻打地块的行军和返回速度
        TRANSFER_STATION_MARCH_SPEED(754,false),//部队攻打中转站的行军和返回速度
        USER_WORLD_BUILDING_MARCH_SPEED(755,false),//部队攻打世界建筑的行军和返回速度
        PLUNDER_DOMAIN_RATE_ADD(756,false),//对地块掠夺百分比提高
        PLUNDER_WORLD_BUILDING_RATE_ADD(757,false),//对世界建筑摧毁与掠夺百分比提高
        DECREASE_DOMAIN_MARCH_COST(758,false),//降低攻打地块需要的体力百分比
        DECREASE_WORLD_BUILDING_MARCH_COST(759,false),//降低攻打世界建筑需要的百分比
        DECREASE_TRANSFER_STATION_MARCH_COST(760,false),//降低攻打中转站体力百分比
        USER_WORLD_BUILDING_SPEED(761,false),//增加世界建筑的建造速度
        USER_WORLD_BUILDING_DECREASE_RES(762,false),//降低世界建筑建造的资源消耗
        USER_WORLD_BUILDING_DECREASE_ITEM1(763,false),//降低世界建筑的混凝土消耗
        USER_WORLD_BUILDING_ADD_EXP(764,false),//提高建造世界建筑获得的荣誉
        USER_WORLD_BUILDING_ADD_NUMBER(765,false),//增加每种世界建筑的建造数量
        USER_WORLD_BUILDING_DURABLE_PROTECT(766,false),//降低受到的耐久伤害

        USER_WORLD_BUILDING_EFFECT_ADD(768,false),//世界建筑作用号数值*【768】，只在荣誉精通中使用。

        USER_WORLD_BUILDING_NPC_UP(769,false), //世界建筑NPC

        DOMAIN_FIGHT_ARMY_RECOVER_RATE_ADD(770),//攻打地块兵力恢复比例提高

        DOMAIN_HERO_EXP_RATE_ADD(771,false),//打地块获得的指挥官经验增加

        USER_WORLD_BUILDING_PRODUCT_REDUCE_ELECTRICITY(773,false),//生产耗电降低

        USER_WORLD_BUILDING_PRODUCT_SPEED(774,false), //生产速度提高


        DOMAIN_ATTACK_775(775, false),//在地块、中转站、世界建筑中部队攻击提高	与其他攻击作用相加
        DOMAIN_DEFEND_776(776, false),//在地块、中转站、世界建筑中部队防御提高

        USER_ADD_DOMAIN_LIMIT(777,false), //地块上限
        ATK_DOMAIN_ADD_DESERT_EXP(778,false),//打地块获得的荣誉增加
        DOMAIN_HOSPITAL_MEDICINE_ADD(781,false), //再生药剂生产速度提高，基础（1+【781】/100）
        DOMAIN_HOSPITAL_MEDICINE_LIMIT(782,false),//再生药剂上限提高，基础（1+【782】/100）
        ALLIANCE_MARK(800, false),      // 联盟标志解锁
        ALLIANCE_MARK_NUM(793, false),  // 联盟标志上限
        ALLIANCE_MARK_TIME(794, false), // 联盟标志时间


        DEC_DEFENDER_DEF(926, false), //  英雄攻城值    数值  战斗胜利后扣除的失败方城防值

        SLOW_ATTACK_MARCHSPEED(927, false),      // 城市受到攻击时，攻击方行军速度    百分比
        WARRIOR_CURE_SPEED(967, false),       //967  治疗勇士速度    百分比  治疗时间=治疗时间/（1+【作用号】/100）
        TRUCK_CURE_SPEED(968, false),         //968  治疗射手速度    百分比  治疗时间=治疗时间/（1+【作用号】/100）
        SHOOTER_CURE_SPEED(969, false),        //969  治疗车速度    百分比  治疗时间=治疗时间/（1+【作用号】/100）

        WARRIOR_ADD_EXP(975,false), //驻扎后,按照勇士造兵时长，给与经验奖励，单位1分钟=XX经验    百分比  造勇士才有经验，1分钟=XX经验，根据作用号传值，并且驻扎后生效
        SHOOTER_ADD_EXP(976,false), //驻扎后,按照射手造兵时长，给与经验奖励，单位1分钟=XX经验    百分比  造射手才有经验，1分钟=XX经验，根据作用号传值，并且驻扎后生效
        TANK_ADD_EXP(977,false), //驻扎后,按照车辆造兵时长，给与经验奖励，单位1分钟=XX经验    百分比  造车辆才有经验，1分钟=XX经验，根据作用号传值，并且驻扎后生效

        HERO_SKILL_SLOT_1(978, false),  // 英雄技能槽1的加成

        UNLOCK_COLLECTION_BUILDING(595,false), // 解锁采集中心    1开0关
        UNLOCK_ADDITIONAL_ASYLUM(597,false), // 解锁额外的收容所    数值  建筑id=410000，建造上限=原上限+作用值，额外的建筑解锁大本等级与第一个解锁等级相同
        UNLOCK_ADDITIONAL_HOSPITAL(783,false), // 解锁额外的医院    数值  建筑id=411000，建造上限=原上限+作用值，额外的建筑解锁大本等级与第一个解锁等级相同
        UNLOCK_STORAGE(784,false), // 784 解锁仓储中心 1开0关

        DOMAIN_HOSPITAL_SPEED_ADD(788,false),//地块医院加速
        SMOKE_ATTACK_OPEN(795, false), //   击破科技功能开启
        SMOKE_ADDTIME(796, false),  // 冒烟时间  决定时间
        SMOKE_DEBUF(902, false),    // 击破效果标志
        // =====================================新作用號==============================================================
        HERO_SKILL_SLOT_2(985,false), // 增加二技能效果
        ADD_EXP_BY_COST_TIME(986,false), // 完成受傷部隊治療，根據花費時間給與經驗（1分鐘給與X經驗）
        WARRIOR_ADD_UPGRADE_ARMY_NUM(987,false), // 勇士晋级、强化数量
        WARRIOR_ADD_STRONG_ARMY_SPEED(988,false), // 勇士晋级、强化速度
        SHOOTER_ADD_UPGRADE_ARMY_NUM(989,false), // 射手晋级、强化数量
        SHOOTER_ADD_STRONG_ARMY_SPEED(990,false), // 射手晋级、强化速度

        TECHNOLOGY_COST_MONEY(991,false), // 科技研究消耗钞票 原始消耗钞票*（1+作用号991/100）
        ADD_EXP_BY_BUILDING_POWER(992,false), // 获得1点建筑战斗力提升xxx经验值
        BUILDING_MOENY_COST(993,false), // 建筑消耗钞票 原始消耗钞票*（1+作用号993/100）
        TUBO_MODE_MOENY_RATE(994,false), // 钞票极速生产成功率
        ADD_BUY_RESOURCE(995,false), // 增加交易中心可购资源
        ADD_EXP_BY_TECHNOLOGY_POWER(996,false), // 获得1点科技战斗力提升xxx经验值
        TECHNOLOGY_COST_RESOURCE(997,false), // 科技研究消耗资源（不包含钞票）
        TRUCK_ADD_UPGRADE_ARMY_NUM(998,false), //  改装车晋级、强化数量
        TRUCK_ADD_STRONG_ARMY_SPEED(999,false), // 改装车晋级、强化速度        

        MARK_ATTACK_ADD(748, false),        //748  是通过标记直接加上的，effect攻击标记目标，攻击增加    百分比  所有攻击标记目标，攻击增加 = 原攻击*(1+[748]/100)
        MARK_DEFEND_ADD(749, false),        //749  攻击标记目标，防御增加    百分比  所有攻击标记目标，防御增加 = 原防御*(1+[749]/100)

        WARRIOR_COST_REDUCE(674,false), // 勇士维护费降低
        TRUCK_COST_REDUCE(675,false), // 车维护费降低
        SHOOTER_COST_REDUCE(676,false), // 射维护费降低
        ALLIANCESCIENCE920(920,false), // 木头 铁 燃料 食物 仓库上限保护增加
        ALLIANCESCIENCE921(921,false), // 钞票仓库保护上限增加

        CHIP_COST_REDUCE(940, false), // 芯片消耗减少  百分比  实际消耗=max（ （1-【940】/100）,0.1f）
        CHIP_MAX_ADD(941, false),      // 芯片容量增加  实际容量=原始容量*（1+【941】/100）
        CHIP_COST_TIME_REDUCE(942, false), // 芯片时间减少   实际时间=原始时间*（1-【942】/100）
        CHIP_UPGRADE_COST(943, false),  // 升级消耗减少   实际消耗=原始消耗*（1-【943】/100）
        CHIP_BUILDING_MAX(944, false),  // 额外的建造上限

        LS_ALLIANCE_FIGHT_SCORE_ADD(950,false),//宣战分加成

        // 这个放在非攻击技能，是因为他们是动态加入的
        THREE_WARRIOR_ATTACK(928, false), //  三只小队均为勇士时，攻击
        THREE_TRUCK_ATTACK(929, false), //  三只小队均为改装车时，攻击
        THREE_SHOOTER_ATTACK(930, false), // 三只小队均为射手时，攻击
        THREE_WARRIOR_DEFEND(931, false),//  三只小队均为勇士时，防御
        THREE_TRUCK_DEFEND(932, false),//  三只小队均为改装车时，防御
        THREE_SHOOTER_DEFEND(933, false),//  三只小队均为射手时，防御

        WARRIOR_ATTACK_ADD(964, false), // 勇士破坏指增加%  百分比，正加负减
        TRUCK_ATTACK_ADD(965, false),   // 改装车破坏指增加%  百分比，正加负减
        SHOOTER_ATTACK_ADD(966, false), // 射手破坏指增加%  百分比，正加负减

        // 防御队列作用号
        DEFENCE_APC_953(953, false), // 防御队列开关
        DEFENCE_APC_957(957, false), // 防御队列出征上限

        EFFECT_958(958, false), // 958  解锁高级哨塔
        EFFECT_959(959, false),  // 959  哨塔能量上限
        EFFECT_960(960, false), // 960  哨塔能量恢复速度
        EFFECT_961(961, false), // 961  哨塔攻击增加

        CHIP_FACTORY_IMMEDIATELY_ADD(299, false),  // 芯片工厂超载效率提升
        ENERGY_FACTORY_IMMEDIATELY_ADD(303, false),// 能源提炼厂超载效率提升
        VIP_STORE_COST_ADD_EXP(304, false), // vip商店花费点数时，获得经验增加
        HERO_DESTROY_RETURN_EXP(305, false), // 分解军官返还经验比例
        EXCHANGE_METAL_MONEYCOST_FIRST(306, false), // 军校中每日首次兑换智慧勋章优惠百分比
        OCCUPY_TREBUCHET_ADD_HURT(307, false), // 占领巨炮时伤害提示（百分比）多人占领时，取最高的数值生效
        VIP_ALLIANCE_MAX_DONATE(298, false), // 联盟Max捐献
        VIP_EFFECT_CHAT_FRAME(309, false), // vip聊天框 作用值为1：铜  作用值为2：银   作用值为3：金  作用值为4：钻石

        BATCH_USE_TURBO_MODE_FOOD(244, false),  // 批量使用极速功能 - 粮食
        BATCH_USE_TURBO_MODE_OIL(433, false),   // 批量使用极速功能 - 油
        BATCH_USE_TURBO_MODE_WOOD(434, false),  // 批量使用极速功能 - 木
        BATCH_USE_TURBO_MODE_IRON(435, false),  // 批量使用极速功能 - 钢
        BATCH_USE_TURBO_MODE_WATER(518, false), // 批量使用极速功能 - 水
        BATCH_USE_TURBO_MODE_ELECTRICITY(519, false),   // 批量使用急速功能 - 电
        BATCH_USE_TURBO_MODE_CASH(503, false),  // 批量使用急速功能 - 钞票
        VIP_GIFT_SHOW_MAX_NUM(616, false), // 礼品展示最大数量

        EFFECT_423(423, false), // 集结带队时，增加全队勇士攻击
        EFFECT_426(426, false), // 集结带队时，增加全队勇士防御
        EFFECT_427(427, false), //集结带队时，增加全队勇士生命
        EFFECT_432(432, false), // 集结带队时，为队员补齐与队长攻击、防御、生命属性差的一定比例（不包含英雄和配件加成）

        ALLIANCE_LOTTERY_LEVEL(10000, false), // 联盟卡池等级
        ALLIANCE_MEMBER_COUNT(10001, false), // 联盟人数上限
		FOOD_COUNT_ADD(10002,false),  //  急速模式次数增加
        WATER_COUNT_ADD(10003,false),  //  急速模式次数增加
        ELECTRICITY_COUNT_ADD(10004,false),  //  急速模式次数增加
        IRON_COUNT_ADD(10005,false),  //  急速模式次数增加
        STONE_COUNT_ADD(10006,false),  //  急速模式次数增加
        OIL_COUNT_ADD(10007,false),  //  急速模式次数增加
        MONEY_COUNT_ADD(10008,false),  //  急速模式次数增加

        
        HERO_EFFECT_ATTACK(20001,true),  // 新加 英雄技能影响攻击属性
        HERO_EFFECT_DEFEND(20002,true),  // 新加 英雄技能影响防御属性
        HERO_EFFECT_HEALTH(20003,true),  // 新加 英雄技能影响生命属性

        UNLOCK_VIP_BUILDING_480000(480000,false), // 解锁建筑480000    1开0关
        UNLOCK_VIP_BUILDING_481000(481000,false), // 解锁建筑481000    1开0关
        UNLOCK_VIP_BUILDING_482000(482000,false), // 解锁建筑482000    1开0关

        ZONE_WOOD_OUTPUT(10050,false), // 村庄区域木材产量
        ZONE_STONE_OUTPUT(10051,false), // 村庄区域铁产量
        ZONE_IRON_OUTPUT(10052,false), // 村庄区域石头产量
        ZONE_FOOD_OUTPUT(10053,false), // 村庄区域粮食产量
        PERSONAL_BOSS_DAILY_NUM(10054,false), // 个人boss每日调整次数
        ;

    private final int index;
    private final boolean battleEffect;

    private GameEffect(int index) {
        this.index = index;
        this.battleEffect = true; //默认是 true 防止漏掉的情况  非战斗中使用的作用号写一个false 或者战斗作用号写到BattleEffect中
    }

    private GameEffect(int index, boolean battleEffect) {
        this.index = index;
        this.battleEffect = battleEffect;
    }

    public int getIndex() {
        return index;
    }

    public boolean isBattleEffect() {
        return battleEffect;
    }

    private static GameEffect[] gameEffects = values();

    public static void setGameEffects(GameEffect[] gameEffects) {
        GameEffect.gameEffects = gameEffects;
    }

    public static GameEffect getByValue(int value) {
        GameEffect[] ges = gameEffects;
        for (GameEffect ge : ges) {
            if (ge.getIndex() == value) {
                return ge;
            }
        }
        return null;
    }

    public static GameEffect getBattleEffect(BattleConstants.BattleEffect battleEffect) {
        return getByValue(battleEffect.getEffectId());
    }

    @Override
    public String toString() {
        return "EID:" + index;
    }
}


public enum BattleEffect {

        EFFECT_DEFAULT(0),
//        EFFECT_1(1),//攻击
//        EFFECT_2(2),//防御
//        EFFECT_3(3),//统率
//        EFFECT_4(4),//生命值
//        EFFECT_5(5),//生命比例%
        EFFECT_6(6),//将军攻击增加%
        EFFECT_7(7),//将军防御增加%
//        EFFECT_8(8),//统率比例
        EFFECT_9(9),//将军技能几率增加%
        EFFECT_10(10),//攻城方技能几率增加%
        EFFECT_11(11),//守城方技能几率增加%
        EFFECT_12(12),//B降低敌方技能几率
//        EFFECT_13(13),//联盟仓库每日存储上限增加
//        EFFECT_14(14),//英雄抓捕几率增加
        EFFECT_15(15),//无视防御
        EFFECT_16(16),//将军攻击变化%
        EFFECT_17(17),//将军防御变化%
        EFFECT_18(18),//变羊比例
//        EFFECT_19(19),//英雄逃脱几率增加
        EFFECT_20(20),//技能状态持续时间增加
        EFFECT_21(21),//对近战伤害比例增加
        EFFECT_22(22),//对远程伤害比例增加
        EFFECT_24(24),//运兵车死兵转化为伤兵
//        EFFECT_25(25),//射击场免费刷新
//        EFFECT_26(26),//许愿池次数增加
//        EFFECT_27(27),//编队功能状态
//        EFFECT_28(28),//编队个数
//        EFFECT_29(29),//跨服战伤兵上限
        EFFECT_33(33),//王座战时攻击方攻击比例增加
        EFFECT_34(34),//王座战时防御方防御比例增加
        EFFECT_35(35),//攻击巨炮（投石机）攻击力提升
        EFFECT_36(36),//部队占领巨炮防御力提升
//        EFFECT_37(37),//城市受到攻击时，被攻击方比例影响速度
//        EFFECT_38(38),//4种资源保护
//        EFFECT_39(39),//资源无敌
        EFFECT_40(40),//矿战伤害加成
        EFFECT_41(41),//攻城伤害加成
        EFFECT_42(42),//守城伤害加成
        EFFECT_43(43),//无敌
        EFFECT_44(44),//控制-兵不能攻击
        EFFECT_45(45),//控制-英雄不能放技能
        EFFECT_46(46),//控制-打断吟唱
        EFFECT_47(47),//pve伤害加成
        EFFECT_48(48),//组队攻击方攻击加成
        EFFECT_49(49),//组队防御方防御加成
//        EFFECT_50(50),//木材产量
//        EFFECT_51(51),//铁产量
//        EFFECT_52(52),//石料产量
//        EFFECT_53(53),//粮食产量
        MONEY_OUTPUT_ADD(858,false),  //   金币产量增加  百分比
//        EFFECT_54(54),//银产量
        EFFECT_55(55),//部队数量增加
//        EFFECT_56(56),//单支部队兵力上限增加
//        EFFECT_57(57),//伤兵上限
//        EFFECT_58(58),//援军行军速度
//        EFFECT_59(59),//攻击野怪行军速度
//        EFFECT_60(60),//行军速度
//        EFFECT_61(61),//城市保护
//        EFFECT_62(62),//反侦察
//        EFFECT_63(63),//稻草人
//        EFFECT_64(64),//维护费
//        EFFECT_65(65),//采集速度
//        EFFECT_66(66),//造兵速度（以后不再用）
//        EFFECT_67(67),//造陷阱速度
//        EFFECT_68(68),//建筑速度
//        EFFECT_69(69),//研究速度
//        EFFECT_70(70),//vip状态
//        EFFECT_71(71),//银币保护
//        EFFECT_72(72),//4种资源保护
//        EFFECT_73(73),//伤兵上限
//        EFFECT_74(74),//交易行军速度
//        EFFECT_75(75),//集结军速度增加
//        EFFECT_76(76),//组队进攻
        EFFECT_77(77),//攻城时死兵转化成伤兵率
//        EFFECT_78(78),//部队负重增加
//        EFFECT_79(79),//金币采集速度加快
//        EFFECT_80(80),//玩家经验加成
//        EFFECT_81(81),//政务刷新时间缩短
//        EFFECT_82(82),//高品质政务刷新概率提高
//        EFFECT_83(83),//秘密礼物领奖时间缩短
//        EFFECT_84(84),//任务奖励提高
//        EFFECT_85(85),//和联盟成员交易时，税收减少
//        EFFECT_86(86),//英雄训练经验获得增加
//        EFFECT_87(87),//攻城掠夺资源量提高
//        EFFECT_88(88),//陷阱数量上限增加
//        EFFECT_89(89),//采集速度-木
//        EFFECT_90(90),//采集速度-秘银
//        EFFECT_91(91),//采集速度-铁
//        EFFECT_92(92),//采集速度-粮
//        EFFECT_93(93),//采集速度-银
//        EFFECT_94(94),//行军速度-侦查
//        EFFECT_95(95),//行军速度-攻击城市
//        EFFECT_96(96),//行军速度-攻击营地
//        EFFECT_97(97),//行军速度-采集
//        EFFECT_98(98),//行军速度-攻击野怪
//        EFFECT_99(99),//行军速度-返回
//        EFFECT_100(100),//金
//        EFFECT_101(101),//木
//        EFFECT_102(102),//秘银
//        EFFECT_103(103),//铁
//        EFFECT_104(104),//粮
//        EFFECT_105(105),//银
//        EFFECT_106(106),//体力恢复速度
//        EFFECT_107(107),//增加体力值
//        EFFECT_108(108),//治疗伤兵资源降低1
//        EFFECT_109(109),//玩家经验
//        EFFECT_110(110),//vip点数
//        EFFECT_111(111),//英雄自身经验加成
//        EFFECT_112(112),//同队伍内所有英雄经验加成
//        EFFECT_113(113),//造兵速度-步兵
//        EFFECT_114(114),//造兵速度-骑兵
//        EFFECT_115(115),//造兵速度-弓兵
//        EFFECT_116(116),//造兵速度-车兵
//        EFFECT_117(117),//产生伤兵的概率-城市战斗
//        EFFECT_118(118),//产生伤兵的概率-营地战斗
//        EFFECT_119(119),//产生伤兵的概率-资源点战斗
//        EFFECT_120(120),//产生伤兵的概率-野怪战斗
//        EFFECT_121(121),//伤兵恢复速度提升、治疗
//        EFFECT_122(122),//着火损失的城防值提升
//        EFFECT_123(123),//行军速度-返回-守营失败
//        EFFECT_124(124),//行军速度-返回-攻城成功
//        EFFECT_125(125),//增加城防值
//        EFFECT_126(126),//屠城（攻城方降低守城）
        EFFECT_127(127),//陷阱消耗减少%
//        EFFECT_128(128),//银币保护
//        EFFECT_129(129),//资源点防守失败时也能携带回部分已采集资源
//        EFFECT_130(130),//攻打资源点胜利后可掠夺对方已采集的资源
//        EFFECT_131(131),//单次招募士兵更多
//        EFFECT_132(132),//增加木秘银铁粮的存储上限
//        EFFECT_133(133),//部队负重增加
//        EFFECT_134(134),//金币采集速度加快
//        EFFECT_135(135),//攻城掠夺资源量提高
//        EFFECT_136(136),//缩短探险时间间隔
//        EFFECT_137(137),//提高宝物获得的概率
//        EFFECT_138(138),//降低探险遇到陷阱的几率
//        EFFECT_139(139),//降低交易税率
//        EFFECT_140(140),//提高交易负重
//        EFFECT_141(141),//援军上限
//        EFFECT_142(142),//联盟帮助时间
//        EFFECT_143(143),//组队队员空位增加
//        EFFECT_144(144),//战争大厅集结部队数增加
//        EFFECT_145(145),//双倍科技进度几率
//        EFFECT_146(146),//双倍贡献获得几率
//        EFFECT_147(147),//木产量加成（最外层加成 同boost）
//        EFFECT_148(148),//粮产量加成（最外层加成 同boost）
//        EFFECT_149(149),//铁产量加成（最外层加成 同boost）
//        EFFECT_150(150),//秘银产量加成（最外层加成 同boost）
        EFFECT_151(151),//技能伤害比例
        EFFECT_152(152),//将军技能直接伤害
//        EFFECT_153(153),//木采集速度加成
//        EFFECT_154(154),//粮采集速度加成
//        EFFECT_155(155),//铁采集速度加成
//        EFFECT_156(156),//秘银采集速度加成
        EFFECT_157(157),//陷阱伤害增加%不损失
//        EFFECT_158(158),//钢
//        EFFECT_159(159),//筹码
//        EFFECT_160(160),//训练弹
//        EFFECT_161(161),//帮助人数上限增加
//        EFFECT_163(163),//水晶
//        EFFECT_164(164),//采集获得的资源量提升
//        EFFECT_165(165),//副岛芯片产量
//        EFFECT_167(167),//造兵消耗的资源量减少
        EFFECT_176(176),//防御武器克勇士伤害
        EFFECT_177(177),//防御武器克改装车辆伤害
        EFFECT_178(178),//防御武器克射手伤害
        EFFECT_179(179),//疫苗炸弹的伤害
//        EFFECT_180(180),//援助燃油的基础值
//        EFFECT_181(181),//援助食物的基础值
//        EFFECT_182(182),//援助钢铁的基础值
//        EFFECT_183(183),//援助合金的基础值
//        EFFECT_184(184),//援助每日免费次数
//        EFFECT_185(185),//科技研究消耗燃油
//        EFFECT_186(186),//科技研究消耗粮食
//        EFFECT_187(187),//科技研究消耗钢铁
//        EFFECT_188(188),//科技研究消耗合金
//        EFFECT_189(189),//科技研究消耗
//        EFFECT_190(190),//，0-
        EFFECT_191(191),//单人进攻他人基地，敌方损失的士兵有一定比例会直接死亡
//        EFFECT_192(192),//立即治疗XX士兵
//        EFFECT_193(193),//随机招募XX名勇士
//        EFFECT_194(194),//所有英雄立即获得XX经验
//        EFFECT_195(195),//使XX名最低等级的士兵提升一个级别
//        EFFECT_196(196),//立即获得X个技能点
//        EFFECT_197(197),//守城时,军官不被抓捕的概率
//        EFFECT_199(199),//科技研究消耗
//        EFFECT_200(200),//中毒
//        EFFECT_201(201),//不能移动
        EFFECT_202(202),//受到手雷的伤害
        EFFECT_203(203),//受到地雷的伤害
        EFFECT_204(204),//受到喷火器的伤害
        EFFECT_205(205),//受到防御武器的伤害
//        EFFECT_206(206),//治疗7级以下伤兵速度
//        EFFECT_207(207),//治疗8-9级伤兵速度
//        EFFECT_208(208),//治疗10级伤兵速度
//        EFFECT_209(209),//治疗7级以下伤兵资源
//        EFFECT_210(210),//治疗8-9级伤兵资源
//        EFFECT_211(211),//治疗10级伤兵资源
//        EFFECT_212(212),//治疗伤兵资源降低2
//        EFFECT_213(213),//治疗伤兵资源降低3
//        EFFECT_214(214),//治疗伤兵资源降低4
//        EFFECT_215(215),//治疗伤兵资源降低5
//        EFFECT_216(216),//建筑消耗
//        EFFECT_217(217),//防御武器建造消耗
//        EFFECT_218(218),//训练士兵消耗资源
//        EFFECT_220(220),//最强要塞解锁更高级奖励
//        EFFECT_221(221),//获得立即研究时间
//        EFFECT_222(222),//立即建筑时间增加
//        EFFECT_223(223),//采集增加的最强要塞积分提高
//        EFFECT_224(224),//建造增加的最强要塞积分提高
//        EFFECT_225(225),//研究增加的最强要塞积分提高
//        EFFECT_226(226),//消灭丧尸增加的最强要塞积分提高
//        EFFECT_227(227),//击杀士兵增加的最强要塞积分提高
//        EFFECT_228(228),//最强要塞积分提高
//        EFFECT_229(229),//击杀带有正面官职的敌人士兵增加的最强要塞积分提高
//        EFFECT_230(230),//击杀总统的士兵增加的最强要塞积分提高
//        EFFECT_231(231),//几率获得双倍个人奖励
//        EFFECT_234(234),//战斗时死兵转化丧尸比例
        EFFECT_235(235),//对敌国部队攻击增加
        EFFECT_236(236),//对敌国部队防御增加
//        EFFECT_237(237),//训练获得最强要塞积分提高
//        EFFECT_238(238),//占领敌方土地获得最强要塞积分提高
        EFFECT_251(251),//射手攻击致死率
        EFFECT_252(252),//暴走：施放技能和状态时，将敌我所有满足object和object_para的部队都算作目标，再根据数量去找目标；普攻的目标为随机敌我前排，如果有打后排技能，也会打我方后排，不会打自己
        EFFECT_253(253),//射手死兵转化为伤兵
//        EFFECT_254(254),//改装车攻击致死率
//        EFFECT_254(254),//弹仓容量
//        EFFECT_255(255),//改装车死兵转化为伤兵
//        EFFECT_255(255),//导弹队列数
//        EFFECT_256(256),//导弹生产速度
//        EFFECT_257(257),//绝对反导
//        EFFECT_258(258),//城防值立即减少
        EFFECT_259(259),//车兵攻击致死率
        EFFECT_260(260),//车兵死兵转化为伤兵
        EFFECT_262(262),//特种兵 arm=1 攻击加成
        EFFECT_263(263),//特种兵 arm=3 攻击加成
        EFFECT_264(264),//特种兵 arm=5 攻击加成
        EFFECT_265(265),//特种兵 arm=7 攻击加成
        EFFECT_266(266),//特种兵 arm=1 防御加成
        EFFECT_267(267),//特种兵 arm=3 防御加成
        EFFECT_268(268),//特种兵 arm=5 防御加成
        EFFECT_269(269),//特种兵 arm=7 防御加成
        EFFECT_270(270),//特种兵 arm=1 受到 战术兵伤害减少
        EFFECT_271(271),//特种兵 arm=3 攻击 战术兵伤害增加
        EFFECT_272(272),//特种兵 arm=5 攻击 战术兵伤害增加
        EFFECT_273(273),//特种兵 arm=7 攻击 战术兵伤害增加
        EFFECT_286(286),//丧尸兵攻击致死率
        EFFECT_287(287),//丧尸兵自爆比例
        EFFECT_289(289),//降低集结时间（百分比）
        EFFECT_290(290),//集结盟友攻击提高，不叠加，取最大值（百分比）
        EFFECT_291(291),//勇士被攻击反击概率（百分比）
        EFFECT_292(292),//集结盟友防御提高，不叠加，取最大值（百分比）
        EFFECT_302(302),//禁疗：无法 ，无法被治疗
        EFFECT_308(308),// 发射中心、巨炮死转伤比例	（百分比）
        EFFECT_312(312),//守城 勇士援护自己部队比例
        EFFECT_313(313),//守城 勇士反击率
        EFFECT_314(314),//陷阱伤害增加%
        EFFECT_315(315),//守城 哨塔无视目标防御（百分比）
        EFFECT_316(316),//守城 射手第三技能概率
        EFFECT_317(317),//守城 车兵第三技能概率
        EFFECT_318(318),//守城 丧尸第三技能概率
        EFFECT_321(321),//援助盟友 防御加成
        EFFECT_322(322),//参与集结 防御加成
        EFFECT_323(323),//参与集结 补齐与队长攻击差100700
        EFFECT_324(324),//援助盟友 补齐与队长攻击差100700
        EFFECT_388(388),//勇士攻击致死率
        EFFECT_402(402),//出征每增加一个兵种，全体攻击提高（百分比）
        EFFECT_403(403),//普通攻击是否有几率打后排的兵
        EFFECT_450(450),//控制-不能攻击（生效人数取决于我方数量）
        EFFECT_456(456),//洞察状态：身上的以下作用号无效：44、45、46、EFFECT_252暴走状态
//        EFFECT_500(500),//增加联盟成员数量
//        EFFECT_501(501),//增加里面礼物的消失倒计时
//        EFFECT_502(502),//增加打开联盟礼物时获得的礼物经验值
//        EFFECT_504(504),//增加联盟帮助减少的CD时间
//        EFFECT_505(505),//减少制造装备所需的联盟积分
//        EFFECT_506(506),//减少购买装备所需的联盟贡献值
//        EFFECT_507(507),//增加装备制造的速度
//        EFFECT_508(508),//增加每次捐献的资源总量上限
//        EFFECT_509(509),//缩短每两次捐献之间的时间间隔
//        EFFECT_510(510),//提高联盟科技的研究速度
//        EFFECT_513(513),//降低缠绕塔的攻击CD
//        EFFECT_514(514),//降低闪电塔的攻击CD
//        EFFECT_515(515),//降低龙巢的攻击CD
//        EFFECT_516(516),//捡宝箱类型的行军速度增加
//        EFFECT_517(517),//遗迹可以驻扎的士兵数量增加
//        EFFECT_650(650),//采集速度降低
//        EFFECT_651(651),//采集负重增加
//        EFFECT_660(660),//新造兵速度（以后的投放都用新的作用号）
        EFFECT_245(245),//防御武器的触发率
        EFFECT_246(246),//我方战损/敌方战损＞2时,防御武器触发率提高
        EFFECT_560(560),//特种勇士生命
        EFFECT_561(561),//特种射手生命
        EFFECT_562(562),//特种改装生命
        EFFECT_563(563),//特种丧尸生命
        EFFECT_566(566),//军官技能,增加集结时攻击属性
        EFFECT_568(568),//单人进攻城市死转伤
        EFFECT_592(592), //单人进攻伤害加深
        EFFECT_593(593),// 降低防守方参战人数
        EFFECT_594(594),// 单人攻城时，若战斗对我方不利，则会提前撤退
        EFFECT_598(598),//降低攻城士兵的参数
        EFFECT_599(599),//降低守城方兵力的参数
        EFFECT_604(604),//单人进攻 防守方伤转死
        EFFECT_652(652),//启用新战斗规则
        EFFECT_655(655),//抓捕堡垒中，斩杀军官以后获得攻击加成
        EFFECT_656(656),//抓捕堡垒中，斩杀军官以后获得防御加成

        EFFECT_687(687), //每个回合发动攻击时，攻击次数+x

        EFFECT_823(823),//受伤百分比降低

        /*
            EFFECT_823(823),//对(1-3)级怪攻击百分比加成
            EFFECT_824(824),//对(1-3)级怪防御百分比加成
            EFFECT_825(825),//对(7-9)级怪攻击百分比加成
            EFFECT_826(826),//对(7-9)级怪防御百分比加成
            EFFECT_827(827),//对(10)级怪攻击百分比加成
            EFFECT_828(828),//对(10)级怪防御百分比加成
            EFFECT_829(829),//对(1-10)级怪战斗受伤百分比降低
            EFFECT_830(830),//对(4-6)级怪攻击百分比加成
            EFFECT_831(831),//对(4-6)级怪防御百分比加成
        */
        EFFECT_850(850), // 运兵车伤的步防 百分比加成
        EFFECT_851(851), // 运兵车伤的射防 百分比加成
        EFFECT_852(852), // 运兵车伤的车防 百分比加成
        EFFECT_853(853), // 运兵车伤的步攻 百分比加成
        EFFECT_854(854), // 运兵车伤的射攻 百分比加成
        EFFECT_855(855), // 运兵车伤的车攻 百分比加成

        EFFECT_868(868), // 加强型车进攻  868  百分比  所有加强型车进攻 = 原攻击*(1+[868]/100)
        EFFECT_869(869), // 加强型车防御  869  百分比  所有加强型车防御 = 原攻击*(1+[869]/100)
        EFFECT_872(872), // 加强型勇士进攻  872  百分比  所有加强型勇士进攻 = 原攻击*(1+[872]/100)
        EFFECT_873(873), // 加强型勇士防御  873  百分比  所有加强型勇士防御 = 原攻击*(1+[873]/100)
        EFFECT_876(876), // 加强型射手进攻  876  百分比  所有加强型射手进攻 = 原攻击*(1+[876]/100)
        EFFECT_877(877), // 加强型射手防御  877  百分比  所有加强型射手防御 = 原攻击*(1+[877]/100)

        EFFECT_918(918),//  燃烧伤害比例
        EFFECT_919(919),//  诅咒伤害比例
        EFFECT_946(946),//  溅射伤害比例
        EFFECT_947(947),//  反击伤害比例
        EFFECT_948(948),//  怒意狂击伤害比例
/*
        EFFECT_910(910), // 1级车攻击  910  百分比
        EFFECT_911(911), //2级车攻击  911  百分比
        EFFECT_912(912), //3级车攻击  912  百分比
        EFFECT_913(913), //4级车攻击  913  百分比
        EFFECT_914(914), //5级车攻击  914  百分比
        EFFECT_915(915), //6级车攻击  915  百分比
        EFFECT_916(916), //7级车攻击  916  百分比
        EFFECT_917(917), //8级车攻击  917  百分比
        EFFECT_918(918), //9级车攻击  918  百分比
        EFFECT_919(919), //10级车攻击  919  百分比

        EFFECT_920(920), // 1级车防御  920  百分比
        EFFECT_921(921), // 2级车防御  921  百分比
        EFFECT_922(922), // 3级车防御  922  百分比
        EFFECT_923(923), // 4级车防御  923  百分比
        EFFECT_924(924), // 5级车防御  924  百分比
        EFFECT_925(925), // 6级车防御  925  百分比
        EFFECT_926(926), // 7级车防御  926  百分比
        EFFECT_927(927), // 8级车防御  927  百分比
        EFFECT_928(928), // 9级车防御  928  百分比
        EFFECT_929(929), // 10级车防御  929  百分比

        EFFECT_930(930), // 1级勇士攻击  930  百分比
        EFFECT_931(931), // 2级勇士攻击  931  百分比
        EFFECT_932(932), // 3级勇士攻击  932  百分比
        EFFECT_933(933), // 4级勇士攻击  933  百分比
        EFFECT_934(934), // 5级勇士攻击  934  百分比
        EFFECT_935(935), // 6级勇士攻击  935  百分比
        EFFECT_936(936), //7级勇士攻击  936  百分比
        EFFECT_937(937), //8级勇士攻击  937  百分比
        EFFECT_938(938), //9级勇士攻击  938  百分比
        EFFECT_939(939), //10级勇士攻击  939  百分比

        EFFECT_940(940), //1级勇士防御  940  百分比
        EFFECT_941(941), //2级勇士防御  941  百分比
        EFFECT_942(942), //3级勇士防御  942  百分比
        EFFECT_943(943), //4级勇士防御  943  百分比
        EFFECT_944(944), //5级勇士防御  944  百分比
        EFFECT_945(945), //6级勇士防御  945  百分比
        EFFECT_946(946), //7级勇士防御  946  百分比
        EFFECT_947(947), //8级勇士防御  947  百分比
        EFFECT_948(948), //9级勇士防御  948  百分比
        EFFECT_949(949), //10级勇士防御  949  百分比

        EFFECT_950(950), //1级射手攻击  950  百分比
        EFFECT_951(951), //2级射手攻击  951  百分比
        EFFECT_952(952), //3级射手攻击  952  百分比
        EFFECT_953(953), //4级射手攻击  953  百分比
        EFFECT_954(954), //5级射手攻击  954  百分比
        EFFECT_955(955), //6级射手攻击  955  百分比
        EFFECT_956(956), //7级射手攻击  956  百分比
        EFFECT_957(957), //8级射手攻击  957  百分比
        EFFECT_958(958), //9级射手攻击  958  百分比
        EFFECT_959(959), //10级射手攻击  959  百分比

        EFFECT_960(960), //1级射手防御  960  百分比
        EFFECT_961(961), //2级射手防御  961  百分比
        EFFECT_962(962), //3级射手防御  962  百分比
        EFFECT_963(963), //4级射手防御  963  百分比
        EFFECT_964(964), //5级射手防御  964  百分比
        EFFECT_965(965), //6级射手防御  965  百分比
        EFFECT_966(966), //7级射手防御  966  百分比
        EFFECT_967(967), //8级射手防御  967  百分比
        EFFECT_968(968), //9级射手防御  968  百分比
        EFFECT_969(969), //10级射手防御  969  百分比
        */
        EFFECT_909(909), //战斗技能和状态的伤害增加
        EFFECT_910(910), //闪避状态：伤害无效化（后面会有无视闪避的技能，这种情况下不会消耗闪避次数），附带状态还是会加上
        EFFECT_911(911), //普攻系数
        EFFECT_912(912), //普攻伤害增加
        EFFECT_913(913), //受到战斗技能和状态的伤害增加
        EFFECT_914(914), //受到普攻伤害增加
        EFFECT_915(915), //易燃状态：特殊机制

        EFFECT_917(917), // 受到战斗技能的伤害减少 百分比 实际伤害=原战斗技能伤害*（1-【917】%）


        EFFECT_934(934), // 援军攻击增加 转化为援军的  1010
        EFFECT_935(935), // 援军防御增加 转化为援军的  1030
       /* EFFECT_923(923),  // 勇士攻击速度
        EFFECT_924(924),  // 车攻击速度
        EFFECT_925(925),  // 射手攻击速度
*/
        EFFECT_963(963), //  受到致死效果降低    百分比,正值增加,负值减少  致死效果降低=致死效果降低*（1+【作用号】/100
        EFFECT_979(979), //1-5级怪攻击增加  979  百分比
        EFFECT_980(980), //1-5级怪防守增加  980  百分比
        EFFECT_981(981), //6-10级怪攻击增加  981  百分比
        EFFECT_982(982), //6-10级怪防守增加  982  百分比
        EFFECT_983(983), //1-15级怪攻击增加  983  百分比
        EFFECT_984(984), //1-15级怪防守增加  984  百分比

        STAMINA_COST(10009,false),  //  体力消耗减少百分比

public enum BatteEffectArmsGroup {

        ATTACK(100700, true),//攻击加成（百分比）
        DEFEND(100701, true),//防御加成（百分比）
        HEALTH_AMOUNT(100702, true),//生命加成（固定值）
        HEALTH(100703, true),//生命加成（百分比）
        ATTACK_FIX(100704, true),//攻击伤害修正（百分比）
        DEFEND_FIX_ATTACKER(100705, true),//被指定兵种攻击伤害修正（百分比）
        DEFEND_FIX_AMOUNT(100706, true),//被攻击伤害修正（固定值）
        DEFEND_FIX(100707, true),//被攻击伤害修正（百分比）
        HIT(100708, true),//命中（千分比）
        DODGE(100709, true),//闪避（千分比）
        CRIT(100710, true),//暴击（千分比）
        CRIT_PREVENT(100711, true),//免暴（千分比）
        CRIT_DAMAGE(100712, true),//暴伤（百分比）
        CRIT_DAMAGE_PREVENT(100713, true),//免暴伤（百分比）

        ARMY_LOAD(100730, true),//部队负重
        ARMY_SPEED(100731, true),//部队行军速度
        ATTACK_AMOUNT(100732, true),//攻击加成（固定值）
        DEFEND_AMOUNT(100733, true),//防御加成（固定值）
        SKILL_SECOND(100734, true),//第二普攻技能概率（千分比）

        FORTRESS_TEAM_ATTACK(100750, true),//自己城堡坐落于堡垒范围内，且堡垒内有超过2人防守，获得人数*堡垒作用号的加成（百分比）
        FORTRESS_TEAM_DEFEND(100751, true),//自己城堡坐落于堡垒范围内，且堡垒内有超过2人防守，获得人数*堡垒作用号的加成（百分比）

        AIRBORNE_ATTACK(100752, true),//空降兵攻击集成
        AIRBORNE_DEFENCE(100753, true),//空降兵防御集成

        SKILL_EX_ATTACK(100801, true ), //  战术攻击  100801
        SKILL_EX_DEFEND(100802, true ), //战术防御  100802

        GENERAL_ATTACK(100790, true),//将军技伤害加成
        ATTACK_SPEED(100800, true), // 战斗速度
        ATTACK_SPEED_EX(9020, true), // 战斗速度Ex
        //ATTACK_X(100801, true),  //战术攻击


        //分割 以上作用号组会全部写入邮件中 以下作用号需要判定特定战斗类型/所在服/活动期间才会写入邮件

        CITY_ATTACKER_ATTACK(100720, BattleEffectSide.ATTACK),//攻城战攻击方攻击修正（百分比）
        CITY_ATTACKER_DEFEND(100721, BattleEffectSide.ATTACK),//攻城战攻击方防御修正（百分比）
        CITY_DEFENDER_ATTACK(100722, BattleEffectSide.DEFEND),//攻城战防守方攻击修正（百分比）
        CITY_DEFENDER_DEFEND(100723, BattleEffectSide.DEFEND),//攻城战防守方防御修正（百分比）


        CITY_SINGLE_ATTACK(100754,BattleEffectSide.ATTACK), //单人攻城 士兵伤害减少

        MINE_ATTACK(100724),//资源点攻击修正（百分比）
        MINE_DEFEND(100725),//资源点防御修正（百分比）

        CAMP_ATTACK(100726),//营地攻击修正（百分比）
        CAMP_DEFEND(100727),//营地防御修正（百分比）

        REINFORCE_ATTACK(100804, BattleEffectSide.DEFEND), // 援助攻击    100804
        REINFORCE_DEFEND(100805, BattleEffectSide.DEFEND), // 援助防御    100805

        CITY_DEFEND_CHENGFANG_DEC(100803, BattleEffectSide.ATTACK), //  兵种城防值减少

        CITY_DEFENDER_DEAL_DAMAGE_FIX(100728, BattleEffectSide.DEFEND),//攻城战防守方伤害修正（百分比）
//        CITY_ATTACKER_CAUSE_DEFENDER_RESIST_DAMAGE_FIX(100729),//攻城战使防守方受到伤害减少（百分比）已废弃，使用100735
        CITY_ATTACKER_DEAL_DAMAGE_FIX(100735, BattleEffectSide.ATTACK),//攻城战攻击方伤害修正（百分比）

        THRONE_ATTACK(100736),//发射中心攻击修正（百分比）
        THRONE_DEFEND(100737),//发射中心防御修正（百分比）
        TREBUCHET_ATTACK(100738),//巨炮攻击修正（百分比）
        TREBUCHET_DEFEND(100739),//巨炮防御修正（百分比）

        THRONE_ATTACKER_ATTACK(100740, BattleEffectSide.ATTACK),//进攻发射中心攻击修正（百分比）
        THRONE_ATTACKER_DEFEND(100741, BattleEffectSide.ATTACK),//进攻发射中心防御修正（百分比）
        THRONE_DEFENDER_ATTACK(100742, BattleEffectSide.DEFEND),//防守发射中心攻击修正（百分比）
        THRONE_DEFENDER_DEFEND(100743, BattleEffectSide.DEFEND),//防守发射中心防御修正（百分比）
        DESERT_ATTACK(100744),//沙漠攻击修正（百分比）
        DESERT_DEFEND(100745),//沙漠防御修正（百分比）
        CROSS_ATTACK(100746),//最强要塞攻击修正（百分比）
        CROSS_DEFEND(100747),//最强要塞防御修正（百分比）
        UNKINGDOM_ATTACK(100748),//大帝攻击修正（百分比）
        UNKINGDOM_DEFEND(100749),//大帝防御修正（百分比）

```
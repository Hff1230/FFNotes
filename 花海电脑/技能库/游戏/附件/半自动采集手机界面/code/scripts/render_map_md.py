# -*- coding: utf-8 -*-
"""把 qnyh_keyboard_map.json 渲染成可读的界面图谱 markdown。"""
import json, os
ROOT = r"E:\AiDemos\QnyhAuto"
d = json.load(open(os.path.join(ROOT, "map", "qnyh_keyboard_map.json"), encoding="utf-8"))
sigs, funcs = d["sigs"], d["funcs"]

PURPOSE = {
    "是否大厅": "主城/大厅（世界场景）", "是否Wifi": "网络状态图标（掉线判据）",
    "是否坐骑图标": "HUD 坐骑按钮", "是否Left": "左侧聊天框",
    "是否道具使用": "道具使用确认弹窗", "是否易市买东西": "易市（交易行）购买界面",
    "是否回收界面": "装备回收界面", "是否回收警告": "回收二次确认警告",
    "是否满回收": "回收背包已满", "是否易市购买提示": "易市购买结果提示",
    "是否价格异常": "易市价格异常提示", "是否背包": "背包界面",
    "是否商城": "商城（红线：只登记不点）", "是否福利": "福利/签到入口",
    "是否科举去不去": "科举活动询问弹窗", "是否考状元": "考状元（科举答题）",
    "是否断线重连": "断线重连弹窗", "是否关林去不去": "关林活动询问弹窗",
    "是否签到": "每日签到", "是否事件弹窗": "突发事件弹窗",
    "是否联赛召集": "帮会联赛召集弹窗", "是否帮会A": "帮会界面",
    "是否队伍": "队伍界面", "是否团队": "团队界面", "是否便携组队": "便携组队界面",
    "是否申请列表": "入队申请列表", "是否大地图": "小地图（右上角）",
    "是否世界地图": "世界地图", "是否分线界面": "分线选择",
    "是否小红包": "小红包", "是否小金包": "小金包", "是否花魁包": "花魁红包",
    "是否帮花包": "帮花红包", "是否语音包": "语音红包", "是否红包列表": "红包列表界面",
    "是否hud_S": "HUD 状态 S（8 组单点）", "是否hud_B": "HUD 状态 B（9 组单点）",
    "是否乾坤袋界面": "乾坤袋（开箱）界面", "是否乾坤袋浅蓝": "乾坤袋-浅蓝档",
    "是否乾坤袋深蓝": "乾坤袋-深蓝档", "是否乾坤袋装备9珍": "乾坤袋-装备9珍档",
    "是否乾坤袋浅红": "乾坤袋-浅红档", "是否乾坤袋深红": "乾坤袋-深红档",
    "是否正在移动": "角色移动中（11 职业立绘各一套）",
    "是否初级宝图": "初级宝图", "是否中级宝图": "中级宝图", "是否高级宝图": "高级宝图",
    "是否黄金级宝图": "黄金级宝图", "是否盗墓笔记": "盗墓笔记道具",
    "是否龙太子": "一条龙任务对话界面（日常主循环）",
    "是否等待进图": "等待进入副本", "是否下一轮": "一轮结束提示",
}
EXEC_DESC = {
    "执行乾坤袋": "自动开乾坤袋（按浅蓝/深蓝/装备9珍/浅红/深红分档处理）",
    "执行刷易市": "交易行刷货/买东西（高风险：涉及交易）",
    "执行回收蓝装": "批量回收蓝装（含警告确认 + 撤销）",
    "执行抢红包": "帮会抢红包（找红包→超时检测→红包列表）",
    "执行挖宝图": "自动挖宝图（含移动中判定，防止打断移动）",
    "执行一条龙": "日常一条龙主循环（龙太子→等待进图→下一轮）",
    "开始挂机": "地图寻路 + 组队跟随 + 开启挂机",
    "开始挂机2": "挂机（备用流程）",
    "检查意外弹窗": "意外弹窗巡检 #1", "检查意外弹窗2": "意外弹窗巡检 #2（一条龙前调用）",
    "打开大地图": "打开/确认小地图（自检循环）",
    "打开世界地图": "打开/确认世界地图（自检循环）",
}

is_f = sorted(d["is_funcs"], key=lambda x: funcs[x]["line"])
ex_f = sorted(d["exec_funcs"], key=lambda x: funcs[x]["line"])
pm_f = [n for n in funcs if funcs[n]["kind"] == "Sub" and n not in ex_f] + d["prim_funcs"]

L = []
L.append("# 倩女幽魂 界面图谱（从按键精灵脚本提取，PC 版基线）\n")
L.append("> 来源：`傲视小助手.q` 程序化解析（`scripts/parse_q_map.py`）\n")
L.append("> ⚠️ **坐标系为 PC 版 1296×758 窗口**。手机版 1600×720 宽高比不同（16:9 → 20:9），"
         "**全部比色点与点击坐标必须重标**；面板结构与跳转逻辑可整套复用。\n")
L.append("## 0. 概览\n")
L.append("| 项 | 数量 |")
L.append("|---|---|")
L.append("| 含比色签名的变量 | %d |" % len(sigs))
L.append("| 比色点合计 | %d |" % sum(len(v) for v in sigs.values()))
L.append("| 函数总数 | %d |" % len(funcs))
L.append("| └ 界面判定（是否Xxx） | %d |" % len(is_f))
L.append("| └ 业务流程（执行/开始/打开…） | %d |" % len(ex_f))
L.append("| └ 原语（比色/点击/移动…） | 8 |")
L.append("")
L.append("**判别手段分布**：比色点 616 个 / `dm.CmpColor` 相似度 **0.9** / `FindPic` 找图仅 **1 处** / **OCR 0 处**")
L.append("")
L.append("## 1. 界面判定表（52 个）\n")
L.append("| # | 函数 | 用途（按名推断） | 比色签名 | 点数 | 状态 |")
L.append("|---|---|---|---|---|---|")
for i, n in enumerate(is_f, 1):
    used = funcs[n]["sigs"]
    sig_txt = "<br>".join("`%s`" % s for s in used) if used else "—"
    npts = sum(len(sigs[s]) for s in used if s in sigs)
    L.append("| %d | `%s` | %s | %s | %d | ⬜ 待手机端重标 |"
             % (i, n, PURPOSE.get(n, ""), sig_txt, npts))
L.append("")
L.append("## 2. 原语（可直接移植到 AutoX.js）\n")
L.append("```vb")
L.append("Function 多点比色(array)          ' 全部点都命中 → 1")
L.append("    For UBound(array)+1")
L.append("        If 比色(array(i)) = 0 Then result=0 : Exit For")
L.append("Function 比色(array)              ' dm.CmpColor(x, y, \"hex\", 0.9)")
L.append("Function 移动(x,y)                ' MyRnd=Int(5*Rnd+1)；MoveTo ×3；Delay 移延迟(10)")
L.append("Function 点击(x,y)                ' 移动 → dm.LeftClick → Delay 点延迟(30)")
L.append("Function 高速点击(x,y)            ' MoveTo ×2 → LeftClick → Delay 80")
L.append("Function 找图(picName)            ' dm.FindPic(0,0,1296,758,名,\"000000\",0.9,0,intX,intY)")
L.append("```")
L.append("")
L.append("## 3. 业务流程与跳转规则（%d 条）\n" % len(ex_f))
for n in ex_f:
    r = funcs[n]
    L.append("### `%s` — %s  <sub>L%d</sub>\n" % (n, EXEC_DESC.get(n, ""), r["line"]))
    if r["calls"]:
        L.append("**调用链**： " + " → ".join("`%s`" % c for c in r["calls"]) + "\n")
    if r["clicks"]:
        L.append("**点击序列**（PC 基线坐标）：\n")
        L.append("| 序 | 坐标 | 备注 |")
        L.append("|---|---|---|")
        for i, c in enumerate(r["clicks"], 1):
            L.append("| %d | (%d, %d) | %s |" % (i, c["x"], c["y"], c["comment"] or c["op"]))
        L.append("")
L.append("## 4. 重标工作单（手机版 1600×720）\n")
L.append("对每个界面：① 手机截图 → ② 定位同名面板 → ③ 在新坐标系重取比色点"
         "（须落在**纯色块深处**，11×11 平坦约束 + 容差≥35）→ ④ 重取按钮坐标 → ⑤ 校验。\n")
L.append("| 优先级 | 界面 | 理由 |")
L.append("|---|---|---|")
L.append("| P0 | `是否大厅` `是否龙太子` `是否等待进图` `是否下一轮` | 日常一条龙主链路 |")
L.append("| P0 | `是否断线重连` `是否事件弹窗` `检查意外弹窗2` | 长跑必须能自愈 |")
L.append("| P1 | `是否大地图` `是否世界地图` `是否队伍` | 挂机寻路链路 |")
L.append("| P1 | `是否背包` `是否回收界面` `是否回收警告` `是否满回收` | 回收蓝装 |")
L.append("| P1 | `是否红包列表` `是否小红包` `是否小金包` `是否花魁包` `是否帮花包` `是否语音包` | 抢红包 |")
L.append("| P2 | `是否签到` `是否福利` `是否科举去不去` `是否关林去不去` `是否联赛召集` | 日常活动弹窗 |")
L.append("| P2 | `是否商城` `是否易市买东西` `是否易市购买提示` `是否价格异常` | **只登记不点击**（红线） |")
L.append("| P3 | `是否乾坤袋*`（6 个） `是否hud_S/B` `是否正在移动` | 可选功能 |")

md = "\n".join(L)
p = os.path.join(ROOT, "docs", "界面图谱-按键精灵版.md")
open(p, "w", encoding="utf-8").write(md)
print("已写出:", p, os.path.getsize(p), "bytes")
print("行数:", md.count("\n") + 1)

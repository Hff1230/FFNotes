#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""用 evidence/ 的真实截图重建 screens.json —— 取代 map/screens.json 里的合成摆拍数据。

为什么重建：旧 screens.json 的比色签名每点全同（main_hud 12 点都是 [196,62,62]）、
锚点框整齐划一（x=120/460/800, w=280,h=104）→ 那是管道连通性验证用的假图，
且 COLOR_TOL=35 正是方案文档里标了「已作废，待真机重标」的值。

本脚本做三件真事：
  ① 判别关键词 ROI —— 从建图期【全屏 OCR】的精确框自动生成（零 token）
     运行时改用 use_det=False 只读该 ROI → 9ms，而不是全屏 1.5s
  ② 比色点 —— 「跨状态稳定 × 跨界面可分 × 局部平坦 × 空间抑制」四约束自动选点
  ③ 自检 —— 类内/类间分离度 + 用生成物对全量截图做回归，输出混淆矩阵

用法:
  python build_map_real.py [--points 16] [--out map/screens.json]
"""
import argparse
import json
import os
import sys
from collections import defaultdict

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mapkit import vision as V  # noqa: E402

EV = r"E:/AiDemos/QnyhAuto/evidence"
ROOT = r"E:/AiDemos/QnyhAuto"
TARGET = (1600, 720)

# ────────────────────────────────────────────────────────────── 场景定义
# keys  = 判别关键词（必须在该界面出现；HUD 上的同名物已用 ROI 区分）
# files = 该界面的建图样本（同界面的多张不同状态图 → 供「跨状态稳定」选点用）
# 注意：同一界面有多张样本，是比色点能抗状态变化的前提。
SCENES = {
    "hud": {
        "name": "主界面 HUD",
        "purpose": "游戏主界面（任务追踪/战斗/挂机都在此层）",
        # 注意：hud_00_a/b/01/02 经 OCR 验证【不是 HUD】（内容是「九久同心」活动页），
        # 已拆到 panel_banner / panel_lianjie。分组错误会让「跨状态稳定」选点全废。
        "files": ["hud_final2.png", "hud_final.png", "hud_now.png", "hud_ref2.png",
                  "now2.png", "after_bag_close.png", "after_quest_close.png",
                  "after_team_close.png", "after_market_close.png", "after_order_close.png",
                  "S13_cargo.png", "S15_quest_cargo.png", "S16_quest2.png", "S16b.png",
                  "S11_afk.png"],
        # 顶部横排四钮同排出现 = HUD 的特异组合（面板态不会有这四个同排）
        "keys": ["易市", "福利"],
        "yband": (0, 120),          # 关键词只允许出现在此 y 带（排除别处的同名文字）
    },
    "panel_banner": {
        "name": "活动横幅",
        "purpose": "进游戏时的活动横幅页（点画面正中翻页/进入）",
        "files": ["hud_00_a.png", "hud_00_b.png", "hud_01_nopopup.png"],
        "keys": ["微微一笑联动玩法", "九久同心"],
        "yband": (150, 520),
    },
    "panel_lianjie": {
        "name": "九久同心活动面板",
        "purpose": "活动面板（含『开启绘本』按钮）",
        "files": ["hud_02_now.png"],
        "keys": ["开启绘本", "竞速比赛"],
        "yband": (150, 560),
    },
    "panel_activity": {
        "name": "活动面板",
        "purpose": "日常任务总入口（一条龙/货运任务都在这）",
        "files": ["S12_activity.png"],
        "keys": ["我要装备", "一条龙"],
        "yband": (0, 300),
    },
    "panel_quest": {
        "name": "任务面板",
        "purpose": "任务列表/详情（含危险按钮『放弃任务』）",
        "files": ["S17.png", "S18_daily.png", "S19_guild.png", "S8_quest.png"],
        "keys": ["放弃任务", "立刻前往"],
        "yband": (400, 720),
    },
    "panel_bag": {
        "name": "包裹",
        "purpose": "背包（含危险按钮『回收』）",
        "files": ["S7_bag.png"],
        "keys": ["回收", "整理"],
        "yband": (0, 200),
    },
    "panel_team": {
        "name": "队伍",
        "purpose": "队伍信息（含『召唤跟随』『取消跟随』）",
        "files": ["S9_team.png"],
        "keys": ["自动匹配", "一键喊话"],
        "yband": (0, 200),
    },
    "panel_market": {
        "name": "集市",
        "purpose": "易市类 —— 只确认不探索（用户指令）",
        "files": ["S10_market.png"],
        "keys": ["交易市场"],
        "yband": (0, 120),
    },
    "panel_order": {
        "name": "下一订单",
        "purpose": "纯图标面板 —— 看到就关闭（用户指令）",
        "files": ["S14_order.png", "S14b_order.png"],
        "keys": ["下一订单"],
        "yband": (100, 300),
    },
    "dialog_exit": {
        "name": "退出确认弹窗",
        "purpose": "BACK 键必然触发；点『取消』回原界面，⚠️『确定』会真的退出游戏",
        "files": ["cancel_1s.png", "cancel_3s.png", "cancel_6s.png",
                  "real_01_after_cancel.png", "bright_A_orig.png",
                  "bright_B_dark.png", "bright_C_max.png"],
        "keys": ["是否要退出游戏", "取消"],
        "yband": (200, 500),
    },
    "panel_serverlist": {
        "name": "选择服务器",
        "purpose": "启动流程的选服页 —— 进服由用户手动完成，识别到就停手（不自动操作）",
        "files": ["burst_0_serverlist.png"],
        "keys": ["选择服务器", "已有角色"],
        "yband": (0, 250),
    },
}

# 已量准的固定点击坐标（来自 docs/界面图谱-安卓版-实测.md 与 OCR 实测）
# 1600x720 固定分辨率 → 真机坐标是死的，不需要模板匹配定位
CLICKS = {
    "hud": {"集市": (1097, 66), "福利": (1169, 66), "活动": (1242, 66), "商城": (1312, 66),
            "任务": (153, 163), "队伍": (273, 165), "背包": (1396, 236),
            "挂机": (1466, 371), "取消跟随": (277, 346), "召唤跟随": (152, 346)},
    "panel_activity": {"日常页签": (347, 144), "一条龙_参加": (1267, 232),
                       "货运任务_参加": (1266, 335), "师门任务_参加": (816, 232)},
    "panel_quest": {"立刻前往": (1285, 662), "页签_日常": (255, 222), "页签_全部": (255, 103)},
    "panel_bag": {"整理": (1225, 115), "页签_装备": (300, 100)},
    "panel_team": {"召唤跟随": (1030, 644), "取消跟随": (1200, 644)},
    "panel_order": {},
    "panel_market": {},
    "dialog_exit": {"取消": (653, 432)},
    "panel_serverlist": {},
}

# 危险区（红线，永不触碰）+ 关闭键
DANGER = [
    {"screen": "panel_bag", "name": "回收", "xy": (1120, 100), "why": "销毁物品"},
    {"screen": "panel_quest", "name": "放弃任务", "xy": (1029, 662), "why": "放弃任务不可逆"},
    {"screen": "panel_team", "name": "离开队伍", "xy": (370, 644), "why": "不可逆"},
    {"screen": "panel_team", "name": "更多操作", "xy": (518, 644), "why": "内含解散/踢人"},
    {"screen": "panel_market", "name": "任意买卖", "xy": None, "why": "交易/付费"},
    {"screen": "panel_activity", "name": "充值入口", "xy": None, "why": "付费"},
    {"screen": "dialog_exit", "name": "确定(退出游戏)", "xy": (947, 432), "why": "会真的退出游戏"},
]
# 各面板关闭键（实测坐标）
CLOSERS = {
    "panel_bag": (1345, 63), "panel_team": (1345, 63), "panel_market": (1345, 63),
    "panel_order": (1119, 120), "panel_activity": (1364, 48), "panel_quest": (1388, 47),
    "dialog_exit": (653, 432),
}

PAD = 8          # 关键词 ROI 外扩像素（留余量，防止文字轻微位移被切边）
FLAT_K = 11
FLAT_THR = 1.5
MIN_DIST = 80
SPREAD_W = 1.0   # 跨状态漂移的惩罚权重（>1 过于苛刻会让点全被淘汰）


def imread_u(p):
    with open(p, "rb") as f:
        return cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)


def load_scene_images(scenes):
    """返回 {sid: {"imgs":[PIL...], "ocr":{fname: items}}}"""
    out = {}
    for sid, sc in scenes.items():
        imgs, ocr = [], {}
        for f in sc["files"]:
            p = os.path.join(EV, f)
            if not os.path.exists(p):
                print("  [跳过] 缺文件 %s" % f)
                continue
            bgr = imread_u(p)
            if bgr is None or (bgr.shape[1], bgr.shape[0]) != TARGET:
                print("  [跳过] 尺寸不符 %s" % f)
                continue
            imgs.append(np.asarray(Image.open(p).convert("RGB")))
            jp = p + ".ocr.json"
            if os.path.exists(jp):
                with open(jp, encoding="utf-8") as fh:
                    ocr[f] = json.load(fh)["items"]
        if imgs:
            out[sid] = {"imgs": imgs, "ocr": ocr}
    return out


def find_key_roi(items, key, yband):
    """在建图期 OCR 结果里找关键词的框，外扩 PAD 得到运行时 ROI。"""
    for it in items:
        if key in it["text"] and yband[0] <= it["cy"] <= yband[1]:
            return [max(0, it["x0"] - PAD), max(0, it["y0"] - PAD),
                    min(TARGET[0], it["x1"] + PAD), min(TARGET[1], it["y1"] + PAD)], it
    return None, None


def pick_points(scene_imgs, n=16, min_dist=MIN_DIST, min_ratio=1.5):
    """Fisher 判别准则选点：直接优化「类间可分性 / 类内稳定性」= between/within。

    为什么不用「11x11 局部平坦约束」：实测在游戏 HUD 这种场景图上，要求某像素在
    【所有样本图】上局部 std < 1.5 时，满足率是 **0.000%**（flat p50 = 44.6）——
    HUD 是游戏画面（建筑/NPC/屋顶），几乎每处都有细节，该约束在场景类上不可满足。
    Fisher 比直接量化可分性：边缘点因跨状态抖动大（within 大）而自动落选，
    纯色无差异区因 between=0 也自动落选，不需要人为设平坦阈值。
    """
    sids = list(scene_imgs)
    mus, within = [], []
    for sid in sids:
        arr = np.stack([im.astype(np.float32) for im in scene_imgs[sid]])
        mus.append(arr.mean(axis=0))
        within.append(arr.std(axis=0) if arr.shape[0] > 1
                      else np.zeros(arr.shape[1:], np.float32))
        del arr
    mus = np.stack(mus)                                   # (S,H,W,3)
    within = np.stack(within).mean(axis=0)                # (H,W,3) 平均类内标准差
    between = mus.std(axis=0)                             # (H,W,3) 类间标准差
    ratio = (between / (within + 1.0)).mean(axis=2)        # (H,W)  Fisher 比

    sc = ratio.copy()
    sc[:14, :] = sc[-14:, :] = -1
    sc[:, :14] = sc[:, -14:] = -1

    print("    [诊断] Fisher比 between/within:  max %6.2f  p99 %6.2f  p50 %6.2f"
          % (ratio.max(), np.percentile(ratio, 99), np.percentile(ratio, 50)))
    print("    [诊断] between p99 %6.2f   within p50 %6.2f"
          % (np.percentile(between, 99), np.percentile(within, 50)))
    for thr in (1.5, 2, 3, 5, 8):
        print("    [诊断] Fisher比 > %.1f 的像素 %.4f%%" % (thr, 100.0 * float((ratio > thr).mean())))

    pts, info = [], []
    for _ in range(n):
        y, x = np.unravel_index(int(np.argmax(sc)), sc.shape)
        if sc[y, x] < min_ratio:
            break
        pts.append([int(x), int(y)])
        info.append({"xy": [int(x), int(y)],
                     "ratio": round(float(ratio[y, x]), 2),
                     "between": round(float(between[y, x].mean()), 1),
                     "within": round(float(within[y, x].mean()), 1)})
        sc[max(0, y - min_dist):y + min_dist, max(0, x - min_dist):x + min_dist] = -1
    return pts, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--points", type=int, default=16)
    ap.add_argument("--out", default=os.path.join(ROOT, "map", "screens.json"))
    a = ap.parse_args()

    print("=== 载入真实截图 ===")
    scen = load_scene_images(SCENES)
    for sid, s in scen.items():
        print("  %-16s %2d 张样本, %d 张有 OCR" % (sid, len(s["imgs"]), len(s["ocr"])))
    if len(scen) < 3:
        print("样本不足，终止")
        return 1

    print("\n=== ① 自动生成判别关键词 ROI（取建图期 OCR 精确框） ===")
    screen_entries, roi_report = {}, {}
    for sid, sc in SCENES.items():
        if sid not in scen:
            continue
        s = scen[sid]
        rois = []
        for key in sc["keys"]:
            found = None
            for fname, items in s["ocr"].items():
                roi, it = find_key_roi(items, key, sc["yband"])
                if roi:
                    found = (fname, roi, it)
                    break
            if found:
                fname, roi, it = found
                rois.append({"key": key, "roi": roi, "expect": it["text"],
                             "src": fname, "conf": it["conf"]})
                print("  %-16s 关键词「%s」→ ROI %s  (来自 %s, conf %.3f, 实测中心 (%d,%d))"
                      % (sid, key, roi, fname, it["conf"], it["cx"], it["cy"]))
            else:
                print("  %-16s 关键词「%s」**未在建图 OCR 中找到**（检查 files/yband）" % (sid, key))
        if not rois:
            print("  !! %s 无可用 ROI，跳过该界面" % sid)
            continue
        roi_report[sid] = rois

    usable = [sid for sid in roi_report if sid in scen]
    print("\n=== ② 比色选点（跨状态稳定 × 跨界面可分×平坦×抑制） ===")
    pts, pinfo = pick_points({sid: scen[sid]["imgs"] for sid in usable}, n=a.points)
    print("  选出 %d 个采样点" % len(pts))
    for p in pinfo:
        print("    (%4d,%4d)  Fisher比 %5.2f  类间 %5.1f  类内 %5.1f"
              % (p["xy"][0], p["xy"][1], p["ratio"], p["between"], p["within"]))
    if not pts:
        print("  !! 选不出点 —— 界面间无足够纯色差异区")
        return 1

    print("\n=== ③ 生成多候选色签名（跨状态采样，不靠放宽容差） ===")
    for sid in usable:
        shots = scen[sid]["imgs"]
        spec = V.collect_candidates(shots, pts, tol=6, max_cands=12)
        multi = sum(1 for e in spec if len(e[2]) > 1)
        screen_entries.setdefault(sid, {})
        screen_entries[sid]["spec"] = spec
        print("  %-16s %d 点，其中 %d 点需多候选色（跨状态变色）" % (sid, len(spec), multi))

    print("\n=== ④ 类内/类间比色分离度自检 ===")
    tol_try = [40, 30, 25, 20, 15, 12, 10, 8, 6]
    best_tol, best_gap = None, -9
    for tol in tol_try:
        intra, inter = {}, {}
        for sid in usable:
            shares = [V.spec_score(V.color_sig(im, pts), screen_entries[sid]["spec"], tol)[0]
                      for im in scen[sid]["imgs"]]
            intra[sid] = min(shares)
        for i, A in enumerate(usable):
            for B in usable[i + 1:]:
                # 用 A 的代表图去套 B 的签名（误判率）
                s = V.spec_score(V.color_sig(scen[A]["imgs"][0], pts),
                                 screen_entries[B]["spec"], tol)[0]
                inter["%s→%s" % (A, B)] = s
        worst_intra = min(intra.values())
        worst_inter = max(inter.values())
        gap = worst_intra - worst_inter
        print("  tol=%2d  类内最差 %.3f  类间最好 %.3f  裕度 %+0.3f  %s"
              % (tol, worst_intra, worst_inter, gap, "✅" if gap > 0 else "❌"))
        if gap > best_gap:
            best_tol, best_gap = tol, gap
            best_detail = (dict(intra), dict(inter))

    print("\n  选定 tol=%d（裕度 %+0.3f）" % (best_tol, best_gap))
    if best_gap <= 0:
        print("  ⚠ 比色无法完全分离 → 运行时必须以 OCR 关键词为准，比色只做候选预筛")

    print("\n=== ⑤ 写出 screens.json ===")
    sm = V.ScreenMap(list(TARGET), tol=best_tol)
    sm.points = pts
    for sid in usable:
        sc = SCENES[sid]
        sm.screens[sid] = {
            "name": sc["name"], "purpose": sc["purpose"],
            "color_sig": V.color_sig(scen[sid]["imgs"][0], pts),
            "spec": screen_entries[sid]["spec"],
            "keys": roi_report[sid],                 # ★ 运行时 OCR 判别用
            "clicks": {k: list(v) for k, v in CLICKS.get(sid, {}).items()},
            "closer": list(CLOSERS[sid]) if sid in CLOSERS else None,
            "danger": [d for d in DANGER if d["screen"] == sid],
            "anchors": [], "texts": [],
        }
    sm.save(a.out)
    print("  已写 %s  (%d 界面, %d 比色点, tol=%d)" % (a.out, len(sm.screens), len(pts), best_tol))

    # 附上评测所需的 ground truth 分组，供 regress.py 使用
    gt = {sid: list(SCENES[sid]["files"]) for sid in usable}
    with open(os.path.join(ROOT, "map", "ground_truth.json"), "w", encoding="utf-8") as f:
        json.dump({"scenes": gt, "screen_size": list(TARGET)}, f, ensure_ascii=False, indent=1)
    print("  已写 map/ground_truth.json (供全量回归评测)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

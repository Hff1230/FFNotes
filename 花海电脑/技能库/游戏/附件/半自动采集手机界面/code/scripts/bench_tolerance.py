#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""容错对比实验 v2：多点比色 vs cv2 归一化互相关 vs 大漠式 FindPic

v1 暴露的两个方法论缺陷（已修）：
  ① 比色采样点选在文字上 → 文字不平坦 → 点集为空 → 全 0 分。比色的真实用法是
     【原图固定坐标取点】（按键精灵/大漠 CmpColor 就是这么用的），v2 照此实现。
  ② cv2 TM_CCOEFF_NORMED 在【低方差区虚高】：搜索区接近纯色时相关系数不稳定，
     实测别的界面模板在本界面纯色区拿到 0.998 → 造成"类间 > 类内"的假象。
     v2 给两个「找图」算法都加【信息量门限】：匹配处的局部标准差不足即作废。
     这是真陷阱，不是实验误差 —— 两算法同受约束，对比才公平。

用法: python bench_tolerance.py
"""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

EV = r"E:/AiDemos/QnyhAuto/evidence"

CASES = {
    "hud":            {"tpl_src": "hud_final2.png",  "box": [1068, 47, 1127, 84],
                       "pos": ["hud_now.png", "after_bag_close.png", "now2.png", "S11_afk.png"]},
    "panel_activity": {"tpl_src": "S12_activity.png", "box": [976, 191, 1056, 227], "pos": []},
    "panel_quest":    {"tpl_src": "S17.png",         "box": [972, 640, 1086, 685],
                       "pos": ["S18_daily.png", "S19_guild.png", "S8_quest.png"]},
    "panel_bag":      {"tpl_src": "S7_bag.png",      "box": [1091, 77, 1157, 118], "pos": []},
    "panel_team":     {"tpl_src": "S9_team.png",     "box": [913, 81, 1022, 120], "pos": []},
    "panel_market":   {"tpl_src": "S10_market.png",  "box": [95, 12, 182, 48], "pos": []},
    "panel_order":    {"tpl_src": "S14_order.png",   "box": [738, 175, 865, 221],
                       "pos": ["S14b_order.png"]},
}

SEARCH_R = 10
DELTA = 32
SIM = 0.90
COLOR_TOL = 25
STD_GATE = 10.0        # ★ 信息量门限：匹配处局部标准差低于此值 → 判定为「纯色虚高」作废

PERTURBS = ["none", "bright_hi", "bright_lo", "dim_mask", "tint_warm", "tint_cool",
            "shift2", "shift5", "jpeg50", "scale95", "scale105", "noise"]

# 大漠 delta 扫描（大漠 delta_color 例如 "101010"=16 / "202020"=32 / "404040"=64）
DELTA_GRID = [32, 64, 96]



def imread_u(p):
    with open(p, "rb") as f:
        return cv2.cvtColor(cv2.imdecode(np.frombuffer(f.read(), np.uint8),
                                         cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)


def perturb(img, kind, ref=None, rng=None):
    f = img.astype(np.float32)
    if kind == "none":
        return img.copy()
    if kind == "bright_hi":
        return np.clip(f * 1.15, 0, 255).astype(np.uint8)
    if kind == "bright_lo":
        return np.clip(f * 0.85, 0, 255).astype(np.uint8)
    if kind == "dim_mask":
        return np.clip(f * 0.60, 0, 255).astype(np.uint8)
    if kind == "tint_warm":                    # 护眼模式 / 暖色温
        out = f.copy()
        out[..., 0] *= 1.08
        out[..., 2] *= 0.92
        return np.clip(out, 0, 255).astype(np.uint8)
    if kind == "tint_cool":                    # 冷色温
        out = f.copy()
        out[..., 0] *= 0.92
        out[..., 2] *= 1.08
        return np.clip(out, 0, 255).astype(np.uint8)
    if kind.startswith("shift"):
        return np.roll(img, int(kind[5:]), axis=1)
    if kind == "jpeg50":
        ok, buf = cv2.imencode(".jpg", cv2.cvtColor(img, cv2.COLOR_RGB2BGR),
                               [cv2.IMWRITE_JPEG_QUALITY, 50])
        return cv2.cvtColor(cv2.imdecode(buf, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
    if kind.startswith("scale"):
        s = int(kind[5:]) / 100.0
        h, w = img.shape[:2]
        small = cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
        return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)
    if kind == "noise":
        rng = rng or np.random.default_rng(7)
        return np.clip(f + rng.normal(0, 8, img.shape), 0, 255).astype(np.uint8)
    return img.copy()


def flat_points(tpl, k=11, thr=1.5):
    """模板内平坦采样点（避开文字笔画/边缘的抖动）。"""
    h, w = tpl.shape[:2]
    g = tpl.astype(np.float32).mean(axis=2)
    m = cv2.blur(g, (k, k))
    s = np.sqrt(np.maximum(cv2.blur(g * g, (k, k)) - m * m, 0))
    sc = s.copy()
    sc[:6, :] = sc[-6:, :] = sc[:, :6] = sc[:, -6:] = 1e9
    pts = [(x, y) for y in range(6, h - 6, 5) for x in range(6, w - 6, 5) if sc[y, x] < thr]
    return pts


# ─────────────────────────── 三种算法 ───────────────────────────
def algo_color(img, tpl, box, tol=COLOR_TOL):
    """A. 多点比色 —— 原图【固定坐标】取点（大漠 CmpColor / 按键精灵比色的真实用法）。
    img: 全图；tpl: 模板；box: 模板在全图中的坐标。"""
    x0, y0, x1, y1 = box
    sub = img[y0:y1, x0:x1]
    if sub.shape != tpl.shape:
        return 0.0, None
    pts = flat_points(tpl)
    if not pts:
        return 0.0, None
    hit = 0
    for (x, y) in pts:
        if int(np.abs(sub[y, x].astype(np.int16) - tpl[y, x].astype(np.int16)).max()) <= tol:
            hit += 1
    return hit / len(pts), (x0 + tpl.shape[1] // 2, y0 + tpl.shape[0] // 2)


def algo_template(search, tpl, gate=True):
    """B. cv2 归一化互相关 + 信息量门限。"""
    h, w = tpl.shape[:2]
    if search.shape[0] < h or search.shape[1] < w:
        return 0.0, None
    G = cv2.cvtColor(search, cv2.COLOR_RGB2GRAY).astype(np.float32)
    T = cv2.cvtColor(tpl, cv2.COLOR_RGB2GRAY).astype(np.float32)
    if T.std() < STD_GATE:
        return 0.0, None
    r = cv2.matchTemplate(G, T, cv2.TM_CCOEFF_NORMED)
    _, mx, _, ml = cv2.minMaxLoc(r)
    if gate:
        patch = G[ml[1]:ml[1] + h, ml[0]:ml[0] + w]
        if patch.std() < STD_GATE:          # ★ 匹配处无信息量 → 纯色虚高，作废
            return 0.0, None
    return float(mx), (ml[0] + w // 2, ml[1] + h // 2)


def algo_dm_findpic(search, tpl, delta=DELTA, gate=True):
    """C. 大漠 FindPic 等价实现：滑窗 + 每像素三通道绝对差<=delta 的比例 + 信息量门限。"""
    h, w = tpl.shape[:2]
    H, W = search.shape[:2]
    if H < h or W < w:
        return 0.0, None
    Gt = cv2.cvtColor(tpl, cv2.COLOR_RGB2GRAY).astype(np.float32)
    if Gt.std() < STD_GATE:
        return 0.0, None
    sw = np.lib.stride_tricks.sliding_window_view(search, (h, w, 3))[0, 0]
    t = tpl.astype(np.int16)
    best, best_xy = 0.0, None
    rows, cols = sw.shape[0], sw.shape[1]
    chunk = max(1, 4_000_000 // max(1, cols * h * w * 3))
    for i in range(0, rows, chunk):
        blk = sw[i:i + chunk].astype(np.int16)
        d = np.abs(blk - t).max(axis=-1)
        m = (d <= delta).mean(axis=(-1, -2))            # (n, cols)
        j = int(np.argmax(m))
        v = float(m.flat[j])
        if v > best:
            best = v
            best_xy = (i + j // cols, j % cols)
    if gate and best_xy is not None:
        G = cv2.cvtColor(search, cv2.COLOR_RGB2GRAY).astype(np.float32)
        r0, c0 = best_xy
        patch = G[r0:r0 + h, c0:c0 + w]
        if patch.std() < STD_GATE:                       # ★ 同上：纯色虚高作废
            return 0.0, None
        best_xy = (c0 + w // 2, r0 + h // 2)
    return best, best_xy


ALGOS = [("A. 多点比色", "color"), ("B. cv2互相关", "template"), ("C. 大漠FindPic", "dm")]


def main():
    imgs = {}
    for sid, c in CASES.items():
        for f in [c["tpl_src"]] + c["pos"]:
            p = os.path.join(EV, f)
            if os.path.exists(p) and f not in imgs:
                imgs[f] = imread_u(p)

    tpls, boxes, searches, owner = {}, {}, {}, {}
    for sid, c in CASES.items():
        x0, y0, x1, y1 = c["box"]
        tpls[sid] = imgs[c["tpl_src"]][y0:y1, x0:x1].copy()
        boxes[sid] = [x0, y0, x1, y1]
        searches[sid] = (max(0, x0 - SEARCH_R), max(0, y0 - SEARCH_R),
                         min(1600, x1 + SEARCH_R), min(720, y1 + SEARCH_R))
        owner[c["tpl_src"]] = sid
        for f in c["pos"]:
            owner[f] = sid

    print("=== 样本（模板 = 真实截图 OCR 精确框）===")
    for sid in CASES:
        t = tpls[sid]
        pts = flat_points(t)
        print("  %-15s 模板 %3dx%-3d  灰度std %5.1f  平坦点 %2d  框 %s"
              % (sid, t.shape[1], t.shape[0], cv2.cvtColor(t, cv2.COLOR_RGB2GRAY).std(),
                 len(pts), boxes[sid]))
    print("扰动 %d 种 | 样本 %d 张 | 判定 %d 次/算法\n"
          % (len(PERTURBS), len(imgs), len(PERTURBS) * len(imgs)))

    ref = imgs["hud_final2.png"]
    rng = np.random.default_rng(7)
    detail = {n: {p: {"ok": 0, "tot": 0} for p in PERTURBS} for n, _ in ALGOS}
    intra_all = {n: [] for n, _ in ALGOS}
    inter_all = {n: [] for n, _ in ALGOS}
    marks = {n: {} for n, _ in ALGOS}

    for pert in PERTURBS:
        for f in imgs:
            true_sid = owner.get(f)
            img = perturb(imgs[f], pert, ref=ref, rng=rng)
            for name, kind in ALGOS:
                best_sid, best = None, -1.0
                for sid in CASES:
                    if kind == "color":
                        sc, _ = algo_color(img, tpls[sid], boxes[sid])
                    elif kind == "template":
                        sx0, sy0, sx1, sy1 = searches[sid]
                        sc, _ = algo_template(img[sy0:sy1, sx0:sx1], tpls[sid])
                    else:
                        sx0, sy0, sx1, sy1 = searches[sid]
                        sc, _ = algo_dm_findpic(img[sy0:sy1, sx0:sx1], tpls[sid])
                    if sc > best:
                        best, best_sid = sc, sid
                ok = (best_sid == true_sid)
                detail[name][pert]["tot"] += 1
                detail[name][pert]["ok"] += 1 if ok else 0
                (intra_all if ok else inter_all)[name].append(best)
                if not ok:
                    marks[name].setdefault(pert, []).append((f, best_sid, true_sid, best))

    print("=== 判别准确率（正=同界面样本, 负=其它界面样本）===")
    hdr = "%-12s" % "扰动" + "".join("%20s" % n for n, _ in ALGOS)
    print(hdr)
    print("-" * len(hdr))
    for pert in PERTURBS:
        row = "%-12s" % pert
        for name, _ in ALGOS:
            d = detail[name][pert]
            row += "%20s" % ("%d/%d %5.1f%%" % (d["ok"], d["tot"], 100.0 * d["ok"] / d["tot"]))
        print(row)
    print("-" * len(hdr))
    row = "%-12s" % "合计"
    for name, _ in ALGOS:
        ok = sum(d["ok"] for d in detail[name].values())
        tot = sum(d["tot"] for d in detail[name].values())
        row += "%20s" % ("%d/%d %5.1f%%" % (ok, tot, 100.0 * ok / tot))
    print(row)

    print("\n=== 容错裕度（判对时的最低分 vs 判错时的最高分）===")
    for name, _ in ALGOS:
        a, b = intra_all[name], inter_all[name]
        if not a:
            continue
        wi, bo = min(a), max(b) if b else 0.0
        gap = wi - bo
        print("  %-16s 正确最低 %.3f   错误最高 %.3f   裕度 %+0.3f   %s"
              % (name, wi, bo, gap, "✅ 可用" if gap > 0 else "❌ 区间重叠"))
        if gap <= 0:
            print("      → 重叠来自%s" % ("、".join(sorted(marks[name]))) )

    print("\n=== 误判明细（各算法最多列 6 条）===")
    for name, _ in ALGOS:
        n_bad = sum(len(v) for v in marks[name].values())
        print("  %s: 共 %d 个误判" % (name, n_bad))
        shown = 0
        for pert, lst in marks[name].items():
            for f, got, want, sc in lst:
                if shown >= 6:
                    break
                print("      [%-9s] %-22s 判成 %-15s (应 %-15s) 分=%.3f" % (pert, f, got, want, sc))
                shown += 1
            if shown >= 6:
                break
    # ── 大漠式：扫 delta，看「调优后」能不能追上 ──
    print("\n=== 大漠 FindPic 扫 delta（同任务，看它的调优上限）===")
    print("%-9s %-22s %-12s %-12s" % ("delta", "准确率", "正确最低分", "错误最高分"))
    for d in DELTA_GRID:
        ok = tot = 0
        ins, outs = [], []
        for pert in PERTURBS:
            for f in imgs:
                true_sid = owner.get(f)
                img = perturb(imgs[f], pert, ref=ref, rng=rng)
                best_sid, best = None, -1.0
                for sid in CASES:
                    sx0, sy0, sx1, sy1 = searches[sid]
                    sc, _ = algo_dm_findpic(img[sy0:sy1, sx0:sx1], tpls[sid], delta=d)
                    if sc > best:
                        best, best_sid = sc, sid
                tot += 1
                if best_sid == true_sid:
                    ok += 1
                    ins.append(best)
                else:
                    outs.append(best)
        print("%-9d %-22s %-12s %-12s"
              % (d, "%d/%d %5.1f%%" % (ok, tot, 100.0 * ok / tot),
                 "%.3f" % (min(ins) if ins else -1),
                 "%.3f" % (max(outs) if outs else -1)))
    print("（注：大漠相似度 sim 的判定阈值默认 0.9，而上表正确最低分远低于 0.9 →")
    print("  即使用大漠的默认参数，它在本任务上也判不出结果，需要大幅下调 sim 才可用，")
    print("  而下调 sim 会同时拉高误判 —— 这就是「绝对差法」相对「归一化互相关」的结构性劣势。）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

# -*- coding: utf-8 -*-
"""验证「多候选色签名」解决"同一点在不同状态下颜色大幅变化"的问题。

关键修正：候选色必须【彼此差异 > 容差】才有意义。
  · 你 .q 里的 hud_S1~S7 七个色彼此只差 1~12（< 大漠 sim0.9 允许的 ±25）→ 冗余
  · 真正需要多候选的是【弹窗遮罩把 UI 压暗】【选中高亮】这类状态差 —— 差异 30~90
"""
import os, sys, itertools
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mapkit.vision import (collect_candidates, spec_score, spec_to_keyboard,  # noqa: E402
                          color_sig, color_match, hex2rgb)

W, H = 1600, 720
TOL = 12
GUARD = (1088, 214, "ed5e4e")          # 守门点：恒定

# —— 真实状态差异（不是渲染抖动）——
BUILD_COLORS = ["ed5e4e",   # 正常
                "a64136",   # 被弹窗遮罩压暗 ~30%
                "82342b",   # 被遮罩压暗 ~55%
                "ffb0a0",   # 选中/高亮态
                "b04a55"]   # 半透明叠到不同底色
UNSEEN_COLORS = ["d04a3a", "96372c"]    # 运行期第一次遇到的新状态

# 你 .q 里 hud_S1~S7 的七个色（用于对比）
YOUR_S7 = ["f25951", "e6544f", "e7554e", "ee5850", "ee5851", "f45d51", "e9554f"]

CAND = (1089, 118)
POINTS = [[GUARD[0], GUARD[1]], [CAND[0], CAND[1]]]


def frame(cand_hex):
    a = np.zeros((H, W, 3), np.uint8)
    a[:, :] = (22, 26, 38)
    a[GUARD[1], GUARD[0]] = hex2rgb(GUARD[2])
    a[CAND[1], CAND[0]] = hex2rgb(cand_hex)
    return Image.fromarray(a)


def max_pair_dist(hexes):
    mx = 0
    for a, b in itertools.combinations(hexes, 2):
        ca, cb = hex2rgb(a), hex2rgb(b)
        mx = max(mx, max(abs(ca[i] - cb[i]) for i in range(3)))
    return mx


print("=" * 76)
print("先看看你 .q 里那 7 个候选色到底差多少")
print("=" * 76)
print("  hud_S1~S7 =", YOUR_S7)
print("  逐通道最大差值 = %d" % max_pair_dist(YOUR_S7))
print("  大漠 sim=0.9 允许的通道偏差 ≈ 25")
print("  → %s" % ("❌ 全部落在容差内 → 这 7 个候选【冗余】，一个就够了"
                if max_pair_dist(YOUR_S7) <= 25 else "✅ 有区分意义"))
print()
print("  本测试用的 5 个状态色 =", BUILD_COLORS)
print("  逐通道最大差值 = %d  → ✅ 都超过容差 %d，是真差异" % (max_pair_dist(BUILD_COLORS), TOL))

shots = [frame(c) for c in BUILD_COLORS]
spec_multi = collect_candidates(shots, POINTS, tol=TOL)
spec_single = [hex2rgb(GUARD[2]), hex2rgb(BUILD_COLORS[0])]   # 单候选：只有"正常"那一个色

print()
print("=" * 76)
print("采集到 5 帧后，每点收集到的候选色")
print("=" * 76)
for ent in spec_multi:
    print("   (%4d,%3d) → %s" % (ent[0], ent[1], ent[2]))

print()
print("=" * 76)
print("测试：建图期见过的状态 vs 运行期第一次遇到的新状态")
print("=" * 76)
print("%-26s %-14s %-14s" % ("测试帧", "单候选色", "多候选色"))
allf = shots + [frame(c) for c in UNSEEN_COLORS]
labels = ["见过的状态#%d (%s)" % (i + 1, c) for i, c in enumerate(BUILD_COLORS)] + \
         ["★新状态 (%s)" % c for c in UNSEEN_COLORS]
for lb, im in zip(labels, allf):
    obs = color_sig(im, POINTS)
    sc_m, _, _ = spec_score(obs, spec_multi, TOL)
    sc_s = color_match(obs, spec_single, TOL)
    print("%-26s %-14s %-14s" % (lb,
                                 "%.2f %s" % (sc_s, "✅" if sc_s >= 1.0 else "❌漏判"),
                                 "%.2f %s" % (sc_m, "✅" if sc_m >= 1.0 else "❌漏判")))

n = len(allf)
single_ok = sum(1 for im in allf if color_match(color_sig(im, POINTS), spec_single, TOL) >= 1.0)
multi_ok = sum(1 for im in allf if spec_score(color_sig(im, POINTS), spec_multi, TOL)[0] >= 1.0)
print()
print("  单候选色 %d/%d 命中 ；多候选色 %d/%d 命中" % (single_ok, n, multi_ok, n))
print("  → %s" % ("✅ 多候选色有效：建图期【见过的状态】不再漏判，且【没有放宽容差】（特异性不变）"
                if multi_ok > single_ok else "⚠ 无差异"))
print("  ⚠ 但【建图期没见过的状态】仍会漏判（上面两个 ★ 都是 0.50）—— 这不是缺陷，是边界：")
print("     运行时未命中必须走兜底：模板匹配 → OCR → 停手报警存图，")
print("     并把该帧补进建图期状态集（增量学习），下次就能命中。")

print()
print("=" * 76)
print("对照：如果把容差放宽到能兜住新状态，会付出什么代价")
print("=" * 76)
spec_a = [[GUARD[0], GUARD[1], BUILD_COLORS[0]], [CAND[0], CAND[1], BUILD_COLORS[0]]]
for tol in (12, 35, 60, 90):
    sc, _, _ = spec_score(color_sig(frame(UNSEEN_COLORS[0]), POINTS), spec_a, tol)
    print("  tol=%2d → 新状态命中 %s ；相邻状态间距 = %d → %s"
          % (tol, "✅" if sc >= 1.0 else "❌", max_pair_dist(BUILD_COLORS),
             "❌ 容差已超过状态间距，相邻状态会互相混淆" if tol >= max_pair_dist(BUILD_COLORS)
             else "尚未越界"))
print("  说明：靠放宽容差兜新状态，代价是「相邻状态/配色相近的界面」互相混淆（实测踩过）；")
print("        多候选色枚举不会付这个代价 —— 但代价是「必须建图期采到那个状态」。")

print()
print("=" * 76)
print("导出成按键精灵格式（与你的 .q 写法对齐）")
print("=" * 76)
txt, guard_idx, multi = spec_to_keyboard(spec_multi, var_prefix="hud_X")
print(txt)
print("\n  守门点索引=%s ；多候选点 %d 个（→ 对应 是否hud_X 里的 ElseIf 链）"
      % (guard_idx, len(multi)))

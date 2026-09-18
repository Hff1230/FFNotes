#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全量回归：用真实 screens.json 跑 mapkit.recognize 识别器，出混淆矩阵与耗时。

验证的是【运行时真正会跑的那条路径】：比色预筛 → OCR 关键词决策（use_det=False 只读 ROI）。
不是另写一套评测代码 —— 评测与运行共用 mapkit/recognize.py，避免"评测通过但实跑不通"。

用法: python regress.py [--all]
  --all  除建图样本外，对 evidence 里全部 1600x720 截图也跑一遍，看预测分布
"""
import argparse
import json
import os
import sys
import time
from collections import Counter, defaultdict

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from mapkit.recognize import Recognizer  # noqa: E402

EV = os.path.join(ROOT, "evidence")


def imread_u(p):
    with open(p, "rb") as f:
        return cv2.cvtColor(cv2.imdecode(np.frombuffer(f.read(), np.uint8),
                                         cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--map", default=os.path.join(ROOT, "map", "screens.json"))
    ap.add_argument("--gt", default=os.path.join(ROOT, "map", "ground_truth.json"))
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--verbose", action="store_true")
    a = ap.parse_args()

    with open(a.gt, encoding="utf-8") as f:
        gt = json.load(f)
    file2scene = {}
    for sid, files in gt["scenes"].items():
        for fn in files:
            file2scene[fn] = sid

    rec = Recognizer(a.map)
    if rec.ocr is None:
        print("!! OCR 不可用，无法评测 OCR 关键词层")
        return 1
    print("=== 图谱 ===")
    print("  界面 %d 个，采样点 %d 个，容差 tol=%d，OCR 置信阈值 %.2f"
          % (len(rec.screens), len(rec.points), rec.tol, rec.min_conf))
    print("  界面: %s\n" % ", ".join(rec.screens))

    # ── 混淆矩阵 ──
    scenes = sorted(rec.screens)
    conf = defaultdict(Counter)
    rows, costs, fails = [], [], []
    for fn, truth in sorted(file2scene.items()):
        p = os.path.join(EV, fn)
        if not os.path.exists(p):
            continue
        img = imread_u(p)
        if (img.shape[1], img.shape[0]) != tuple(rec.screen_size):
            continue
        t0 = time.time()
        r = rec.identify(img, verbose=a.verbose)
        dt = (time.time() - t0) * 1000
        pred = r["screen"] or "(未识别)"
        conf[truth][pred] += 1
        costs.append(dt)
        rows.append((fn, truth, pred, r["method"], r["confidence"], r["detail"], dt))
        if pred != truth:
            fails.append(rows[-1])

    n_ok = sum(conf[s][s] for s in scenes)
    n_tot = sum(sum(c.values()) for c in conf.values())
    print("=== 建图样本回归（%d 张）===" % n_tot)
    w = max(len(x) for x in scenes) + 1
    hdr = "%-*s" % (w, "真实\\预测") + "".join("%*s" % (w, s[:w - 1]) for s in scenes) + "%*s" % (w, "未识别")
    print(hdr)
    print("-" * len(hdr))
    for truth in scenes:
        line = "%-*s" % (w, truth)
        for pred in scenes:
            v = conf[truth][pred]
            line += "%*s" % (w, v if v else ".")
        nu = conf[truth]["(未识别)"]
        line += "%*s" % (w, nu if nu else ".")
        mark = "" if conf[truth][truth] == sum(conf[truth].values()) else "  ← 有误判"
        print(line + mark)
    print("-" * len(hdr))
    print("准确率: %d/%d = %.1f%%   平均耗时 %.0fms  最大 %.0fms"
          % (n_ok, n_tot, 100.0 * n_ok / max(1, n_tot),
             sum(costs) / max(1, len(costs)), max(costs) if costs else 0))

    if fails:
        print("\n=== 失败明细 ===")
        for fn, truth, pred, method, cf, det, dt in fails:
            print("  %-24s 真实 %-15s 判成 %-15s [%s %.2f] %s"
                  % (fn, truth, pred, method, cf, det[:60]))

    print("\n=== 命中方式分布（这一层是运行时的实际路径）===")
    md = Counter(r[3] for r in rows)
    for k, v in md.most_common():
        print("  %-16s %d" % (k, v))

    if not a.all:
        return 0

    # ── 全量扫描（无标签图看预测分布）──
    print("\n=== 全量扫描（含无标签图）===")
    pngs = sorted(f for f in os.listdir(EV) if f.lower().endswith(".png"))
    dist = Counter()
    unknown = []
    t_all = time.time()
    n = 0
    for f in pngs:
        img = imread_u(os.path.join(EV, f))
        if img is None or (img.shape[1], img.shape[0]) != tuple(rec.screen_size):
            continue
        r = rec.identify(img)
        n += 1
        dist[r["screen"] or "(未识别)"] += 1
        if r["screen"] is None:
            unknown.append((f, r["detail"][:70]))
    print("  共 %d 张，耗时 %.0fs" % (n, time.time() - t_all))
    for k, v in dist.most_common():
        print("  %-20s %3d  (%.0f%%)" % (k, v, 100.0 * v / max(1, n)))
    if unknown:
        print("\n  未识别样例（最多 15 条）:")
        for f, d in unknown[:15]:
            print("    %-26s %s" % (f, d))
    return 0


if __name__ == "__main__":
    sys.exit(main())

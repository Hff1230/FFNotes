#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证 L3 全屏降级 + 自校准：人为注入 ROI 漂移（模拟 UI 改版/换分辨率），
看「固定 ROI 快路径」失败后能否被「全屏 OCR 降级」救回，并把新坐标写回图谱。

用法: python test_selfcalib.py
"""
import json
import os
import sys
import time

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from mapkit.recognize import Recognizer  # noqa: E402

EV = os.path.join(ROOT, "evidence")
MAP = os.path.join(ROOT, "map", "screens.json")
TMP = os.path.join(ROOT, "map", "_calib_test.json")

CASES = [("S17.png", "panel_quest"), ("hud_final2.png", "hud"),
         ("S12_activity.png", "panel_activity"), ("S7_bag.png", "panel_bag"),
         ("cancel_1s.png", "dialog_exit"), ("S9_team.png", "panel_team")]


def imread_u(p):
    with open(p, "rb") as f:
        return cv2.cvtColor(cv2.imdecode(np.frombuffer(f.read(), np.uint8),
                                         cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)


def shift_rois(rec, dx, dy):
    for s in rec.screens.values():
        for k in s.get("keys", []):
            x0, y0, x1, y1 = k["roi"]
            k["roi"] = [x0 + dx, y0 + dy, x1 + dx, y1 + dy]


def main():
    print("=== ① 基准（无漂移）===")
    rec0 = Recognizer(MAP)
    for f, truth in CASES:
        img = imread_u(os.path.join(EV, f))
        t0 = time.time()
        r = rec0.identify(img)
        dt = (time.time() - t0) * 1000
        ok = "✅" if r["screen"] == truth else "❌"
        print("  %-20s %s %-16s [%-9s %.0fms]" % (f, ok, r["screen"], r["method"], dt))

    print("\n=== ② 注入 ROI 漂移 → 固定路径 vs 降级路径 ===")
    print("%-10s %-30s %-30s" % ("漂移", "固定ROI(use_full_ocr=False)", "含降级(use_full_ocr=True)"))
    for dx, dy in [(4, 3), (8, 6), (14, 10), (24, 18), (40, 30)]:
        rec = Recognizer(MAP)
        shift_rois(rec, dx, dy)
        n_fast = n_full = 0
        t_fast = t_full = 0.0
        for f, truth in CASES:
            img = imread_u(os.path.join(EV, f))
            t0 = time.time()
            r1 = rec.identify(img, use_full_ocr=False)
            t_fast += (time.time() - t0) * 1000
            t0 = time.time()
            r2 = rec.identify(img, use_full_ocr=True)
            t_full += (time.time() - t0) * 1000
            n_fast += 1 if r1["screen"] == truth else 0
            n_full += 1 if r2["screen"] == truth else 0
        n = len(CASES)
        print("%-10s %-30s %-30s" % ("(%+d,%+d)" % (dx, dy),
                                     "%d/%d   %4.0fms/张" % (n_fast, n, t_fast / n),
                                     "%d/%d   %4.0fms/张" % (n_full, n, t_full / n)))

    print("\n=== ③ 自校准：漂移 (14,10) 后回写图谱 ===")
    with open(MAP, encoding="utf-8") as f:
        orig = json.load(f)["screens"]
    rec = Recognizer(MAP)
    shift_rois(rec, 14, 10)
    for f, truth in CASES:
        rec.identify(imread_u(os.path.join(EV, f)), use_full_ocr=True)
    n_changed = rec.save_calibration(out_path=TMP)
    print("  自校准改写 %d 条 ROI（drift>=6px 才写）" % n_changed)
    with open(TMP, encoding="utf-8") as f:
        new = json.load(f)["screens"]
    print("  %-22s %-26s %-26s %-26s" % ("界面/关键词", "建图原始ROI", "注入漂移后ROI", "自校准回写ROI"))
    shown = 0
    for sid in orig:
        for k in orig[sid].get("keys", []):
            cal = None
            for k2 in new[sid].get("keys", []):
                if k2["key"] == k["key"] and "calibrated_from" in k2:
                    cal = (k2["calibrated_from"], k2["roi"])
                    break
            if cal is None:
                continue
            tag = "%s/%s" % (sid, k["key"][:8])
            print("  %-22s %-26s %-26s %-26s" % (tag, k["roi"], cal[0], cal[1]))
            shown += 1
            if shown >= 8:
                break
        if shown >= 8:
            break

    print("\n=== ④ 用自校准后的图谱重跑（应回到快路径）===")
    if os.path.exists(TMP):
        rec2 = Recognizer(TMP)
        for f, truth in CASES:
            img = imread_u(os.path.join(EV, f))
            t0 = time.time()
            r = rec2.identify(img, use_full_ocr=False)
            dt = (time.time() - t0) * 1000
            ok = "✅" if r["screen"] == truth else "❌"
            print("  %-20s %s %-16s [%-9s %.0fms]" % (f, ok, r["screen"], r["method"], dt))
        os.remove(TMP)
        print("  （已清理临时图谱 %s）" % os.path.basename(TMP))
    return 0


if __name__ == "__main__":
    sys.exit(main())

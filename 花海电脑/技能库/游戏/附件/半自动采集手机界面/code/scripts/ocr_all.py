#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""对 evidence/ 下所有全屏截图做本地 OCR，产出 <图>.ocr.json 索引（零 token）。

用途：为「程序化界面判别」提供 ground truth —— 每张图的文字 + 精确坐标，
后续建图脚本据此决定「用哪个关键词/哪块区域判别哪个界面」，不靠 AI 读图。

用法:
  python ocr_all.py [--limit N] [--force] [--dir <目录>]
说明:
  · 默认跳过已有 .ocr.json（--force 覆盖重做）
  · 只处理 1600x720 全屏图（裁剪图/放大图对建图无用）
  · 结果 = ocr_panel.py 的同一结构，便于复用
"""
import argparse
import json
import os
import sys
import time

import cv2
import numpy as np

TARGET = (1600, 720)


def imread_u(p):
    with open(p, "rb") as f:
        return cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=r"E:/AiDemos/QnyhAuto/evidence")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--conf", type=float, default=0.5)
    a = ap.parse_args()

    d = os.path.abspath(a.dir)
    pngs = sorted(f for f in os.listdir(d) if f.lower().endswith(".png"))
    todo = []
    for f in pngs:
        p = os.path.join(d, f)
        img = imread_u(p)
        if img is None:
            continue
        h, w = img.shape[:2]
        if (w, h) != TARGET:
            continue                      # 裁剪/放大图，不参与建图
        out = p + ".ocr.json"
        if os.path.exists(out) and not a.force:
            continue
        todo.append(f)
    if a.limit:
        todo = todo[:a.limit]

    print("待 OCR: %d 张全屏图 (目录 %s)" % (len(todo), d), flush=True)
    if not todo:
        return 0

    from rapidocr_onnxruntime import RapidOCR
    eng = RapidOCR()

    t_all = time.time()
    done = 0
    for f in todo:
        p = os.path.join(d, f)
        img = imread_u(p)
        t0 = time.time()
        res, _ = eng(img)
        items = []
        if res:
            for box, txt, conf in res:
                if float(conf) < a.conf:
                    continue
                xs = [q[0] for q in box]
                ys = [q[1] for q in box]
                items.append({
                    "text": txt,
                    "conf": round(float(conf), 3),
                    "x0": int(min(xs)), "x1": int(max(xs)),
                    "y0": int(min(ys)), "y1": int(max(ys)),
                    "cx": int(sum(xs) / len(xs)), "cy": int(sum(ys) / len(ys)),
                })
        items.sort(key=lambda z: (z["cy"] // 24, z["cx"]))
        with open(p + ".ocr.json", "w", encoding="utf-8") as fh:
            json.dump({"src": p.replace("\\", "/"), "ymin": 0, "ymax": TARGET[1],
                       "items": items}, fh, ensure_ascii=False, indent=1)
        done += 1
        el = time.time() - t_all
        eta = el / done * (len(todo) - done)
        print("[%3d/%3d] %-26s %4d 条  %5.0fms  已用 %4.0fs  ETA %4.0fs"
              % (done, len(todo), f[:26], len(items), (time.time() - t0) * 1000, el, eta),
              flush=True)

    print("\n完成 %d 张，总耗时 %.0fs" % (done, time.time() - t_all), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

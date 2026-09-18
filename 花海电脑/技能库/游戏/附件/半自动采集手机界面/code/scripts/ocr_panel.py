#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""面板文字/元素程序化提取（本地 OCR，零 token，为后续图色识别准备数据）。

用法:
  python ocr_panel.py <图> [y_min] [y_max] [conf阈值=0.5]
说明:
  · 用 RapidOCR 做全图检测+识别，输出每条文字的文本/置信度/原图坐标框/中心
  · 结果同时存成 <图>.ocr.json，便于后续程序化引用（不做 AI 读图）
  · 只读取图，不触碰设备
"""
import json, os, sys, time
import numpy as np
import cv2


def imread_u(p):
    with open(p, "rb") as f:
        return cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    src = sys.argv[1]
    ymin = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    ymax = int(sys.argv[3]) if len(sys.argv) > 3 else 10 ** 9
    conf_thr = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5

    img = imread_u(src)
    if img is None:
        print("读图失败:", src)
        return 1
    roi = img[ymin:ymax]
    from rapidocr_onnxruntime import RapidOCR
    eng = RapidOCR()
    t0 = time.time()
    res, _ = eng(roi)
    dt = (time.time() - t0) * 1000
    items = []
    if res:
        for box, txt, conf in res:
            if float(conf) < conf_thr:
                continue
            xs = [p[0] for p in box]
            ys = [p[1] + ymin for p in box]
            items.append({
                "text": txt,
                "conf": round(float(conf), 3),
                "x0": int(min(xs)), "x1": int(max(xs)),
                "y0": int(min(ys)), "y1": int(max(ys)),
                "cx": int(sum(xs) / len(xs)), "cy": int(sum(ys) / len(ys)),
            })
    items.sort(key=lambda d: (d["cy"] // 20, d["cx"]))
    print("图 %s  区域 y %d-%d  耗时 %.0fms  共 %d 条 (conf>=%.2f)"
          % (os.path.basename(src), ymin, ymax, dt, len(items), conf_thr))
    print("-" * 78)
    for it in items:
        print("  x %4d-%4d  y %4d-%4d  中心(%4d,%4d)  conf %.3f  %s"
              % (it["x0"], it["x1"], it["y0"], it["y1"], it["cx"], it["cy"], it["conf"], it["text"]))
    out = src + ".ocr.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"src": src, "ymin": ymin, "ymax": ymax, "items": items}, f,
                  ensure_ascii=False, indent=1)
    print("-" * 78)
    print("已存 %s" % out)
    return 0


if __name__ == "__main__":
    sys.exit(main())

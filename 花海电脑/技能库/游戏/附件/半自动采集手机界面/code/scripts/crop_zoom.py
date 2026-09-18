#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""精确量坐标工具 —— 全分辨率裁剪放大，供视觉精确读数（替代目测缩略图）。

用法:
  python crop_zoom.py <图> <x0> <y0> <x1> <y1> [放大倍数=3] [输出名]

输出裁剪放大图 + 打印坐标换算公式。注意：cv2.imread 读不了中文路径，
故一律用 np.fromfile + cv2.imdecode。
"""
import os, sys
import numpy as np
import cv2


def imread_u(path):
    return cv2.imdecode(np.frombuffer(open(path, "rb").read(), np.uint8), cv2.IMREAD_COLOR)


def main():
    if len(sys.argv) < 6:
        print(__doc__)
        return 1
    src = sys.argv[1]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
    scale = int(sys.argv[6]) if len(sys.argv) > 6 else 3
    out = sys.argv[7] if len(sys.argv) > 7 else "crop_zoom.png"
    a = imread_u(src)
    h, w = a.shape[:2]
    x0, x1 = max(0, min(x0, w - 1)), max(1, min(x1, w))
    y0, y1 = max(0, min(y0, h - 1)), max(1, min(y1, h))
    c = a[y0:y1, x0:x1]
    big = cv2.resize(c, (c.shape[1] * scale, c.shape[0] * scale), interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(out, big)
    print("原图: %s  %dx%d" % (src, w, h))
    print("裁剪区域: x %d-%d, y %d-%d  (尺寸 %dx%d)" % (x0, x1, y0, y1, x1 - x0, y1 - y0))
    print("放大 %dx → %s  (%dx%d)" % (scale, out, big.shape[1], big.shape[0]))
    print("换算: 原x = %d + 放大x/%d ; 原y = %d + 放大y/%d" % (x0, scale, y0, scale))
    print("反向: 放大x = (原x - %d)*%d ; 放大y = (原y - %d)*%d" % (x0, scale, y0, scale))
    return 0


if __name__ == "__main__":
    sys.exit(main())

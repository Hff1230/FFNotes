#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""限定区域比对：只比较指定矩形区域的像素差异，用于验证"局部细微变化"。
用法: python diff_region.py <图A> <图B> [x0 y0 x1 y1]
不带区域则比全图。输出：区域尺寸、变化>8/>40 的像素数与占比、最大差值、是否变化。
"""
import sys
import numpy as np
import cv2


def imread_u(p):
    with open(p, "rb") as f:
        return cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    a, b = imread_u(sys.argv[1]), imread_u(sys.argv[2])
    h, w = a.shape[:2]
    if len(sys.argv) >= 7:
        x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
    else:
        x0, y0, x1, y1 = 0, 0, w, h
    x0, x1 = max(0, min(x0, w - 1)), max(1, min(x1, w))
    y0, y1 = max(0, min(y0, h - 1)), max(1, min(y1, h))
    ra, rb = a[y0:y1, x0:x1], b[y0:y1, x0:x1]
    d = np.abs(ra.astype(np.int16) - rb.astype(np.int16)).max(axis=2)
    n = d.size
    print("区域 x %d-%d, y %d-%d  (%dx%d = %d px)" % (x0, x1, y0, y1, x1 - x0, y1 - y0, n))
    print("  变化>8  : %7d px  %.2f%%" % (int((d > 8).sum()), float((d > 8).mean() * 100)))
    print("  变化>40 : %7d px  %.2f%%" % (int((d > 40).sum()), float((d > 40).mean() * 100)))
    print("  变化>100: %7d px  %.2f%%" % (int((d > 100).sum()), float((d > 100).mean() * 100)))
    print("  最大差值: %d" % int(d.max()))
    pct40 = float((d > 40).mean() * 100)
    print("  判定: %s" % ("★ 该区域确有变化" if pct40 > 1.0 else "无显著变化"))
    return 0


if __name__ == "__main__":
    sys.exit(main())

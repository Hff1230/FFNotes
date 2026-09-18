#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给截图叠加坐标网格标尺，便于一次性精确读出多个元素位置。
用法: python grid_overlay.py <图> [步长=100] [输出]
生成的新图上每 步长 px 画一条线并标注原图坐标；细线=步长/2。
"""
import sys
import numpy as np
import cv2


def imread_u(p):
    with open(p, "rb") as f:
        return cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)


def main():
    src = sys.argv[1]
    step = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    out = sys.argv[3] if len(sys.argv) > 3 else "grid.png"
    a = imread_u(src).copy()
    h, w = a.shape[:2]
    half = max(1, step // 2)
    # 细网格
    for x in range(0, w, half):
        if x % step:
            cv2.line(a, (x, 0), (x, h), (90, 90, 90), 1)
    for y in range(0, h, half):
        if y % step:
            cv2.line(a, (0, y), (w, y), (90, 90, 90), 1)
    # 主网格
    for x in range(0, w + 1, step):
        cv2.line(a, (x, 0), (x, h), (0, 255, 255), 1)
        cv2.putText(a, str(x), (x + 3, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
        cv2.putText(a, str(x), (x + 3, h - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
    for y in range(0, h + 1, step):
        cv2.line(a, (0, y), (w, y), (0, 255, 255), 1)
        cv2.putText(a, str(y), (4, y + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
        cv2.putText(a, str(y), (w - 60, y + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
    cv2.imwrite(out, a)
    print("已生成 %s  原图 %dx%d  主网格 %dpx / 细网格 %dpx" % (out, w, h, step, half))
    print("读数方法：黄线标注的 x / y 值即为原图坐标")
    return 0


if __name__ == "__main__":
    sys.exit(main())

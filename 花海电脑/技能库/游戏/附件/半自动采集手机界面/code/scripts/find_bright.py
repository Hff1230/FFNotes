# -*- coding: utf-8 -*-
"""程序化定位亮色元素（如 ✕ 关闭按钮）：在指定区域内找近白色连通块并输出边界。
用法: python find_bright.py <图> <y0> <y1> [亮度阈值] [最小面积]
"""
import sys
import numpy as np
import cv2


def imread_u(p):
    return cv2.imdecode(np.frombuffer(open(p, "rb").read(), np.uint8), cv2.IMREAD_COLOR)


def main():
    src = sys.argv[1]
    y0, y1 = int(sys.argv[2]), int(sys.argv[3])
    thr = int(sys.argv[4]) if len(sys.argv) > 4 else 190
    minarea = int(sys.argv[5]) if len(sys.argv) > 5 else 20
    a = imread_u(src)
    roi = a[y0:y1]
    m = (roi.min(axis=2) > thr).astype(np.uint8)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m, 8)
    print("图: %s  区域 y %d-%d  近白阈值 min(R,G,B)>%d  最小面积 %d" % (src, y0, y1, thr, minarea))
    print("找到 %d 个连通块：" % (n - 1))
    rows = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < minarea:
            continue
        cx, cy = cent[i]
        rows.append((int(x), int(y + y0), int(w), int(h), int(area),
                     int(round(cx)), int(round(cy + y0))))
    rows.sort(key=lambda r: -r[4])
    for x, y, w, h, area, cx, cy in rows[:25]:
        print("  边界 x %4d-%4d  y %4d-%4d  (%3dx%3d)  面积%6d  中心 (%4d,%4d)"
              % (x, x + w, y, y + h, w, h, area, cx, cy))
    if not rows:
        print("   （无）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

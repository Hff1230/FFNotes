#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""图像比对工具：把基准图与若干候选图逐像素比对，输出"变化>40 的像素占比"。
用法: python cmp.py <基准图> <候选图1> [候选图2 ...]
说明: 用 np.fromfile + cv2.imdecode，避免 cv2.imread 读不了中文路径的问题。
"""
import os, sys
import numpy as np
import cv2


def imread_u(p):
    with open(p, "rb") as f:
        return cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    base_p = sys.argv[1]
    base = imread_u(base_p)
    print("基准: %s  %s" % (os.path.basename(base_p), base.shape))
    for p in sys.argv[2:]:
        cur = imread_u(p)
        if cur.shape != base.shape:
            print("  %-34s 尺寸不同 %s" % (os.path.basename(p), cur.shape))
            continue
        d = np.abs(base.astype(np.int16) - cur.astype(np.int16)).max(axis=2)
        pct = float(np.mean(d > 40) * 100)
        flag = "★ 同一屏" if pct < 1 else ("有变化" if pct < 20 else "★ 不同屏")
        print("  %-34s 变化>40 %6.2f%%   %s" % (os.path.basename(p), pct, flag))
    return 0


if __name__ == "__main__":
    sys.exit(main())

# -*- coding: utf-8 -*-
"""扫描 evidence/ 里的截图素材，按尺寸归类，报告哪些能用于建图。

判据：只有「全屏 1600x720」的原生截图才能当建图素材 —— 裁剪图/放大图
（crop_*、*_3x、*_4x、ocr_*、scan2_* 等）尺寸不对，不能进图谱。
"""
import os
import sys
from collections import defaultdict

from PIL import Image

EV = os.environ.get("EV", r"E:/AiDemos/QnyhAuto/evidence")
TARGET = (1600, 720)

by_size = defaultdict(list)
for f in sorted(os.listdir(EV)):
    if not f.lower().endswith(".png"):
        continue
    p = os.path.join(EV, f)
    try:
        with Image.open(p) as im:
            by_size[im.size].append(f)
    except Exception as e:  # noqa: BLE001
        by_size[("ERR", str(e)[:40])].append(f)

print("=== 尺寸分布 ===")
for sz, fs in sorted(by_size.items(), key=lambda kv: -len(kv[1])):
    mark = "  <== 可用于建图" if sz == TARGET else ""
    print(f"{str(sz):>16}  {len(fs):>4} 张{mark}")

print("\n=== 全屏 1600x720 清单 ===")
full = [f for f in sorted(by_size.get(TARGET, []))]
for f in full:
    has_ocr = os.path.exists(os.path.join(EV, f + ".ocr.json"))
    print(f"  {f:<28} {'[有OCR]' if has_ocr else ''}")
print(f"\n合计 {len(full)} 张全屏图")

# 带 OCR 的全屏图 = 最有价值的建图素材
print("\n=== 有本地 OCR 结果的全屏图（零 token 素材） ===")
for f in full:
    p = os.path.join(EV, f + ".ocr.json")
    if os.path.exists(p):
        print(f"  {f}  ->  {os.path.getsize(p)} B")

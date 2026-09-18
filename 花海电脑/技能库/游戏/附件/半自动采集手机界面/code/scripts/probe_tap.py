# -*- coding: utf-8 -*-
"""决定性问题：adb 注入的点击到底有没有生效？
方法：截图A → 点击 → 截图B → 逐像素比对（不依赖视觉判读）。
同时把 1600x720 原图上的候选按钮区域裁出来，供精确量坐标。
"""
import os, subprocess, sys, time
import numpy as np

ADB = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\adb-device-control\scripts\tools\adb.exe"
S = "FML4C19C17007446"
OUT = r"E:\AiDemos\QnyhAuto\evidence"
os.makedirs(OUT, exist_ok=True)


def sh(*a):
    return subprocess.run([ADB, "-s", S, "shell"] + list(a),
                          capture_output=True).stdout.decode("utf-8", "ignore").strip()


def shot(name):
    p = os.path.join(OUT, name)
    r = subprocess.run([ADB, "-s", S, "exec-out", "screencap", "-p"], capture_output=True)
    open(p, "wb").write(r.stdout)
    import cv2
    return cv2.imread(p), p


def focus():
    o = sh("dumpsys window | grep -m1 mCurrentFocus")
    return o.split("mCurrentFocus=")[-1].strip()


print("=== 0) 当前前台 ===")
print("  ", focus())

a, pa = shot("probe_A.png")
print("   截图A:", pa, a.shape)

TX, TY = 659, 378
print("\n=== 1) 点击 (%d,%d) —— 就是之前点过的『取消』位置 ===" % (TX, TY))
sh("input swipe", str(TX), str(TY), str(TX), str(TY), "90")
time.sleep(2.0)

b, pb = shot("probe_B.png")
print("   截图B:", pb)

d = np.abs(a.astype(np.int16) - b.astype(np.int16))
pct_any = float(np.mean(d.max(axis=2) > 8)) * 100
pct_big = float(np.mean(d.max(axis=2) > 40)) * 100
print("\n=== 2) A/B 差异 ===")
print("   平均差 %.3f  最大差 %d" % (d.mean(), d.max()))
print("   变化>8 的像素  %.2f%%" % pct_any)
print("   变化>40 的像素 %.2f%%   ← 界面切换通常 >5%%" % pct_big)
print("   → %s" % ("✅ 点击【生效】了（画面明显变化）" if pct_big > 1.0
                  else "❌ 画面几乎没变 → 这次点击没落到位或目标无响应"))

# 关键区域裁剪（供精确量坐标）：对话框中部
import cv2
crop = a[300:460, 480:1120]
cp = os.path.join(OUT, "probe_dialog_zoom.png")
cv2.imwrite(cp, crop)
print("\n=== 3) 已裁出对话框区域供量坐标 ===")
print("   ", cp, crop.shape, "（原图区域 x480-1120, y300-460）")
print("   提示：裁剪图内 (x,y) 对应原图 (%d+ x, 300+ y)" % 480)

print("\n=== 4) 用 shell 命令再验一次输入通路（非触摸） ===")
print("   keyevent 是否生效：", "OK" if sh("input keyevent 0") == "" else "?")
print("   当前前台:", focus())

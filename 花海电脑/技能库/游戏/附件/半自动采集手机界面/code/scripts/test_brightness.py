# -*- coding: utf-8 -*-
"""实证：手机屏幕亮度是否影响 screencap 的像素值。
做法：读原始亮度 → 截图A → 亮度设 5 → 截图B → 亮度设 255 → 截图C → 还原 → 三图两两比对。
"""
import os, subprocess, sys, time
import numpy as np

ADB = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\adb-device-control\scripts\tools\adb.exe"
S = "FML4C19C17007446"
OUT = r"E:\AiDemos\QnyhAuto\evidence"
os.makedirs(OUT, exist_ok=True)


def sh(*args):
    return subprocess.run([ADB, "-s", S, "shell"] + list(args),
                          capture_output=True).stdout.decode("utf-8", "ignore").strip()


def shot(path):
    r = subprocess.run([ADB, "-s", S, "exec-out", "screencap", "-p"], capture_output=True)
    open(path, "wb").write(r.stdout)
    return path


def load(p):
    import cv2
    return cv2.imread(p)          # BGR


print("=== 0) 记录原始设置 ===")
b0 = sh("settings", "get", "system", "screen_brightness")
m0 = sh("settings", "get", "system", "screen_brightness_mode")
print("screen_brightness = %s   screen_brightness_mode = %s (0=手动 1=自动)" % (b0, m0))

results = {}
try:
    print("\n=== 1) 亮度 = %s（原始）→ 截图A ===" % b0)
    a = load(shot(os.path.join(OUT, "bright_A_orig.png")))
    time.sleep(1.5)

    print("=== 2) 亮度 = 5（几乎最暗）→ 截图B ===")
    sh("settings", "put", "system", "screen_brightness_mode", "0")
    sh("settings", "put", "system", "screen_brightness", "5")
    time.sleep(2.5)
    print("    实测读回:", sh("settings", "get", "system", "screen_brightness"))
    b = load(shot(os.path.join(OUT, "bright_B_dark.png")))
    time.sleep(1.5)

    print("=== 3) 亮度 = 255（最亮）→ 截图C ===")
    sh("settings", "put", "system", "screen_brightness", "255")
    time.sleep(2.5)
    print("    实测读回:", sh("settings", "get", "system", "screen_brightness"))
    c = load(shot(os.path.join(OUT, "bright_C_max.png")))
finally:
    print("\n=== 4) 还原原始设置 ===")
    sh("settings", "put", "system", "screen_brightness", b0 or "128")
    sh("settings", "put", "system", "screen_brightness_mode", m0 or "1")
    print("    还原后: brightness=%s mode=%s" % (sh("settings", "get", "system", "screen_brightness"),
                                             sh("settings", "get", "system", "screen_brightness_mode")))

print("\n" + "=" * 66)
print("像素值比对（若亮度不影响截图，三张应完全一致）")
print("=" * 66)
pairs = [("A原始", a, "B最暗", b), ("A原始", a, "C最亮", c), ("B最暗", b, "C最亮", c)]
for n1, x, n2, y in pairs:
    if x.shape != y.shape:
        print("  %s vs %s: 尺寸不同 %s / %s" % (n1, n2, x.shape, y.shape))
        continue
    d = np.abs(x.astype(np.int16) - y.astype(np.int16))
    mean_d = d.mean()
    max_d = d.max()
    pct_changed = float(np.mean(d.max(axis=2) > 10)) * 100
    pct_same = float(np.mean(d.max(axis=2) == 0)) * 100
    print("  %-6s vs %-6s  平均差 %.3f  最大差 %3d  变化>10 的像素 %.4f%%  完全相同的像素 %.4f%%"
          % (n1, n2, mean_d, max_d, pct_changed, pct_same))

# 再取 12 个固定采样点，模拟"比色点"会怎么变
print("\n" + "=" * 66)
print("模拟比色：在图上取 12 个固定点，看亮度变化后颜色是否漂移")
print("=" * 66)
h, w = a.shape[:2]
np.random.seed(3)
pts = [(np.random.randint(50, w - 50), np.random.randint(50, h - 50)) for _ in range(12)]
for tol in (0, 5, 25, 35):
    hit = 0
    for (x, y) in pts:
        d = int(np.abs(b[y, x].astype(int) - c[y, x].astype(int)).max())
        if d <= tol:
            hit += 1
    print("  容差 %2d → 12 点中 %2d 点仍判为同色（%.0f%%）" % (tol, hit, hit / 12 * 100))
print("\n参考：容差 0 = 要求逐位完全相同")

# -*- coding: utf-8 -*-
"""扫描探测：找出能关掉弹窗的位置，并摸清【哪些区域点击有响应、哪些没有】。
每点一次就截图比对；一旦弹窗关闭即停止。
"""
import os, subprocess, time
import numpy as np
import cv2

ADB = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\adb-device-control\scripts\tools\adb.exe"
S = "FML4C19C17007446"
E = r"E:\AiDemos\QnyhAuto\evidence"


def sh(*a):
    return subprocess.run([ADB, "-s", S, "shell"] + list(a),
                          capture_output=True).stdout.decode("utf-8", "ignore").strip()


def shot(n):
    p = os.path.join(E, n)
    r = subprocess.run([ADB, "-s", S, "exec-out", "screencap", "-p"], capture_output=True)
    open(p, "wb").write(r.stdout)
    return cv2.imdecode(np.frombuffer(open(p, "rb").read(), np.uint8), cv2.IMREAD_COLOR)


def tap(x, y, ms=90):
    sh("input swipe", str(x), str(y), str(x), str(y), str(ms))


def diff(a, b):
    d = np.abs(a.astype(np.int16) - b.astype(np.int16)).max(axis=2)
    return float(np.mean(d > 40) * 100)


REF = shot("scan_ref.png")
print("参考帧已存 scan_ref.png")

# 候选点：右上角 X 附近密集采样 + 屏幕各处（含弹窗外区域）
CAND = [
    (1380, 44, "X 原位"),
    (1370, 40, "X 左上"),
    (1392, 40, "X 右上"),
    (1370, 52, "X 左下"),
    (1392, 52, "X 右下"),
    (1380, 28, "X 上方"),
    (1380, 62, "X 下方"),
    (1340, 44, "X 左侧"),
    (1420, 44, "X 右侧"),
    (800, 690, "弹窗下方屏幕内"),
    (100, 690, "左下角"),
    (60, 60, "左上角"),
    (1540, 690, "右下角"),
    (800, 360, "屏幕正中"),
]
for x, y, label in CAND:
    tap(x, y)
    time.sleep(1.6)
    cur = shot("scan_%d_%d.png" % (x, y))
    d = diff(REF, cur)
    print("  %-14s (%4d,%4d)  变化 %6.2f%%  %s"
          % (label, x, y, d, "★ 有响应！" if d > 1.0 else "无响应"))
    if d > 20:
        print("  → 画面大变化，弹窗可能已关闭，停止扫描")
        break
print("\n最终前台:", sh("dumpsys window | grep -m1 mCurrentFocus").split("mCurrentFocus=")[-1].strip())

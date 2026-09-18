# -*- coding: utf-8 -*-
"""精确坐标下测试 ✕ (边界 x1350-1380, y35-59, 中心1364,48) 是否响应。
同时对比 input tap（原生，DOWN/UP 同时）与 swipe 拟人（有按下时长）。
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


def diff(a, b):
    d = np.abs(a.astype(np.int16) - b.astype(np.int16)).max(axis=2)
    return float(np.mean(d > 40) * 100)


REF = shot("cx_ref.png")
print("参考帧:", REF.shape)
POINTS = [(1364, 48, "正中心"),
          (1358, 44, "左上内"), (1370, 44, "右上内"),
          (1358, 53, "左下内"), (1370, 53, "右下内"),
          (1364, 36, "上沿内"), (1364, 58, "下沿内")]
for x, y, lb in POINTS:
    sh("input tap", str(x), str(y))
    time.sleep(1.4)
    cur = shot("cx_tap_%d_%d.png" % (x, y))
    print("  input tap  %-8s (%4d,%4d)  变化 %6.2f%%" % (lb, x, y, diff(REF, cur)))
    if diff(REF, cur) > 5:
        print("   ★ 生效！")
        break

print("\n--- 换拟人 swipe 再试中心 ---")
sh("input swipe", "1364", "48", "1364", "48", "110")
time.sleep(1.6)
cur = shot("cx_swipe.png")
print("  swipe 中心  变化 %6.2f%%" % diff(REF, cur))

print("\n--- 试双击中心 ---")
for _ in range(2):
    sh("input tap", "1364", "48")
    time.sleep(0.12)
time.sleep(1.6)
cur = shot("cx_dbl.png")
print("  双击 中心   变化 %6.2f%%" % diff(REF, cur))

print("\n最终:", sh("dumpsys window | grep -m1 mCurrentFocus").split("mCurrentFocus=")[-1].strip())

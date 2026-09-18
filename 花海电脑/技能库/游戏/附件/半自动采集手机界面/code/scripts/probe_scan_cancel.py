# -*- coding: utf-8 -*-
"""网格扫描：在「取消」按钮周围密集试点击，看能否关掉「是否要退出游戏」弹窗。
用途：若某个点成功 → 说明存在坐标偏移，可量化；若全失败 → 说明该区域/该按钮不吃注入。
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


REF = shot("scan2_ref.png")
print("参考帧（退出弹窗）已存 scan2_ref.png")
ok = None
tried = 0
for y in range(340, 421, 15):
    for x in range(600, 761, 20):
        tried += 1
        sh("input tap", str(x), str(y))
        time.sleep(1.0)
        cur = shot("scan2_%d_%d.png" % (x, y))
        d = diff(REF, cur)
        if d > 5:
            print("  ★ (%d,%d) 变化 %.2f%%  → 有响应！" % (x, y, d))
            ok = (x, y, d)
            break
    if ok:
        break
print("共试 %d 点" % tried)
if ok:
    print("→ 存在响应点 (%d,%d) 变化 %.2f%%：说明有坐标偏移，可修正" % ok)
else:
    print("→ 45 点全部无响应：该按钮不吃 adb 注入（或弹窗只响应真人触摸）")
print("最终前台:", sh("dumpsys window | grep -m1 mCurrentFocus").split("mCurrentFocus=")[-1].strip())

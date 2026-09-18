# -*- coding: utf-8 -*-
"""连拍探针：进入游戏 → 点角色卡 → 0.6s/1.5s/3s/6s 连拍，定位瞬态到底发生了什么。"""
import os, subprocess, time
import numpy as np
import cv2

ADB = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\adb-device-control\scripts\tools\adb.exe"
S = "FML4C19C17007446"
E = r"E:\AiDemos\QnyhAuto\evidence"


def sh(*a):
    return subprocess.run([ADB, "-s", S, "shell"] + list(a),
                          capture_output=True).stdout.decode("utf-8", "ignore").strip()


def shot(name):
    p = os.path.join(E, name)
    r = subprocess.run([ADB, "-s", S, "exec-out", "screencap", "-p"], capture_output=True)
    open(p, "wb").write(r.stdout)
    return cv2.imread(p), p


def tap(x, y, ms=90):
    sh("input swipe", str(x), str(y), str(x), str(y), str(ms))


def diff(a, b):
    d = np.abs(a.astype(np.int16) - b.astype(np.int16))
    return float(np.mean(d.max(axis=2) > 40) * 100)


print("=== 1) 点「进入游戏」(785,510) ===")
tap(785, 510)
time.sleep(5)
s0, p0 = shot("burst_0_serverlist.png")
print("   ", p0)

print("=== 2) 点角色卡 (624,200) —— 连拍 ===")
tap(624, 200)
frames = []
for tag, delay in (("a", 0.6), ("b", 1.5), ("c", 3.0), ("d", 6.0)):
    time.sleep(delay if not frames else delay - frames[-1][2])
    im, p = shot("burst_1%s_card.png" % tag)
    frames.append((tag, im, delay, p))
    print("   +%.1fs  %s" % (delay, p))

print("\n=== 3) 各帧相对「点卡后 0.6s」的变化 ===")
base = frames[0][1]
for tag, im, d, p in frames:
    print("   %s (+%.1fs) 变化>40: %5.2f%%" % (tag, d, diff(base, im)))

print("\n=== 4) 每帧相对「选服界面」的变化（判断是否还在选服） ===")
for tag, im, d, p in frames:
    print("   %s (+%.1fs) 相对选服界面: %5.2f%%" % (tag, d, diff(s0, im)))

print("\n=== 5) 当前前台 ===")
print("   ", sh("dumpsys window | grep -m1 mCurrentFocus").split("mCurrentFocus=")[-1].strip())

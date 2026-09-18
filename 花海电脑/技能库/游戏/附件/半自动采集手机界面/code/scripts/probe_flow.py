# -*- coding: utf-8 -*-
"""按正确流程干净跑一遍：启动页 → 点进入游戏 → 选角色卡 → 再点进入游戏 → 进服
每一步都截图 + 与前一屏比对，确认状态迁移。
"""
import os, subprocess, time
import numpy as np
import cv2

ADB = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\adb-device-control\scripts\tools\adb.exe"
S = "FML4C19C17007446"
E = r"E:\AiDemos\QnyhAuto\evidence"
ENTER = (785, 510)
CARD1 = (607, 210)


def sh(*a):
    return subprocess.run([ADB, "-s", S, "shell"] + list(a),
                          capture_output=True).stdout.decode("utf-8", "ignore").strip()


def shot(n):
    p = os.path.join(E, n)
    r = subprocess.run([ADB, "-s", S, "exec-out", "screencap", "-p"], capture_output=True)
    open(p, "wb").write(r.stdout)
    a = cv2.imdecode(np.frombuffer(open(p, "rb").read(), np.uint8), cv2.IMREAD_COLOR)
    return a


def tap(x, y):
    sh("input tap", str(x), str(y))


def diff(a, b):
    if a is None or b is None:
        return -1
    d = np.abs(a.astype(np.int16) - b.astype(np.int16))
    return float(np.mean(d.max(axis=2) > 40) * 100)


s0 = shot("flow_0_start.png")
print("s0  当前状态                      已存 flow_0_start.png")

tap(*ENTER)
time.sleep(5)
s1 = shot("flow_1_panel.png")
print("s1  点「进入游戏」(785,510)        与s0 差 %6.2f%%" % diff(s0, s1))

tap(*CARD1)
time.sleep(3)
s2 = shot("flow_2_card.png")
print("s2  点角色卡 (607,210)             与s1 差 %6.2f%%  ；与s0 差 %6.2f%%"
      % (diff(s1, s2), diff(s0, s2)))

tap(*ENTER)
time.sleep(5)
s3 = shot("flow_3_enter2.png")
print("s3  再点「进入游戏」(+5s)           与s1(面板) 差 %6.2f%%  ；与s2 差 %6.2f%%"
      % (diff(s1, s3), diff(s2, s3)))

time.sleep(10)
s4 = shot("flow_4_enter2b.png")
print("s4  +15s                          与s3 差 %6.2f%%" % diff(s3, s4))

print()
print("判读线索：")
print("  s3 与 s1(面板) 差异大  → 说明没有回到面板")
print("  s3 与 s2 差异大        → 说明离开了启动页（可能已进游戏）")
print("  产物: flow_1_panel / flow_2_card / flow_3_enter2 / flow_4_enter2b")

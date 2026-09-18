# -*- coding: utf-8 -*-
"""验证假设：选角色卡 → 回启动页（服务器已切换）→ 再点「进入游戏」 → 真正进服。"""
import os, subprocess, time
import numpy as np
import cv2

ADB = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\adb-device-control\scripts\tools\adb.exe"
S = "FML4C19C17007446"
E = r"E:\AiDemos\QnyhAuto\evidence"
ENTER = (785, 510)


def sh(*a):
    return subprocess.run([ADB, "-s", S, "shell"] + list(a),
                          capture_output=True).stdout.decode("utf-8", "ignore").strip()


def shot(n):
    p = os.path.join(E, n)
    r = subprocess.run([ADB, "-s", S, "exec-out", "screencap", "-p"], capture_output=True)
    open(p, "wb").write(r.stdout)
    return cv2.imread(p), p


def tap(x, y, ms=90):
    sh("input swipe", str(x), str(y), str(x), str(y), str(ms))


def diff(a, b):
    d = np.abs(a.astype(np.int16) - b.astype(np.int16))
    return float(np.mean(d.max(axis=2) > 40) * 100)


print("=== 状态 0：当前 ===")
s0, p0 = shot("h_0_now.png")
print("   ", p0)

print("=== 步骤 A：点「进入游戏」 ===")
tap(*ENTER)
time.sleep(6)
sA, pA = shot("h_1_after_enter.png")
print("   与状态0差异 %.2f%%  → %s" % (diff(s0, sA),
                                     "变成了另一屏（若>40则为选服面板）" if diff(s0, sA) > 40
                                     else "没变（可能直接进游戏或没响应）"))

print("=== 步骤 B：点角色卡 (607,210) ===")
tap(607, 210)
time.sleep(5)
sB, pB = shot("h_2_after_card.png")
print("   与选服/前屏差异 %.2f%%" % diff(sA, sB))

print("=== 步骤 C：再点「进入游戏」 ===")
tap(*ENTER)
time.sleep(20)
sC, pC = shot("h_3_after_enter2.png")
print("   与步骤B差异 %.2f%%" % diff(sB, sC))

print("\n=== 汇总 ===")
print("   0 当前        :", p0)
print("   A 点进入游戏  :", pA)
print("   B 点角色卡    :", pB)
print("   C 再点进入游戏:", pC)
print("\n   判定依据：游戏内 HUD 通常有大幅新内容，且画面持续变化（角色/场景动）")

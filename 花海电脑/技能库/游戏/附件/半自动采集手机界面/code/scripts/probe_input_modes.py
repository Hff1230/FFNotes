# -*- coding: utf-8 -*-
"""对比两种点击方式在选服面板上的效果，并测左栏按钮是否真的可点。
  input tap x y          —— 原生点击（DOWN/UP 时间戳重合）
  input swipe x y x y 90 —— 拟人点击（真实按下时长，本工具默认）
测试点：
  (412,204) 「推荐」   —— 若面板响应，应切换列表（画面变化）
  (607,210) 卡片1      —— 期待进入游戏
"""
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


def diff(a, b):
    d = np.abs(a.astype(np.int16) - b.astype(np.int16))
    return float(np.mean(d.max(axis=2) > 40) * 100)


def open_panel(tag):
    sh("input tap", str(ENTER[0]), str(ENTER[1]))
    time.sleep(4.5)
    return shot("t_%s_panel.png" % tag)[0]


def step(mode, x, y, label):
    ref = open_panel(label.replace(" ", ""))
    pre, _ = shot("t_tmp_pre.png")
    if diff(pre, ref) > 20:
        print("   [%s] 面板未打开，跳过" % label)
        return
    if mode == "tap":
        sh("input tap", str(x), str(y))
    else:
        sh("input swipe", str(x), str(y), str(x), str(y), "90")
    time.sleep(2.5)
    post, _ = shot("t_%s.png" % label.replace(" ", ""))
    d = diff(ref, post)
    if d > 20:
        state = "面板关闭"
    else:
        state = "面板保持（无变化）"
    print("   [%s] mode=%-5s  与面板差异 %6.2f%%  → %s" % (label, mode, d, state))


print("=" * 78)
print("A. input tap 点左栏「推荐」(412,204) —— 面板是否响应？")
print("=" * 78)
step("tap", 412, 204, "ref_tab")

print()
print("=" * 78)
print("B. input tap 点卡片1 (607,210)")
print("=" * 78)
step("tap", 607, 210, "card1")

print()
print("=" * 78)
print("C. 拟人 swipe 点左栏「推荐」(412,204) 作对照")
print("=" * 78)
step("swipe", 412, 204, "ref_tab_swipe")

print()
cur, cp = shot("t_final.png")
print("收尾截图:", cp)
print("前台:", sh("dumpsys window | grep -m1 mCurrentFocus").split("mCurrentFocus=")[-1].strip())

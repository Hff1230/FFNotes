# -*- coding: utf-8 -*-
"""系统化探测：选服面板上各位置被点击后，面板是保持还是关闭。
流程（每个目标一轮）：
  点「进入游戏」→ 等 → 截 pre（应等于参考面板）→ 点目标 → 等 → 截 post
  比较 post 与 参考面板：差异大 = 面板被关闭；差异小 = 面板还在
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


print("=== 建立参考：点「进入游戏」拿到选服面板 ===")
tap(*ENTER)
time.sleep(5)
REF, refp = shot("probe_ref_panel.png")
print("   ", refp)

TARGETS = [
    (400, 140, "左栏「已有角色」"),
    (607, 210, "卡片1 中心"),
    (607, 130, "卡片1 头像"),
    (585, 245, "卡片1 名字"),
    (780, 210, "卡片2 中心"),
    (1000, 210, "卡片3 中心"),
    (1000, 285, "卡片3 服务器名"),
    (1380, 44, "右上 X 关闭"),
]

print("\n" + "=" * 78)
print("%-22s %-10s %s" % ("点击目标", "与面板差异", "判定"))
print("=" * 78)
for x, y, label in TARGETS:
    # 先把面板调出来
    tap(*ENTER)
    time.sleep(4.5)
    pre, _ = shot("probe_pre.png")
    if diff(pre, REF) > 20:
        print("%-22s 面板未打开，跳过（与参考差 %.1f%%）" % (label, diff(pre, REF)))
        continue
    tap(x, y)
    time.sleep(2.5)
    post, pp = shot("probe_post_%d_%d.png" % (x, y))
    d = diff(post, REF)
    verdict = "面板已关闭（点击落到面板外）" if d > 20 else "面板仍打开 ✅（点击被面板接收）"
    print("%-22s %8.1f%%  %s" % (label, d, verdict))

print("\n=== 收尾：当前状态 ===")
cur, cp = shot("probe_final.png")
print("   与选服面板差异 %.1f%%  → %s" % (diff(cur, REF),
                                        "当前是选服面板" if diff(cur, REF) < 20 else "已离开选服面板"))
print("   前台:", sh("dumpsys window | grep -m1 mCurrentFocus").split("mCurrentFocus=")[-1].strip())

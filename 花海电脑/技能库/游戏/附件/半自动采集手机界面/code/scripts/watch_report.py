#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""watch_report.py —— 手机界面变化播报器（供 cron no_agent 直发对话，零 token）。

只在【手机当前界面发生变化】时输出一行；未变化则输出为空 → cron 静默，不刷屏。

用法:
  python watch_report.py            # 变化才输出（cron 用这个）
  python watch_report.py --force    # 无论是否变化都输出一行（即时点名查询）
"""
import argparse
import json
import os
import subprocess
import sys
import time

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
HI = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\mobile-game-automation\scripts\human_input.py"
PY = sys.executable
OUTDIR = os.path.join(ROOT, "evidence", "annot")
STATE = os.path.join(OUTDIR, ".report_state.json")
LIVE = os.path.join(OUTDIR, "_report_live.png")


def imread_u(p):
    return cv2.cvtColor(cv2.imdecode(np.fromfile(p, dtype=np.uint8), cv2.IMREAD_COLOR),
                        cv2.COLOR_BGR2RGB)


def grab(path, serial=None, tries=4):
    """截图并校验能解码。

    坑：守护进程和播报器会**同时**调 adb 截图，偶尔产出坏 PNG
    （libpng bad header / imdecode 返回 None）——只判文件大小会漏过去，必须真解码一次。
    """
    for _ in range(tries):
        cmd = [PY, HI, "shot", path] + (["--serial", serial] if serial else [])
        try:
            # ★ 关键：先删掉旧文件。否则 adb 截图失败时，旧图还在原处，
            #   解码一样成功 → 会把「你已经离开的那个界面」当成当前界面播报出去。
            if os.path.exists(path):
                os.remove(path)
            subprocess.run(cmd, capture_output=True, timeout=60)
            if not os.path.exists(path) or os.path.getsize(path) < 5000:
                raise ValueError("文件太小")
            img = imread_u(path)
            if img is not None and img.size:
                return img
        except Exception:
            pass
        time.sleep(0.6)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="无论是否变化都输出一行")
    ap.add_argument("--serial", default=None)
    a = ap.parse_args()

    os.makedirs(OUTDIR, exist_ok=True)
    from mapkit.recognize import Recognizer
    rec = Recognizer(os.path.join(ROOT, "map", "screens.json"))

    img = grab(LIVE, a.serial)
    if img is None:
        print("[播报失败] 截图连续 4 次都没拿到可解码的画面（adb 忙 / 与守护抢占用）")
        return 1

    res = rec.identify(img)
    sid = res.get("screen")
    conf = res.get("confidence", 0.0)
    key = sid if sid else "##unknown"

    prev = None
    if os.path.exists(STATE):
        try:
            prev = json.load(open(STATE, encoding="utf-8")).get("sid")
        except Exception:
            prev = None

    if not a.force and prev == key:
        return 0                     # 界面没变 → 不输出 → cron 静默

    json.dump({"sid": key, "ts": time.strftime("%Y-%m-%d %H:%M:%S")},
              open(STATE, "w", encoding="utf-8"), ensure_ascii=False)

    t = time.strftime("%H:%M:%S")
    if sid:
        name = (rec.screens.get(sid) or {}).get("name") or sid
        print("📱 %s　当前界面：%s（%s）　置信度 %.3f" % (t, name, sid, conf))
    else:
        print("📱 %s　当前界面：【我不认识】—— 取点窗口应已自动弹出，请你点完按 ESC" % t)
    return 0


if __name__ == "__main__":
    sys.exit(main())

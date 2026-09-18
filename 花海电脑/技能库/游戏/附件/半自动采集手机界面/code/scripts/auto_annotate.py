#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""auto_annotate.py —— 界面标注守护进程：自动发现「识别器不认识的界面」并弹取点工具。

你只需操作手机切换界面，无需提醒 agent：
    检测到未识别界面（连续 STABLE 帧稳定）
        → 自动截图 + 弹出 pick_point（阻塞，你点完按 ESC）
        → 自动 merge_picks --apply 入库
        → 继续监听

触发规则:
  · 只对【识别器返回 None】的界面弹窗（已认识的界面不打扰你）
  · 需连续 STABLE 帧结果一致才触发（躲开切换动画/过渡态）
  · 同一画面只弹一次（按截图指纹去重）；切走再切回可再次触发
  · 弹窗被误关后，切走再切回即可重弹

用法:
  python auto_annotate.py                    # 守护
  python auto_annotate.py --interval 1.6     # 截图间隔（秒）
  python auto_annotate.py --stable 2         # 连续几帧确认
  python auto_annotate.py --force            # 未知界面每帧都弹（调试用）
退出:
  Ctrl+C，或新建文件 evidence/annot/STOP
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import time

import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

HI = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\mobile-game-automation\scripts\human_input.py"
PY = sys.executable
OUTDIR = os.path.join(ROOT, "evidence", "annot")
STOP = os.path.join(OUTDIR, "STOP")


def imread_u(p):
    return cv2.cvtColor(cv2.imdecode(np.fromfile(p, dtype=np.uint8), cv2.IMREAD_COLOR),
                        cv2.COLOR_BGR2RGB)


def grab(path, serial, py, hi, tries=4):
    """截图并校验可解码。

    坑：守护与播报器（cron）会**同时**调 adb 截图，偶发坏 PNG
    （libpng bad header / imdecode 返回 None / cvtColor 断言失败）。
    只判文件大小会漏过去 —— 必须真解码一次，失败就重试。
    """
    for _ in range(tries):
        cmd = [py, hi, "shot", path] + (["--serial", serial] if serial else [])
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
        except Exception:  # noqa: BLE001
            pass
        time.sleep(0.6)
    return None


OVERLAY = os.path.join(OUTDIR, "_overlay.json")


def write_overlay(sid, conf, known, rec=None):
    """给桌面悬浮窗（hud_overlay.py）写当前界面状态 —— 实时飘字、零 token。

    悬浮窗每 0.3s 读这个文件，所以守护一识别到就更新，用户不用看对话框。
    """
    try:
        name = sid or ""
        if known and sid and rec is not None:
            name = (rec.screens.get(sid) or {}).get("name") or sid
        with open(OVERLAY, "w", encoding="utf-8") as f:
            json.dump({"name": name or "不认识", "sid": sid or "", "known": bool(known),
                       "conf": round(float(conf or 0), 3), "ts": time.strftime("%H:%M:%S")},
                      f, ensure_ascii=False)
    except Exception:  # noqa: BLE001
        pass


def fingerprint(img):
    """画面指纹：缩到 32x14 灰度后 hash（对轻微噪声不敏感）。"""
    g = cv2.cvtColor(cv2.resize(img, (32, 14)), cv2.COLOR_RGB2GRAY)
    return hashlib.md5(g.tobytes()).hexdigest()[:12]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--interval", type=float, default=1.6)
    ap.add_argument("--stable", type=int, default=2)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--serial", default=None)
    a = ap.parse_args()

    os.makedirs(OUTDIR, exist_ok=True)
    if os.path.exists(STOP):
        os.remove(STOP)

    from mapkit.recognize import Recognizer
    rec = Recognizer(os.path.join(ROOT, "map", "screens.json"))
    print("[守护启动] 间隔%.1fs 稳定%d帧 图谱%d界面。你切界面即可，我不打扰已认识的界面。"
          % (a.interval, a.stable, len(rec.screens)), flush=True)

    shot = os.path.join(OUTDIR, "_live.png")
    seen = set()          # 已弹过的画面指纹
    pending, last_state = 0, "init"
    n = 0

    while True:
        if os.path.exists(STOP):
            print("[停止] 检测到 STOP 文件，退出。", flush=True)
            return 0
        try:
            img = grab(shot, a.serial, PY, HI)
            if img is None:
                print("[警告] 截图连续 4 次都没拿到可解码画面（adb 忙 / 与播报器抢占用）", flush=True)
                time.sleep(a.interval)
                continue
            res = rec.identify(img)
            sid = res.get("screen")
            fp = fingerprint(img)

            if sid is not None:
                write_overlay(sid, res.get("confidence", 0), True, rec)
                # 只在「界面真的变了」时打印，否则每 1.6s 刷一行把日志淹掉
                if last_state != sid:
                    print("[已知] %s (%.0fms)" % (sid, res.get("ms", 0)), flush=True)
                last_state, pending = sid, 0
                time.sleep(a.interval)
                continue

            # 未识别界面
            if last_state is None:
                same = (fp == last_state_fp) if 'last_state_fp' in dir() else False
                pending = 0 if same else pending
            last_state_fp = fp
            pending += 1
            write_overlay(None, 0, False)
            print("[未知] 指纹%s 连续%d/%d帧" % (fp, pending, a.stable), flush=True)

            if pending >= a.stable and (a.force or fp not in seen):
                seen.add(fp)
                n += 1
                name = "unknown_%s_%02d" % (time.strftime("%H%M%S"), n)
                shot2 = os.path.join(OUTDIR, "%02d_%s.png" % (n, name))
                subprocess.run([PY, HI, "shot", shot2], capture_output=True, timeout=60)
                print("\n>>> 弹出取点工具 #%d：%s" % (n, shot2), flush=True)
                print(">>> 请你点特征点/按钮，改好顶部界面名，按 ESC 结束", flush=True)
                # ★ 不要传 "unknown"：它会被预填进界面名框，用户一不留神就写进图谱，
                #   留下一个既无比色签名又无 OCR 关键词、永远识别不出的界面 → 守护无限弹窗。
                #   留空 → 取点工具会强制用户命名（见 pick_point.py 的 write()）。
                subprocess.run([PY, os.path.join(ROOT, "scripts", "pick_point.py"),
                                shot2, "--screen", ""], timeout=7200)
                pk = shot2 + ".picks.json"
                if os.path.exists(pk):
                    j = __import__("json").load(open(pk, encoding="utf-8"))
                    print(">>> 你记录了 %d 个点，自动入库..." % len(j.get("picks", [])), flush=True)
                    subprocess.run([PY, os.path.join(ROOT, "scripts", "merge_picks.py"),
                                    pk, "--apply"], timeout=300)
                else:
                    print(">>> 未产生 picks.json，跳过", flush=True)
                print(">>> 继续监听...\n", flush=True)
                pending = 0
            last_state = None
        except KeyboardInterrupt:
            print("\n[停止] Ctrl+C", flush=True)
            return 0
        except Exception as e:  # noqa: BLE001
            print("[异常] %s" % e, flush=True)
        time.sleep(a.interval)


if __name__ == "__main__":
    sys.exit(main())

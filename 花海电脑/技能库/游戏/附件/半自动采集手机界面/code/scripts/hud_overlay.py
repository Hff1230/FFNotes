#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""hud_overlay.py —— 桌面悬浮字 + 一键关闭当前界面（零 token、秒级）。

为什么用这个而不是 cron/对话播报：
  · cron 最小粒度 1 分钟，跟不上人工切界面的速度（实测 '20s' 被拒）
  · hermes send / webhook --deliver-only 只能投递「消息平台」，本地桌面会话不在目标里
  · 所以直接在屏幕上飘字：守护（auto_annotate.py）写 _overlay.json，本窗口 0.3s 读一次

「关闭界面」按钮的安全护栏（点的是真手机，必须保守）：
  1. 当前界面【不认识】→ 不动作
  2. 界面在图谱里【没有 closer】→ 不动作
  3. closer 里的坐标与该界面 danger（付费/退出等禁区）重合 → 拒绝执行
  4. 只点 closer 里逐个列出的坐标，绝不临场推断

用法:
  python hud_overlay.py                 # 默认左上角
  python hud_overlay.py --pos 1550,50   # 放右上角（本屏宽 1600）
  python hud_overlay.py --scale 1.3     # 字体放大
交互:
  左键拖动 = 挪位置 ；右键 = 关闭悬浮窗 ；点「✕ 关闭界面」= 关掉手机上当前界面
"""
import argparse
import json
import os
import subprocess
import sys
import time
import tkinter as tk

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STATE = os.path.join(ROOT, "evidence", "annot", "_overlay.json")
MAP = os.path.join(ROOT, "map", "screens.json")
HI = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\mobile-game-automation\scripts\human_input.py"
PY = sys.executable


def load_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def norm_closer(raw):
    """把 closer 规整成 [(x,y),...]。

    坑（实测「点关闭没反应」的真因）：历史数据里 closer 有**两种格式** ——
    `[1364, 48]`（一维）和 `[[1350, 56]]`（二维）。若直接 `for x, y in closer`，
    一维那种会遍历出单个数字去解包，当场 TypeError，**一个点击都发不出去**。
    """
    out = []
    if not raw:
        return out
    if not isinstance(raw[0], (list, tuple)):
        raw = [raw]                      # 一维 → 包一层
    for p in raw:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            out.append((int(p[0]), int(p[1])))
    return out


def danger_xy(raw):
    """危险区统一取出 [(x,y),...]，兼容两种写法。

    坑：danger 同样混用 —— `[{'screen':.., 'xy':[1120,100], 'why':..}]`（字典）
    与 `[[447,420]]`（纯坐标）。若按 `tuple(p)` 取，字典会变成键名元组，
    **禁区检查静默失效**（等于没有护栏）。
    """
    out = []
    for p in (raw or []):
        if isinstance(p, dict):
            q = p.get("xy")
            if isinstance(q, (list, tuple)) and len(q) >= 2:
                out.append((int(q[0]), int(q[1])))
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
            out.append((int(p[0]), int(p[1])))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pos", default="20,20", help="窗口位置 x,y")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--interval", type=int, default=300, help="刷新毫秒")
    a = ap.parse_args()

    root = tk.Tk()
    root.overrideredirect(True)                 # 无边框
    root.attributes("-topmost", True)           # 置顶
    try:
        root.attributes("-alpha", 0.90)         # 半透明
    except Exception:
        pass
    root.configure(bg="#0b0b0b")
    x, y = (int(v) for v in a.pos.split(","))
    root.geometry("+%d+%d" % (x, y))

    fs = max(10, int(14 * a.scale))
    lbl = tk.Label(root, text="手机界面：等待守护…", font=("Microsoft YaHei", fs, "bold"),
                   bg="#0b0b0b", fg="#00ff88", padx=14, pady=6, justify="left", anchor="w")
    lbl.pack(fill="x")

    bar = tk.Frame(root, bg="#0b0b0b")
    bar.pack(fill="x", padx=6, pady=(0, 6))

    btn = tk.Button(bar, text="✕ 关闭界面", font=("Microsoft YaHei", max(9, fs - 4), "bold"),
                    bg="#c62828", fg="white", activebackground="#e53935",
                    activeforeground="white", bd=0, padx=10, pady=3, cursor="hand2")
    btn.pack(side="left")

    hint = tk.Label(bar, text="左键拖 / 右键关窗", font=("Microsoft YaHei", 8),
                    bg="#0b0b0b", fg="#666666")
    hint.pack(side="left", padx=8)

    # ── 拖动 ──
    drag = {"x": 0, "y": 0}

    def on_press(e):
        drag["x"], drag["y"] = e.x, e.y

    def on_drag(e):
        root.geometry("+%d+%d" % (root.winfo_x() + e.x - drag["x"],
                                  root.winfo_y() + e.y - drag["y"]))

    for w in (root, lbl, bar, hint):
        w.bind("<Button-1>", on_press)
        w.bind("<B1-Motion>", on_drag)
    for w in (root, lbl, bar, hint):
        w.bind("<Button-3>", lambda e: root.destroy())

    # ── 关闭当前界面 ──
    def tap(px, py):
        subprocess.run([PY, HI, "tap", str(px), str(py)], capture_output=True, timeout=30)

    def do_close():
        st = load_json(STATE, {}) or {}
        sid = st.get("sid")
        if not sid or not st.get("known"):
            lbl.configure(text="当前界面不认识，不敢乱点", fg="#ff6b6b")
            root.after(1800, tick_once)
            return
        s = (load_json(MAP, {}) or {}).get("screens", {}).get(sid, {})
        closer = norm_closer(s.get("closer"))
        if not closer:
            lbl.configure(text="%s 没有定义关闭键" % (st.get("name") or sid), fg="#ffb300")
            root.after(1800, tick_once)
            return
        danger = set(danger_xy(s.get("danger")))
        hit = [p for p in closer if p in danger]
        if hit:
            lbl.configure(text="⚠ 关闭键与禁区重合，已拒绝执行 %s" % hit, fg="#ff6b6b")
            root.after(2500, tick_once)
            return
        name = st.get("name") or sid
        for i, (px, py) in enumerate(closer, 1):
            lbl.configure(text="正在关闭 %s …(%d/%d) (%d,%d)" % (name, i, len(closer), px, py),
                          fg="#ffd54f")
            root.update()
            tap(px, py)
            time.sleep(1.3)
        lbl.configure(text="已关闭：%s" % name, fg="#00e5ff")
        root.after(2200, tick_once)

    btn.configure(command=do_close)

    # ── 轮询状态 ──
    def tick_once():
        d = load_json(STATE, None)
        if not d:
            lbl.configure(text="手机界面：守护未运行", fg="#888888")
            return
        if d.get("known"):
            lbl.configure(text="手机界面：%s    %.3f   %s"
                               % (d.get("name", "?"), d.get("conf", 0), d.get("ts", "")),
                          fg="#00ff88")
        else:
            lbl.configure(text="手机界面：不认识（守护正在取点）   %s" % d.get("ts", ""),
                          fg="#ff6b6b")

    def tick():
        tick_once()
        root.after(a.interval, tick)

    tick()
    root.mainloop()


if __name__ == "__main__":
    main()

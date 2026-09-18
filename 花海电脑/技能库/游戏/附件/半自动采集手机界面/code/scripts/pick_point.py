#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pick_point.py —— 手机截图人工取点工具（带跟随鼠标的像素放大镜）。

取点规则（**两类点，按「有没有备注」自动分流**）:
  · 空白点（不填名字）  = 比色特征点 → 用于识别界面。**必须落在纯色区**（std 小），
                          否则比色会抖。入库时 std>6 会被拦下重选。
  · 有备注的点（填名字） = 按钮位置  → 用于点击动作，写入 screens[id].clicks[名字]。
                          只要位置准即可，**std 大没关系**（按钮中心本来就在图标/文字上）。
  两类点可以混着点，工具按有无备注自动分流。

用法:
  python pick_point.py <截图> --screen <界面ID> [--tag point|close|click] [--out out.json]

操作:
  鼠标移动   → 十字准星处自动弹出【8x 像素放大镜】，状态栏实时显示
               中心 1px 色值 / 11x11 中位数 / std / ★ 评级
  左键单击   → 记录该点（含放大镜确认为纯色区）
  R          → 重新载入图片（agent 重新截图后按一下刷新）
  E          → 清空已记录
  方向键     → 微调 1px（放大镜下精确定位）
  ESC / 关窗  → 退出并写盘

放大镜设计:
  跟随鼠标，20x20 原图像素 → 8x NEAREST 放大（保留像素块，不插值模糊）
  红色十字 = 当前鼠标所在像素；绿色方框 = 该像素边界
  靠近窗口边缘时自动翻到另一侧，不遮挡取点位置

品质评级（决定能否当比色特征点）:
  ★★★ std<=2.5  纯色区，优秀 —— 首选
  ★★  std<=6    可用 —— 勉强
  ★   其他      不要用 —— 落在文字/图标/边缘上，抗锯齿会变色

输出:
  <截图>.picks.json
  {"src":"...","screen":"hud","k":11,
   "picks":[{"n":1,"x":1234,"y":56,"rgb":[240,238,236],"std":1.2,"grade":"★★★","tag":"point"}]}
"""
import argparse
import json
import os
import tkinter as tk
from tkinter import simpledialog

import numpy as np
from PIL import Image, ImageTk

MAG_N = 20      # 放大镜取样边长（原图像素）
MAG_Z = 8       # 放大倍数 → 显示 160x160
MAG_PX = MAG_N * MAG_Z


def sample(im, x, y, k):
    h = k // 2
    box = np.asarray(im.crop((max(0, x - h), max(0, y - h),
                              min(im.width, x + h + 1), min(im.height, y + h + 1))),
                     dtype=np.float32).reshape(-1, 3)
    return [int(v) for v in np.median(box, axis=0)], float(box.std(axis=0).max())


def grade(std):
    return "★★★" if std <= 2.5 else ("★★" if std <= 6.0 else "★")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("img")
    ap.add_argument("--screen", default="")
    ap.add_argument("--tag", default="point", choices=["point", "close", "click"])
    ap.add_argument("--k", type=int, default=11)
    ap.add_argument("--out", default=None)
    ap.add_argument("--scale", type=float, default=0.0)
    a = ap.parse_args()

    path = os.path.abspath(a.img)
    out = a.out or (path + ".picks.json")
    im = Image.open(path).convert("RGB")

    root = tk.Tk()
    root.title("取点 [%s / %s] — %s" % (a.screen or "-", a.tag, os.path.basename(path)))
    sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
    s = a.scale or min(1.0, (sh - 150) / float(im.height), (sw - 60) / float(im.width))

    state = {"im": im, "tkimg": None, "magtk": None, "cur": (0, 0)}
    # ── 顶部：界面名（决定这些点存到哪个界面）──
    # agent 用识别器预填一个建议值，你核对/修改即可，无需在对话里说明。
    topf = tk.Frame(root)
    topf.pack(fill="x")
    tk.Label(topf, text="界面名:", font=("Microsoft YaHei", 10)).pack(side="left")
    scr_var = tk.StringVar(value=a.screen)
    ent = tk.Entry(topf, textvariable=scr_var, font=("Consolas", 12), width=26,
                   fg="#0033cc")
    ent.pack(side="left", padx=6)
    tk.Label(topf, text="← 【必填】决定这些点存到哪个界面（英文ID，如 welfare_monthcard）",
             font=("Microsoft YaHei", 9), fg="#c00000").pack(side="left")

    def _mark(*_):
        # 空着或还是占位名 → 黄底提醒；这种界面存进去就是「永远认不出」的垃圾
        v = scr_var.get().strip()
        ent.configure(bg="#fff3cd" if (not v or v == "unknown") else "white")

    scr_var.trace_add("write", _mark)
    _mark()
    cv = tk.Canvas(root, width=int(im.width * s), height=int(im.height * s),
                   highlightthickness=0, cursor="crosshair")
    cv.pack()
    bar = tk.Label(root, anchor="w", font=("Consolas", 10), bg="#111", fg="#0f0")
    bar.pack(fill="x")

    # 放大镜（悬浮在 root 上，跟随鼠标）
    mag = tk.Canvas(root, width=MAG_PX + 2, height=MAG_PX + 2,
                    highlightthickness=1, highlightbackground="#ff2d55", bd=0, bg="#000")

    picks = []
    last = {"name": ""}

    def write():
        # ★ 不允许写出「没名字」或占位名 unknown 的界面：
        #   那种界面没有比色签名、也没有 OCR 关键词 → 识别器永远认不出 → 守护无限弹窗。
        sid = (scr_var.get().strip() or a.screen).strip()
        if not sid or sid == "unknown":
            sid = (simpledialog.askstring(
                "这个界面叫什么？",
                "请填界面 ID（英文，如 welfare_monthcard）\n不填则不写盘：",
                parent=root) or "").strip()
            if not sid or sid == "unknown":
                messagebox.showwarning(
                    "未命名",
                    "没填界面名 —— 这次不写盘。\n"
                    "请在顶部「界面名」框填好名字，再按 ESC。")
                return
            scr_var.set(sid)
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"src": path.replace("\\", "/"),
                       "screen": sid, "tag": a.tag,
                       "k": a.k, "scale": round(s, 4), "picks": picks},
                      f, ensure_ascii=False, indent=1)

    def to_img(ev):
        return int(round(ev.x / s)), int(round(ev.y / s))

    def redraw():
        disp = state["im"] if s >= 1.0 else state["im"].resize(
            (int(state["im"].width * s), int(state["im"].height * s)), Image.LANCZOS)
        state["tkimg"] = ImageTk.PhotoImage(disp)
        cv.delete("all")
        cv.create_image(0, 0, anchor="nw", image=state["tkimg"])
        for p in picks:
            px, py = p["x"] * s, p["y"] * s
            cv.create_oval(px - 9, py - 9, px + 9, py + 9, outline="#ff2d55", width=3)
            cv.create_line(px - 15, py, px + 15, py, fill="#ff2d55")
            cv.create_line(px, py - 15, px, py + 15, fill="#ff2d55")
            cv.create_text(px + 18, py - 18, anchor="w", text="#%d %s" % (p["n"], p["grade"]),
                           fill="#ff2d55", font=("Consolas", 11, "bold"))
            if p.get("name"):
                cv.create_text(px + 18, py + 6, anchor="w", text=p["name"],
                               fill="#00d4ff", font=("Microsoft YaHei", 11, "bold"))

    def update_mag(x, y, ev=None):
        """在 (x,y) 处弹出放大镜：20x20 原图像素 → 8x NEAREST。"""
        if not (0 <= x < state["im"].width and 0 <= y < state["im"].height):
            mag.place_forget()
            return
        h = MAG_N // 2
        cx0 = max(0, min(state["im"].width - MAG_N, x - h))
        cy0 = max(0, min(state["im"].height - MAG_N, y - h))
        box = state["im"].crop((cx0, cy0, cx0 + MAG_N, cy0 + MAG_N))
        state["magtk"] = ImageTk.PhotoImage(box.resize((MAG_PX, MAG_PX), Image.NEAREST))
        mag.delete("all")
        mag.create_image(1, 1, anchor="nw", image=state["magtk"])
        # 中心像素：绿色框 + 红色十字
        gx, gy = (x - cx0) * MAG_Z + 1, (y - cy0) * MAG_Z + 1
        mag.create_rectangle(gx, gy, gx + MAG_Z, gy + MAG_Z, outline="#00ff88", width=2)
        mag.create_line(gx + MAG_Z // 2, 0, gx + MAG_Z // 2, MAG_PX + 2, fill="#ff2d55")
        mag.create_line(0, gy + MAG_Z // 2, MAG_PX + 2, gy + MAG_Z // 2, fill="#ff2d55")
        # 位置：优先鼠标右下，越界翻边
        mx = ev.x + 26 if ev else 0
        my = ev.y + 26 if ev else 0
        if ev and mx + MAG_PX + 6 > root.winfo_width():
            mx = ev.x - MAG_PX - 26
        if ev and my + MAG_PX + 6 > root.winfo_height():
            my = ev.y - MAG_PX - 26
        mag.place(x=max(0, mx), y=max(0, my))

    def show(x, y):
        med, std = sample(state["im"], x, y, a.k)
        px1 = state["im"].getpixel((x, y))
        hint("(%4d,%4d)  单点RGB%-15s  %dx%d中位RGB%-15s std%5.2f %s"
             % (x, y, str(px1), a.k, a.k, str(med), std, grade(std)))
        return med, std

    def hint(txt):
        bar.config(text="%s  |  [%s/%s] 已记录 %d   鼠标=放大镜  R=刷新 E=清空 ←↑↓→=微调 ESC=退出"
                        % (txt, a.screen or "-", a.tag, len(picks)))

    def on_move(ev):
        x, y = to_img(ev)
        state["cur"] = (x, y)
        if 0 <= x < state["im"].width and 0 <= y < state["im"].height:
            show(x, y)
            update_mag(x, y, ev)

    def on_click(ev):
        x, y = to_img(ev)
        if not (0 <= x < state["im"].width and 0 <= y < state["im"].height):
            return
        med, std = sample(state["im"], x, y, a.k)
        g = grade(std)
        # 命名（可留空）：名字直接进图谱，作为该界面可点动作名
        nm = simpledialog.askstring(
            "这个点是什么？",
            "【留空】= 比色特征点（请点在纯色区，否则会被拦）\n"
            "【填名字】= 按钮（位置准即可，std 大没关系）\n"
            "名字例：活动 / 背包 / 挂机 / 关闭键 / 货运_参加",
            initialvalue=last["name"], parent=root)
        nm = (nm or "").strip()
        if nm:
            last["name"] = nm
        picks.append({"n": len(picks) + 1, "x": x, "y": y, "rgb": med,
                      "std": round(std, 2), "grade": g, "tag": a.tag, "name": nm})
        write()
        redraw()
        print("[%s/%s #%d] (%d,%d) RGB%s std=%.2f %s  name=%s"
              % (a.screen or "-", a.tag, len(picks), x, y, med, std, g, nm or "-"), flush=True)
        hint("已记录 #%d (%d,%d) %s RGB%s std%.2f %s"
             % (len(picks), x, y, nm or "", med, std, g))

    def nudge(dx, dy):
        x, y = state["cur"]
        x, y = max(0, min(state["im"].width - 1, x + dx)), max(0, min(state["im"].height - 1, y + dy))
        state["cur"] = (x, y)
        cv.event_generate("<Motion>", x=int(x * s), y=int(y * s))
        show(x, y)
        update_mag(x, y)

    def reload_img(_ev=None):
        try:
            state["im"] = Image.open(path).convert("RGB")
            redraw()
            hint("已重新载入")
        except Exception as e:  # noqa: BLE001
            hint("重载失败: %s" % e)

    def clear(_ev=None):
        picks[:] = []
        write()
        redraw()
        hint("已清空")

    cv.bind("<Motion>", on_move)
    cv.bind("<Button-1>", on_click)
    cv.bind("<Leave>", lambda e: mag.place_forget())
    for key, d in (("<Left>", (-1, 0)), ("<Right>", (1, 0)), ("<Up>", (0, -1)), ("<Down>", (0, 1))):
        root.bind(key, lambda e, d=d: nudge(*d))
    root.bind("<r>", reload_img)
    root.bind("<R>", reload_img)
    root.bind("<e>", clear)
    root.bind("<E>", clear)
    root.bind("<Escape>", lambda e: root.destroy())

    redraw()
    write()
    hint("准备就绪")
    print("窗口已打开 %s screen=%s tag=%s 缩放%.3f 放大镜 %dx%d→%dx%d" %
          (path, a.screen or "-", a.tag, s, MAG_N, MAG_N, MAG_PX, MAG_PX), flush=True)
    root.mainloop()
    print("退出。共 %d 点 → %s" % (len(picks), out), flush=True)


if __name__ == "__main__":
    main()

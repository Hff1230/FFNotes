#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""倩女幽魂手游 日常自动化主循环 —— PC 端 adb 驱动 + 运行时零 token 本地识别。

架构（依据 docs/方案-视觉层与反作弊.md 与实测回归）：
  截图(adb) → mapkit.recognize 三层级联（比色预筛 → OCR 关键词 → 未命中停手）
            → 安全护栏（界面白名单 + 危险区半径 + 动作后像素验证）
            → human_input 拟人点击（对数正态间隔 / 坐标抖动 / 零距离 swipe 造真实 DOWN→UP）

安全红线（硬编码，任何流程都绕不过）：
  · 永不点击：充值 / 商城 / 购买 / 月卡 / 礼包 / 元宝 / 仙玉 / 兑换 / 回收(销毁) /
    分解 / 放弃任务 / 离开队伍 / 摆摊 / 交易 / 删除角色
  · 新面板内部不盲点：只点「已量准的 ✕」与「白名单按钮」
  · 用户指令：福利 / 商城 / 易市(集市) / 下一订单 类界面 → 看到就关闭，不深入探索
  · 状态开关类按钮（挂机/跟随）点一次后必须点第二次还原

用法：
  python qnyh_run.py --check            # 体检：设备 / 坐标空间 / 图谱 / OCR / 红线表
  python qnyh_run.py --dry              # 巡检：截图+识别+报告，不点击（安全）
  python qnyh_run.py --close-panel      # 关闭当前面板（找 closer → 点 → 验证）
  python qnyh_run.py --flow 接货运任务    # 跑指定流程
  python qnyh_run.py --flow 领日常 --dry  # 流程 dry-run
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
from mapkit.recognize import Recognizer  # noqa: E402

SKILL_SCRIPTS = os.path.join(os.path.expanduser("~"), "AppData", "Local", "hermes",
                             "skills", "tools", "mobile-game-automation", "scripts")
CTL = os.path.join(os.path.expanduser("~"), "AppData", "Local", "hermes", "skills",
                   "tools", "adb-device-control", "scripts", "adbctl.py")

# 变化判定基准（技能实测）：HUD 本底动效 1.0~1.6%，有效点击 >5%
CHANGE_THR = 3.0          # 变化>40 的像素占比超过此值认为画面确实变了
SETTLE = 2.0              # 界面切换后等动画稳定（Unity 按钮刚出现时可能不可交互）

# ── 动作白名单（只有这些名字允许被点击）──
ALLOWED = {
    "集市", "福利", "活动", "商城", "任务", "队伍", "背包", "挂机",
    "取消跟随", "召唤跟随", "日常页签", "一条龙_参加", "货运任务_参加", "师门任务_参加",
    "立刻前往", "页签_日常", "页签_全部", "整理", "页签_装备",
}
# 这些即使在白名单语义上也永不点击（双保险）
FORBIDDEN = {"商城", "购买", "充值", "月卡", "礼包", "兑换", "回收",
             "放弃任务", "离开队伍", "更多操作", "分解", "摆摊", "交易", "删除角色"}


def load_human_input(serial):
    """载入技能的拟人输入层（模块级会解析 adb/serial，必须设好 PHONE 再 import）。"""
    os.environ["PHONE"] = serial
    if SKILL_SCRIPTS not in sys.path:
        sys.path.insert(0, SKILL_SCRIPTS)
    import human_input as HI
    return HI


ADB_BIN = os.path.join(os.path.dirname(CTL), "tools", "adb.exe")


def list_devices(state="device"):
    """解析 adb 原始输出（`serial\\tdevice`），返回 (在线列表, 原始行)。

    踩坑记录：原先解析 `adbctl.py devices` 的展示格式，而它的输出形如
    `  FML4C19C17007446       [device]  model=WLZ_AL10 ...` —— 用 `[device]` 标记、
    不含 tab，按 `\\tdevice` 匹配会**永远返回 0 台**（假报"无设备"）。
    adb 原始输出格式稳定，用它。
    raw 行同时用于诊断 offline / unauthorized。
    """
    try:
        out = subprocess.run([ADB_BIN, "devices"], capture_output=True,
                             timeout=60).stdout.decode("utf-8", "ignore")
    except Exception:  # noqa: BLE001
        return [], []
    ok, raw = [], []
    for l in out.splitlines():
        l = l.strip()
        if not l or l.startswith("List of"):
            continue
        raw.append(l)
        parts = l.split()
        if len(parts) >= 2 and parts[1] == state:
            ok.append(parts[0])
    return ok, raw


class Runner:
    def __init__(self, serial, dry=False, outdir=None):
        self.serial = serial
        self.dry = dry
        self.HI = load_human_input(serial)
        self.rec = Recognizer(os.path.join(ROOT, "map", "screens.json"))
        ts = time.strftime("%Y%m%d_%H%M%S")
        self.outdir = outdir or os.path.join(ROOT, "evidence", "run", ts)
        os.makedirs(self.outdir, exist_ok=True)
        self.n = 0
        self.last = None        # (screen_id, 帧)
        self.trace = []

    # ---------- 基础 ----------
    def log(self, msg):
        line = "[%s] %s" % (time.strftime("%H:%M:%S"), msg)
        print(line, flush=True)
        self.trace.append(line)

    def snap(self):
        self.n += 1
        p = os.path.join(self.outdir, "%03d.png" % self.n)
        self.HI.shot(p)
        with open(p, "rb") as f:
            bgr = cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)
        return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), p

    def see(self, img=None, verbose=False):
        img = img if img is not None else self.snap()[0]
        r = self.rec.identify(img, verbose=verbose)
        return r

    # ---------- 护栏 ----------
    def guard(self, xy, name, screen=None):
        """点击前护栏。返回 True 表示允许。"""
        screen = screen or (self.last[0] if self.last else None)
        if name and name not in ALLOWED:
            self.log("  ⛔ 拦截：动作「%s」不在白名单" % name)
            return False
        if name and name in FORBIDDEN:
            self.log("  ⛔ 拦截：「%s」在黑名单（永不点击）" % name)
            return False
        d = self.rec.is_danger(screen, xy) if screen else None
        if d:
            self.log("  ⛔ 拦截：坐标 %s 落在危险区「%s」（%s）" % (xy, d["name"], d["why"]))
            return False
        return True

    def change_pct(self, a, b, region=None):
        if a.shape != b.shape:
            return 100.0
        A, B = a, b
        if region:
            x0, y0, x1, y1 = region
            A, B = a[y0:y1, x0:x1], b[y0:y1, x0:x1]
        d = np.abs(A.astype(np.int16) - B.astype(np.int16)).max(axis=2)
        return float((d > 40).mean() * 100.0)

    def tap(self, xy, name=None, expect=None, region=None):
        """拟人点击 + 护栏 + 点后像素验证。expect=期望切换到的界面 id。"""
        screen = self.last[0] if self.last else None
        if not self.guard(xy, name, screen):
            return False
        before = self.last[1] if self.last else None
        if self.dry:
            self.log("  [dry] 本应点击 %s %s（当前 %s）" % (name or "", xy, screen))
            return True
        self.log("  点击 %s %s（当前界面 %s）" % (name or "?", xy, screen))
        self.HI.tap(int(xy[0]), int(xy[1]))
        time.sleep(SETTLE)
        after, path = self.snap()
        chg = self.change_pct(before, after) if before is not None else 100.0
        r = self.see(after)
        got = r["screen"]
        ok = True
        if expect:
            ok = (got == expect)
            self.log("    变化 %.2f%%（阈值 %.1f%%）→ 识别为 %s（期望 %s）%s"
                     % (chg, CHANGE_THR, got, expect, "✅" if ok else "❌"))
        else:
            self.log("    变化 %.2f%%（阈值 %.1f%%）→ 识别为 %s" % (chg, CHANGE_THR, got))
        if chg < CHANGE_THR and not ok:
            self.log("    ⚠ 画面几乎没变且界面不符预期 → 判定点击无效")
            ok = False
        self.last = (got, after)
        return ok

    def observe(self):
        """截一张、识别、更新状态。"""
        img, path = self.snap()
        r = self.see(img)
        self.last = (r["screen"], img)
        self.log("界面=%s  [%s %.2f]  %s" % (r["screen"], r["method"], r["confidence"], r["detail"]))
        return r

    # ---------- 能力 ----------
    def close_panel(self):
        """关闭当前面板：用图谱里的 closer 坐标 → 点 → 验证回到已知界面。"""
        if not self.last:
            self.observe()
        screen, before = self.last
        if screen is None:
            self.log("当前界面未识别，不敢乱点。请手动处理。")
            return False
        xy = self.rec.closer_xy(screen)
        if not xy:
            self.log("图谱里没有 %s 的关闭键坐标 → 不盲点" % screen)
            return False
        self.log("关闭 %s：✕ %s" % (screen, xy))
        if self.dry:
            self.log("  [dry] 本应点击 ✕")
            return True
        self.HI.tap(int(xy[0]), int(xy[1]))
        time.sleep(SETTLE)
        after, _ = self.snap()
        chg = self.change_pct(before, after)
        r = self.see(after)
        self.last = (r["screen"], after)
        self.log("  变化 %.2f%% → 现在 %s" % (chg, r["screen"]))
        return r["screen"] is not None and r["screen"] != screen

    def do_step(self, step):
        """step = {"from": 界面, "click": 动作名, "expect": 目标界面}"""
        if not self.last:
            self.observe()
        screen = self.last[0]
        if screen != step["from"]:
            self.log("跳过步骤（当前 %s，该步骤要求从 %s 出发）" % (screen, step["from"]))
            return False
        xy = self.rec.click_xy(step["from"], step["click"])
        if not xy:
            self.log("图谱里没有 %s.%s 的坐标" % (step["from"], step["click"]))
            return False
        return self.tap(xy, name=step["click"], expect=step.get("expect"))


# ── 流程表：每步 (从哪个界面, 点哪个已量准的动作, 期望到哪个界面) ──
FLOWS = {
    "接货运任务": [
        {"from": "hud", "click": "活动", "expect": "panel_activity"},
        {"from": "panel_activity", "click": "货运任务_参加", "expect": "hud"},
    ],
    "打开活动面板": [
        {"from": "hud", "click": "活动", "expect": "panel_activity"},
    ],
    "收起面板回HUD": [
        {"from": "panel_activity", "click": None, "expect": "hud"},
    ],
}


def cmd_check(args):
    devs, raw = list_devices()
    print("=== 体检 ===")
    print("在线设备: %s" % (devs or "无"))
    if raw and not devs:
        print("  ⚠ 检测到 USB 设备但状态不是 device（offline / unauthorized）:")
        for l in raw:
            print("     %s" % l)
    rec = Recognizer(os.path.join(ROOT, "map", "screens.json"))
    print("图谱: %d 界面 / %d 采样点 / tol=%d" % (len(rec.screens), len(rec.points), rec.tol))
    for sid, s in rec.screens.items():
        print("  %-16s 关键词 %-28s 可点动作 %-30s 关闭键 %s"
              % (sid, ",".join(k["key"] for k in s.get("keys", [])),
                 ",".join(s.get("clicks", {})) or "-", s.get("closer") or "-"))
    print("危险区登记 %d 条:" % sum(len(s.get("danger", [])) for s in rec.screens.values()))
    for sid, s in rec.screens.items():
        for d in s.get("danger", []):
            print("  %-16s %-10s %s  ← %s" % (sid, d["name"], d.get("xy"), d["why"]))
    print("OCR: %s" % ("可用" if rec.ocr is not None else "不可用"))
    if not devs:
        print("\n⚠ 无在线设备。请插 USB 线并在手机上允许 USB 调试；")
        print("  华为机 USB 易掉成 offline（很多线只有充电芯），不行就换线/换口。")
    return 0 if devs else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serial", default=os.environ.get("PHONE"))
    ap.add_argument("--dry", action="store_true", help="不真的点击")
    ap.add_argument("--check", action="store_true", help="只做体检")
    ap.add_argument("--dry-scan", dest="scan", action="store_true", help="巡检：识别当前界面并报告")
    ap.add_argument("--close-panel", dest="close", action="store_true")
    ap.add_argument("--flow", default=None)
    a = ap.parse_args()

    if a.check:
        return cmd_check(a)

    devs, raw = list_devices()
    serial = a.serial or (devs[0] if len(devs) == 1 else None)
    if not serial:
        print("没有可用设备（在线 %d 台）。先插线，或 --serial 指定。" % len(devs))
        for l in raw:
            print("  检测到: %s  ← 非 device 状态（需在手机上点『允许 USB 调试』）" % l)
        print("体检命令: python qnyh_run.py --check")
        return 1

    r = Runner(serial, dry=a.dry)
    r.log("serial=%s dry=%s 输出目录=%s" % (serial, a.dry, r.outdir))

    if a.close:
        r.observe()
        r.close_panel()
        return 0
    if a.flow:
        steps = FLOWS.get(a.flow)
        if not steps:
            print("未知流程 %s，可选: %s" % (a.flow, list(FLOWS)))
            return 1
        r.observe()
        for st in steps:
            r.do_step(st)
        r.observe()
        return 0

    # 默认：巡检（安全）
    r.observe()
    screen = r.last[0]
    if screen:
        print("\n当前界面 %s 的白名单动作: %s" % (screen, list(r.rec.screens[screen].get("clicks", {}))))
        print("关闭键: %s" % (r.rec.closer_xy(screen),))
    return 0


if __name__ == "__main__":
    sys.exit(main())

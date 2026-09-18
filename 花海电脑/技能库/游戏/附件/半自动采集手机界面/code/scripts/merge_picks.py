#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""merge_picks.py —— 把 pick_point.py 的人工取点合并进 map/screens.json。

人工建图链路:
    pick_point.py 取点/取关闭键  →  merge_picks.py 入库  →  recognize.py 比色直判

为什么需要「补采」这一步:
    图谱的比色点是【全局点】(points 数组)，每个界面都要在**同一个点集**上有签名
    (screens[id].color_sig)。人工只针对目标界面取点，其余界面的签名必须由脚本
    从它们的建图样本自动补采 —— 否则各界面签名长度不一致，整套比色立刻失效。

用法:
    python merge_picks.py <picks.json>              # dry-run：只报告判别力，不写盘
    python merge_picks.py <picks.json> --apply      # 写回 map/screens.json
    python merge_picks.py <picks.json> --apply --new-id welfare_signin --name "大神福利/签到"
说明:
    picks.json 由 pick_point.py 产出；--tag point 的点入比色点集，--tag close 的点入 closer。
"""
import argparse
import json
import os
import shutil
import sys
from datetime import datetime

import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

MAP = os.path.join(ROOT, "map", "screens.json")
GT = os.path.join(ROOT, "map", "ground_truth.json")
EV = os.path.join(ROOT, "evidence")


def imread_u(p):
    return cv2.cvtColor(cv2.imdecode(np.fromfile(p, dtype=np.uint8), cv2.IMREAD_COLOR),
                        cv2.COLOR_BGR2RGB)


def sample(img, x, y, k):
    h = k // 2
    y0, y1 = max(0, y - h), min(img.shape[0], y + h + 1)
    x0, x1 = max(0, x - h), min(img.shape[1], x + h + 1)
    box = img[y0:y1, x0:x1].reshape(-1, 3).astype(np.float32)
    return tuple(int(v) for v in np.median(box, axis=0)), float(box.std(axis=0).max())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("picks")
    ap.add_argument("--map", default=MAP)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--new-id", default=None, help="新界面 ID（图谱里没有时用）")
    ap.add_argument("--name", default="", help="新界面中文名")
    a = ap.parse_args()

    pk = json.load(open(a.picks, encoding="utf-8"))
    target = a.new_id or pk.get("screen") or ""
    tag = pk.get("tag", "point")
    k = int(pk.get("k", 11))
    pts = pk["picks"]
    print("取点文件: %s" % a.picks)
    print("目标界面: %s   类型: %s   点数: %d   采样窗: %dx%d" % (target, tag, len(pts), k, k))
    print("来源截图: %s" % pk.get("src"))
    if not target:
        print("✗ 缺少界面 ID（--new-id 或 picks.json 的 screen）")
        return 1

    m = json.load(open(a.map, encoding="utf-8"))
    gt = json.load(open(GT, encoding="utf-8")) if os.path.exists(GT) else {}
    gt = gt.get("scenes", gt)
    print("图谱现有界面: %d 个   全局点: %d 个" % (len(m["screens"]), len(m.get("points", []))))

    is_new = target not in m["screens"]
    print("%s 界面 %s" % ("＋新增" if is_new else "→ 已存在，将追加", target))

    if tag == "close":
        for p in pts:
            print("  关闭键候选 #%d (%d,%d) RGB%s std=%.2f %s"
                  % (p["n"], p["x"], p["y"], p["rgb"], p.get("std", -1), p.get("grade", "")))
        if a.apply:
            sid = target
            if is_new:
                m["screens"][sid] = {"name": a.name or sid, "purpose": "人工标注",
                                     "color_sig": [], "spec": [], "keys": [], "clicks": {},
                                     "closer": [], "danger": [], "anchors": [], "texts": []}
            m["screens"][sid]["closer"] = [[int(p["x"]), int(p["y"])] for p in pts]
            _save(a.map, m)
            print("✓ 已写入 closer")
        return 0

    # ---- tag=point：把人工点并入全局点集，并补采其它界面的签名 ----
    # ★ 两类点分开处理：
    #   带名字的 = 按钮位置 → 只登记 clicks，【不做】比色特征点
    #       （按钮中心多落在图标/文字上，std 必然大，当比色点会抖）
    #   无名字的 = 比色特征点 → 必须 std 小（落在纯色块深处）
    src = pk["src"]
    img = imread_u(src) if os.path.exists(src) else None
    new_index = []
    if is_new and a.apply:
        # point 分支同样要建界面壳，否则 clicks 无处可写（原来只有 close 分支建）
        m["screens"][target] = {"name": a.name or target, "purpose": "人工标注",
                                "color_sig": [], "spec": [], "keys": [], "clicks": {},
                                "closer": [], "danger": [], "anchors": [], "texts": []}
    for p in pts:
        nm = (p.get("name") or "").strip()
        if nm:
            # 带名字 = 按钮位置 → 只登记 clicks，不查 std
            # （按钮中心多落在图标/文字上，std 必然大，当比色点会抖）
            if a.apply:
                m["screens"][target].setdefault("clicks", {})[nm] = [int(p["x"]), int(p["y"])]
            print("  ⚑按钮 [%s] (%d,%d)" % (nm, p["x"], p["y"]))
            continue
        xy = [int(p["x"]), int(p["y"])]
        if xy in [list(q) for q in m["points"]]:
            print("  跳过重复点 (%d,%d)" % (xy[0], xy[1]))
            continue
        med = p.get("rgb")
        std = p.get("std", 0.0)
        if med is None and img is not None:
            med, std = sample(img, xy[0], xy[1], k)
            med = list(med)
        if a.apply:
            m["points"].append(xy)
        new_index.append((len(m["points"]) - 1 if a.apply else -1, xy, med, std, p.get("grade")))
        print("  ＋点 (%4d,%4d) RGB%s std=%.2f %s" % (xy[0], xy[1], med, std, p.get("grade", "")))

    if not new_index:
        print("没有新点，结束")
        return 0

    # ---- 判别力校验（dry-run 也跑）：新点的色值不能与「其它界面」在同位置撞色 ----
    tol = m.get("tol", 6)
    print("\n判别力校验（tol=%d，对比其它界面在同位置的采样色）:" % tol)
    bad = 0
    bad_xy = set()      # 收集不合格点 → 循环后【真剔除】（只打印不剔除 = 没校验）
    for i, xy, med, std, g in new_index:
        worst, who = 999, None
        for sid in m["screens"]:
            if sid == target:
                continue
            for f in [x for x in gt.get(sid, []) if os.path.exists(os.path.join(EV, x))][:4]:
                c, _ = sample(imread_u(os.path.join(EV, f)), xy[0], xy[1], k)
                d = max(abs(c[0] - med[0]), abs(c[1] - med[1]), abs(c[2] - med[2]))
                if d < worst:
                    worst, who = d, "%s/%s" % (sid, f)
        if std > 6.0:
            bad += 1
            bad_xy.add(tuple(xy))
            print("  ✗ (%4d,%4d) RGB%s std%.1f —— 不在纯色区（std>6），比色会抖 → 请换位置"
                  % (xy[0], xy[1], med, std))
            continue
        if std > 2.5:
            print("  ⚠ (%4d,%4d) RGB%s std%.1f —— 非纯色（勉强可用），优先换 ★★★ 处"
                  % (xy[0], xy[1], med, std))
        if worst <= tol:
            bad += 1
            bad_xy.add(tuple(xy))
            print("  ✗ (%4d,%4d) RGB%s —— 与 %s 色差仅 %d ≤ tol → **该点会误命中**！"
                  % (xy[0], xy[1], med, who, worst))
        elif worst <= tol * 3:
            print("  ⚠ (%4d,%4d) RGB%s —— 最小色差 %d（偏近，建议换位置）"
                  % (xy[0], xy[1], med, worst))
        else:
            print("  ✓ (%4d,%4d) RGB%s std%.1f —— 最小色差 %d，判别力良好"
                  % (xy[0], xy[1], med, std, worst))
    print("  结论: %s" % ("全部可用 ✓" if bad == 0 else "★ %d 个点会误命中，建议重新取点" % bad))

    # ★ 真剔除：坏点不能留在 new_index，更不能留在 m["points"]。
    #   只打印 ✗ 不剔除的后果实测过：点集 16→21、各界面签名长度不齐 → (21,3)/(0,) 广播失败 → 识别器崩。
    if bad_xy:
        before = len(new_index)
        new_index = [it for it in new_index if tuple(it[1]) not in bad_xy]
        print("  已剔除 %d 个不合格点（%d → %d）" % (before - len(new_index), before, len(new_index)))
        if a.apply:
            m["points"] = [q for q in m["points"] if tuple(q) not in bad_xy]
            print("  已从全局点集撤回坏点，现有点 %d 个" % len(m["points"]))
    if not new_index:
        if a.apply:
            _save(a.map, m)      # 按钮 clicks 仍要落盘
            print("  无比色特征点，但按钮已登记 → 已写盘")
        return 0

    # 补采：每个界面在该点上的色值（多候选 = 各样本的中位数色）
    print("\n补采其它界面的签名（每界面最多 4 张样本）...")
    for sid in m["screens"]:
        if sid not in gt:
            print("  警告: %s 无建图样本，签名用占位（该点对该界面无判别力）" % sid)
            continue
        files = [f for f in gt[sid] if os.path.exists(os.path.join(EV, f))][:4]
        if not files:
            continue
        candidates = {}
        for xy in [n[1] for n in new_index]:
            cs = set()
            for f in files:
                c, _ = sample(imread_u(os.path.join(EV, f)), xy[0], xy[1], k)
                cs.add(tuple(c))
            candidates[tuple(xy)] = [list(c) for c in cs]
        print("  %-16s 已采 %d 点 × %d 样本" % (sid, len(new_index), len(files)))
        if a.apply:
            sig = m["screens"][sid].setdefault("color_sig", [])
            while len(sig) < len(m["points"]) - len(new_index):
                sig.append([])
            for i, xy, med, std, g in [(len(m["points"]) - len(new_index) + j, n[1], n[2], n[3], n[4])
                                       for j, n in enumerate(new_index)]:
                sig.append(candidates[tuple(xy)])

    # ---- 带名字的点同时登记为该界面的可点动作 clicks[name] ----
    named = [p for p in pts if (p.get("name") or "").strip()]
    if named:
        if is_new:
            m["screens"][target] = {"name": a.name or target, "purpose": "人工标注",
                                    "color_sig": [], "spec": [], "keys": [], "clicks": {},
                                    "closer": [], "danger": [], "anchors": [], "texts": []}
        clicks = m["screens"][target].setdefault("clicks", {})
        print("\n可点动作（写入 clicks）:")
        for p in named:
            clicks[p["name"].strip()] = [int(p["x"]), int(p["y"])]
            print("  %-16s → (%d,%d)" % (p["name"].strip(), p["x"], p["y"]))

    if a.apply:
        # 目标界面用人工实测色作为首选候选
        sig = m["screens"][target].setdefault("color_sig", [])
        while len(sig) < len(m["points"]) - len(new_index):
            sig.append([])
        for n in new_index:
            sig.append([n[2]])
        if is_new and not m["screens"][target].get("keys"):
            m["screens"][target]["purpose"] = "人工比色标注（无 OCR 关键词，纯图色判别）"
        _save(a.map, m)
        print("\n✓ 已写回 %s" % a.map)
    else:
        print("\n(dry-run，未写盘；加 --apply 生效)")
    return 0


def _save(path, m):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    bak = os.path.join(ROOT, "Tools", "backup", ts)
    os.makedirs(bak, exist_ok=True)
    if os.path.exists(path):
        shutil.copy2(path, os.path.join(bak, os.path.basename(path)))
        print("  备份 → Tools/backup/%s" % ts)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    sys.exit(main())

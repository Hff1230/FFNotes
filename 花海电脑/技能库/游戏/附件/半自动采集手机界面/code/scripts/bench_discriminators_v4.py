# -*- coding: utf-8 -*-
"""判别器 v4（终版标定）：比色采样点必须落在纯色块【深处】
   对比两种色度量：raw RGB 距离 vs 亮度归一化色度距离
"""
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import PIL.ImageFilter as IF
import cv2

W, H = 1600, 720
FONT = "C:/Windows/Fonts/msyh.ttc"
F52, F40 = ImageFont.truetype(FONT, 52), ImageFont.truetype(FONT, 40)


def build_screen(title, buttons, accent):
    im = Image.new("RGB", (W, H), (22, 26, 38))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 92], fill=(34, 40, 58))
    d.text((40, 18), title, font=F52, fill=(240, 240, 248))
    d.rectangle([1180, 120, 1560, 620], fill=(30, 35, 50))
    d.rectangle([1180, 120, 1560, 170], fill=accent)
    for i, (bid, label, col) in enumerate(buttons):
        x, y = 120 + (i % 3) * 340, 180 + (i // 3) * 150
        d.rounded_rectangle([x, y, x + 280, y + 104], 18, fill=col)
        d.text((x + 40, y + 26), label, font=F40, fill=(250, 250, 250))
    return im


SCREENS = {
    "主HUD": build_screen("倩女幽魂", [("b1", "日常", (196, 62, 62)), ("b2", "任务", (62, 132, 196)),
                                   ("b3", "背包", (196, 152, 62))], (196, 62, 62)),
    "日常":  build_screen("日常任务", [("b1", "签到", (62, 176, 122)), ("b2", "领取", (196, 152, 62)),
                                   ("b3", "一键", (150, 62, 196))], (62, 176, 122)),
    "背包":  build_screen("背包", [("b1", "装备", (120, 90, 62)), ("b2", "材料", (90, 120, 62)),
                                   ("b3", "出售", (196, 62, 62))], (120, 90, 62)),
    "商城":  build_screen("商城", [("b1", "充值", (232, 184, 42)), ("b2", "礼包", (232, 120, 42)),
                                   ("b3", "兑换", (232, 60, 120))], (232, 184, 42)),
    "任务":  build_screen("任务追踪", [("b1", "追踪", (62, 196, 220)), ("b2", "放弃", (140, 140, 140)),
                                   ("b3", "前往", (62, 132, 196))], (62, 196, 220)),
    "角色":  build_screen("角色属性", [("b1", "加点", (196, 62, 152)), ("b2", "技能", (62, 62, 196)),
                                   ("b3", "坐骑", (152, 196, 62))], (196, 62, 152)),
}


def perturb(im, kind):
    if kind == "shift":
        return im.transform(im.size, Image.AFFINE, (1, 0, -4, 0, 1, -3))
    if kind == "noise":
        a = np.asarray(im, np.int16) + np.random.normal(0, 7, (im.height, im.width, 3))
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    if kind == "bright":
        return Image.fromarray(np.clip(np.asarray(im, np.float32) * 1.10, 0, 255).astype(np.uint8))
    if kind == "blur":
        return im.filter(IF.GaussianBlur(1.1))
    raise ValueError(kind)


def pick_points(imgs, n=12, min_dist=80, flat_k=11, flat_thr=1.0, need=12):
    """flat_k x flat_k 窗口内的跨屏最大标准差 < flat_thr → 该点在所有屏上都处于纯色块深处"""
    a = np.stack([np.asarray(im, np.float32) for im in imgs])
    N = len(imgs)
    sep = np.full((H, W), 1e9, np.float32)
    for i in range(N):
        for j in range(i + 1, N):
            sep = np.minimum(sep, np.abs(a[i] - a[j]).mean(axis=2))
    flat = np.zeros((H, W), np.float32)
    for i in range(N):
        g = a[i].mean(axis=2)
        m = cv2.blur(g, (flat_k, flat_k))
        s = np.sqrt(np.maximum(cv2.blur(g * g, (flat_k, flat_k)) - m * m, 0))
        flat = np.maximum(flat, s)
    sc = sep.copy()
    sc[flat > flat_thr] = -1
    sc[:8, :] = sc[-8:, :] = -1
    sc[:, :8] = sc[:, -8:] = -1
    pts = []
    for _ in range(n):
        y, x = np.unravel_index(np.argmax(sc), sc.shape)
        if sc[y, x] < need:
            break
        pts.append((int(x), int(y)))
        sc[max(0, y - min_dist):y + min_dist, max(0, x - min_dist):x + min_dist] = -1
    return pts, sep


def chroma(a):
    """亮度归一化色度：(R,G,B)/max(1,mean) —— 抗整体亮度漂移"""
    a = a.astype(np.float32)
    m = np.maximum(a.mean(axis=-1, keepdims=True), 1.0)
    return a / m


def sig_raw(im, pts):
    a = np.asarray(im, np.uint8)
    return np.array([a[y, x] for x, y in pts], np.int16)


def sig_chr(im, pts):
    a = np.asarray(im, np.uint8)
    return chroma(np.array([a[y, x] for x, y in pts]))


def m_raw(s1, s2, tol):
    return float(np.mean(np.all(np.abs(s1 - s2) <= tol, axis=1)))


def m_chr(s1, s2, tol):
    return float(np.mean(np.abs(s1 - s2).max(axis=1) <= tol))


def main():
    np.random.seed(11)
    names = list(SCREENS)
    imgs = [SCREENS[n] for n in names]

    for flat_k, flat_thr in ((3, 2.5), (11, 1.0), (21, 0.6)):
        pts, sep = pick_points(imgs, n=12, flat_k=flat_k, flat_thr=flat_thr)
        print("=" * 76)
        print(f"平坦窗口 {flat_k}x{flat_k} (阈值{flat_thr}) → 选出 {len(pts)} 点")
        if not pts:
            print("  无合格点（纯色块不足）")
            continue
        # raw
        for tol in (22, 35):
            Sr = {n: sig_raw(SCREENS[n], pts) for n in names}
            intra = min(min(m_raw(Sr[n], sig_raw(perturb(SCREENS[n], k), pts), tol)
                            for k in ("shift", "noise", "bright", "blur")) for n in names)
            inter = max(m_raw(Sr[a], Sr[b], tol) for i, a in enumerate(names) for b in names[i + 1:])
            print(f"  rawRGB  容差{tol:>3}: 类内最差 {intra:.2f} vs 类间最好 {inter:.2f}  "
                  f"{'✅ 阈值区间 (' + format(inter, '.2f') + ', ' + format(intra, '.2f') + ']' if intra > inter else '❌ 重叠'}")
        # chroma
        for tol in (0.12, 0.20):
            Sc = {n: sig_chr(SCREENS[n], pts) for n in names}
            intra = min(min(m_chr(Sc[n], sig_chr(perturb(SCREENS[n], k), pts), tol)
                            for k in ("shift", "noise", "bright", "blur")) for n in names)
            inter = max(m_chr(Sc[a], Sc[b], tol) for i, a in enumerate(names) for b in names[i + 1:])
            print(f"  色度归一 容差{tol:.2f}: 类内最差 {intra:.2f} vs 类间最好 {inter:.2f}  "
                  f"{'✅ 阈值区间 (' + format(inter, '.2f') + ', ' + format(intra, '.2f') + ']' if intra > inter else '❌ 重叠'}")
        print()


if __name__ == "__main__":
    main()

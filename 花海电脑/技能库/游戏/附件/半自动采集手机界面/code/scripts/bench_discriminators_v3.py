# -*- coding: utf-8 -*-
"""判别器 v3：最终选型标定
   1) 比色选点 = 跨屏色差最大化 + 【局部平坦约束】(排除文字/边缘) + 空间抑制
   2) cv2 模板匹配在 1/1、1/2、1/4 三档下的分离度与耗时 → 选最优档
   3) OCR ROI 索引修正后复测
"""
import os, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import PIL.ImageFilter as IF
import cv2
from rapidocr_onnxruntime import RapidOCR

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


def gray(im, k=1):
    if k > 1:
        im = im.resize((im.width // k, im.height // k), Image.BILINEAR)
    return np.asarray(im.convert("L"), np.float32)


# ---------- 1) 比色选点 v2：跨屏色差大 + 局部平坦 ----------
def pick_points(imgs, n=12, min_dist=70, flat_thr=2.5, need=6):
    a = np.stack([np.asarray(im, np.float32) for im in imgs])        # (N,H,W,3)
    # 跨屏'最小两两通道差'：越大说明这一像素越能区分任意两屏
    N = len(imgs)
    sep = np.full((H, W), 1e9, np.float32)
    for i in range(N):
        for j in range(i + 1, N):
            d = np.abs(a[i] - a[j]).mean(axis=2)
            sep = np.minimum(sep, d)
    # 局部平坦度：3x3 内标准差（取所有屏的最大值 → 保证在每个屏上都平坦）
    flat = np.zeros((H, W), np.float32)
    for i in range(N):
        g = a[i].mean(axis=2)
        m = cv2.blur(g, (3, 3))
        s = np.sqrt(np.maximum(cv2.blur(g * g, (3, 3)) - m * m, 0))
        flat = np.maximum(flat, s)
    score = sep.copy()
    score[flat > flat_thr] = -1          # 排除文字/边缘
    score[:6, :] = -1
    score[-6:, :] = -1
    score[:, :6] = -1
    score[:, -6:] = -1
    pts = []
    sc = score.copy()
    for _ in range(n):
        y, x = np.unravel_index(np.argmax(sc), sc.shape)
        if sc[y, x] < need:
            break
        pts.append((int(x), int(y)))
        sc[max(0, y - min_dist):y + min_dist, max(0, x - min_dist):x + min_dist] = -1
    return pts, sep, flat


def sig(im, pts):
    a = np.asarray(im, np.uint8)
    return np.array([a[y, x] for x, y in pts], np.int16)


def match(s1, s2, tol=22):
    return float(np.mean(np.all(np.abs(s1 - s2) <= tol, axis=1)))


def main():
    np.random.seed(11)
    names = list(SCREENS)
    imgs = [SCREENS[n] for n in names]

    print("=" * 76)
    print("1) 比色选点 v2（跨屏色差最大 + 局部平坦 + 空间抑制 >=70px）")
    print("=" * 76)
    pts, sep, flat = pick_points(imgs, n=12)
    print(f"  选出 {len(pts)} 个点: {pts}")
    print(f"  这些点的'跨屏最小色差'范围: "
          f"{min(sep[y,x] for x,y in pts):.1f} ~ {max(sep[y,x] for x,y in pts):.1f} (越大越能区分)")
    S = {n: sig(SCREENS[n], pts) for n in names}
    for tol in (22, 30, 40):
        intra = [min(match(S[n], sig(perturb(SCREENS[n], k), pts), tol)
                     for k in ("shift", "noise", "bright", "blur")) for n in names]
        inter = [match(S[a], S[b], tol) for i, a in enumerate(names) for b in names[i + 1:]]
        ok = min(intra) > max(inter)
        print(f"  容差{tol:>3}: 类内最差 {min(intra):.2f} ({names[int(np.argmin(intra))]})  "
              f"vs 类间最好 {max(inter):.2f}   "
              f"{'✅ 可用，阈值取 (%.2f, %.2f]' % (max(inter), min(intra)) if ok else '❌ 重叠'}")
    t0 = time.time()
    for _ in range(500):
        sig(SCREENS["主HUD"], pts)
    print(f"  单次签名提取耗时: {(time.time()-t0)/500*1000:.2f}ms")

    print()
    print("=" * 76)
    print("2) cv2 模板匹配：三档降采样下的 分离度 / 耗时")
    print("=" * 76)
    tpl_full = np.asarray(SCREENS["主HUD"].convert("L"), np.uint8)[195:255, 140:260]
    for k in (1, 2, 4):
        tpl = (tpl_full if k == 1 else
               np.asarray(Image.fromarray(tpl_full).resize(
                   (tpl_full.shape[1] // k, tpl_full.shape[0] // k), Image.BILINEAR),
                   np.float32))
        t0 = time.time()
        for _ in range(5):
            cv2.matchTemplate(gray(SCREENS["主HUD"], k), tpl.astype(np.float32), cv2.TM_CCOEFF_NORMED)
        dt = (time.time() - t0) / 5 * 1000
        intra = [float(cv2.matchTemplate(gray(perturb(SCREENS["主HUD"], kk), k),
                                         tpl.astype(np.float32), cv2.TM_CCOEFF_NORMED).max())
                 for kk in ("shift", "noise", "bright", "blur")]
        inter = [float(cv2.matchTemplate(gray(SCREENS[n], k), tpl.astype(np.float32),
                                         cv2.TM_CCOEFF_NORMED).max())
                 for n in names if n != "主HUD"]
        margin = min(intra) - max(inter)
        print(f"  1/{k}: 耗时 {dt:6.1f}ms  类内最差 {min(intra):.3f}  类间最好 {max(inter):.3f}  "
              f"裕度 {margin:+.3f}  {'✅' if margin > 0.15 else '⚠ 裕度偏小' if margin > 0 else '❌'}")

    print()
    print("=" * 76)
    print("3) OCR ROI 模式（use_det=False）复测 —— 索引 res[0][0]")
    print("=" * 76)
    eng = RapidOCR()
    for name in ("日常", "背包", "主HUD"):
        roi = SCREENS[name].crop((30, 10, 420, 88))
        eng(np.asarray(roi), use_det=False, use_cls=False, use_rec=True)
        t0 = time.time()
        res, _ = eng(np.asarray(roi), use_det=False, use_cls=False, use_rec=True)
        dt = (time.time() - t0) * 1000
        txt = res[0][0] if res else None
        conf = round(float(res[0][1]), 3) if res else None
        print(f"  {name:<6} roi={roi.size}  {dt:5.0f}ms  文本='{txt}' 置信={conf}")


if __name__ == "__main__":
    main()

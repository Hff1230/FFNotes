# -*- coding: utf-8 -*-
"""判别器 v2：修正 v1 的三个问题
   1) 比色 → 采样点改为【按信息量自动精选 + 空间抑制】，不用共享网格
   2) 模板匹配 → 换 cv2.matchTemplate (TM_CCOEFF_NORMED) 提速
   3) OCR ROI 模式 → 修正返回结构索引并验证真实文本
"""
import os, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2
from rapidocr_onnxruntime import RapidOCR

W, H = 1600, 720
FONT = "C:/Windows/Fonts/msyh.ttc"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "evidence")
os.makedirs(OUT, exist_ok=True)
F52, F40 = ImageFont.truetype(FONT, 52), ImageFont.truetype(FONT, 40)


def build_screen(title, buttons, accent, panel=True):
    im = Image.new("RGB", (W, H), (22, 26, 38))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 92], fill=(34, 40, 58))
    d.text((40, 18), title, font=F52, fill=(240, 240, 248))
    if panel:
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
import PIL.ImageFilter as IF


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


def down(im, k=4):
    """降采样加速模板匹配（按键精灵也常用这招）"""
    return np.asarray(im.convert("L").resize((im.width // k, im.height // k),
                                             Image.BILINEAR), np.float32)


# ---------- 1) 比色：按信息量自动选点 + 空间抑制 ----------
def pick_points(imgs, n=12, min_dist=60):
    a = np.stack([np.asarray(im, np.float32) for im in imgs])   # (N,H,W,3)
    var = a.std(axis=0).mean(axis=2)                            # 每像素跨屏差异
    pts, flat = [], var.copy()
    for _ in range(n):
        y, x = np.unravel_index(np.argmax(flat), flat.shape)
        pts.append((int(x), int(y)))
        y0, y1 = max(0, y - min_dist), min(H, y + min_dist)
        x0, x1 = max(0, x - min_dist), min(W, x + min_dist)
        flat[y0:y1, x0:x1] = -1
    return pts


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
    print("1) 多点比色 —— 采样点按【跨屏信息量】自动精选 + 空间抑制(间距>=60px)")
    print("=" * 76)
    pts = pick_points(imgs, n=12)
    print("  自动选出的 12 个点:", pts)
    S = {n: sig(SCREENS[n], pts) for n in names}
    intra = [min(match(S[n], sig(perturb(SCREENS[n], k), pts))
                 for k in ("shift", "noise", "bright", "blur")) for n in names]
    inter = [match(S[a], S[b]) for i, a in enumerate(names) for b in names[i + 1:]]
    for n, v in zip(names, intra):
        print(f"    类内 {n:<8} 最差匹配率 {v:.2f}")
    print(f"  → 类内最差 {min(intra):.2f}  vs  类间最好 {max(inter):.2f}   "
          f"{'✅ 有阈值区间' if min(intra) > max(inter) else '❌ 仍重叠'}")
    # 代价
    t0 = time.time()
    for _ in range(1000):
        sig(SCREENS["主HUD"], pts)
    print(f"  单次签名提取 (1600x720 numpy 索引): {(time.time()-t0)/1000*1000:.2f}ms")

    print()
    print("=" * 76)
    print("2) 模板匹配 cv2.matchTemplate(TM_CCOEFF_NORMED)，全屏搜索 1600x720 → 降采样1/4")
    print("=" * 76)
    tpl_full = np.asarray(SCREENS["主HUD"].convert("L"), np.float32)[195:255, 140:260]
    for k in (1, 2, 4):
        tpl = np.asarray(Image.fromarray(tpl_full.astype(np.uint8)).resize(
            (tpl_full.shape[1] // k, tpl_full.shape[0] // k)), np.float32)
        t0 = time.time()
        r = cv2.matchTemplate(down(SCREENS["主HUD"], k), tpl, cv2.TM_CCOEFF_NORMED)
        dt = (time.time() - t0) * 1000
        print(f"  降采样 1/{k}  搜索区 {down(SCREENS['主HUD'],k).shape[::-1]}  "
              f"模板 {tpl.shape[::-1]}  峰值={r.max():.3f}  耗时={dt:.1f}ms")
    k = 4
    tpl = np.asarray(Image.fromarray(tpl_full.astype(np.uint8)).resize(
        (tpl_full.shape[1] // k, tpl_full.shape[0] // k)), np.float32)
    intraB, interB = [], []
    print("  分离度 (1/4 降采样)：")
    for kind in ("shift", "noise", "bright", "blur"):
        v = cv2.matchTemplate(down(perturb(SCREENS["主HUD"], kind), k), tpl,
                              cv2.TM_CCOEFF_NORMED).max()
        intraB.append(float(v))
        print(f"    类内 主HUD+{kind:<7} 峰值={v:.3f}")
    for n in names:
        if n == "主HUD":
            continue
        v = cv2.matchTemplate(down(SCREENS[n], k), tpl, cv2.TM_CCOEFF_NORMED).max()
        interB.append(float(v))
        print(f"    类间 {n:<8} 峰值={v:.3f}")
    print(f"  → 类内最差 {min(intraB):.3f}  vs  类间最好 {max(interB):.3f}   "
          f"{'✅ 分离优秀' if min(intraB) > max(interB) else '⚠ 重叠'}")

    print()
    print("=" * 76)
    print("3) OCR ROI 模式：修正索引 + 验证真实文本 + 延迟")
    print("=" * 76)
    eng = RapidOCR()
    for name, box in (("日常", (30, 10, 340, 86)), ("倩女幽魂", (30, 10, 420, 86)),
                      ("背包", (30, 10, 260, 86))):
        roi = SCREENS[name].crop(box)
        eng(np.asarray(roi), use_det=False, use_cls=False, use_rec=True)  # warm
        t0 = time.time()
        res, _ = eng(np.asarray(roi), use_det=False, use_cls=False, use_rec=True)
        dt = (time.time() - t0) * 1000
        print(f"  {name:<6} roi={roi.size}  {dt:.0f}ms  返回={res}")


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""界面判别器实测：在真实游戏分辨率 1600x720 上对比三种方案
   A. 多点比色 (multi-point color signature)   —— 按键精灵"比色"那一套
   B. 局部模板匹配 NCC (ROI 内找图)             —— 按键精灵"找图"那一套
   C. OCR 仅识别模式(use_det=False) 的 ROI 延迟 —— 关键字匹配那一套

输出每个方法的【类内最差分 vs 类间最好分】→ 有没有可用阈值区间。
"""
import os, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from numpy.lib.stride_tricks import sliding_window_view

W, H = 1600, 720
FONT = "C:/Windows/Fonts/msyh.ttc"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "evidence")
os.makedirs(OUT, exist_ok=True)
F52 = ImageFont.truetype(FONT, 52)
F40 = ImageFont.truetype(FONT, 40)


def build_screen(title, buttons, accent, panel=True):
    """合成一个'游戏界面'：深色底 + 标题栏 + 若干异色按钮 + 侧面板"""
    im = Image.new("RGB", (W, H), (22, 26, 38))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 92], fill=(34, 40, 58))              # 标题栏
    d.text((40, 18), title, font=F52, fill=(240, 240, 248))
    if panel:
        d.rectangle([1180, 120, 1560, 620], fill=(30, 35, 50))  # 右侧面板
        d.rectangle([1180, 120, 1560, 170], fill=accent)
    for i, (bid, label, col) in enumerate(buttons):
        x, y = 120 + (i % 3) * 340, 180 + (i // 3) * 150
        d.rounded_rectangle([x, y, x + 280, y + 104], 18, fill=col)
        d.text((x + 40, y + 26), label, font=F40, fill=(250, 250, 250))
    return im


SCREENS = {
    "主HUD":  build_screen("倩女幽魂", [("b1", "日常", (196, 62, 62)), ("b2", "任务", (62, 132, 196)),
                                      ("b3", "背包", (196, 152, 62))], (196, 62, 62)),
    "日常":   build_screen("日常任务", [("b1", "签到", (62, 176, 122)), ("b2", "领取", (196, 152, 62)),
                                      ("b3", "一键", (150, 62, 196))], (62, 176, 122)),
    "背包":   build_screen("背包", [("b1", "装备", (120, 90, 62)), ("b2", "材料", (90, 120, 62)),
                                      ("b3", "出售", (196, 62, 62))], (120, 90, 62)),
    "商城":   build_screen("商城", [("b1", "充值", (232, 184, 42)), ("b2", "礼包", (232, 120, 42)),
                                      ("b3", "兑换", (232, 60, 120))], (232, 184, 42)),
    "任务":   build_screen("任务追踪", [("b1", "追踪", (62, 196, 220)), ("b2", "放弃", (140, 140, 140)),
                                      ("b3", "前往", (62, 132, 196))], (62, 196, 220)),
    "角色":   build_screen("角色属性", [("b1", "加点", (196, 62, 152)), ("b2", "技能", (62, 62, 196)),
                                      ("b3", "坐骑", (152, 196, 62))], (196, 62, 152)),
}

# 类内扰动：整体偏移 / 噪声 / 亮度压缩 —— 模拟真实"同一屏但每帧不同"
def perturb(im, kind):
    if kind == "shift":
        return im.transform(im.size, Image.AFFINE, (1, 0, -4, 0, 1, -3))
    if kind == "noise":
        a = np.asarray(im, np.int16) + np.random.normal(0, 7, (im.height, im.width, 3))
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    if kind == "bright":
        return Image.fromarray(np.clip(np.asarray(im, np.float32) * 1.10, 0, 255).astype(np.uint8))
    if kind == "jpegish":   # 轻微模糊 + 噪声，模拟视频流/压缩
        return im.filter(__import__("PIL.ImageFilter", fromlist=["x"]).GaussianBlur(1.1))
    raise ValueError(kind)


# ---------------- A. 多点比色 ----------------
# 采样点：故意落在"有区分度"的元素上（标题文字区、按钮色块、面板色）
PTS = [(60, 30), (200, 46), (400, 46), (1240, 140), (1300, 140),
       (150, 200), (300, 230), (420, 230), (150, 350), (420, 380),
       (150, 500), (420, 530)]
TOL = 22   # 每通道容差


def color_sig(im):
    a = np.asarray(im, np.uint8)
    return np.array([a[y, x] for x, y in PTS], np.int16)


def color_match(s1, s2):
    """返回匹配点比例"""
    return float(np.mean(np.all(np.abs(s1 - s2) <= TOL, axis=1)))


# ---------------- B. 局部模板匹配 NCC ----------------
def ncc_max(img2d, tmpl2d, chunk=24):
    """在 img 中搜索 tmpl，返回最大 NCC。分块避免内存爆炸。"""
    th, tw = tmpl2d.shape
    hh, ww = img2d.shape
    tf = tmpl2d.ravel().astype(np.float32)
    tf -= tf.mean()
    tn = np.linalg.norm(tf) or 1e-6
    best = -1.0
    for y0 in range(0, hh - th + 1, chunk):
        y1 = min(y0 + chunk, hh - th + 1)
        win = sliding_window_view(img2d[y0:y1 + th - 1], (th, tw))
        wf = win.reshape(-1, th * tw).astype(np.float32)
        wf -= wf.mean(axis=1, keepdims=True)
        den = np.linalg.norm(wf, axis=1) * tn
        den[den == 0] = 1e-6
        best = max(best, float((wf @ tf / den).max()))
    return best


def band(im, x0, y0, x1, y1):
    return np.asarray(im.convert("L"), np.float32)[y0:y1, x0:x1]


# ---------------- 主流程 ----------------
def main():
    np.random.seed(11)
    names = list(SCREENS)
    print("=" * 74)
    print("A. 多点比色  12 点 / 每通道容差 %d" % TOL)
    print("=" * 74)
    sigs = {n: color_sig(SCREENS[n]) for n in names}
    intra = []
    print("  类内（同屏 + 扰动）：")
    for n in names:
        vs = [color_match(sigs[n], color_sig(perturb(SCREENS[n], k)))
              for k in ("shift", "noise", "bright", "jpegish")]
        intra.append(min(vs))
        print(f"    {n:<8} shift={vs[0]:.2f} noise={vs[1]:.2f} bright={vs[2]:.2f} blur={vs[3]:.2f}  → 最差 {min(vs):.2f}")
    inter = []
    print("  类间（不同屏）：")
    for i, a in enumerate(names):
        row = []
        for j, b in enumerate(names):
            if i == j:
                row.append("  -- ")
                continue
            m = color_match(sigs[a], sigs[b])
            row.append(f"{m:.2f}")
            inter.append(m)
        print(f"    {a:<8} vs " + " ".join(row))
    print(f"\n  → 类内最差 {min(intra):.2f}  vs  类间最好 {max(inter):.2f}   "
          f"{'✅ 有可用阈值区间' if min(intra) > max(inter) else '❌ 区间重叠，单靠比色不可靠'}")

    print()
    print("=" * 74)
    print("B. 局部模板匹配 NCC（模板=主HUD的'日常'按钮 120x60，在 400x200 带状区内找）")
    print("=" * 74)
    tpl_box = (140, 195, 260, 255)
    tpl = np.asarray(SCREENS["主HUD"].convert("L"), np.float32)[195:255, 140:260]
    t0 = time.time()
    intraB = []
    print("  类内：")
    for k in ("shift", "noise", "bright", "jpegish"):
        p = perturb(SCREENS["主HUD"], k)
        s = ncc_max(band(p, 100, 170, 500, 370), tpl)
        intraB.append(s)
        print(f"    主HUD+{k:<8} NCC={s:.3f}")
    interB = []
    print("  类间（拿去别的屏里找同一个模板）：")
    for n in names:
        if n == "主HUD":
            continue
        s = ncc_max(band(SCREENS[n], 100, 170, 500, 370), tpl)
        interB.append(s)
        print(f"    {n:<8} NCC={s:.3f}")
    dtB = (time.time() - t0) * 1000
    print(f"\n  → 类内最差 {min(intraB):.3f}  vs  类间最好 {max(interB):.3f}   "
          f"{'✅ 分离良好' if min(intraB) > max(interB) else '⚠ 有重叠'}   总耗时 {dtB:.0f}ms / {len(names)+4} 次")

    print()
    print("=" * 74)
    print("C. OCR 仅识别模式 (use_det=False) 在紧裁 ROI 上的延迟")
    print("=" * 74)
    try:
        from rapidocr_onnxruntime import RapidOCR
        eng = RapidOCR()
        roi = SCREENS["日常"].crop((30, 10, 340, 86))   # 只裁标题区
        roi.save(os.path.join(OUT, "roi_title_daily.png"))
        for warm in range(2):
            t0 = time.time()
            res, _ = eng(np.asarray(roi), use_det=False, use_cls=False, use_rec=True)
            dt = (time.time() - t0) * 1000
            txt = [r[1] for r in res] if res else []
            print(f"  第{warm+1}次: {dt:.0f}ms  识别={txt}  ROI尺寸={roi.size}")
    except Exception as e:
        print("  [SKIP]", e)


if __name__ == "__main__":
    main()

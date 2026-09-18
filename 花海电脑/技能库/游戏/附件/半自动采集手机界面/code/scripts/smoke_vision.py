# -*- coding: utf-8 -*-
"""视觉层 smoke test（无需手机）：
   L1 像素锚点 aHash 判别稳健性 vs 坐标偏移/噪声/不同界面
   L3 RapidOCR 中文关键字识别 正确率与耗时
"""
import glob, os, sys, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT = "C:/Windows/Fonts/msyh.ttc"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "evidence")
os.makedirs(OUT, exist_ok=True)


def make_img(text, size=(480, 120), bg=(28, 32, 44), fg=(235, 235, 240), off=(20, 28)):
    im = Image.new("RGB", size, bg)
    ImageDraw.Draw(im).text(off, text, font=ImageFont.truetype(FONT, 52), fill=fg)
    return im


# ---------------- L1: 像素锚点 ----------------
def ahash(im, s=16):
    a = np.asarray(im.convert("L").resize((s, s), Image.BILINEAR), dtype=np.float32)
    return (a > a.mean()).flatten()


def dhash(im, s=16):
    a = np.asarray(im.convert("L").resize((s + 1, s), Image.BILINEAR), dtype=np.float32)
    return (a[:, 1:] > a[:, :-1]).flatten()


def ham(a, b):
    return int(np.count_nonzero(a != b))


def anchor_test():
    print("=" * 62)
    print("L1 像素锚点（aHash / dHash，16x16=256bit）")
    print("=" * 62)
    base = make_img("日常")
    cases = {
        "同图(理想)":          base,
        "整体右移3px":         base.transform(base.size, Image.AFFINE, (1, 0, -3, 0, 1, 0)),
        "整体下移2px":         base.transform(base.size, Image.AFFINE, (1, 0, 0, 0, 1, -2)),
        "高斯噪声sigma=6":     Image.fromarray(
                                 np.clip(np.asarray(base, np.int16)
                                         + np.random.normal(0, 6, np.asarray(base).shape), 0, 255)
                                 .astype(np.uint8)),
        "亮度+12%(模拟压缩)":   Image.fromarray(
                                 np.clip(np.asarray(base, np.float32) * 1.12, 0, 255).astype(np.uint8)),
        "轻微缩放95%":         base.resize((int(base.width * .95), int(base.height * .95)),
                                          Image.BILINEAR).resize(base.size, Image.BILINEAR),
        "★不同界面(背包)":      make_img("背包"),
        "★不同界面(商城)":      make_img("商城"),
    }
    hb_a, hb_d = ahash(base), dhash(base)
    print(f"{'场景':<22}{'aHash距离':>10}{'dHash距离':>10}   判定")
    for name, im in cases.items():
        da, dd = ham(hb_a, ahash(im)), ham(hb_d, dhash(im))
        # 阈值：<=0.15*256≈38 视为同一屏
        verdict = "同屏" if min(da, dd) <= 38 else "不同屏"
        print(f"{name:<22}{da:>10}{dd:>10}   {verdict}")
    print("→ 判别阈值建议：距离<=38 同屏，>38 不同屏（可按实测收紧）")


# ---------------- L3: OCR ----------------
def ocr_test():
    print()
    print("=" * 62)
    print("L3 RapidOCR 关键字识别")
    print("=" * 62)
    try:
        from rapidocr_onnxruntime import RapidOCR
    except Exception as e:
        print("[SKIP] rapidocr 不可用:", e)
        return
    t0 = time.time()
    engine = RapidOCR()
    print(f"引擎冷启动(含模型加载)：{time.time() - t0:.2f}s")

    tests = [
        ("单关键字-日常", make_img("日常")),
        ("单关键字-任务", make_img("任务")),
        ("带边框-角色", make_img("角色", size=(300, 90), off=(15, 16))),
        ("游戏标题-倩女幽魂", make_img("倩女幽魂", size=(560, 130), off=(20, 30))),
        ("干扰-大量小字", make_img("确定 取消 返回 背包 商城 任务 日常 角色 活动 好友",
                                   size=(1200, 90), off=(10, 20))),
    ]
    tot = []
    for name, im in tests:
        p = os.path.join(OUT, f"ocr_{name.split('-')[0]}.png")
        im.save(p)
        t0 = time.time()
        res, _ = engine(np.asarray(im))
        dt = (time.time() - t0) * 1000
        tot.append(dt)
        txts = [r[1] for r in res] if res else []
        conf = [round(float(r[2]), 3) for r in res] if res else []
        print(f"  {name:<18} 识别={txts}  置信={conf}  {dt:.0f}ms")
    print(f"→ 单次 OCR 平均 {sum(tot)/len(tot):.0f}ms（ROI 裁小后会更快）")


if __name__ == "__main__":
    np.random.seed(7)
    anchor_test()
    ocr_test()

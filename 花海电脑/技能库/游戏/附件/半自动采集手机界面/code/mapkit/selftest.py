# -*- coding: utf-8 -*-
"""端到端自检：合成界面 → 建图 → 三层识别 → 按钮定位 → 存取往返
在手机上线前把整条流水线的正确率验掉。
"""
import os, sys, json, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import PIL.ImageFilter as IF

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mapkit.vision import ScreenMap, tpl_peak, to_rgb_array   # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = os.path.join(ROOT, "evidence")
OUT = os.path.join(ROOT, "map")
os.makedirs(EV, exist_ok=True); os.makedirs(OUT, exist_ok=True)
W, H = 1600, 720
FONT = "C:/Windows/Fonts/msyh.ttc"
F52, F40 = ImageFont.truetype(FONT, 52), ImageFont.truetype(FONT, 40)

BTN = [(120, 180, 280, 104), (460, 180, 280, 104), (800, 180, 280, 104)]


def build_screen(title, buttons, accent):
    im = Image.new("RGB", (W, H), (22, 26, 38))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 92], fill=(34, 40, 58))
    d.text((40, 18), title, font=F52, fill=(240, 240, 248))
    d.rectangle([1180, 120, 1560, 620], fill=(30, 35, 50))
    d.rectangle([1180, 120, 1560, 170], fill=accent)
    for (x, y, w, h), (label, col) in zip(BTN, buttons):
        d.rounded_rectangle([x, y, x + w, y + h], 18, fill=col)
        d.text((x + 40, y + 26), label, font=F40, fill=(250, 250, 250))
    return im


SPEC = {
    "main_hud": ("倩女幽魂", [("日常", (196, 62, 62)), ("任务", (62, 132, 196)), ("背包", (196, 152, 62))],
                 (196, 62, 62), "主界面 HUD", ["日常", "任务", "背包"]),
    "daily":    ("日常任务", [("签到", (62, 176, 122)), ("领取", (196, 152, 62)), ("一键", (150, 62, 196))],
                 (62, 176, 122), "日常/签到面板", ["签到", "领取", "一键"]),
    "bag":      ("背包", [("装备", (120, 90, 62)), ("材料", (90, 120, 62)), ("出售", (196, 62, 62))],
                 (120, 90, 62), "背包装备面板", ["装备", "材料", "出售"]),
    "shop":     ("商城", [("充值", (232, 184, 42)), ("礼包", (232, 120, 42)), ("兑换", (232, 60, 120))],
                 (232, 184, 42), "商城（红线：只登记不点）", ["充值", "礼包", "兑换"]),
    "quest":    ("任务追踪", [("追踪", (62, 196, 220)), ("放弃", (140, 140, 140)), ("前往", (62, 132, 196))],
                 (62, 196, 220), "任务追踪面板", ["追踪", "放弃", "前往"]),
    "role":     ("角色属性", [("加点", (196, 62, 152)), ("技能", (62, 62, 196)), ("坐骑", (152, 196, 62))],
                 (196, 62, 152), "角色属性面板", ["加点", "技能", "坐骑"]),
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


def main():
    np.random.seed(11)
    scenes, imgs = {}, {}
    for sid, (title, btns, accent, purpose, labels) in SPEC.items():
        im = build_screen(title, btns, accent)
        imgs[sid] = im
        scenes[sid] = {
            "name": title, "purpose": purpose, "image": im,
            "anchors": [{"name": lab, "box": box} for lab, box in zip(labels, BTN)],
            "texts": [{"name": "标题", "roi": [30, 10, 390, 78], "expect": title}],
        }

    print("=" * 78)
    print("① 建图 + 自检")
    print("=" * 78)
    m = ScreenMap()
    rep = m.build(scenes, OUT, n_points=12)
    print(f"  比色采样点 {rep['n_points']} 个: {m.points}")
    print(f"  类内最差(扰动后同屏匹配率): {rep['intra_worst']}")
    inter = rep["inter_best"]
    print(f"  类间最好(不同屏匹配率): 最大={max(inter.values()):.3f}  "
          f"({max(inter, key=inter.get)})")
    print(f"  → {rep['verdict']}")

    print()
    print("=" * 78)
    print("② 三层级联识别正确率（对每屏做 4 种扰动）")
    print("=" * 78)
    kinds = ["ideal", "shift", "noise", "bright", "blur"]
    ok = tot = 0
    by_method = {}
    t0 = time.time()
    for sid in SPEC:
        row = []
        for k in kinds:
            img = imgs[sid] if k == "ideal" else perturb(imgs[sid], k)
            t1 = time.time()
            r = m.identify(img, OUT)
            dt = (time.time() - t1) * 1000
            good = (r["screen"] == sid)
            ok += good; tot += 1
            by_method[r["method"]] = by_method.get(r["method"], 0) + 1
            row.append(f"{k}:{'✅' if good else '❌→' + str(r['screen'])}({r['method']},{dt:.0f}ms)")
        print(f"  {sid:<9} " + "  ".join(row))
    print(f"\n  → 总正确率 {ok}/{tot} = {ok/tot*100:.1f}%   各层命中次数 {by_method}   "
          f"总耗时 {(time.time()-t0)*1000:.0f}ms")

    print()
    print("=" * 78)
    print("③ 强关闭比色层（points 清空）→ 验证模板匹配 / OCR 兜底能否接住")
    print("=" * 78)
    from rapidocr_onnxruntime import RapidOCR
    ocr = RapidOCR()
    m2 = ScreenMap(m.screen_size, m.tol)
    m2.screens, m2.points = m.screens, []
    ok2 = tot2 = 0
    by2 = {}
    for sid in SPEC:
        img = perturb(imgs[sid], "noise")
        r = m2.identify(img, OUT, ocr=ocr)
        good = (r["screen"] == sid)
        ok2 += good; tot2 += 1
        by2[r["method"]] = by2.get(r["method"], 0) + 1
        print(f"  {sid:<9} → {r['screen']}  方法={r['method']}  {r['detail']}")
    print(f"  → 兜底正确率 {ok2}/{tot2} = {ok2/tot2*100:.1f}%  命中分布 {by2}")

    print()
    print("=" * 78)
    print("④ 未登记界面（防误判）：喂一张没建过图的'设置'界面")
    print("=" * 78)
    unseen = build_screen("设置", [("声音", (90, 90, 90)), ("画面", (70, 70, 70)), ("操作", (60, 60, 60))],
                          (90, 90, 90))
    r = m.identify(unseen, OUT)
    print(f"  → 结果 screen={r['screen']}  method={r['method']}  conf={r['confidence']}  {r['detail']}")
    print(f"  → {'✅ 正确拒绝（未误判为已登记界面）' if r['screen'] is None else '⚠ 误判成了 ' + str(r['screen'])}")
    print(f"    比色评分: {r['scores']}")

    print()
    print("=" * 78)
    print("⑤ 按钮定位 button_xy")
    print("=" * 78)
    for sid in SPEC:
        s = SPEC[sid]
        img = perturb(imgs[sid], "shift")
        for lab in s[4][:1]:
            xy = m.button_xy(sid, lab, img=img, base_dir=OUT)
            print(f"  {sid:<9} '{lab}' → 点击坐标 {xy}")

    print()
    print("=" * 78)
    print("⑥ screens.json 存取往返")
    print("=" * 78)
    p = os.path.join(OUT, "screens.json")
    m.save(p)
    m3 = ScreenMap.load(p)
    same_pts = m3.points == m.points
    same_screens = set(m3.screens) == set(m.screens)
    r3 = m3.identify(imgs["daily"], OUT)
    print(f"  文件 {p} ({os.path.getsize(p)} bytes)")
    print(f"  采样点一致={same_pts}  界面集合一致={same_screens}  重新识别 daily → {r3['screen']}")
    print(f"  模板文件 {len(os.listdir(os.path.join(OUT,'tpl')))} 个")


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""mapkit.vision —— 界面判别库（运行时 0 token，三层级联）

设计依据：references/vision-layer-and-anticheat.md 实测标定
  L1 比色指纹  ~2ms   采样点须落在纯色块深处（11x11 平坦约束），容差 >=35
  L2 模板匹配  24ms   cv2.matchTemplate(TM_CCOEFF_NORMED) @1/1，阈值 0.70~0.85，唯一能给坐标
  L3 OCR ROI   9ms    use_det=False，置信度阈值 >=0.9

配置产物 screens.json 同时供 PC 端调试与手机端 AutoX.js 运行时读取。
"""
import json
import os
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

# 标定常量（来自实测）
COLOR_TOL = 35          # 每通道容差；22 太紧（亮度+10% 即失配）
FLAT_K = 11             # 平坦窗口；3x3 太松（点落边缘，类内 0.17）
FLAT_THR = 1.0
POINT_MIN_DIST = 80
COLOR_ACCEPT = 0.85     # 比色【候选】阈值（只做筛选，不做决策）
COLOR_CANDIDATES = 3    # 比色最多交几个候选给模板匹配确认
COLOR_MARGIN = 0.15     # 保留：领先幅度参考值（当前不用于决策）
TPL_ACCEPT = 0.80       # 模板匹配阈值（实测裕度 +0.436，0.70~0.85 均可）
ANCHOR_ROI_MARGIN = 48   # 锚点搜索区自动外扩像素。不设 roi → 全屏搜(80ms)；120px→58ms；48px→数 ms
OCR_MIN_CONF = 0.90     # OCR 置信度阈值（0.722 → 误读成"背包電"）


# ---------------------------------------------------------------- 基础量
def to_rgb_array(im) -> np.ndarray:
    if isinstance(im, np.ndarray):
        return im if im.ndim == 3 else cv2.cvtColor(im, cv2.COLOR_GRAY2RGB)
    return np.asarray(im.convert("RGB"))


def to_gray(im, k: int = 1) -> np.ndarray:
    if isinstance(im, np.ndarray):
        g = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY) if im.ndim == 3 else im
    else:
        g = np.asarray(im.convert("L"))
    if k > 1:
        g = cv2.resize(g, (g.shape[1] // k, g.shape[0] // k), interpolation=cv2.INTER_AREA)
    return g.astype(np.float32)


def pick_color_points(imgs: List[np.ndarray], n: int = 12, min_dist: int = POINT_MIN_DIST,
                      flat_k: int = FLAT_K, flat_thr: float = FLAT_THR,
                      min_sep: float = 12.0) -> Tuple[List[List[int]], np.ndarray]:
    """跨屏色差最大化 + 局部平坦约束 + 空间抑制。返回 (points, sep_map)。

    必须用 11x11 平坦约束：3x3 约束会让采样点落在色块边缘，blur/偏移即失配（实测类内 0.17）。
    """
    a = np.stack([to_rgb_array(im).astype(np.float32) for im in imgs])
    N, H, W, _ = a.shape
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
        y, x = np.unravel_index(int(np.argmax(sc)), sc.shape)
        if sc[y, x] < min_sep:
            break
        pts.append([int(x), int(y)])
        sc[max(0, y - min_dist):y + min_dist, max(0, x - min_dist):x + min_dist] = -1
    return pts, sep


def color_sig(im, points: List[List[int]]) -> List[List[int]]:
    a = to_rgb_array(im)
    return [[int(a[y, x, c]) for c in range(3)] for x, y in points]


def color_match(sig_a, sig_b, tol: int = COLOR_TOL) -> float:
    """单候选色逐点比对，返回命中比例（向后兼容保留）"""
    a, b = np.asarray(sig_a, np.int16), np.asarray(sig_b, np.int16)
    return float(np.mean(np.all(np.abs(a - b) <= tol, axis=1)))


# ================= 多候选色签名 =================
# 借鉴「傲视小助手」的两段式：点之间 AND × 点内候选色 OR
#   守门点（稳定不变）做特异性，防误判；候选点（会变）枚举多个颜色做召回，防漏判。
#   比"放宽容差"好 —— 放宽容差会让配色相近的界面互相混淆（实测踩过）。

def hex2rgb(h):
    h = str(h).strip().lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def rgb2hex(c) -> str:
    return "%02x%02x%02x" % (int(c[0]), int(c[1]), int(c[2]))


def _cands_of(entry):
    """spec 点的颜色字段：'hex' 或 ['hex','hex'] → [(r,g,b), ...]"""
    c = entry[2]
    if isinstance(c, str):
        c = [c]
    return [hex2rgb(x) for x in c]


def spec_score(observed, spec, tol: int = COLOR_TOL):
    """observed: [[r,g,b],...]（与 spec 同序）；spec: [[x,y,'hex'|['hex',...]],...]
    返回 (命中比例, 逐点命中 bool 列表, 逐点最小通道距离)。点间 AND，点内候选色 OR。"""
    hits, dists = [], []
    for obs, ent in zip(observed, spec):
        best = 1 << 30
        for c in _cands_of(ent):
            best = min(best, max(abs(int(obs[i]) - c[i]) for i in range(3)))
        hits.append(best <= tol)
        dists.append(best)
    n = max(1, len(spec))
    return sum(hits) / n, hits, dists


def collect_candidates(shots, points, tol: int = 6, max_cands: int = 12):
    """跨状态多次采样：对每个点收集实际观测到的颜色集合（tol 内视为同色）。
    shots: 同一界面的多次截图（PIL/ndarray 列表）；points: [[x,y],...]
    返回 spec: [[x, y, ['hex', ...]], ...] —— 可直接当多候选色签名用。
    这就是"不靠放宽容差，而靠枚举候选色"的落地方式。"""
    specs = []
    for x, y in points:
        seen = []
        for im in shots:
            a = to_rgb_array(im)
            c = (int(a[y, x, 0]), int(a[y, x, 1]), int(a[y, x, 2]))
            if not any(max(abs(c[i] - s[i]) for i in range(3)) <= tol for s in seen):
                seen.append(c)
        specs.append([int(x), int(y), [rgb2hex(c) for c in seen[:max_cands]]])
    return specs


def spec_to_keyboard(spec, var_prefix="sig"):
    """导出成按键精灵格式：守门点单独一个变量，多候选点展开成 N 个变量。
    与 「傲视小助手.q」的写法一致（Array(x,y,"hex")），便于双向对照。"""
    out = ["// 由 mapkit 导出（按键精灵 大漠 dm.CmpColor 相似度 0.9 对应容差 ~25）"]
    guard_idx, multi = None, []
    for i, ent in enumerate(spec):
        x, y, cands = ent[0], ent[1], (ent[2] if isinstance(ent[2], list) else [ent[2]])
        if len(cands) == 1:
            if guard_idx is None:
                guard_idx = i
                out.append('%s_Color = Array(%d,%d,"%s")' % (var_prefix, x, y, cands[0]))
            else:
                out.append('%s%d_Color = Array(%d,%d,"%s")' % (var_prefix, i, x, y, cands[0]))
        else:
            multi.append((i, x, y, cands))
            for j, c in enumerate(cands, 1):
                out.append('%s%d_%d_Color = Array(%d,%d,"%s")' % (var_prefix, i, j, x, y, c))
    return "\n".join(out), guard_idx, multi


def tpl_peak(img, tpl, roi: Optional[List[int]] = None) -> Tuple[float, Optional[Tuple[int, int]]]:
    """模板匹配，返回 (峰值, 全图坐标)。roi=[x,y,w,h] 限定搜索区。"""
    G, T = to_gray(img), to_gray(tpl)
    ox, oy = 0, 0
    if roi:
        x, y, w, h = roi
        G = G[y:y + h, x:x + w]
        ox, oy = x, y
    if G.shape[0] < T.shape[0] or G.shape[1] < T.shape[1]:
        return -1.0, None
    r = cv2.matchTemplate(G, T, cv2.TM_CCOEFF_NORMED)
    _, mx, _, ml = cv2.minMaxLoc(r)
    cx = ox + ml[0] + T.shape[1] // 2
    cy = oy + ml[1] + T.shape[0] // 2
    return float(mx), (cx, cy)


# ---------------------------------------------------------------- 屏幕图谱
class ScreenMap:
    """screens.json 的读写与三层级联识别。"""

    def __init__(self, screen_size=(0, 0), tol=COLOR_TOL):
        self.screen_size = list(screen_size)
        self.tol = tol
        self.points: List[List[int]] = []
        self.screens: Dict[str, dict] = {}
        self._tpl_cache: Dict[str, np.ndarray] = {}

    # ---- 建图 ----
    def build(self, scenes: Dict[str, dict], base_dir: str, n_points: int = 12) -> dict:
        """scenes = {id: {"name":..., "purpose":..., "image":PIL/ndarray,
                          "anchors":[{"name","box":[x,y,w,h]}], "texts":[{"name","roi":[..], "expect":str}]}}
        自动精选比色点、裁出模板图、写入 base_dir/tpl/。返回自检报告。"""
        imgs = [to_rgb_array(s["image"]) for s in scenes.values()]
        self.screen_size = [imgs[0].shape[1], imgs[0].shape[0]]
        self.points, sep = pick_color_points(imgs, n=n_points)
        tpl_dir = os.path.join(base_dir, "tpl")
        os.makedirs(tpl_dir, exist_ok=True)

        for sid, sc in scenes.items():
            a = to_rgb_array(sc["image"])
            entry = {"name": sc.get("name", sid), "purpose": sc.get("purpose", ""),
                     "color_sig": color_sig(a, self.points), "anchors": [], "texts": [],
                     "exits": sc.get("exits", {})}
            for an in sc.get("anchors", []):
                x, y, w, h = an["box"]
                fn = f"{sid}__{an['name']}.png".replace("/", "_").replace(" ", "_")
                Image.fromarray(a[y:y + h, x:x + w]).save(os.path.join(tpl_dir, fn))
                roi = an.get("roi")
                if roi is None:
                    # 自动给搜索区：box 外扩 margin（大幅提速；也容忍界面元素轻微位移）
                    m0 = an.get("roi_margin", ANCHOR_ROI_MARGIN)
                    rx, ry = max(0, x - m0), max(0, y - m0)
                    rw = min(self.screen_size[0] - rx, w + 2 * m0)
                    rh = min(self.screen_size[1] - ry, h + 2 * m0)
                    roi = [int(rx), int(ry), int(rw), int(rh)]
                entry["anchors"].append({"name": an["name"], "tpl": f"tpl/{fn}",
                                         "box": [x, y, w, h],
                                         "roi": roi,
                                         "threshold": an.get("threshold", TPL_ACCEPT)})
            for tx in sc.get("texts", []):
                entry["texts"].append({"name": tx["name"], "roi": tx["roi"],
                                       "expect": tx["expect"],
                                       "min_conf": tx.get("min_conf", OCR_MIN_CONF)})
            self.screens[sid] = entry
        self._tpl_cache.clear()
        return self.selfcheck(scenes)

    def selfcheck(self, scenes: Dict[str, dict]) -> dict:
        """建图自检：类内(扰动) vs 类间 的比色分离度，以及两两最高分，确认无混淆。"""
        ids = list(self.screens)
        sigs = {i: self.screens[i]["color_sig"] for i in ids}
        inter = {}
        for i, a in enumerate(ids):
            for b in ids[i + 1:]:
                inter[f"{a}|{b}"] = round(color_match(sigs[a], sigs[b], self.tol), 3)
        # 类内：+/- 少量平移与增益
        intra = {}
        for sid, sc in scenes.items():
            a = to_rgb_array(sc["image"])
            worst = 1.0
            for k in (3, -3):
                sh = np.roll(a, k, axis=1)
                worst = min(worst, color_match(sigs[sid], color_sig(sh, self.points), self.tol))
            br = np.clip(a.astype(np.float32) * 1.10, 0, 255).astype(np.uint8)
            worst = min(worst, color_match(sigs[sid], color_sig(br, self.points), self.tol))
            intra[sid] = round(worst, 3)
        ok = max(intra.values()) > max(inter.values()) if inter else True
        return {"n_points": len(self.points), "intra_worst": intra, "inter_best": inter,
                "separable": bool(ok),
                "verdict": "✅ 比色可分离" if ok else "❌ 比色区间重叠，需增加采样点或改用模板匹配"}

    # ---- 识别 ----
    def _tpl(self, path: str) -> np.ndarray:
        if path not in self._tpl_cache:
            self._tpl_cache[path] = np.asarray(Image.open(path).convert("RGB"))
        return self._tpl_cache[path]

    def identify(self, img, base_dir: str, ocr=None) -> dict:
        """三层级联。返回 {screen, method, detail, scores}"""
        scores, ranked = {}, []
        if self.points:
            obs = color_sig(img, self.points)
            for sid, s in self.screens.items():
                spec = s.get("spec")            # 多候选色（优先）
                if spec:
                    sc, _, _ = spec_score(obs, spec, self.tol)
                else:
                    sc = color_match(obs, s["color_sig"], self.tol)
                scores[sid] = round(sc, 3)
            ranked = sorted(scores.items(), key=lambda kv: -kv[1])
        # —— 比色只做【候选筛选】，不做决策 ——
        # 原因：容差 35 是为抗亮度漂移，但会让配色相近的界面互相混淆（实测"设置"被误判成"背包"）。
        # 比色是相似度不是语义 → 必须用模板匹配确认候选。
        cands = [sid for sid, sc in ranked if sc >= COLOR_ACCEPT][:COLOR_CANDIDATES]
        from_color = bool(cands)
        if not cands:
            cands = list(self.screens)       # 比色无候选 → 退化为全屏模板匹配

        best = (-1.0, None, None, None)
        for sid in cands:
            for an in self.screens[sid]["anchors"]:
                p, c = tpl_peak(img, self._tpl(os.path.join(base_dir, an["tpl"])), an.get("roi"))
                if p > best[0]:
                    best = (p, sid, (an["name"], c, an["threshold"]), an["name"])
        if best[1] and best[0] >= best[2][2]:
            method = "color+template" if from_color else "template"
            return {"screen": best[1], "method": method, "confidence": round(best[0], 3),
                    "detail": f"{'比色候选' if from_color else '直接'}→模板 {best[2][0]} 峰值 {best[0]:.3f}",
                    "scores": scores, "xy": best[2][1]}

        if ocr is not None:
            a = to_rgb_array(img)
            for sid, s in self.screens.items():
                for tx in s["texts"]:
                    x, y, w, h = tx["roi"]
                    res, _ = ocr(a[y:y + h, x:x + w], use_det=False, use_cls=False, use_rec=True)
                    if not res:
                        continue
                    text, conf = res[0][0], float(res[0][1])
                    if conf >= tx["min_conf"] and tx["expect"] in text:
                        return {"screen": sid, "method": "ocr", "confidence": round(conf, 3),
                                "detail": f"OCR '{text}' conf={conf:.3f}", "scores": scores}
        return {"screen": None, "method": "none", "confidence": 0.0,
                "detail": "三层全未命中 → 存图停手", "scores": scores}

    def button_xy(self, screen_id: str, anchor_name: str, img=None, base_dir: str = "") -> Optional[Tuple[int, int]]:
        """取按钮坐标：给了 img 就用模板匹配定位，否则回退建图时的 box 中心。"""
        s = self.screens[screen_id]
        for an in s["anchors"]:
            if an["name"] != anchor_name:
                continue
            if img is not None and base_dir:
                p, c = tpl_peak(img, self._tpl(os.path.join(base_dir, an["tpl"])), an.get("roi"))
                if c and p >= an["threshold"]:
                    return c
            x, y, w, h = an["box"]
            return (x + w // 2, y + h // 2)
        return None

    # ---- 持久化 ----
    def save(self, path: str):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"version": 1, "screen_size": self.screen_size, "tol": self.tol,
                       "points": self.points, "screens": self.screens},
                      f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: str) -> "ScreenMap":
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        m = cls(d["screen_size"], d.get("tol", COLOR_TOL))
        m.points, m.screens = d["points"], d["screens"]
        return m

# -*- coding: utf-8 -*-
"""mapkit.recognize —— 运行时界面识别器（零 token），主循环与回归评测共用同一份实现。

快路径（常态 20ms）：
  L1 比色指纹 ~2ms          —— 候选预筛（纯 numpy）
  L2 固定 ROI 的 OCR ~9ms   —— 决策层：use_det=False 只读 ROI，不是全屏 1.5s
降级路径（只在 L1/L2 全失败时触发）：
  L3 全屏 OCR ~1.5s         —— 等价于大漠 FindStr/FindPic 的「不受固定坐标约束」能力，
                              命中后把新位置记入 self.calib 形成【自校准】闭环

为什么需要 L3：固定 ROI 建图快，但脆 —— 游戏 UI 改版 / 换分辨率 / 元素位移后会失效。
大漠这类工具用全屏搜索，灵活性是它唯一比固定 ROI 强的地方；本层把它补上，仍零 token。
自校准的价值：一次全屏命中就能把漂移的 ROI 修回来（drift 会记录在 calib 里），
不必重新采集建图。
"""
import json
import os
from typing import Dict, List, Optional

import cv2
import numpy as np

from mapkit import vision as V

OCR_MIN_CONF = 0.90
COLOR_PREFILTER = 0.55      # 比色预筛门槛：太严会漏，太松等于不筛
PAD_SELF = 8                # 自校准生成新 ROI 时的外扩像素（与建图一致）
DRIFT_WARN = 6              # 偏移超过此像素即认为是真漂移，值得回写
DRIFT_MAX = 300             # ★ 全屏降级时，命中位置与建图位置的最大允许偏移（曼哈顿距离）
                            # 踩坑：不设上限时，把福利面板左下角的「大神福利」认成 HUD 顶部的
                            # 「福利」（drift -877,+600 也照收）→ 直接误判界面。
                            # 位置校验是必须的：关键词相同不代表是同一个界面元素。


def imread_u(p):
    with open(p, "rb") as f:
        return cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)


class Recognizer:
    """loaded from screens.json。ocr 为 RapidOCR 实例（懒加载，可注入假实现做测试）。"""

    def __init__(self, map_path: str, ocr=None, min_conf: float = OCR_MIN_CONF):
        self.map_path = map_path
        with open(map_path, encoding="utf-8") as f:
            d = json.load(f)
        self._raw = d
        self.screen_size = tuple(d["screen_size"])
        self.tol = d.get("tol", 25)
        self.points = d["points"]
        self.screens: Dict[str, dict] = d["screens"]
        self.min_conf = min_conf
        self._ocr = ocr
        self._ocr_tried = ocr is not None
        self.calib: List[dict] = []      # 自校准记录 [{screen,key,old,new,shift}]

    # ---- OCR 懒加载 ----
    @property
    def ocr(self):
        if not self._ocr_tried:
            self._ocr_tried = True
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._ocr = RapidOCR()
            except Exception as e:  # noqa: BLE001
                print("[recognize] OCR 不可用: %s" % e)
                self._ocr = None
        return self._ocr

    # ---------------- L2：固定 ROI 读取 ----------------
    def _read_roi(self, img, roi) -> Optional[tuple]:
        """读一块 ROI 的文字（use_det=False → 9ms）。返回 (text, conf) 或 None。"""
        if self.ocr is None:
            return None
        x0, y0, x1, y1 = [int(v) for v in roi]
        x0, y0 = max(0, x0), max(0, y0)
        sub = img[y0:y1, x0:x1]
        if sub.size == 0 or sub.shape[0] < 8 or sub.shape[1] < 8:
            return None
        try:
            res, _ = self.ocr(np.ascontiguousarray(sub),
                              use_det=False, use_cls=False, use_rec=True)
        except Exception:  # noqa: BLE001
            return None
        if not res:
            return None
        first = res[0]
        if isinstance(first, (list, tuple)) and len(first) >= 2:
            if isinstance(first[0], str):
                return str(first[0]), float(first[1])
            if len(first) >= 3:
                return str(first[1]), float(first[2])
        return None

    # ---------------- L3：全屏 OCR 降级 + 自校准 ----------------
    def _full_ocr_items(self, arr) -> List[dict]:
        """全屏 OCR（det=True，~1.5s）→ [{text,conf,x0,y0,x1,y1,cx,cy}]。"""
        if self.ocr is None:
            return []
        try:
            res, _ = self.ocr(arr)
        except Exception:  # noqa: BLE001
            return []
        out = []
        for it in (res or []):
            if not (isinstance(it, (list, tuple)) and len(it) >= 3):
                continue
            box, txt, conf = it[0], it[1], float(it[2])
            if conf < self.min_conf:
                continue
            xs = [float(p[0]) for p in box]
            ys = [float(p[1]) for p in box]
            out.append({"text": str(txt), "conf": conf,
                        "x0": int(min(xs)), "x1": int(max(xs)),
                        "y0": int(min(ys)), "y1": int(max(ys)),
                        "cx": int(sum(xs) / len(xs)), "cy": int(sum(ys) / len(ys))})
        return out

    def _identify_full_ocr(self, arr, verbose=False) -> Optional[dict]:
        """降级：全屏找关键词。命中即返回，并把新位置记入 calib（自校准）。
        匹配时优先选【离建图位置最近】的命中 —— 界面元素位置通常稳定，
        这样既能抗位移，又不会被画面上别处的同名文字带偏。"""
        found = self._full_ocr_items(arr)
        if not found:
            return None
        hits: Dict[str, list] = {}
        for sid, s in self.screens.items():
            for k in s.get("keys", []):
                x0, y0, x1, y1 = k["roi"]
                kcx, kcy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
                best, best_d = None, 1e9
                for f in found:
                    if k["key"] in f["text"]:
                        d = abs(f["cx"] - kcx) + abs(f["cy"] - kcy)
                        if d < best_d:
                            best, best_d = f, d
                if best is not None and best_d <= DRIFT_MAX:
                    hits.setdefault(sid, []).append((k, best, best_d))
        if not hits:
            return None
        sid = max(hits, key=lambda s: len(hits[s]))
        detail = []
        for k, f, d in hits[sid]:
            nx0 = max(0, f["x0"] - PAD_SELF)
            ny0 = max(0, f["y0"] - PAD_SELF)
            nx1 = min(self.screen_size[0], f["x1"] + PAD_SELF)
            ny1 = min(self.screen_size[1], f["y1"] + PAD_SELF)
            new_roi = [nx0, ny0, nx1, ny1]
            ox0, oy0, ox1, oy1 = k["roi"]
            shift = int(round(((nx0 + nx1) - (ox0 + ox1)) / 2.0)), int(round(((ny0 + ny1) - (oy0 + oy1)) / 2.0))
            self.calib.append({"screen": sid, "key": k["key"], "old": list(k["roi"]),
                               "new": new_roi, "shift": list(shift)})
            detail.append("%s→%s(drift %s)" % (k["key"], new_roi, shift))
            if verbose:
                print("    [全屏降级] %-16s 「%s」 读到 %-14s conf=%.3f 新ROI %s"
                      % (sid, k["key"], f["text"], f["conf"], new_roi))
        return {"screen": sid, "method": "ocr_full", "confidence": round(max(f["conf"] for _, f, _ in hits[sid]), 3),
                "detail": "全屏降级命中: " + "; ".join(detail), "scores": {}, "ocr_hits": []}

    def save_calibration(self, out_path: Optional[str] = None) -> int:
        """把自校准得到的新 ROI 写回图谱（只改漂移超过 DRIFT_WARN 的项）。返回改写条数。"""
        changed = 0
        for c in self.calib:
            if max(abs(c["shift"][0]), abs(c["shift"][1])) < DRIFT_WARN:
                continue
            for k in self.screens.get(c["screen"], {}).get("keys", []):
                if k["key"] == c["key"]:
                    k["calibrated_from"] = c["old"]
                    k["roi"] = c["new"]
                    changed += 1
        if changed:
            p = out_path or self.map_path
            self._raw["screens"] = self.screens
            with open(p, "w", encoding="utf-8") as f:
                json.dump(self._raw, f, ensure_ascii=False, indent=2)
        return changed

    # ---------------- 主识别 ----------------
    def identify(self, img, use_ocr: bool = True, use_full_ocr: bool = True,
                 verbose: bool = False) -> dict:
        """img: RGB ndarray。返回 {screen, method, confidence, detail, scores, ocr_hits}"""
        arr = V.to_rgb_array(img)
        scores: Dict[str, float] = {}
        if self.points:
            obs = V.color_sig(arr, self.points)
            for sid, s in self.screens.items():
                spec = s.get("spec") or s.get("color_sig")
                # 防御：新界面还没取点 → 签名缺失或结构不全 → 不参与比色，只靠 OCR 关键词。
                # （踩坑：空 spec 是 falsy，`or` 会取到 color_sig；而 color_sig 每项为空列表时
                #   spec[0][2] 直接 IndexError 把整个识别打崩。）
                if not spec or len(spec[0]) < 3:
                    scores[sid] = 0.0
                    continue
                if isinstance(spec[0][2], (list, str)):
                    scores[sid] = round(V.spec_score(obs, spec, self.tol)[0], 3)
                else:
                    scores[sid] = round(V.color_match(obs, spec, self.tol), 3)
        ranked = sorted(scores.items(), key=lambda kv: -kv[1])
        cands = [s for s, v in ranked if v >= COLOR_PREFILTER]
        if not cands:
            cands = [s for s, _ in ranked] or list(self.screens)

        hits = []
        if use_ocr and self.ocr is not None:
            for sid in cands:
                for k in self.screens[sid].get("keys", []):
                    got = self._read_roi(arr, k["roi"])
                    if not got:
                        continue
                    text, conf = got
                    key = k["key"]
                    ok = (key in text) or (text and text in k["expect"])
                    hits.append({"screen": sid, "key": key, "read": text,
                                 "conf": round(conf, 3), "ok": bool(ok and conf >= self.min_conf)})
                    if verbose:
                        print("    OCR %-16s 「%s」 读到 %-14s conf=%.3f %s"
                              % (sid, key, text, conf, "✅" if (ok and conf >= self.min_conf) else "✗"))
        good = [h for h in hits if h["ok"]]
        if good:
            by: Dict[str, List[dict]] = {}
            for h in good:
                by.setdefault(h["screen"], []).append(h)
            best = max(by.items(), key=lambda kv: (len(kv[1]), max(x["conf"] for x in kv[1])))
            sid = best[0]
            return {"screen": sid, "method": "ocr",
                    "confidence": round(max(x["conf"] for x in best[1]), 3),
                    "detail": "关键词命中 %s" % [x["key"] for x in best[1]],
                    "scores": scores, "ocr_hits": hits}

        # ── 固定 ROI 全失败 → 降级全屏 OCR（+自校准）──
        if use_ocr and use_full_ocr and self.ocr is not None:
            r = self._identify_full_ocr(arr, verbose=verbose)
            if r:
                r["scores"] = scores
                r["ocr_hits"] = hits
                return r

        if hits:
            return {"screen": None, "method": "ocr_lowconf", "confidence": 0.0,
                    "detail": "读到文字但未达置信/关键词: %s"
                              % [(h["key"], h["read"], h["conf"]) for h in hits],
                    "scores": scores, "ocr_hits": hits}
        return {"screen": None, "method": "none", "confidence": 0.0,
                "detail": "比色+固定ROI+全屏 均未命中 → 应留图停手",
                "scores": scores, "ocr_hits": []}

    # ---------------- 便捷访问 ----------------
    def click_xy(self, screen_id: str, name: str):
        c = (self.screens.get(screen_id) or {}).get("clicks", {})
        return tuple(c[name]) if name in c else None

    def closer_xy(self, screen_id: str):
        c = (self.screens.get(screen_id) or {}).get("closer")
        return tuple(c) if c else None

    def is_danger(self, screen_id: str, xy, radius: int = 45) -> Optional[dict]:
        """点击前的红线护栏：xy 落在某危险区 radius 内则返回该危险项。"""
        for d in (self.screens.get(screen_id) or {}).get("danger", []):
            if not d.get("xy"):
                continue
            if abs(xy[0] - d["xy"][0]) <= radius and abs(xy[1] - d["xy"][1]) <= radius:
                return d
        return None

    def all_danger(self, screen_id: str) -> List[dict]:
        return (self.screens.get(screen_id) or {}).get("danger", [])

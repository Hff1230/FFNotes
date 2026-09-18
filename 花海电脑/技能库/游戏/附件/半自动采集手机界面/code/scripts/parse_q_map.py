# -*- coding: utf-8 -*-
"""把按键精灵 .q 脚本解析成结构化【界面图谱】：
   - 符号表（Array 字面量，支持嵌套）
   - 比色签名（[x,y,"hex"] 三元组）
   - 每个 是否Xxx 函数 → 用了哪些界面签名
   - 每个 执行Xxx / 动作函数 → 调用了哪些函数 + 点击了哪些坐标（= 跳转规则）
输出 docs/界面图谱-按键精灵版.md + map/qnyh_keyboard_map.json
"""
import json, os, re, sys

SRC = r"E:\AiDemos\QnyhAuto\refs\傲视小助手.clean.q"
ROOT = r"E:\AiDemos\QnyhAuto"
lines = open(SRC, encoding="utf-8").read().splitlines()

HEXRE = re.compile(r'^"?[0-9a-fA-F]{6}"?$')


# ---------------- Array 字面量解析（递归下降） ----------------
def parse_args(s):
    """把 'a, b, Array(c,d), "x"' 切成顶层逗号分隔的片段"""
    out, depth, cur, q = [], 0, "", False
    for ch in s:
        if ch == '"':
            q = not q
        if not q:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            elif ch == "," and depth == 0:
                out.append(cur.strip()); cur = ""; continue
        cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def parse_val(expr, syms):
    expr = expr.strip()
    m = re.match(r"^Array\s*\((.*)\)\s*$", expr)
    if m:
        inner = m.group(1).strip()
        if inner == "":
            return []
        return [parse_val(a, syms) for a in parse_args(inner)]
    m = re.match(r'^"([^"]*)"$', expr)
    if m:
        return m.group(1)
    if re.match(r"^-?\d+$", expr):
        return int(expr)
    if expr in syms:
        return syms[expr]
    return expr          # 未解析（表达式/函数调用）


# ---------------- 第一遍：符号表 ----------------
syms = {}
for i, ln in enumerate(lines, 1):
    s = ln.strip()
    if s.startswith("//") or s.startswith("'") or s == "":
        continue
    m = re.match(r"^(\w+)\s*=\s*(.+)$", s)
    if m and not s.startswith("If") and "Then" not in s:
        name, rhs = m.group(1), m.group(2)
        if rhs.strip() in syms or "Array" in rhs or re.match(r'^"', rhs.strip()) or re.match(r"^-?\d+$", rhs.strip()):
            try:
                syms[name] = parse_val(rhs, syms)
            except Exception:
                pass

# ---------------- 收集签名（[x,y,hex] 及签名组） ----------------
def sig_points(v, out):
    """递归收集所有 [x,y,hex] 三元组"""
    if isinstance(v, list):
        if len(v) == 3 and isinstance(v[0], int) and isinstance(v[1], int) \
           and isinstance(v[2], str) and HEXRE.match(v[2]):
            out.append(v)
        else:
            for x in v:
                sig_points(x, out)
    return out


sigs = {}          # 变量名 -> 点列表
for name, v in syms.items():
    pts = sig_points(v, [])
    if pts:
        sigs[name] = pts

# ---------------- 第二遍：函数体 ----------------
funcs, cur, indoc = {}, None, False
for i, ln in enumerate(lines, 1):
    s = ln.strip()
    m = re.match(r"^(?:Function|Sub)\s+(\w+)", s, re.I)
    if m:
        cur = m.group(1)
        funcs[cur] = {"line": i, "kind": "Sub" if s.lower().startswith("sub") else "Function",
                      "body": []}
        continue
    if re.match(r"^End\s+(Function|Sub)", s, re.I):
        cur = None
        continue
    if cur:
        funcs[cur]["body"].append((i, s))

# ---------------- 分析每个函数 ----------------
CALLRE = re.compile(r"(?:Call\s+)?([\u4e00-\u9fa5\w]+)\s*\(")
CLICKRE = re.compile(r"^(?:Call\s+)?(点击|高速点击)\s+(\d+)\s*,\s*(\d+)")
res = {}
for name, f in funcs.items():
    calls, clicks, sigs_used, delays = [], [], [], []
    for ln_no, s in f["body"]:
        if s.startswith("//"):
            continue
        mc = CLICKRE.match(s)
        if mc:
            clicks.append({"op": mc.group(1), "x": int(mc.group(2)), "y": int(mc.group(3)),
                           "comment": "", "line": ln_no})
            continue
        for mm in CALLRE.finditer(s):
            fn = mm.group(1)
            if fn in funcs and fn != name and fn not in calls:
                calls.append(fn)
        for sn in sigs:
            if re.search(r"\b%s\b" % re.escape(sn), s) and sn not in sigs_used:
                sigs_used.append(sn)
        md = re.search(r"Delay\s+(\d+)", s)
        if md:
            delays.append(int(md.group(1)))
    res[name] = {"kind": f["kind"], "line": f["line"], "calls": calls,
                 "clicks": clicks, "sigs": sigs_used,
                 "n_lines": len(f["body"])}

# 点击注释（同行 // 后的文字）
for name, f in funcs.items():
    for c in res[name]["clicks"]:
        for ln_no, s in f["body"]:
            if ln_no == c["line"] and "//" in s:
                c["comment"] = s.split("//", 1)[1].strip()
                break

# ---------------- 分类 ----------------
is_funcs = [n for n in res if re.match(r"^是否", n)]
exec_funcs = [n for n in res if re.match(r"^(执行|开始|打开|停止|进图|检查)", n)]
prim_funcs = [n for n in res if n in ("找图", "多点比色", "比色", "移动", "点击", "高速点击", "延迟", "输出")]

# ---------------- 输出 ----------------
os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "map"), exist_ok=True)
data = {"source": os.path.basename(SRC), "sigs": sigs, "funcs": res,
        "is_funcs": is_funcs, "exec_funcs": exec_funcs, "prim_funcs": prim_funcs}
with open(os.path.join(ROOT, "map", "qnyh_keyboard_map.json"), "w", encoding="utf-8") as fh:
    json.dump(data, fh, ensure_ascii=False, indent=1)

print("符号表中含比色签名的变量: %d 个，比色点合计 %d 个"
      % (len(sigs), sum(len(v) for v in sigs.values())))
print("函数总数 %d（界面判定 %d / 业务流程 %d / 原语 %d）"
      % (len(res), len(is_funcs), len(exec_funcs), len(prim_funcs)))
print()
print("=" * 78)
print("界面判定函数（是否Xxx）→ 使用的比色签名")
print("=" * 78)
for n in sorted(is_funcs, key=lambda x: res[x]["line"]):
    r = res[n]
    used = r["sigs"]
    detail = "; ".join("%s(%d点)" % (s, len(sigs[s])) for s in used) or "—（无签名/用其它判定）"
    print("  L%-5d %-16s %s" % (r["line"], n, detail))
print()
print("=" * 78)
print("业务流程函数 → 调用链 + 点击序列（= 跳转规则）")
print("=" * 78)
for n in sorted(exec_funcs, key=lambda x: res[x]["line"]):
    r = res[n]
    print("  L%-5d %s" % (r["line"], n))
    if r["calls"]:
        print("        调用: %s" % " → ".join(r["calls"]))
    for c in r["clicks"][:14]:
        print("        点击 (%4d,%4d)  %s" % (c["x"], c["y"], c["comment"]))
    if len(r["clicks"]) > 14:
        print("        ... 共 %d 次点击" % len(r["clicks"]))

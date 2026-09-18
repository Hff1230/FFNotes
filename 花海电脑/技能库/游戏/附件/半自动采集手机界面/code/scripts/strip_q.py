# -*- coding: utf-8 -*-
"""剥离 .q 里的 Attachment 内嵌 dm.dll base64，输出干净副本 + 结构统计。"""
import os, re, sys, collections

SRC = r"C:\Users\hufeifei.JOY\AppData\Local\hermes\attachments\傲视小助手.q"
DST = r"E:\AiDemos\QnyhAuto\refs\傲视小助手.clean.q"
os.makedirs(os.path.dirname(DST), exist_ok=True)

raw = open(SRC, "rb").read()
text = raw.decode("gb18030", errors="replace")
lines = text.splitlines()

clean, dropped = [], 0
for ln in lines:
    if len(ln) > 5000:                      # 内嵌附件（base64）
        clean.append("<%d 字符的内嵌附件已剥离>" % len(ln))
        dropped += len(ln)
    else:
        clean.append(ln)
open(DST, "w", encoding="utf-8").write("\n".join(clean))

print("总行数 %d → 干净副本 %d 行，剥离 %d 字符" % (len(lines), len(clean), dropped))
print("干净副本:", DST, os.path.getsize(DST), "bytes")
print()

# 结构统计
body = [l for l in clean if len(l) < 5000]
kinds = {
    "大漠调用 dm.":      r"\bdm\.\w+",
    "比色点定义 Array(x,y,hex)": r"Array\(\s*\d+\s*,\s*\d+\s*,\s*\"[0-9a-fA-F]{6}\"\s*\)",
    "找图 FindPic":       r"FindPic",
    "找色 FindColor":     r"FindColor",
    "OCR":                r"Ocr|OCR",
    "截图 Capture":       r"Capture",
    "点击 LeftClick":     r"LeftClick",
    "按键 KeyPress":      r"KeyPress",
    "输入 SayString":     r"SayString|SendString",
    "窗口绑定 BindWindow": r"BindWindow",
    "延时 Delay":         r"Delay",
    "条件 If":            r"^\s*If\b",
    "循环 For/While":     r"^\s*(For|While)\b",
    "子程序 Sub/Function": r"^\s*(Sub|Function)\b",
    "跳转 Goto":          r"^\s*Goto\b",
}
for name, pat in kinds.items():
    n = sum(len(re.findall(pat, l)) for l in body)
    print("  %-26s %5d" % (name, n))

print()
print("=" * 70)
print("所有比色签名变量（Dim XxxColor）")
print("=" * 70)
for i, l in enumerate(body, 1):
    m = re.match(r"\s*Dim\s+(.+Color)\s*$", l)
    if m:
        print("  L%-5d %s" % (i, m.group(1)))

print()
print("=" * 70)
print("所有子程序/函数名")
print("=" * 70)
for i, l in enumerate(body, 1):
    m = re.match(r"\s*(Sub|Function)\s+(\w+)", l)
    if m:
        print("  L%-5d %s %s" % (i, m.group(1), m.group(2)))

print()
print("=" * 70)
print("大漠插件用到的函数名（去重）")
print("=" * 70)
c = collections.Counter(re.findall(r"\bdm\.(\w+)", "\n".join(body)))
for k, v in c.most_common():
    print("  %-24s %d 次" % (k, v))

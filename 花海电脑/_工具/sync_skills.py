#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hermes 技能 -> Obsidian 笔记导出器
仓库: C:\\FFH\\FFNotes   目标根目录: 花海电脑/

用法（在 git-bash 里）:
  python sync_skills.py                 # 按清单导出全部技能 + 重建索引
  python sync_skills.py --list          # 列出本机所有 Hermes 技能（挑要归档的）
  python sync_skills.py --only <名字>   # 只同步某一个
  python sync_skills.py --check         # 只比对差异，不写文件

加新技能: 编辑 _工具/技能清单.json（或用 --add），再跑一次本脚本即可。
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

VAULT = Path(os.environ.get("FFNOTES_VAULT", r"C:\FFH\FFNotes"))
ROOT = Path(os.environ.get("FFNOTES_SKILLROOT", VAULT / "花海电脑"))
LIB = ROOT / "技能库"
TOOLS = ROOT / "_工具"
MANIFEST = TOOLS / "技能清单.json"
SKILLS_DIR = Path(os.environ.get("HERMES_SKILLS",
                                 Path.home() / "AppData/Local/hermes/skills"))
INDEX = ROOT / "00-技能库索引.md"

# 分类目录固定名单：新技能归到这几类里，避免文件夹越建越乱
CATEGORIES = ["游戏", "办公文档", "设计创作", "自动化运维", "开发编码", "研究学习", "其他"]


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def split_frontmatter(text):
    """返回 (frontmatter_dict_原始文本, body)。不解析完整 YAML，够用就行。"""
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    fm = text[3:end].strip("\r\n")
    body = text[end + 4:].lstrip("\r\n")
    return fm, body


def fm_field(fm, key):
    m = re.search(rf"^{key}:\s*(.+)$", fm, re.M)
    if not m:
        return ""
    return m.group(1).strip().strip('"').strip("'")


def fm_tags(fm):
    tags = []
    m = re.search(r"tags:\s*\[([^\]]*)\]", fm)
    if m:
        tags = [t.strip().strip('"').strip("'") for t in m.group(1).split(",") if t.strip()]
    return tags


def find_skill(name):
    hits = [p for p in SKILLS_DIR.rglob("SKILL.md") if p.parent.name == name]
    return hits[0] if hits else None


def all_skills():
    out = []
    for p in SKILLS_DIR.rglob("SKILL.md"):
        if p.parent.name in ("skills",):
            continue
        out.append((p.parent.name, str(p.relative_to(SKILLS_DIR))))
    return sorted(out)


def load_manifest():
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"技能": []}


def save_manifest(mf):
    TOOLS.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(mf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def export_one(entry, check_only=False):
    name = entry["技能"]
    cat = entry.get("分类", "其他")
    title = entry.get("标题") or name
    src = find_skill(name)
    if not src:
        print(f"  ✗ 找不到技能 {name}")
        return None
    if cat not in CATEGORIES:
        print(f"  ! 分类「{cat}」不在固定名单里（{', '.join(CATEGORIES)}），仍按原样放置")

    text = src.read_text(encoding="utf-8")
    fm, body = split_frontmatter(text)
    src_tags = fm_tags(fm)
    desc = entry.get("说明") or fm_field(fm, "description")
    ts = now()

    outdir = LIB / cat
    outfile = outdir / (entry.get("文件名") or f"{title}.md")
    tags = ["技能库", cat] + [t for t in src_tags if t not in ("技能库",)]
    tag_line = ", ".join(dict.fromkeys(tags))

    head = f"""---
title: {title}
分类: {cat}
来源技能: {name}
来源路径: {src}
同步时间: {ts}
tags: [{tag_line}]
---

> [!info] 由 Hermes 技能自动导出（只读镜像）
> 源文件：`{src}`
> 最后同步：{ts}　|　导出工具：`花海电脑/_工具/sync_skills.py`
> 改笔记不会改技能；要改内容请改源 SKILL.md 后重跑导出。

## 技能说明

{desc}

"""
    new = head + body.rstrip() + "\n"
    if check_only:
        old = outfile.read_text(encoding="utf-8") if outfile.exists() else ""
        state = "一致" if old == new else "有差异（需重新导出）"
        print(f"  {state}: {outfile.relative_to(ROOT)}")
        return entry

    outdir.mkdir(parents=True, exist_ok=True)
    old = outfile.read_text(encoding="utf-8") if outfile.exists() else ""
    outfile.write_text(new, encoding="utf-8")
    print(f"  {'~ 更新' if old else '+ 新建'} {outfile.relative_to(ROOT)}")

    # 附带文档：技能目录下除 SKILL.md 外的 md（references/ 等）
    extras = [p for p in src.parent.rglob("*.md") if p.name != "SKILL.md"]
    for p in extras:
        dst = outdir / "附件" / name / p.relative_to(src.parent)
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(p.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"    + 附件 {dst.relative_to(ROOT)}")
    return entry


def rebuild_index(entries):
    rows = []
    by_cat = {}
    for e in entries:
        by_cat.setdefault(e.get("分类", "其他"), []).append(e)
    for cat in CATEGORIES:
        for e in by_cat.get(cat, []):
            title = e.get("标题") or e["技能"]
            desc = (e.get("说明") or "").splitlines()[0] if e.get("说明") else ""
            desc = desc.replace("|", "/")
            rows.append(f"| {cat} | [[{title}]] | `{e['技能']}` | {desc} | {e.get('同步时间','')} |")
    for cat, lst in by_cat.items():
        if cat in CATEGORIES:
            continue
        for e in lst:
            title = e.get("标题") or e["技能"]
            rows.append(f"| {cat} | [[{title}]] | `{e['技能']}` |  |  |")

    body = f"""---
title: 花海电脑 · 技能库索引
tags: [技能库, 索引, 花海电脑]
更新时间: {now()}
---

# 花海电脑 · 技能库索引

本机（花海电脑）Hermes 技能的 Obsidian 镜像库。笔记是**只读副本**，真源永远是 Hermes 技能目录
`C:\\Users\\Administrator\\AppData\\Local\\hermes\\skills\\`；要改内容就改源文件，然后重跑导出。

## 一、技能清单（{len(entries)} 个）

| 分类 | 笔记 | 技能名 | 说明 | 同步时间 |
|---|---|---|---|---|
{chr(10).join(rows) if rows else "| - | - | - | 还没有归档技能 | - |"}

## 二、文件夹管理规范

```
花海电脑/
├── 00-技能库索引.md      ← 本文件，唯一的目录入口
├── 技能库/               ← 技能笔记正文，按分类分文件夹
│   ├── 游戏/
│   ├── 办公文档/         ← 以后新技能只能进这 7 类
│   ├── 设计创作/
│   ├── 自动化运维/
│   ├── 开发编码/
│   ├── 研究学习/
│   └── 其他/
│        └── <技能名>/附件/   ← 技能的 references/ 等附带文档
├── _模板/                ← 新建技能笔记的模板
└── _工具/                ← 导出器 + 技能清单.json（加技能只改清单）
```

**固定 7 个分类文件夹，不再新增顶层分类**，避免目录越建越乱。命名规范：
- 笔记文件名 = 中文标题，不带空格，用 `-` 连接（如 `迷你传奇-每日日常自动化.md`）。
- 每条笔记必须在 `技能清单.json` 里有一条记录（技能名 / 分类 / 标题 / 说明）。
- 笔记一律以 YAML frontmatter 开头，`tags` 至少含 `技能库` 和分类名，便于 Obsidian 检索。

## 三、怎么加新技能

1. 看有哪些技能可归档：`python 花海电脑/_工具/sync_skills.py --list`
2. 加进清单：`python 花海电脑/_工具/sync_skills.py --add <技能名> --cat 游戏 --title "中文标题" --desc "一句话说明"`
3. 重跑导出（会同时刷新本索引）：`python 花海电脑/_工具/sync_skills.py`

## 四、相关

- 电脑上的实物资料：[[花海电脑]] 所在仓库根目录 `C:\\FFH\\FFNotes`
- 标书资料库在 `E:\\标书制作`（不在本仓库）
"""
    INDEX.write_text(body, encoding="utf-8")
    print(f"~ 重建 {INDEX.relative_to(VAULT)}（{len(entries)} 条）")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="列出本机所有 Hermes 技能")
    ap.add_argument("--only", help="只同步指定技能名")
    ap.add_argument("--check", action="store_true", help="只比对差异，不写文件")
    ap.add_argument("--add", help="把技能加入清单")
    ap.add_argument("--cat", default="其他")
    ap.add_argument("--title")
    ap.add_argument("--desc", default="")
    a = ap.parse_args()

    if a.list:
        for n, rel in all_skills():
            print(f"{n:45s} {rel}")
        return

    ROOT.mkdir(parents=True, exist_ok=True)
    mf = load_manifest()

    if a.add:
        if not find_skill(a.add):
            print(f"✗ 本机没有技能 {a.add}")
            sys.exit(1)
        mf["技能"] = [e for e in mf["技能"] if e["技能"] != a.add]
        mf["技能"].append({"技能": a.add, "分类": a.cat,
                           "标题": a.title or a.add, "说明": a.desc})
        save_manifest(mf)
        print(f"+ 已加入清单：{a.add} -> {a.cat}")
        return

    todo = mf["技能"]
    if a.only:
        todo = [e for e in todo if e["技能"] == a.only]
    print(f"导出目标：{ROOT}")
    for e in todo:
        export_one(e, check_only=a.check)
    if not a.check:
        for e in todo:
            if e.get("分类") is None:
                e["分类"] = "其他"
        save_manifest(mf)
        rebuild_index(todo)


if __name__ == "__main__":
    main()

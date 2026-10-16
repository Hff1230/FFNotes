---
title: 改字号/行距后高亮不再居中 —— 成因与修复
项目: 纯阅
类型: 修复方案（先文档后改码）
关联: [[03-纯阅关键约定与踩坑]]、`docs/fix/scroll_page_label_skip/fix-plan.md`
所有者: 虾米
更新: 2026-10-16
状态: 已改码 + 门禁 GREEN + 已出包；**真机待验**
---

# 改字号/行距后高亮不再居中

## 1. 现象（用户真机 2026-10-16）

> 「跳转字体大小和行距后高亮不能保持在屏幕中间了」

听书（滚动模式居中跟读）时改字号或行距，高亮就不再停在屏幕中间。

## 2. 根因（读码确认）

字号的 `A-` / `A+` 与行距按钮原来只做一件事：`this.rebuildPages()`（**重分页**）。
而滚动模式的几何全在 `measureBlocks()` 里：

| 量 | 谁在用 |
|---|---|
| `measWidth` / `measLineH`（那把「尺子」） | `blockEstHeight()` → 块高 → `pixelOfLocal()` → `centerTarget()` 的目标 y |
| `blockTops` / `contentHeight` / `maxScroll` | 居中目标、上下界夹取、章末判据 |

`rebuildPages()` **不碰这些** ⇒ 改完字号/行距后，居中跟读仍在用**旧字号的行高**算目标 ⇒ 高亮回不到屏幕中间。
（`measureBlocks()` 只在建窗口 / 视口变化 / 换章时被调用，改字号这条路上一次都没有。）

## 3. 修法（只动字号/行距三个按钮的那条路）

新增 `onFontMetricsChanged()`：

```
rebuildPages()            // 重分页（原有）
measureBlocks()           // ★ 补上：重算尺子 measWidth/measLineH + blockTops/contentHeight/maxScroll
updatePageLabel(true)     // 页码立即刷新（页码按文字位置算，不受行高影响，但保持一致）
if (ttsPlaying && !pageMode) { syncHi(); recenterNow(); }   // ★ 听书中：立刻重新居中
```

`recenterNow()`：清掉「让位窗」`userHoldUntil`（用户刚点是明确要求重居中）→ 立刻 `followFrontier(当前朗读位置)`
→ **再补两次**（120 ms / 350 ms）—— List 用新字号重排要一两帧，第一次那次目标是拿旧布局算的。

## 4. 验收

1. 门禁：`python tools/font_metrics_selftest.py` → **GREEN**；反向对照（`git show HEAD:…` 旧版）→ **RED（8 项失败）**
   → 证明门禁真的跟着代码走（不是摆设）。
2. 真机：听书（滚动模式）中改字号 `A+`/`A-` 或行距 ⇒ 高亮**仍停在屏幕中间**，不跑出屏幕、不贴顶。
3. 不回归：改字号后阅读位置不漂（`rebuildPages()` 的锚定逻辑未动）；翻页模式行为不变（该分支不重居中）。

## 5. 交付

| 项 | 值 |
|---|---|
| 包 | `release/_wip/entry-default-signed-label4font-release.hap`（含本修复 + 页码第四稿） |
| md5 / 体积 | `1db2d2cc285b6c593f21bddace41032a` / 1,314,056 B（10-16 11:0x，自用版 release） |
| 飞书 | message_id `om_x100b622d65e0c4a0def8631c0a4a89c`，回读 md5 一致 ✅ |

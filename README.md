# 数学路径怪探

适合移动端与桌面的中英文数字路径益智游戏。支持 3×3、4×4、5×5、6×6，共 319 题；刷新页面后会保留上次题目、已走路径和完成记录。

A bilingual number-path puzzle game for mobile and desktop. It includes 319 puzzles from 3×3 to 6×6 and preserves the current puzzle, path, and completion records after a refresh.

- 正式版：<https://edu.alading.org/games/number-path>
- English: <https://edu.alading.org/en/games/number-path>
- GitHub Pages：<https://lsdlyu.github.io/number-path-game/>

## 本地开发

```bash
pnpm install
pnpm dev
```

## 玩法

从数字 1 出发，只走上下左右，按顺序经过数字；不漏格、不重走，最后抵达最大的数字。

- 3×3、4×4、5×5、6×6 分别独立解锁。每个类别初始只开放第 1 题，按顺序通关后开放下一题；未解锁题目在列表和快捷选择中禁用。
- 可以重玩已解锁题目。“重新开始”确认后只重置当前路线，保留通关记录、最佳成绩和已解锁关卡；刷新后继续保存的路线。
- 旧版记录继续保留。若此前跳过了前面的题目，需要补完缺少的题目后才能继续后面的关卡；刷新时会回到可进入的关卡。
- 进度保存在当前浏览器，本地存储不可用时仍可游玩，但刷新后无法保留进度。

Each board size unlocks independently. Solve cases in order to unlock the next one. Replaying a case keeps your completion record, best time, and unlocked cases. Existing records are retained, but any earlier unsolved cases must be completed before moving on.

自得学园出品｜ChatGPT 协力 · 人工复核

## 通关反馈与专注体验

- 3×3：轻量星光（约 1.2 秒）；4×4：单束烟花（约 1.6 秒）；5×5：双束烟花（约 2.1 秒）；6×6：三束烟花（约 2.6 秒）。动画局限于棋盘，不遮挡操作。
- 仅在本次通关时播放庆祝并触发节奏震动；刷新和重新打开已完成关卡不会重播。
- 当前路线没有合法的下一格时，显示暖色边框与回退提示，并短震两下。这里只判断眼前的合法下一步，不声称能提前识别所有无解分支。不会拿预设答案来判定死路。
- “体验设置”提供动效、震动、自动聚焦三个独立开关，保存在当前浏览器。动效关闭或系统要求减少动态效果时停用动画。
- 标准震动 API 仅在支持的浏览器和设备上尝试调用，实际效果受硬件与系统设置影响；不支持时禁用震动开关，保留文字与边框提示。可使用“试一下震动”在真机确认。
- 开始走棋后弱化标题与类别栏，悬停或键盘进入时恢复；不在拖动中折叠界面，避免棋盘位置变化。

## 界面与交互

- 棋盘集中展示，关卡、体验设置和玩法说明按需打开。手机使用底部面板，保留语言切换；常用操作紧邻棋盘。
- 棋盘标明下一数字、终点、已走格数和本次用时。支持拖动、逐格点击、点回已走格回退；键盘方向键走棋，`Z` / `Backspace` 撤回。
- 快速直线拖动会补上经过的格子；支持时使用合并前的指针采样保留转弯。多点触控只跟随开始连线的指针，不猜测没有采样到的对角转弯。
- 各类别记住正在玩的关卡和路线。计时从首次走棋开始，打开面板、进入后台时暂停，刷新后累加已保存用时。
- 提示从当前路线寻找可行解，标准路线使用即时提示；其他路线在 Worker 中限量搜索。超时或计算预算用尽仅提示“暂时没找到”，不会误判为无解。缺少 Worker 时使用更小的搜索预算。
- 面板使用原生 `dialog`，支持 Escape 关闭和浏览器焦点管理；棋盘只有一个 Tab 入口，提示文字包含行列位置。重开需要确认，可取消并继续当前路线。

设计依据、取舍和验证范围见 [界面与交互评审](docs/UX_REVIEW.md)。

验证：`pnpm test` 覆盖全部 319 题的标准解路径、四档通关、死路回退、开关持久化、刷新不重播、无震动支持和减少动态效果，以及各类别独立解锁、旧记录兼容、重玩保留成绩、快速拖动、键盘回退、面板操作、计时暂停和提示搜索；`pnpm build` 检查类型和生产构建。真实手机的触感与震感需在设备上确认。

## GitHub Pages 发布配置

仓库已包含 `.github/workflows/deploy-pages.yml`，会在 `main` 更新时构建并发布 `dist`。请在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，无需再创建发布工作流。这样可避免“Deploy from a branch”的旧流程把源码覆盖到线上。[GitHub 官方配置说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

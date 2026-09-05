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

自得学园出品｜ChatGPT 协力 · 人工复核

## 通关反馈与专注体验

- 3×3：轻量星光（约 1.2 秒）；4×4：单束烟花（约 1.6 秒）；5×5：双束烟花（约 2.1 秒）；6×6：三束烟花（约 2.6 秒）。动画局限于棋盘，不遮挡操作。
- 仅在本次通关时播放庆祝并触发节奏震动；刷新和重新打开已完成关卡不会重播。
- 当前路线没有合法的下一格时，显示暖色边框与回退提示，并短震两下。这里只判断眼前的合法下一步，不声称能提前识别所有无解分支。不会拿预设答案来判定死路。
- “体验设置”提供动效、震动、自动聚焦三个独立开关，保存在当前浏览器。动效关闭或系统要求减少动态效果时停用动画。
- 标准震动 API 仅在支持的浏览器和设备上尝试调用，实际效果受硬件与系统设置影响；不支持时禁用震动开关，保留文字与边框提示。可使用“试一下震动”在真机确认。
- 开始走棋后弱化外围面板，悬停或键盘进入面板时恢复；不在拖动中折叠界面，避免棋盘位置变化。手机布局压缩标题和选题区，保留撤回、提示、重开及通关后的下一题入口。

验证：`pnpm test` 覆盖全部 319 题的标准解路径、四档通关、死路回退、开关持久化、刷新不重播、无震动支持和减少动态效果；`pnpm build` 检查类型和生产构建。真实手机的震感需在设备上确认。

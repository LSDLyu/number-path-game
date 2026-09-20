# Lisa 的字母冒险

独立游戏文件位于 `public/games/lisa-letter-adventure/`，包含十关和全部本地图片。原有数学路径怪探的源码、入口、关卡、存档和配置保持不变。

## 本次修正

小人第一次落在第一关的字母上可以站稳，字母晃动时小人跟随。由字母上短跳或长跳后，再落回同一字母即可收集；字母消失，出现字母名称、示例单词、手绘图片，并朗读字母名称和单词。沿用补心规则，不扣心。

## 发布到 edu.alading.org

目标新增路径：`/games/lisa-letter-adventure/`。只把此目录的 index.html 和 assets 部署到对应独立路径；不要替换域名根目录、现有 `/games/number-path`、旧 `/number-path-game/` 或其它页面。

`public/games/index.html` 是新增的游戏目录页，列出数学路径怪探和 Lisa 的字母冒险。当前线上 `/games/` 为 404。若主站由框架管理，请将此目录页移植为主站的 /games 路由，并将原“数学游戏”导航链接指向 /games/。必须在主站源项目中构建发布，不能用本仓库的 dist 整体覆盖主站。

本仓库现有 Vite 构建会复制 public 内容；GitHub Pages 的独立入口为仓库路径下 `games/lisa-letter-adventure/`。它不等同于 edu.alading.org 发布完成。

## 验证

游戏完整回归测试通过，包括十关控制、52项字母任务、全部配图解码、新增37处字母可达性，以及站上字母后短跳/长跳再落回的收集与朗读。未做真实 iPad 声音听测。

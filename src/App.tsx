import { NumberPathGame } from "./NumberPathGame";

export function App() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="https://edu.alading.org/" aria-label="返回自得学园首页">
          <span aria-hidden="true">学</span>
          <strong>自得学园<small>ZIDE LEARNING</small></strong>
        </a>
        <nav aria-label="页面链接">
          <a href="https://edu.alading.org/games/number-path">正式游戏页</a>
          <a href="https://edu.alading.org/">更多学习内容</a>
        </nav>
      </header>
      <main><NumberPathGame /></main>
      <footer className="site-footer">
        <div>
          <strong>自得学园</strong>
          <span>ChatGPT 协力 · 人工复核</span>
        </div>
        <nav aria-label="页尾链接">
          <a href="https://edu.alading.org/apply">申请试读</a>
          <a href="https://alading.org/">返回 alading.org</a>
        </nav>
      </footer>
    </>
  );
}

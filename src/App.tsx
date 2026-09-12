import { useEffect, useState } from "react";
import { NumberPathGame } from "./NumberPathGame";

type Locale = "zh" | "en";

const appCopy = {
  zh: {
    brand: "自得学园",
    brandLatin: "ZIDE LEARNING",
    brandLabel: "返回自得学园首页",
    navLabel: "页面链接",
    live: "正式游戏页",
    more: "更多学习内容",
    switchLanguage: "English",
    switchLabel: "Switch to English",
    footerNote: "ChatGPT 协力 · 人工复核",
    footerLabel: "页尾链接",
    apply: "申请试读",
    back: "返回 alading.org",
    title: "数学路径怪探｜自得学园",
  },
  en: {
    brand: "Zide Learning",
    brandLatin: "自得学园",
    brandLabel: "Back to the Zide Learning home page",
    navLabel: "Page links",
    live: "Official game page",
    more: "More learning resources",
    switchLanguage: "中文",
    switchLabel: "切换到中文",
    footerNote: "ChatGPT collaboration · human review",
    footerLabel: "Footer links",
    apply: "Request a sample",
    back: "Back to alading.org",
    title: "Number Path Detectives | Zide Learning",
  },
} as const;

function initialLocale(): Locale {
  const requested = new URLSearchParams(window.location.search).get("lang");
  if (requested === "zh" || requested === "en") return requested;
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "zh";
}

export function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const copy = appCopy[locale];
  const alternateLocale: Locale = locale === "zh" ? "en" : "zh";
  const liveHref = locale === "zh"
    ? "https://edu.alading.org/games/number-path"
    : "https://edu.alading.org/en/games/number-path";

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : "en";
    document.title = copy.title;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", locale);
    window.history.replaceState(null, "", url);
  }, [copy.title, locale]);

  return (
    <>
      <header className="site-header">
        <a className="brand" href={locale === "zh" ? "https://edu.alading.org/" : "https://edu.alading.org/en"} aria-label={copy.brandLabel}>
          <span aria-hidden="true">学</span>
          <strong>{copy.brand}<small>{copy.brandLatin}</small></strong>
        </a>
        <nav aria-label={copy.navLabel}>
          <a
            href={`?lang=${alternateLocale}`}
            aria-label={copy.switchLabel}
            onClick={(event) => {
              event.preventDefault();
              setLocale(alternateLocale);
            }}
          >
            {copy.switchLanguage}
          </a>
        </nav>
      </header>
      <main><NumberPathGame key={locale} locale={locale} /></main>
      <footer className="site-footer">
        <div>
          <strong>{copy.brand}</strong>
          <span>{copy.footerNote}</span>
        </div>
        <nav aria-label={copy.footerLabel}>
          <a href={liveHref}>{copy.live}</a>
          <a href={locale === "zh" ? "https://edu.alading.org/" : "https://edu.alading.org/en"}>{copy.more}</a>
          <a href={locale === "zh" ? "https://edu.alading.org/apply" : "https://edu.alading.org/en/apply"}>{copy.apply}</a>
          <a href="https://alading.org/">{copy.back}</a>
        </nav>
      </footer>
    </>
  );
}

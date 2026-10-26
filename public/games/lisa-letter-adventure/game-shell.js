/* Canonical game chrome. Copies in independent games are kept byte-identical. */
(() => {
  if (window.__zideGameShell) { document.dispatchEvent(new Event('zide-game-shell:mount')); return; }
  window.__zideGameShell = true;
  const names = ['number-path', 'lisa-letter-adventure', 'typewriter', 'number-merge', 'lisa-wonder-house', 'huarong', 'shotgun', 'rourou'];
  const script = document.currentScript;
  let audio;
  import(new URL('site-audio.mjs', script?.src || new URL('/game-shell.js', location.href)).href).then(module => {
    audio = module; module.subscribeAudio(updateAudio); updateAudio();
  }).catch(() => { /* Keep the control disabled when preferences cannot load. */ });
  const style = `
    :host{display:block;color:#243d34;font:15px/1.5 "PingFang SC","Microsoft YaHei",system-ui,sans-serif;text-align:left}
    *{box-sizing:border-box}a{color:inherit;text-decoration:none}button{font:inherit;color:inherit;cursor:pointer}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #b74c24;outline-offset:3px;border-radius:6px}
    .bar{background:#f7f1e6f7;border-bottom:1px solid #234b3c26;backdrop-filter:blur(14px)}
    .inner{max-width:1240px;margin:auto;padding:0 28px;display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:var(--zgs-header-height,80px);transition:min-height .2s ease}
    .brand{display:flex;align-items:center;gap:10px;flex-shrink:0;min-height:44px}.mark{display:grid;place-items:center;width:42px;height:42px;border:2px solid #234b3c;border-radius:47% 53% 50% 50%;background:#f1d77a;font:24px Georgia,serif;transform:rotate(-5deg)}
    strong{display:block;font:700 22px/1.1 "Songti SC",Georgia,serif}.latin{display:block;font-size:9px;letter-spacing:.13em;margin-top:4px}
    nav{display:flex;align-items:center;gap:18px}nav a{display:flex;align-items:center;min-height:44px;font-size:14px;font-weight:650;white-space:nowrap}.language{border:1px solid #234b3c55;border-radius:24px;padding:0 16px;min-height:44px}
    :host([compact]) .mark{width:32px;height:32px;font-size:20px}:host([compact]) strong{font-size:18px}:host([compact]) .latin{display:none}
    .skip{position:absolute;top:4px;left:16px;transform:translateY(-160%);background:#f1d77a;padding:8px 14px;z-index:2}.skip:focus{transform:none}
    .footer{border-top:1px solid #234b3c26;background:#f0e9dc;margin-top:0}.foot-inner{max-width:1240px;margin:auto;padding:28px;display:flex;justify-content:space-between;align-items:center;gap:24px}.footer strong{font-size:19px}.footer p{margin:6px 0;color:#4d645b;font-size:13px}.footer small{font-size:11px;color:#4d645b}.footer nav{flex-wrap:wrap;gap:8px 20px}.footer nav a{font-size:13px}
    @media(max-width:600px){.inner{padding:0 16px;gap:10px}.brand{gap:7px}.mark{width:34px;height:34px;font-size:21px}strong{font-size:19px}.latin{font-size:8px}nav{gap:10px}nav a{font-size:12px}.language{padding:0 12px}.home{display:none}.foot-inner{padding:24px 18px;align-items:start;flex-direction:column;gap:12px}.footer nav{gap:8px 24px}}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}}
    .audio-toggle{min-width:44px;min-height:44px;border:1px solid #234b3c55;border-radius:50%;background:#fffaf0;font-size:18px}.audio-settings{border:0;background:transparent;min-height:44px;font-weight:650;font-size:13px}
    dialog{color:#243d34;background:#fffaf0;border:2px solid #234b3c;border-radius:18px;padding:24px;width:min(420px,calc(100vw - 32px));max-height:85svh;overflow:auto}dialog::backdrop{background:#162c2766}dialog h2{margin:0 0 12px;font-size:23px}dialog p{font-size:14px;line-height:1.6}dialog label{display:flex;align-items:center;gap:12px;min-height:48px}dialog input{width:22px;height:22px;accent-color:#17685f}dialog button{min-height:44px;padding:8px 18px;border:1px solid #234b3c;border-radius:12px;background:#f1d77a}.audio-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}button:disabled{opacity:.6;cursor:default}
    @media(max-width:400px){.inner{padding:0 10px;gap:8px}.mark{width:28px;height:28px;font-size:18px}strong{font-size:17px}.latin{font-size:7px}nav{gap:6px}nav a{font-size:11px}.language{padding:0 9px}.audio-toggle{min-width:44px}}
  `;
  let header, footer, lastLocale, frame = 0;
  const locale = () => new URLSearchParams(location.search).get('lang') === 'en' || location.pathname.startsWith('/en/') || document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
  function gameName() {
    const match = location.pathname.match(/\/(?:en\/)?games\/([^/]+)/);
    if (match && names.includes(match[1])) return match[1];
    if (/^\/(en\/)?games\/?$/.test(location.pathname)) return 'directory';
    return script?.dataset.zideGame || document.querySelector('[data-zide-game]')?.dataset.zideGame;
  }
  function links(en, game) {
    const onSite = location.hostname === 'edu.alading.org' || ['localhost','127.0.0.1'].includes(location.hostname);
    const origin = onSite ? '' : 'https://edu.alading.org';
    const base = en ? '/en' : '';
    let alternate = origin + (en ? '' : '/en') + '/games/' + (game === 'directory' ? '' : game + '/');
    if (onSite && game === 'number-path') alternate += '?lang=' + (en ? 'zh' : 'en');
    if (!onSite) {
      const url = new URL(location.href);
      if (game === 'lisa-letter-adventure') url.pathname = url.pathname.replace(/(?:index(?:-en)?\.html)?$/, en ? 'index.html' : 'index-en.html');
      else if (game === 'lisa-wonder-house') url.pathname = url.pathname.replace(/\/(zh|en)\//, en ? '/zh/' : '/en/');
      else url.searchParams.set('lang', en ? 'zh' : 'en');
      alternate = url.href;
    }
    return { home: origin + (base || '/'), games: origin + base + '/games/', apply: origin + base + '/apply', alternate };
  }
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(game) {
    const language = locale();
    if (lastLocale === language && header?.shadowRoot.childElementCount) return;
    lastLocale = language;
    const en = language === 'en', href = links(en, game), brand = en ? 'Zide Learning' : '自得学园';
    header.shadowRoot.innerHTML = `<style>${style}</style><header class="bar"><a class="skip" href="#zide-game-content">${en ? 'Skip to game' : '跳到游戏'}</a><div class="inner"><a class="brand" href="${href.home}" aria-label="${en ? 'Zide Learning home' : '自得学园首页'}"><span class="mark" aria-hidden="true">学</span><span><strong>${brand}</strong><span class="latin">${en ? '自驱成长，自得其乐' : 'ZIDE LEARNING'}</span></span></a><nav aria-label="${en ? 'Site navigation' : '网站导航'}"><a class="home" href="${href.home}">${en ? 'Home' : '首页'}</a><a href="${href.games}">${en ? 'All games' : '全部游戏'}</a><a class="language" href="${escape(href.alternate)}" lang="${en ? 'zh-CN' : 'en'}" aria-label="${en ? '切换到中文' : 'Switch to English'}">${en ? '中文' : 'English'}</a><button class="audio-toggle" type="button" disabled aria-label="${en ? 'Mute all games' : '所有游戏静音'}">♫</button></nav></div></header>`;
    footer.shadowRoot.innerHTML = `<style>${style}</style><footer class="footer"><div class="foot-inner"><div><strong>${brand}</strong><p>${en ? 'Self-driven growth, joyfully discovered.' : '自驱成长，自得其乐'}</p><small>${en ? 'ChatGPT collaboration · human review' : 'ChatGPT 协力 · 人工复核'}</small></div><nav aria-label="${en ? 'Footer links' : '页尾链接'}"><a href="${href.games}">${en ? 'All games' : '全部游戏'}</a><a href="${href.apply}">${en ? 'Request a sample' : '申请试读'}</a><a href="https://alading.org/">${en ? 'Back to alading.org' : '返回 alading.org'} ↗</a><button class="audio-settings" type="button">${en ? 'Sound settings' : '声音设置'}</button></nav></div></footer><dialog aria-labelledby="sound-title"><h2 id="sound-title">${en ? 'Sounds for every game' : '一起调好声音'}</h2><p>${en ? 'One sound switch at the top, shared across games on this browser. Choose sound types here.' : '顶部开关控制所有游戏的声音，这里可以分别设置音乐、音效和语音。设置会保存在当前浏览器。'}</p>${[['music',en?'Music':'音乐'],['effects',en?'Sound effects':'音效'],['voice',en?'Words and spoken hints':'单词发音与语音提示']].map(([key,label])=>`<label><input type="checkbox" disabled data-audio="${key}">${label}</label>`).join('')}<div class="audio-actions"><button class="try-sound" type="button">${en ? 'Try a chime' : '试听一声铃'}</button><button class="close-sound" type="button">${en ? 'Done' : '调好了'}</button></div></dialog>`;
    header.shadowRoot.querySelector('.audio-toggle').addEventListener('click', () => audio?.setAudioPreferences({muted: !audio.readAudioPreferences().muted}));
    const dialog = footer.shadowRoot.querySelector('dialog');
    footer.shadowRoot.querySelector('.audio-settings').addEventListener('click', () => { updateAudio(); dialog.showModal(); });
    footer.shadowRoot.querySelector('.close-sound').addEventListener('click', () => dialog.close());
    dialog.querySelectorAll('[data-audio]').forEach(input => input.addEventListener('change', () => audio?.setAudioPreferences({[input.dataset.audio]:input.checked})));
    dialog.querySelector('.try-sound').addEventListener('click', () => {
      if (!audio?.allowsAudio('effects')) return;
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      const context = new Context();
      context.resume().then(() => {
        if (!audio.allowsAudio('effects')) { context.close(); return; }
        const oscillator = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
        oscillator.frequency.value = 660; gain.gain.setValueAtTime(.04,now); gain.gain.exponentialRampToValueAtTime(.001,now+.22);
        oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(now+.24); oscillator.onended=()=>context.close();
      }).catch(()=>context.close());
    });
    const mainTarget=document.querySelector('main');
    if(mainTarget){if(!mainTarget.id)mainTarget.id='zide-game-content';header.shadowRoot.querySelector('.skip').setAttribute('href','#'+mainTarget.id);}
    updateAudio();
    header.shadowRoot.querySelector('.skip').addEventListener('click', event => {
      event.preventDefault();
      const main = document.querySelector('main');
      if (main) { if (!main.id) main.id='zide-game-content'; if (!main.hasAttribute('tabindex')) main.tabIndex = -1; main.focus({preventScroll:true}); main.scrollIntoView({block:'start'}); }
    });
  }
  function updateAudio() {
    if (!audio || !header?.shadowRoot || !footer?.shadowRoot) return;
    const prefs = audio.readAudioPreferences(), en = locale() === 'en', button = header.shadowRoot.querySelector('.audio-toggle');
    if (button) { button.disabled=false; button.textContent=prefs.muted?'🔇':'♫'; button.setAttribute('aria-pressed',String(prefs.muted)); button.setAttribute('aria-label',en?(prefs.muted?'Unmute all games':'Mute all games'):(prefs.muted?'取消所有游戏静音':'所有游戏静音')); }
    footer.shadowRoot.querySelectorAll('[data-audio]').forEach(input => { input.checked=prefs[input.dataset.audio]; input.disabled=false; });
    const preview=footer.shadowRoot.querySelector('.try-sound'); if(preview)preview.disabled=!audio.allowsAudio('effects');
    // Bridge the unmodified upstream motion lab to the single shared switch.
    if (gameName()==='shotgun') {
      const control=document.querySelector('#sound');
      if(control){
        control.closest('.setting-row').hidden=true;
        const enabled=audio.allowsAudio('effects');
        control.disabled=false;
        if(control.checked!==enabled){control.checked=enabled;control.dispatchEvent(new Event('change'));}
        const note=document.querySelector('#feedback-note');
        if(note)note.textContent=en?'Use the sound switch at the top. Animations and mechanical sounds are learning demonstrations.':'声音由顶部统一控制。部件动画与机械声均为教学演示。';
      }
    }

  }
  function scroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!header) return;
      const compact = (innerHeight <= 500 && innerWidth > innerHeight) || (header.hasAttribute('compact') ? window.scrollY > 16 : window.scrollY > 80);
      header.toggleAttribute('compact', compact);
      document.documentElement.classList.toggle('zgs-compact', compact);
    });
  }
  function mount() {
    const game = gameName();
    if (!game || !document.body) return;
    if (!document.getElementById('zgs-style')) {
      const css = document.createElement('style'); css.id = 'zgs-style';
      css.textContent = `html.zgs-ui{--zgs-header-height:80px;scroll-padding-top:68px}html.zgs-ui.zgs-compact{--zgs-header-height:52px}#zgs-header{display:block;width:100%;position:sticky;top:0;z-index:50;padding-top:env(safe-area-inset-top,0px);background:#f7f1e6}#zgs-footer{display:block;width:100%;clear:both;padding-bottom:env(safe-area-inset-bottom,0px);background:#f0e9dc}.zgs-ui .site-header,.zgs-ui .site-footer,.zgs-ui .z-header,.zgs-ui .z-footer{display:none!important}.zgs-ui[data-zgs-game="shotgun"] #lab>.header{display:none!important}.zgs-ui[data-zgs-game="directory"] .header,.zgs-ui[data-zgs-game="directory"] body>footer{display:none!important}.zgs-ui[data-zgs-game="lisa-wonder-house"] .bottom-line,.zgs-ui[data-zgs-game="lisa-wonder-house"] #languageLink{display:none!important}.zgs-ui .z-skip,.zgs-ui body>.skip-link,.zgs-ui[data-zgs-game="directory"] body>.skip{display:none!important}html.zgs-ui[data-zgs-game="lisa-letter-adventure"],.zgs-ui[data-zgs-game="lisa-letter-adventure"] body{height:auto;min-height:100%;overflow:visible;overscroll-behavior-y:auto;touch-action:pan-y;background:#f7f1e6}.zgs-ui[data-zgs-game="lisa-letter-adventure"] body{display:block;place-items:normal}.zgs-ui[data-zgs-game="lisa-letter-adventure"] .game-shell{margin:0 auto;width:min(100vw,calc((100svh - var(--zgs-header-height)) * 16 / 9));height:min(calc(100svh - var(--zgs-header-height)),calc(100vw * 9 / 16));touch-action:none;overflow:clip}.zgs-ui[data-zgs-game="lisa-letter-adventure"] .panel{max-height:calc(100svh - var(--zgs-header-height) - 24px);overflow:auto;overscroll-behavior:contain}.zgs-ui[data-zgs-game="lisa-letter-adventure"] .overlay{padding:12px}.zgs-ui[data-zgs-game="lisa-letter-adventure"] .letter-card.show{max-height:calc(100svh - var(--zgs-header-height) - 24px)}@media(max-width:600px){html.zgs-ui{--zgs-header-height:72px}html.zgs-ui.zgs-compact{--zgs-header-height:52px}}@media(orientation:portrait) and (max-width:820px){.zgs-ui[data-zgs-game="lisa-letter-adventure"] .game-shell{width:100%;height:calc(100svh - var(--zgs-header-height));min-height:500px;max-height:none}}`;
      document.head.append(css);
    }
    if (!header?.isConnected) {
      header = document.createElement('div'); header.id = 'zgs-header'; header.attachShadow({mode:'open'});
      footer = document.createElement('div'); footer.id = 'zgs-footer'; footer.attachShadow({mode:'open'});
      document.body.prepend(header); document.body.append(footer); lastLocale = null;
    }
    document.documentElement.classList.add('zgs-ui');
    document.documentElement.dataset.zgsGame = game;
    render(game); scroll();
    if (game !== 'directory') { try { localStorage.setItem('zide-last-game-v1',JSON.stringify({game,locale:locale()})); } catch { /* Optional history. */ } }
  }
  document.addEventListener('zide-game-shell:mount', mount);
  document.addEventListener('zide-game-shell:unmount', () => {
    header?.remove(); footer?.remove(); header = footer = null; lastLocale = null;
    document.documentElement.classList.remove('zgs-ui','zgs-compact'); delete document.documentElement.dataset.zgsGame;
  });
  window.addEventListener('scroll', scroll, {passive:true});
  window.addEventListener('resize', scroll, {passive:true});
  new MutationObserver(() => { if (header) render(gameName()); }).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
})();

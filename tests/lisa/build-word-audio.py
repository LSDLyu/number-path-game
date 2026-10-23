"""Build the word map and bilingual, per-recording credits from local assets.

Run again after importing more Commons recordings. Missing recordings remain
explicitly labelled Iris; this script never invents a source or a license.
"""
import hashlib
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "public/games/lisa-letter-adventure"


def build():
    iris = json.loads((ROOT / "iris/manifest.json").read_text())
    words = {clip["text"]: "iris/" + clip["filename"] for clip in iris["clips"] if clip["event"] == "word"}
    credits = json.loads((ROOT / "audio/credits.json").read_text())
    assert set(credits) <= set(words), "Unexpected word in Commons credits"
    for word, credit in credits.items():
        assert credit["file"] == f"audio/{word}.mp3"
        assert credit["source"].startswith("https://commons.wikimedia.org/wiki/File:")
        assert credit["original"].startswith("https://upload.wikimedia.org/")
        assert credit["author"] and credit["changes"]
        assert credit["license"]["url"].startswith("https://creativecommons.org/") or credit["license"]["url"] == "https://commons.wikimedia.org/wiki/Template:PD-self"
        words[word] = credit["file"]
    inventory = {}
    for word, path in words.items():
        data = (ROOT / path).read_bytes()
        assert len(data) > 100, f"Empty recording: {word}"
        inventory[word] = {"file": path, "source": "Wikimedia Commons" if word in credits else "Iris (synthesized)", "sha256": hashlib.sha256(data).hexdigest()}
    (ROOT / "audio/manifest.js").write_text("window.LISA_WORD_AUDIO = " + json.dumps(words, ensure_ascii=False) + ";\n")
    accents = {word: credit.get('accent', 'en-US') for word, credit in credits.items()}
    (ROOT / "audio/accents.js").write_text("window.LISA_WORD_ACCENTS = " + json.dumps(accents) + ";\n")
    (ROOT / "audio/coverage.json").write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + "\n")
    for en in [False, True]:
        title = "Word audio credits" if en else "单词录音来源"
        intro = (f"{len(credits)} of {len(words)} words use human recordings from Wikimedia Commons. The remaining {len(words)-len(credits)} words and game prompts use the existing synthesized Iris recordings."
                 if en else f"{len(words)} 个单词中，{len(credits)} 个使用维基共享资源（Wikimedia Commons）的真人录音；其余 {len(words)-len(credits)} 个单词和玩法提示沿用 Iris 合成录音。")
        if len(credits) == len(words):
            intro = (f"All {len(words)} words use human recordings from Wikimedia Commons. Game prompts retain the existing synthesized Iris recordings." if en else f"全部 {len(words)} 个单词使用维基共享资源（Wikimedia Commons）的真人录音。玩法提示保留原有 Iris 合成录音。")
        note = ("Most recordings use US English; igloo uses British English, and unicorn and yak use Australian English. Each speaker and license is listed below. Recordings are converted to MP3 with volume adjustment only; speaking speed and pitch are unchanged. If a recording cannot load, tap Listen again to retry; the game does not switch to a device voice."
                if en else "大部分单词采用美式英语；igloo 采用英式，unicorn 和 yak 采用澳式。下面逐条列出录音者及许可。录音转为 MP3 并调整音量，不改变语速、音高或剪切发音。录音加载失败时会提示重听，不会自动换成设备语音。")
        rows = []
        esc = html.escape
        for word, path in sorted(words.items()):
            credit = credits.get(word)
            source = (f'<a href="{esc(credit["source"])}">Wikimedia Commons</a> · {esc(credit["author"])} · <a href="{esc(credit["license"]["url"])}">{esc(credit["license"]["name"])}</a><p>{esc(credit["changes"])}</p>' if credit else ("Iris · synthesized recording" if en else "Iris · 合成录音"))
            labels = {'en-US': 'US English' if en else '美式英语', 'en-GB': 'British English' if en else '英式英语', 'en-AU': 'Australian English' if en else '澳式英语'}
            accent = labels.get(accents.get(word), '')
            rows.append(f'<li><h2>{esc(word)}</h2><p>{accent}</p><audio controls preload="none" aria-label="{esc(word)}" src="../{esc(path)}"></audio><div>{source}</div></li>')
        page = f'''<!doctype html>
<html lang="{'en' if en else 'zh-CN'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>
<style>body{{margin:0;background:#fff9ec;color:#3b4140;font:17px/1.65 system-ui,sans-serif}}main{{max-width:920px;margin:auto;padding:24px}}a{{color:#286655;text-underline-offset:3px}}.back{{display:inline-block;padding:12px 0}}h1{{font-size:2rem}}ul{{padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}}li{{list-style:none;background:#fff;border:1px solid #e0dacb;border-radius:20px;padding:16px;min-width:0}}h2{{margin:0 0 12px}}audio{{width:100%;min-height:44px}}li div{{margin-top:12px;font-size:.9rem;overflow-wrap:anywhere}}li p{{margin:8px 0}}</style></head>
<body><main><a class="back" href="{'../index-en.html' if en else '../'}">{'← Back to game' if en else '← 返回游戏'}</a><h1>{title}</h1><p>{intro}</p><p>{note}</p><ul>{''.join(rows)}</ul></main>
<script>document.addEventListener('play',function(event){{if(event.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(function(audio){{if(audio!==event.target)audio.pause()}})}},true);document.addEventListener('visibilitychange',function(){{if(document.hidden)document.querySelectorAll('audio').forEach(function(audio){{audio.pause()}})}});</script></body></html>
'''
        (ROOT / ("audio/credits-en.html" if en else "audio/credits.html")).write_text(page)
    print(f"Catalog: {len(credits)} Commons + {len(words)-len(credits)} Iris words; all {len(words)} files present")


if __name__ == "__main__":
    build()

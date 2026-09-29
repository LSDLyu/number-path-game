#!/usr/bin/env python3
"""Build the English Lisa page from the Chinese game without changing its mechanics."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2] / "public/games/lisa-letter-adventure"
source = (ROOT / "index.html").read_text()

# The first page redirects English-route visitors to this translated sibling.
source = source.replace(
    '  <script>\n    if (location.pathname.startsWith("/en/games/lisa-letter-adventure/")) {\n'
    '      location.replace("index-en.html" + location.search + location.hash);\n'
    '    }\n  </script>\n', ''
)
source = source.replace('<html lang="zh-CN">', '<html lang="en">')
source = source.replace(
    '<title>Lisa的字母冒险</title>',
    '<title>Lisa’s Letter Adventure</title>\n'
    '  <script>if (location.pathname.endsWith("/index-en.html")) '
    'history.replaceState(null, "", "./" + location.search + location.hash);</script>'
)
source = source.replace('https://edu.alading.org/games/', 'https://edu.alading.org/en/games/')
source = source.replace('https://edu.alading.org/"', 'https://edu.alading.org/en"')
source = source.replace('audio/credits.html', 'audio/credits-en.html')

# The meanings are Chinese translations in the original learning data. On the
# English page, the spoken English word also serves as the visible meaning.
source = re.sub(
    r'(\["[A-Z]", "([^"]+)", )"[^"]*"(, "[^"]+"\])',
    lambda match: match.group(1) + '"' + match.group(2) + '"' + match.group(3),
    source,
)
source = re.sub(
    r'(\["([a-z-]+)", )"[^"]*"(, "[^"]+"\])',
    lambda match: match.group(1) + '"' + match.group(2) + '"' + match.group(3),
    source,
)

translations = {
    "适合6岁儿童的绘本风字母启蒙横版闯关游戏": "A storybook letter adventure for young learners",
    "Lisa的字母冒险游戏": "Lisa’s Letter Adventure game",
    "Lisa的字母冒险": "Lisa’s Letter Adventure",
    "横版闯关游戏画面": "Side-scrolling game",
    "剩余五颗爱心": "Five hearts remaining",
    "关闭声音": "Mute sound",
    "打开声音": "Turn on sound",
    "暂停与菜单": "Pause and menu",
    "安全学习时刻": "Word learning pause",
    "苹果手绘图": "Apple illustration",
    "手绘图": " illustration",
    "游戏控制按钮": "Game controls",
    "方向控制": "Direction controls",
    "向上": "Up",
    "向下": "Down",
    "向左": "Left",
    "向右": "Right",
    "跳跃，长按跳得更高": "Jump; hold for a higher jump",
    "长按跳高": "Hold to jump higher",
    "横过来，画面会更大哦 ↻": "Turn your device sideways for a bigger view ↻",
    "陪 Lisa 玩 10 关，听单词、认图画，发现 A–Z！": "Explore 10 levels with Lisa. Hear words, match pictures, and discover A–Z!",
    "开始游戏": "Start game",
    "选关 · 学习记录": "Levels · learning record",
    "进度仅保存在这台设备": "Progress is saved on this device only",
    "短按小跳 · 长按大跳": "Tap for a short jump · hold for a high jump",
    "键盘：方向键 / WASD 移动，空格跳跃": "Keyboard: arrow keys / WASD to move; Space to jump",
    "太棒啦！": "Great job!",
    "Lisa找到了真正的城堡！": "Lisa found the real castle!",
    "再玩一次": "Play again",
    "返回网站": "Website links",
    "← 游戏大厅": "← Games",
    "自得学园首页": "Zide Learning home",
    "第一关 · 字母森林 · A–E": "Level 1 · Letter Forest · A–E",
    "🔊 再听一次": "🔊 Listen again",
    "我准备好了，继续 →": "I’m ready, continue →",
    "苹果": "apple",
    "字母森林": "Letter Forest",
    "滚滚球谷": "Rolling Ball Valley",
    "字母陨石雨": "Letter Meteor Shower",
    "彩虹蹦床岛": "Rainbow Trampoline Island",
    "星光字母列车": "Starlight Letter Train",
    "云朵升降桥": "Cloud Lift Bridge",
    "蘑菇弹跳园": "Bouncy Mushroom Garden",
    "小船漂流记": "Little Boat Journey",
    "气球花园": "Balloon Garden",
    "彩虹礼物城": "Rainbow Gift City",
    "先在安全的草地顶到 A，再跳过火炉！碰字母不扣爱心。": "Touch A on the safe grass, then jump over the furnace. Letters never cost a heart.",
    "按跳带球越过尖刺！上坡前按 ↓ 下球，再按方向键推球上坡。": "Jump with the ball over spikes. Press ↓ to dismount, then push the ball uphill.",
    "按 ↑ ↓ 调整篮子。漏掉的字母还会回来！": "Move the basket with ↑ and ↓. Missed letters will return!",
    "踩蹦床弹高，按 ← → 跳到下一张！按 ↓ 站稳；掉下去会扣一颗爱心。": "Bounce on the trampolines. Use ← → to reach the next one. Press ↓ to steady yourself; falling costs one heart.",
    "跳到字母上按 ↓ 蹲下，收字母、补爱心，给火车盖 Lisa 印章！": "Stand on a letter and press ↓ to collect it, restore a heart, and stamp Lisa’s train.",
    "按 ↑ ↓ 呼叫最近的云朵，跳到云桥上！空中按住 ↑ 可以滑翔。": "Call the nearest cloud with ↑ or ↓ and jump onto it. Hold ↑ in the air to glide.",
    "踩上蘑菇会弹高！按住 ↓ 可以站稳，松开再弹！": "Mushrooms launch you upward. Hold ↓ to stand still, then release to bounce.",
    "全程水域！方向键游泳，按跳回船；泡泡里不怕鲨鱼，但也不能收小鱼。": "Swim with the arrows and jump back into the boat. Bubbles protect you from sharks, but you cannot collect fish inside one.",
    "坐上气球用四个方向飞行！穿过发光字母圈；掉下气球会扣一颗爱心。": "Fly the balloon in four directions through glowing letter rings. Falling costs one heart.",
    "站到每个字母按钮附近按 ↓ 点亮彩虹！集齐六把钥匙，到礼包前按 ↑。": "Press ↓ near each letter button to light the rainbow. Find all six keys, then press ↑ at the gift.",
    "继续第 ": "Continue level ",
    " 关": "",
    "当前无法读取存档，仍可正常游玩": "Saved progress could not be read; you can still play",
    "存档不可用，请不要关闭页面": "Saving is unavailable; keep this page open",
    "歇一歇，再出发": "Take a break, then try again",
    "冒险菜单": "Adventure menu",
    "找到的字母已经留下了。补满爱心，从安全点继续吧！": "Your letters are safe. Restore your hearts and continue from a safe spot.",
    "进度自动保存在这台设备，已解锁的关卡可以重玩。": "Progress is saved on this device. You can replay unlocked levels.",
    "补满爱心，继续本关": "Restore hearts and retry",
    "继续冒险": "Continue adventure",
    "返回开始画面": "Back to start",
    "重新开始本关": "Restart this level",
    "玩法演示": "How to play",
    "学习记录 · 家长查看": "Learning record · for parents",
    "选关": "Choose a level",
    "录音来源": "Audio credits",
    "↓ 停": "↓ stop",
    "短按跳跃是小跳，长按跳得更高。收集字母后会暂停，听完单词再继续。": "Tap Jump for a small jump or hold it to jump higher. After collecting a letter, listen to the word before continuing.",
    "明白了，出发！": "Got it, let’s go!",
    " · 收集 ": " · collected ",
    " 次 · ": " times · ",
    "首次答对 ": "first-try correct ",
    " · 建议再练": " · practice again",
    " · 可继续复习": " · keep reviewing",
    "尚未复习": "not reviewed yet",
    "已收集 ": "Collected ",
    " / 52 个词，复习过 ": " / 52 words; reviewed ",
    " 个。收集表示遇见过，不代表已经掌握。": ". Collecting a word means you met it, not that you have mastered it.",
    "孩子不扣爱心地练习；家长可关注反复答错的词。记录仅在本设备保存。": "Review never costs hearts. Parents can revisit words that need more practice. Records stay on this device.",
    "开始冒险后，这里会出现单词记录。": "Your word record will appear here after you start.",
    "学习记录": "Learning record",
    "返回菜单": "Back to menu",
    "今天又认识了一些新朋友！": "You met some new word friends today!",
    "复习完成。错了也没关系，下次再听一听。": "Review complete. Mistakes are okay; listen again next time.",
    "从第一关再玩": "Play again from level 1",
    "去下一关": "Go to next level",
    "查看学习记录": "View learning record",
    "轻松复习 ": "Quick review ",
    "找到大写 ": "Find the lowercase partner for ",
    " 的小写伙伴": "",
    "听一听，选择对应的图片": "Listen and choose the matching picture",
    "不扣爱心，慢慢想。": "Take your time. No hearts lost.",
    "没关系，再听一次，然后再选一选。不扣爱心。": "That’s okay. Listen and try again. No hearts lost.",
    "答对啦！": "Correct!",
    "再认识一下：": "Meet it again:",
    "继续 →": "Continue →",
    "↓ 下球": "↓ dismount",
    "↓ 蹲下": "↓ crouch",
    "↓ 盖章": "↓ stamp",
    "↓ 潜水": "↓ dive",
    "↓ 下降": "↓ descend",
    "↓ 点亮": "↓ light up",
    "↓ 站稳": "↓ steady",
    "↓ 降云": "↓ lower cloud",
    "↓ 篮子": "↓ basket",
    "到坡脚啦 · ↓ 下球，再 → 推球": "At the slope · ↓ dismount, then → push",
    "站在球后面 · → 推球上坡": "Stand behind the ball · → push uphill",
    "🫧 泡泡保护中 · 出去才能收集小鱼": "🫧 Bubble shield · leave it to collect fish",
    "剩余": "",
    "颗爱心": " hearts remaining",
    "声音还没启动，轻点右上角的喇叭或“再听一次”。": "Sound is not on yet. Tap the speaker or Listen again.",
    "弹簧会连续回弹，试着在上面跳一跳！": "The spring keeps bouncing. Try jumping on it!",
    "小心障碍！": "Watch out for obstacles!",
    "还有 ": "Still missing ",
    "，找齐它们再去下一关！": ". Find them before the next level!",
    "礼包打开啦！A–Z 送你一场字母烟花！": "The gift is open! A–Z made fireworks just for you!",
    "完成！": " complete!",
    "这关的字母都找齐啦！下一站：": "You found every letter! Next stop: ",
    "听一听、认一认，再去下一关": "Listen and review before the next level",
    "十关都完成啦！": "All 10 levels complete!",
    "Lisa和 A–Z 都见过两次面啦！再来一次新的冒险吧。": "Lisa has met A–Z twice. Ready for a new adventure?",
    "复习今天的字母和单词": "Review today’s letters and words",
    "按住 ↓ 蹲下来，钻过小通道！": "Hold ↓ to crouch through the tunnel!",
    "火炉很烫，要跳过去！": "The furnace is hot. Jump over it!",
    "小心黑色小石山，要跳过去！": "Watch out for the dark rocks. Jump over!",
    "蓝色方块是实体，要跳过去，也可以站上去！": "The blue block is solid. Jump over it or stand on it!",
    "小心尖刺小山！跳过去，别落在尖刺上。": "Watch the spikes! Jump over them.",
    "下面是岩浆，不能碰！": "There is lava below. Stay clear!",
    "掉下去啦，再试一次！": "You fell. Try again!",
    "这是假的终点！真正的城堡还在前面。": "That is a false finish! The real castle lies ahead.",
    "靠近梯子，按 ↑ 或 ↓ 上下移动。": "At the ladder, press ↑ or ↓ to climb.",
    "上坡啦！按 ↓ 下球，站在球后面推它上去。": "Going uphill! Press ↓ to dismount, then push the ball from behind.",
    "一起把球推上坡": "Let’s push the ball uphill",
    "① 松开方向键，按 ↓ 下球。": "① Release the arrows and press ↓ to dismount.",
    "② Lisa 会站到球后面。": "② Lisa will stand behind the ball.",
    "③ 按住 →，慢慢把球推上坡。坡顶再跳回球上。": "③ Hold → to push uphill. Jump back onto the ball at the top.",
    "我来试一试": "Let me try",
    "球球被尖刺扎破了！按跳，让 Lisa 和球一起越过去。": "Spikes popped the ball! Jump to get Lisa and the ball across.",
    "小心尖刺！先跳回球上，再带着球一起跳。": "Watch the spikes! Jump onto the ball, then leap together.",
    "哎呀，是一颗小石头！让它落到草地上吧。": "Oh, a little rock! Let it fall onto the grass.",
    "石头碰到 Lisa 啦，左右躲一躲！": "A rock hit Lisa! Dodge left or right.",
    "掉下去啦！回到刚才的平台，再试一次。": "You fell! Back to the platform to try again.",
    "鲨鱼游过来啦！躲进泡泡，等它游走再找字母鱼。": "A shark is coming! Hide in a bubble until it swims away.",
    "彩虹钥匙 ": "Rainbow keys ",
    "集齐六把钥匙后，按 ↑ 打开礼包！": "Collect all six keys, then press ↑ to open the gift!",
    "小心掉落 · 踩稳平台再出发": "Watch your step · land safely",
    "安全泡泡": "Safe bubble",
    "送给 Lisa！": "For Lisa!",
    "↑ 打开礼包": "↑ open gift",
    "去下一站！": "Next stop!",
    "字母集合处": "Meet the letters",
    "踩蹦床弹跳 · ↓ 站稳 · 掉落扣心": "Bounce on trampolines · ↓ steady · falling costs a heart",
    "跳上字母 · ↓ 收集补心 + 盖 Lisa 章": "Jump on letters · ↓ collect, heal and stamp",
    "↑ ↓ 呼叫云朵 · ↑ 滑翔": "↑ ↓ call cloud · ↑ glide",
    "踩蘑菇弹高 · ↓ 停住": "Bounce on mushrooms · ↓ stop",
    "泡泡保护中 · 不会受伤 · 暂不能收集鱼": "Bubble shield · safe, but cannot collect fish",
    "游泳找字母鱼 · 泡泡里避鲨鱼但不能补心": "Swim for letter fish · bubbles block sharks and hearts",
    "↑ ↓ ← → 飞过字母圈": "↑ ↓ ← → fly through letter rings",
    "↓ 点亮六把钥匙 · ↑ 开礼包": "↓ light six keys · ↑ open gift",
    "终点": "Finish",
    "↓ 下球 · → 推球上坡": "↓ dismount · → push uphill",
    "接住字母  ": "Catch letters  ",
}

for chinese, english in sorted(translations.items(), key=lambda item: len(item[0]), reverse=True):
    source = source.replace(chinese, english)

remaining = [(number, line.strip()) for number, line in enumerate(source.splitlines(), 1)
             if re.search(r"[\u3400-\u9fff]", line)]
if remaining:
    raise SystemExit("Untranslated Chinese:\n" + "\n".join(f"{n}: {line}" for n, line in remaining))

(ROOT / "index-en.html").write_text(source)
credits = (ROOT / "audio/credits.html").read_text()
for chinese, english in {
    'lang="zh-CN"': 'lang="en"',
    '单词录音来源': 'Word audio credits',
    '以下 11 个词使用 Wikimedia Commons 真人录音。录音由 Ogg 转为 MP3，发音内容未改动；各 MP3 沿用表列许可。其余单词使用设备语音。':
        'Eleven words use human recordings from Wikimedia Commons. The audio was converted from Ogg to MP3 without changing the spoken content. Each MP3 retains the license shown below. Other words use your device’s speech voice.',
    '单词': 'Word', '录音者': 'Speaker', '来源': 'Source', '许可': 'License',
    '原始录音': 'Original recording', '返回游戏': 'Back to game',
}.items():
    credits = credits.replace(chinese, english)
(ROOT / "audio/credits-en.html").write_text(credits)
print(f"Wrote {ROOT / 'index-en.html'}")

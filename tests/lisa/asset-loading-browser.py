#!/usr/bin/env python3
"""Exercise the shipped Lisa script with Chromium, real Canvas, fetch and audio decoding."""
import asyncio
import collections
import json
import os
import re
import shutil
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
BASE=os.environ.get('LISA_TEST_BASE_URL','http://127.0.0.1:4201/games/lisa-letter-adventure/')
# Inject only into test responses, leaving production pages without a test API.
HOOK='''window.__loadingReview={
 state: function(){return {level:currentLevel,x:player.x,y:player.y,hearts:hearts,paused:paused,mode:learningMode,learned:Object.keys(learnedThisLevel),word:lastLesson&&lastLesson.word,started:started,audioState:audioContext&&audioContext.state,source:!!narrationSource};},
 enter: function(n){learningProgress.unlocked=Math.max(n,learningProgress.unlocked);enterLearningLevel(n,true);},
 reward: function(i){rewardLesson(letterLessons[i||0],player.x,player.y);},
 platform: function(){var out={};Object.keys(platformArt).forEach(function(k){out[k]={src:platformArt[k].src,loaded:platformArt[k].naturalWidth>0};});return out;}
};'''
CURRENT={'apple','ant','ball','banana','cat','cake','dog','duck','egg','elephant'}
NEXT={'fish','frog','goat','grape','hat','horse','igloo','insect','jam','jelly'}

def word(url):
    m=re.search(r'/audio/([^/]+)\.mp3(?:\?|$)',url)
    return m.group(1) if m else None

async def make_page(browser,locale='zh',connection=None,voice=True,muted=False):
    ctx=await browser.new_context(viewport={'width':1280,'height':900})
    await ctx.add_init_script('''(() => {
 const c=%s; Object.defineProperty(navigator,'connection',{configurable:true,value:{...c,addEventListener(){}}});
 localStorage.setItem('zide-audio-preferences-v1',JSON.stringify({muted:%s,voice:%s,music:true,effects:true}));
 window.__wordStarts=0; const start=AudioBufferSourceNode.prototype.start;
 AudioBufferSourceNode.prototype.start=function(...args){window.__wordStarts++;return start.apply(this,args);};
 })();'''%(json.dumps(connection or {'saveData':False,'effectiveType':'4g','downlink':10,'rtt':50}),json.dumps(muted),json.dumps(voice)))
    page=await ctx.new_page(); errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda req:requests.append(req.url))
    async def document_route(route):
        file='index-en.html' if locale=='en' else 'index.html'
        source=(ROOT/'public/games/lisa-letter-adventure'/file).read_text()
        marker='      syncHeroSprite();\n      requestAnimationFrame(loop);'
        assert source.count(marker)==1
        await route.fulfill(status=200,content_type='text/html',body=source.replace(marker,HOOK+'\n'+marker))
    await page.route(re.compile(r'/games/lisa-letter-adventure/index(?:-en)?\.html(?:\?.*)?$'),document_route)
    return ctx,page,requests,errors

async def load(page,locale='zh'):
    await page.goto(BASE+('index-en.html' if locale=='en' else 'index.html'),wait_until='networkidle')
    await page.wait_for_function('window.__loadingReview !== undefined')

async def start(page):
    await page.locator('#startBtn').click()
    if await page.locator('[data-learning="go"]').count():await page.locator('[data-learning="go"]').click()

async def enter(page,n):
    await page.evaluate('(n)=>window.__loadingReview.enter(n)',n)
    if await page.locator('[data-learning="go"]').count():await page.locator('[data-learning="go"]').click()

async def main():
    results={}
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        for locale in ['zh','en']:
            ctx,page,requests,errors=await make_page(browser,locale)
            await load(page,locale)
            assert not any(word(u) or 'platform-' in u for u in requests),requests
            cold=await page.evaluate(r'''()=>{const rs=performance.getEntriesByType('resource');return {requests:rs.length+1,encodedSubresourceBytes:rs.reduce((n,r)=>n+r.encodedBodySize,0),images:rs.filter(r=>r.initiatorType==='img').length,words:rs.filter(r=>/audio\/[^/]+\.mp3/.test(r.name)).length,platforms:rs.filter(r=>/platform-/.test(r.name)).length};}''')
            active=0;maximum=0
            async def slow_spec(route):
                nonlocal active,maximum
                active+=1;maximum=max(maximum,active)
                try:
                    response=await route.fetch();await asyncio.sleep(.06);await route.fulfill(response=response)
                finally:active-=1
            await page.route(re.compile(r'/audio/[^/]+\.mp3$|/assets/(?:apple|ball|cat|dog|egg)-small\.png$'),slow_spec)
            await start(page)
            await page.wait_for_function('()=>window.__loadingReview.state().started')
            for i in range(150):
                if {word(u) for u in requests if word(u)}==CURRENT:break
                await page.wait_for_timeout(100)
            assert {word(u) for u in requests if word(u)}==CURRENT,{word(u) for u in requests if word(u)}
            assert maximum==1,maximum
            assert not any(word(u) in NEXT or 'platform-' in u for u in requests)
            initial_maximum=maximum
            initial=await page.evaluate('window.__loadingReview.state()')
            await page.keyboard.down('ArrowRight');await page.wait_for_timeout(220);await page.keyboard.up('ArrowRight')
            moved=await page.evaluate('window.__loadingReview.state()')
            assert moved['x']>initial['x']+10,(initial,moved)
            await page.keyboard.down('Space');await page.wait_for_timeout(180);await page.keyboard.up('Space')
            jumped=await page.evaluate('window.__loadingReview.state()')
            assert jumped['y']<moved['y']-20,(moved,jumped)
            await page.evaluate('window.__loadingReview.reward(0)')
            await page.locator('#letterCard.show').wait_for()
            await page.wait_for_function('window.__wordStarts>0')
            lesson=await page.evaluate('window.__loadingReview.state()')
            await page.keyboard.down('ArrowRight');await page.wait_for_timeout(250);await page.keyboard.up('ArrowRight')
            assert (await page.evaluate('window.__loadingReview.state()'))['x']==lesson['x']
            await page.locator('#continueLessonBtn').click()
            await load(page,locale)
            await start(page)
            restored=await page.evaluate('window.__loadingReview.state()')
            assert 'A' in restored['learned'],restored
            await enter(page,4)
            await page.wait_for_function('Object.values(window.__loadingReview.platform()).filter(x=>x.src).every(x=>x.loaded)')
            platforms={k for k,v in (await page.evaluate('window.__loadingReview.platform()')).items() if v['src']}
            assert platforms=={'cloud','trampoline','rainbow'},platforms
            await enter(page,8)
            await page.wait_for_function('Object.values(window.__loadingReview.platform()).filter(x=>x.src).every(x=>x.loaded)')
            platforms={k for k,v in (await page.evaluate('window.__loadingReview.platform()')).items() if v['src']}
            assert platforms=={'cloud','trampoline','rainbow','boat','shark','fish','bubble'},platforms
            assert not errors,errors
            results[locale]={'cold':cold,'currentLevelWords':sorted(CURRENT),'maxConcurrentSpeculativeTransfers':initial_maximum,'movementJumpLessonPauseRecordingRestoreAndLevel4And8':True}
            await ctx.close()

        for name,connection,voice,muted in [
            ('saveData',{'saveData':True,'effectiveType':'4g','downlink':10,'rtt':50},True,False),
            ('3g',{'saveData':False,'effectiveType':'3g','downlink':1.5,'rtt':150},True,False),
            ('voiceOff',None,False,False),('muted',None,True,True)]:
            ctx,page,requests,errors=await make_page(browser,connection=connection,voice=voice,muted=muted)
            await load(page);await start(page);await page.wait_for_timeout(1400)
            assert not any(word(u) for u in requests),(name,requests)
            assert not any('platform-' in u for u in requests)
            # The actual lesson remains usable even when warmup or voice is disabled.
            await page.evaluate('window.__loadingReview.reward(0)')
            await page.locator('#letterCard.show').wait_for()
            if name in ['saveData','3g']:
                await page.wait_for_function('window.__wordStarts>0')
                assert len([u for u in requests if word(u)])==1
            else:
                await page.wait_for_timeout(250)
                assert not any(word(u) for u in requests)
            assert not errors,errors
            results[name]={'speculativeWords':0,'actualLessonCardWorks':True,'onDemandRecordingPlayed':name in ['saveData','3g']}
            await ctx.close()

        for locale in ['zh','en']:
            ctx,page,requests,errors=await make_page(browser,locale,connection={'saveData':True})
            counts=collections.Counter()
            async def fail_first(route):
                w=word(route.request.url);counts[w]+=1
                if counts[w]==1:await route.fulfill(status=503,content_type='text/plain',body='test: temporary unavailable')
                else:await route.continue_()
            await page.route(re.compile(r'/audio/[^/]+\.mp3$'),fail_first)
            await load(page,locale);await start(page)
            await page.evaluate('window.__loadingReview.reward(0)')
            await page.wait_for_function('()=>/录音暂时|recording did not play/.test(document.body.textContent)')
            selected=(await page.evaluate('window.__loadingReview.state()'))['word']
            assert counts[selected]==1,counts
            await page.locator('#replayLessonBtn').click()
            await page.wait_for_function('window.__wordStarts>0')
            assert counts[selected]==2,counts
            assert not errors,errors
            results[locale+'Retry']={'word':selected,'requests':counts[selected],'decodedAndPlayed':True}
            await ctx.close()
        ctx,page,requests,errors=await make_page(browser,connection={'saveData':True})
        blocked=True
        async def fail_platform(route):
            if blocked:await route.fulfill(status=503,body='test: temporary image failure')
            else:await route.continue_()
        await page.route(re.compile(r'/assets/platform-trampoline\.(?:webp|png)(?:\?.*)?$'),fail_platform)
        await load(page);await start(page);await enter(page,4)
        await page.locator('#artStatus:not([hidden])').wait_for()
        assert not (await page.evaluate('window.__loadingReview.platform()'))['trampoline']['loaded']
        assert len([u for u in requests if '/platform-trampoline.' in u])==3
        blocked=False
        await page.locator('#retryArt').click()
        await page.wait_for_function('window.__loadingReview.platform().trampoline.loaded')
        await page.locator('#artStatus').wait_for(state='hidden')
        assert not errors,errors
        results['platformRetry']={'boundedAttempts':3,'manualRetryRestoresWebp':True}
        await ctx.close()
        await browser.close()
    if os.environ.get('LISA_TEST_REPORT'):
        Path(os.environ['LISA_TEST_REPORT']).write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(results,indent=2,ensure_ascii=False))

asyncio.run(main())

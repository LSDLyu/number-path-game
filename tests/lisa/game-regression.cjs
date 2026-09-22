// Runs the shipped inline script, actual frame queue, real Canvas drawing and
// browser-compatible Canvas argument checks. The DOM event fixture is not an iPad.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '..');
const dist = process.env.LISA_DIST ? path.resolve(process.env.LISA_DIST) : path.join(root, 'dist');
const baseline = process.argv.includes('--baseline');
const html = baseline
  ? execFileSync('git', ['show', 'e1f01c5f2c5c37b9c27673aa18a9d0daeb5c7c32:dist/index.html'], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

class Target {
  listeners = {};
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  emit(type, props = {}) {
    const e = { type, preventDefault() {}, ...props };
    for (const fn of this.listeners[type] || []) fn(e);
  }
}
class Element extends Target {
  style = {}; attrs = {}; classes = new Set();
  classList = {
    add: (...names) => names.forEach(n => this.classes.add(n)),
    remove: (...names) => names.forEach(n => this.classes.delete(n)),
    contains: n => this.classes.has(n),
    toggle: (n, on) => on ? this.classes.add(n) : this.classes.delete(n)
  };
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
  appendChild(child) { (this.children ||= []).push(child); }
  setPointerCapture() { throw new Error('simulated capture unavailable'); }
}

async function harness({ touchOnly = false, blockedStorage = false, badAudio = false, saved = {} } = {}) {
  const elements = {};
  for (const [, id] of html.matchAll(/id="([^"]+)"/g)) elements[id] = new Element();
  const buttons = ['up', 'down', 'left', 'right'].map(action => {
    const e = new Element(); e.setAttribute('data-action', action); return e;
  });
  const hearts = Array.from({ length: 5 }, () => new Element());
  const doc = new Target();
  doc.getElementById = id => elements[id] ||= new Element();
  doc.createElement = () => new Element();
  doc.hidden = false;
  doc.querySelectorAll = q => q === '.control-btn' ? buttons : q === '.heart' ? hearts
    : q === '.active' ? [...buttons, elements.jumpBtn].filter(e => e.classes.has('active')) : [];
  const canvas = createCanvas(1280, 720), native = canvas.getContext('2d');
  let stackDepth = 0, drawCalls = 0;
  const radii = { arcTo: [4], arc: [2], ellipse: [2, 3], createRadialGradient: [2, 5] };
  const ctx = new Proxy(native, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value !== 'function') return value;
      return (...args) => {
        // @napi-rs/canvas accepts negative arcTo radii; browsers must reject them.
        for (const index of radii[prop] || []) {
          if (args[index] < 0) throw new DOMException(prop + ': radius ' + args[index] + ' is negative', 'IndexSizeError');
          assert(Number.isFinite(args[index]), prop + ': radius must be finite');
        }
        if (prop === 'save') stackDepth++;
        if (prop === 'restore') stackDepth--;
        drawCalls++;
        return value.apply(target, args);
      };
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });
  elements.gameCanvas.getContext = () => ctx;
  const assets = {};
  for (const name of fs.readdirSync(path.join(dist, 'assets'))) {
    if (/\.(png|webp)$/.test(name)) assets['assets/' + name] = await loadImage(path.join(dist, 'assets', name));
  }
  class AssetImage {
    set src(value) { return this.image = assets[value]; }
    get complete() { return !!this.image; }
    get naturalWidth() { return this.image ? this.image.width : 0; }
  }
  // The Canvas receives a decoded image, not a permissive image stub.
  const drawImage = ctx.drawImage;
  const context = new Proxy(ctx, { get(t, p) { return p === 'drawImage'
    ? (im, ...args) => drawImage(im instanceof AssetImage ? im.image : im, ...args) : t[p]; } });
  elements.gameCanvas.getContext = () => context;
  const win = new Target();
  if (!touchOnly) win.PointerEvent = function () {};
  const spoken = [], utterances = [];
  win.SpeechSynthesisUtterance = function (text) { this.text = text; };
  win.speechSynthesis = { speaking: false, pending: false, resume() {}, cancel() {}, getVoices() { return []; }, speak(u) { spoken.push(u.text); utterances.push(u); } };
  if (badAudio) {
    win.AudioContext = function () { throw new Error('audio disabled'); };
    win.speechSynthesis.resume = () => { throw new Error('speech disabled'); };
    win.speechSynthesis.speak = () => { throw new Error('speech disabled'); };
  }
  const storage = {
    getItem(key) { if (blockedStorage) throw new Error('SecurityError'); return saved[key] || null; },
    setItem(key, value) { if (blockedStorage) throw new Error('QuotaExceededError'); saved[key] = value; }
  };
  let queue = [], clock = 0, timers = [], timerId = 0;
  const sandbox = { window: win, document: doc, localStorage: storage, Image: AssetImage,
    SpeechSynthesisUtterance: win.SpeechSynthesisUtterance, console,
    requestAnimationFrame: fn => { queue.push(fn); return queue.length; },
    setTimeout: (fn, ms = 0) => { timers.push({ fn, at: clock + ms, id: ++timerId }); return timerId; },
    clearTimeout: id => { timers = timers.filter(t => t.id !== id); }
  };
  Object.assign(win, sandbox);
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  const hook = `window.__test = {
    state: function () { return { player: player, input: input, hearts: hearts, cameraX: cameraX,
      level: currentLevel, won: won, worldTime: worldTime, ball: rollingBall, meteor: meteorState,
      letter: letter, spring: machineSpring, spikeHill: spikeHill, rollingLetters: rollingLetters, finale: finale,
      adventure: typeof adventure !== 'undefined' ? adventure : null,
      learned: typeof learnedThisLevel !== 'undefined' ? learnedThisLevel : {} }; },
    content: function () { return { levels: LEVELS, sets: LEVEL_LESSON_SETS, lessons: letterLessons, pools: wordPools }; },
    chooseWord: chooseWord,
    load: function (n) { closeLearningDialog(); learningMode=''; levelWords={}; slopeDemoShown=false; slopeBlockedTime=0; learningProgress.unlocked=Math.max(n,learningProgress.unlocked); learningProgress.tutorials[n]=true; currentLevel = n; resetLevel(false); started = true; paused = false; },
    learning: function () { return { mode:learningMode, paused:paused, progress:learningProgress, review:reviewState }; },
    save: saveLearning, enter: enterLearningLevel,
    reward: function (index) { rewardLesson(letterLessons[index || 0], player.x, player.y); },
    damage: damage, finish: finishLevel, draw: draw,
    showLesson: showLetterLesson, speakLesson: speakLesson,
    configureAudio: function (context) { speechRunId++; stopWordAudio(); audioCache = {}; audioContext = context; },
    setSound: setSound, ground: levelTwoGroundY,
    spawnMeteor: spawnMeteor, updateLetter: updateLetter
    , physics: function () { update(1/60); syncHeroSprite(); }
  };`;
  vm.runInNewContext(script.replace('    }());', hook + '\n    }());'), sandbox, { filename: 'game-inline.js' });
  const api = win.__test;
  function frames(n = 1) {
    for (let i = 0; i < n; i++) {
      clock += 1000 / 60;
      const pending = queue; queue = [];
      assert.equal(pending.length, 1, 'exactly one live frame loop');
      pending.forEach(fn => fn(clock));
      const due = timers.filter(t => t.at <= clock); timers = timers.filter(t => t.at > clock);
      due.forEach(t => t.fn());
      assert.equal(stackDepth, 0, 'Canvas state balanced after each frame');
      const p = api.state().player;
      for (const k of ['x', 'y', 'vx', 'vy']) assert(Number.isFinite(p[k]), 'finite player.' + k);
    }
  }
  function press(action, id = 1) {
    const button = action === 'jump' ? elements.jumpBtn : buttons.find(b => b.getAttribute('data-action') === action);
    button.emit(touchOnly ? 'touchstart' : 'pointerdown', touchOnly ? { changedTouches: [{ identifier: id }] } : { pointerId: id });
  }
  function release(id = 1) { win.emit(touchOnly ? 'touchend' : 'pointerup', touchOnly ? { changedTouches: [{ identifier: id }] } : { pointerId: id }); }
  function render(file) {
    const snapshot = createCanvas(1280,720), c = snapshot.getContext('2d');
    c.drawImage(canvas,0,0);
    const s=api.state(), p=s.player;
    c.drawImage(assets['assets/lisa-hero-sprite.png'], p.x-s.cameraX-25, p.y-34,104,p.h+42);
    c.fillStyle='#fff'; c.fillRect(12,12,500,42);c.fillStyle='#174f79';c.font='26px sans-serif';
    c.fillText('Level '+s.level+' / 10',24,42);
    fs.writeFileSync(file,snapshot.toBuffer('image/png'));
  }
  function action(name, value) {
    const target = new Element(); target.setAttribute('data-learning', name);
    if (name === 'answer') target.setAttribute('data-answer', value);
    if (name === 'level') target.setAttribute('data-level', value);
    target.closest = () => target;
    elements.learningDialog.emit('click', { target });
  }
  function continueLesson() { if(api.learning().mode==='lesson') elements.continueLessonBtn.emit('click'); }
  function nextLevel() {
    elements.againBtn.emit('click');
    for(let i=0;i<3;i++) { action('answer',api.learning().review.lesson.word); action('review-next'); }
    action('next-level'); if(api.learning().mode==='tutorial') action('go');
  }
  return { win, doc, elements, api, frames, press, release, spoken, utterances, render, action, continueLesson, nextLevel, saved, drawCalls: () => drawCalls };
}

module.exports = { harness };
if (require.main === module) (async () => {
  const game = await harness();
  function approachFish(badge) {
    const s=game.api.state(),p=s.player;
    const fishX=badge.homeX+Math.sin((s.worldTime+1/60)*1.2+badge.lessonIndex)*28;
    const candidates=[fishX-25,fishX+45];
    const x=candidates.find(x=>s.adventure.shelters.every(bubble=>
      Math.hypot(x+p.w/2-bubble.x,badge.y+p.h/2-bubble.y)>=bubble.r-16));
    assert(x!==undefined,'fish approachable from outside protective bubbles');
    Object.assign(p,{x,y:badge.y,vy:0,vx:0,swimming:true,jumping:false,onGround:false,riding:null,invincible:2});
  }
  if (baseline) {
    assert.throws(() => game.frames(), /arcTo: radius -3 is negative/);
    console.log('REPRODUCED v10: first frame crashes in drawTunnel -> roundedRectPath -> arcTo(-3); no next frame scheduled.');
    return;
  }
  if (!process.argv.includes('--hazards-only')) {
    const steps = n => { for(let i=0;i<n;i++) game.api.physics(); };
    let oscillators=0, contexts=0, resumes=0;
    class AudioFixture {
      state='suspended'; currentTime=0; destination={};
      constructor(){contexts++;}
      resume(){resumes++;this.state='running';return Promise.resolve();}
      close(){this.state='closed';return Promise.resolve();}
      createBuffer(){return {};}
      createBufferSource(){return {connect(){},start(){}};}
      createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){oscillators++;},stop(){}};}
      createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}},connect(){}};}
    }
    game.win.AudioContext=AudioFixture;
    game.elements.startBtn.emit('click');
    game.action('go');
    assert(contexts===1&&resumes>=1&&oscillators>0,'first start click unlocks and plays audio');
    assert.equal(game.spoken.at(-1),'Ready!','non-empty speech unlock happens after reset');
    const lesson=game.api.content().lessons[0];
    game.api.speakLesson(lesson);
    assert.equal(game.spoken.at(-1),lesson.word+'.','word speech requested immediately, not in a timer');
    game.utterances.at(-1).onerror({error:'not-allowed'});
    const count=game.spoken.length;game.press('jump',201);
    assert.equal(game.spoken.length,count+1,'next gesture retries blocked narration');game.release(201);
    game.api.configureAudio({state:'interrupted',close(){return Promise.resolve();}});
    game.doc.hidden=true;game.doc.emit('visibilitychange');
    game.doc.hidden=false;game.doc.emit('visibilitychange');game.action('resume');game.press('right',202);game.release(202);
    assert.equal(contexts,2,'interrupted context recreated on next user gesture');
    console.log('PASS immediate sound unlock, nonempty speech primer, immediate word narration, rejected-speech retry and interrupted audio recovery');

    game.api.load(5);let s=game.api.state(),p=s.player,badge=s.adventure.badges[0];
    game.api.damage('test');p.invincible=0;
    Object.assign(p,{x:badge.x+6,y:badge.y-p.h-2,vy:50,onGround:false,riding:null});
    steps(3);assert(p.onTrainLetter===badge&&badge.active,'letter remains solid until crouched');
    const heartBefore=game.api.state().hearts;
    game.press('down',203);steps(2);game.release(203);
    assert(!badge.active&&badge.platform.stamped,'crouch collects and leaves Lisa stamp');
    assert.equal(game.api.state().hearts,heartBefore+1);steps(10);
    assert.equal(Object.keys(game.api.state().learned).length,1,'stamp rewards only once');
    if(process.argv.includes('--render')) {game.frames(2);game.render('/workspace/scratch/lisa-train-stamp.png');}
    console.log('PASS train letter landing, down collection/heal and persistent Lisa stamp');

    function ballAt(x){game.api.load(2);const s=game.api.state(),b=s.ball,p=s.player;
      s.rollingLetters.forEach(b=>b.active=false);
      Object.assign(b,{x,y:game.api.ground(x)-b.r,vx:0,vy:0,onGround:true,safeX:x});
      Object.assign(p,{x:x-p.w/2,y:b.y-b.r-p.h,onBall:true,onGround:true,vy:0,vx:0});return s;}
    s=ballAt(510);game.press('right',204);steps(45);game.release(204);
    assert.equal(game.api.state().hearts,4,'rolling into spikes punctures ball and costs heart');
    s=ballAt(510);game.press('right',205);game.press('jump',206);steps(24);game.release(206);steps(62);game.release(205);
    assert.equal(game.api.state().hearts,5,'jump with ball clears first spikes');assert(s.ball.x>735&&s.player.onBall);
    for(const spikeX of [620,1415,2100]) {
      s=ballAt(spikeX-85);s.ball.vx=245;
      game.press('right',209);game.press('jump',210);steps(3);game.release(210);steps(65);game.release(209);
      assert.equal(game.api.state().hearts,5,'quick jump clears spikes at '+spikeX);
      assert(s.ball.x>spikeX+115&&s.player.onBall,'Lisa stays with ball across spikes');
    }
    s=ballAt(830);game.press('right',207);steps(80);
    assert(s.ball.x<852,'cannot ride uphill');
    game.press('down',208);steps(1);game.release(208);assert(!s.player.onBall,'down dismounts');
    steps(125);game.release(207);
    assert(s.ball.x>1100,'pushing on foot reaches hill crest');assert.equal(game.api.state().hearts,5);
    if(process.argv.includes('--render')) {game.frames(2);game.render('/workspace/scratch/lisa-ball-hill.png');}
    console.log('PASS ball puncture and recovery, combined Lisa/ball jump, uphill ride restriction and dismount/push to crest');

    game.api.load(8);s=game.api.state();p=s.player;
    assert.equal(p.riding,s.adventure.carrier,'sea level starts on boat, not land');
    for(const x of [20,2300]){Object.assign(p,{x,y:540,vy:80,onGround:false,riding:null,jumping:false});steps(12);assert(p.swimming&&!p.onGround,'no land even at sea boundaries');}
    const bubble=s.adventure.shelters[1],fish=s.adventure.badges[0],shark=s.adventure.sharks[0];
    Object.assign(p,{x:bubble.x-p.w/2,y:bubble.y-p.h/2,vy:0,swimming:true,jumping:false,riding:null,onGround:false,invincible:0});
    s.adventure.sharks.forEach(sh=>sh.homeX=-1000);shark.homeX=bubble.x-50-Math.sin(s.worldTime*.85+shark.phase)*100;
    fish.homeX=bubble.x-31-Math.sin(s.worldTime*1.2+fish.lessonIndex)*28;
    steps(1);assert(p.inBubble&&fish.active);assert.equal(game.api.state().hearts,5,'bubble blocks shark and fish reward');
    game.api.damage('test');Object.assign(p,{x:bubble.x-p.w/2,y:bubble.y-p.h/2,vy:0,swimming:true,jumping:false,riding:null,onGround:false,invincible:0});
    steps(1);assert.equal(game.api.state().hearts,4,'fish does not heal inside bubble');assert(fish.active);
    if(process.argv.includes('--render')) {game.frames(2);game.render('/workspace/scratch/lisa-sea-bubble.png');}
    s.adventure.shelters=[];s.adventure.sharks=[];steps(1);assert(!fish.active);assert.equal(game.api.state().hearts,5,'same fish collectible outside shelter');
    console.log('PASS water-only sea boundaries, boat start and bubbles block both shark damage and fish healing');
    game.win.AudioContext=undefined;game.api.configureAudio(null);
    if(process.argv.includes('--new-mechanics')) return;
  }
  if (!process.argv.includes('--hazards-only')) {
  game.frames(5);
  game.elements.startBtn.emit('click');
  const content = game.api.content();
  assert.equal(content.levels.length,10);
  assert.equal(content.lessons.length,26);
  const frequencies=Array(26).fill(0);
  content.sets.forEach(set=>{assert(set.length===5||set.length===6); set.forEach(i=>frequencies[i]++);});
  assert(frequencies.every(n=>n===2),'each letter has exactly two scheduled learning slots');
  for(const lesson of content.lessons) {
    assert.equal(lesson.speech,lesson.word+'.');
    for(const asset of [lesson.art,lesson.fallbackArt]) {
      const image=await loadImage(path.join(dist,asset));
      assert(image.width>=192 && image.height>=192,'valid complete image for '+lesson.char);
    }
    game.api.showLesson(lesson,false);
    const doodle=game.elements.letterDoodle, fallback=game.elements.doodleFallback;
    assert.equal(doodle.src,lesson.art);
    doodle.onload();assert.equal(doodle.hidden,false);assert.equal(fallback.hidden,true);
    doodle.onerror();assert.equal(doodle.src,lesson.fallbackArt);
    doodle.onerror();assert.equal(doodle.hidden,true);assert.equal(fallback.hidden,false);
    game.api.speakLesson(lesson);game.frames(7);
    assert(game.spoken.includes(lesson.speech),'speech requested for '+lesson.char);
  }
  for (const pool of content.pools) {
    assert(pool.length >= 2, 'multiple examples for every letter');
    pool.forEach(lesson => {
      assert(lesson.meaning && lesson.emoji && lesson.word.toUpperCase().startsWith(lesson.char));
      game.api.showLesson(lesson,false);
      assert.equal(game.elements.letterMeaning.textContent,lesson.meaning);
      if(!lesson.art) { assert(game.elements.letterDoodle.hidden); assert(!game.elements.doodleFallback.hidden); }
    });
    assert.notEqual(game.api.chooseWord(pool[0].char).word,game.api.chooseWord(pool[0].char).word,'consecutive encounters use different examples');
  }
  console.log('PASS balanced A–Z, 52 examples with Chinese meanings, matching images/emoji and word-only speech');
  // Recorded-audio completion, failure and cancellation must never duplicate speech.
  let startedAudio = 0, stoppedAudio = 0;
  const audioMock = { state: 'running', destination: {}, decodeAudioData: async bytes => bytes,
    createBufferSource() { return { connect() {}, start() { startedAudio++; }, stop() { stoppedAudio++; } }; } };
  const flushAudio = async () => { for(let i=0;i<12;i++) await Promise.resolve(); };
  game.win.LISA_WORD_AUDIO = {apple: 'audio/apple.mp3'};
  game.win.fetch = async () => ({ok:true, arrayBuffer: async () => new ArrayBuffer(8)});
  game.api.configureAudio(audioMock);
  let beforeAudio = game.spoken.length;
  game.api.speakLesson(content.lessons[0]); await flushAudio(); game.frames(7);
  assert.equal(startedAudio,1); assert.equal(game.spoken.length,beforeAudio);
  game.api.setSound(false); assert.equal(stoppedAudio,1); game.api.setSound(true);
  game.api.configureAudio({...audioMock, createBufferSource() { throw new Error('playback unavailable'); }});
  game.api.speakLesson(content.lessons[0]); await flushAudio();
  assert.equal(game.spoken.at(-1),'apple.','failed audio start falls back to word speech');
  game.api.configureAudio(audioMock);
  let resolveRecording;
  game.win.fetch = () => new Promise(resolve => {resolveRecording=resolve;});
  beforeAudio = game.spoken.length;
  game.api.speakLesson(content.lessons[0]); game.api.setSound(false);
  resolveRecording({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}); await flushAudio();
  game.frames(160); assert.equal(startedAudio,1); assert.equal(game.spoken.length,beforeAudio);
  game.api.setSound(true); game.api.configureAudio(null);
  game.win.LISA_WORD_AUDIO = {}; delete game.win.fetch;
  console.log('PASS recording playback, start failure fallback, mute cancellation and no duplicate narration');
  for (const level of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    game.api.load(level); game.frames(2);
    const initial = game.api.state().player.x;
    game.press('right', 1); game.frames(12); game.release(1);
    assert(game.api.state().player.x > initial + 5, 'screen right moves player in level ' + level);
    game.frames(24);
    const right = game.api.state().player.x;
    game.win.emit('keydown', { code: 'ArrowLeft', key: 'ArrowLeft' }); game.frames(18);
    game.win.emit('keyup', { code: 'ArrowLeft', key: 'ArrowLeft' });
    assert(game.api.state().player.x < right - 5, 'keyboard left moves player in level ' + level);
    game.api.load(level); game.frames(2);
    const groundY = game.api.state().player.y;
    game.press('jump', 2); game.frames(8); game.release(2);
    assert(game.api.state().player.y < groundY - 10, 'jump moves player upward in level ' + level);
    game.frames(120);
    if (process.argv.includes('--render')) game.render('/workspace/scratch/lisa-level-'+level+'.png');
  }
  console.log('PASS actual frames, Canvas geometry and player movement in all ten levels; ' + game.drawCalls() + ' Canvas calls');

  function minimumJumpY(holdFrames) {
    game.api.load(1); game.frames(2);
    let min = game.api.state().player.y;
    game.press('jump', 22);
    for (let f = 0; f < 100; f++) {
      if (f === holdFrames) game.release(22);
      game.frames(); min = Math.min(min, game.api.state().player.y);
    }
    return min;
  }
  const shortY = minimumJumpY(3), longY = minimumJumpY(22);
  assert(longY < shortY - 40, 'holding jump must produce a materially higher jump');

  game.api.load(1); game.frames(2);
  game.press('down', 7); game.frames(30);
  assert.equal(game.api.state().player.h, 50, 'down crouches');
  assert.equal(game.api.state().player.y + game.api.state().player.h, 475, 'crouch keeps feet on ground');
  const crouchSpriteHeight = parseFloat(game.elements.heroSprite.style.height);
  game.release(7); game.frames(10);
  assert.equal(game.api.state().player.y + game.api.state().player.h, 475, 'standing back up keeps feet on ground');
  assert(parseFloat(game.elements.heroSprite.style.height) > crouchSpriteHeight, 'sprite visibly crouches');
  Object.assign(game.api.state().player, { x: 1290, y: 397 });
  game.press('up', 8); game.frames(20); game.release(8);
  const highY = game.api.state().player.y;
  assert(highY < 370, 'up climbs ladder');
  game.press('down', 8); game.frames(10); game.release(8);
  assert(game.api.state().player.y > highY, 'down descends ladder');

  game.api.load(1);
  Object.assign(game.api.state().player, { x: 978, y: 397 });
  game.press('right', 9); game.frames(24); game.release(9);
  assert(game.api.state().player.x <= 981, 'blue block blocks walking');
  assert.equal(game.api.state().hearts, 5, 'blue block is safe');
  Object.assign(game.api.state().player, { x: 1040, y: 301, vx: 0, vy: 0 });
  game.frames(20);
  assert.equal(game.api.state().player.y + game.api.state().player.h, 379, 'can stand on blue block');

  game.api.load(1);
  Object.assign(game.api.state().player, { x: 880, y: 270, vy: 120, onGround: false });
  let bounced = false;
  for (let i = 0; i < 25; i++) { game.frames(); if (game.api.state().player.vy < -400) bounced = true; }
  assert(bounced, 'spring physically launches Lisa');
  game.api.load(1);
  Object.assign(game.api.state().player, { x: 1985, y: 397 });
  game.press('right', 10); game.frames(15);
  assert(game.api.state().player.x <= 1996, 'tunnel requires crouch');
  game.press('down', 11); game.frames(95); game.release(10); game.release(11);
  assert(game.api.state().player.x > 2190, 'crouching moves through tunnel');
  assert.equal(game.api.state().hearts, 5, 'tunnel crossing does not fall through the ground');

  game.api.load(1);
  Object.assign(game.api.state().player, { x: 310, y: 397 }); game.frames();
  assert.equal(game.api.state().hearts, 4, 'furnace contact loses one heart');
  game.api.reward(); game.frames(7);
  assert.equal(game.api.state().hearts, 5, 'letter restores one heart');
  assert(game.spoken.includes(game.elements.letterWord.textContent+'.'), 'lesson requests the example word only');
  game.continueLesson();
  for (let i = 0; i < 5; i++) { game.api.state().player.invincible = 0; game.api.damage('test', 'fire'); }
  game.frames(100);
  assert.equal(game.api.state().hearts, 0, 'all hearts lost waits for the child');
  assert.equal(game.api.learning().mode, 'defeat'); game.action('retry');
  assert.equal(game.api.state().hearts, 5, 'retry refills hearts');
  assert.equal(game.api.state().level, 1);
  console.log('PASS short/long jump, crouch/stand, ladder, spring, solid blue block, tunnel, injury, healing and restart');

  // Exercise genuine completion conditions and the existing next-level buttons.
  game.api.load(1);
  Object.assign(game.api.state().player, { x: 2340, y: 397 }); game.frames(2);
  assert(!game.api.state().won,'cannot skip unlearned letters at finish');
  game.api.load(1);
  for(let i=0;i<5;i++) {
    const s=game.api.state(), l=s.letter;
    Object.assign(s.player,{x:l.x,y:l.y+Math.sin(l.bob)*7+l.h-3,vy:-220,onGround:false});
    game.frames();game.continueLesson();game.frames(40);
  }
  assert.equal(Object.keys(game.api.state().learned).length,5,'first level learns five distinct letters');
  Object.assign(game.api.state().player, { x: 2340, y: 397 }); game.frames(45);
  assert(game.api.state().won); game.nextLevel(); game.frames();
  assert.equal(game.api.state().level, 2);
  for(const b of game.api.state().rollingLetters) {
    Object.assign(game.api.state().player,{x:b.x,y:b.y,vy:0,onBall:false});game.frames();game.continueLesson();
  }
  game.api.state().player.onBall=true;
  game.api.state().ball.x = 2270; game.frames(45);
  assert(game.api.state().won); game.nextLevel(); game.frames();
  assert.equal(game.api.state().level, 3);
  game.press('up', 13); game.frames(20); game.release(13);
  const lift = game.api.state().meteor.catcherLift;
  game.press('down', 13); game.frames(20); game.release(13);
  assert(game.api.state().meteor.catcherLift < lift - 20, 'up/down move catching basket');
  for (let i = 0; i < 5; i++) {
    const s = game.api.state();
    s.meteor.meteors = [{ x: s.player.x + s.player.w / 2,
      y: s.player.y - s.meteor.catcherLift - s.meteor.basketBounce + 14,
      size: 50, vx: 0, vy: 0, rotation: 0, spin: 0, rock: false, lessonIndex: 10 + i % 5, active: true }];
    game.frames();game.continueLesson();
  }
  assert(game.api.state().won, 'catching five distinct letters completes meteor level');
  game.frames(45); game.nextLevel(); game.frames();
  assert.equal(game.api.state().level, 4);
  for(let n=4;n<=10;n++) {
    assert.equal(game.api.state().level,n);
    for(const b of game.api.state().adventure.badges) {
      const s=game.api.state();
      if(n===8) {
        approachFish(b);
        game.frames(2);
      } else if(n===5) {
        Object.assign(s.player,{x:b.x+6,y:b.y-s.player.h,vy:0,onGround:true,riding:b.platform});
        game.press('down',95);game.frames(2);game.release(95);
      } else if(n===10) {
        Object.assign(s.player,{x:b.x,y:532,vy:0,onGround:true,riding:null});
        game.press('down',95);game.frames(2);game.release(95);
      } else {
        Object.assign(s.player,{x:b.x,y:b.y+Math.sin(b.bob)*8+b.h-3,vy:-220,onGround:false,riding:null});game.frames();
      }
      assert(!b.active,'level mechanic collects letter in level '+n);
      game.continueLesson();
    }
    Object.assign(game.api.state().player,{x:2330,y:532,vy:0});
    if(n===10) game.press('up',96);
    game.frames(95);game.release(96);
    assert(game.api.state().won,'level '+n+' completes');
    game.nextLevel();game.frames();
  }
  assert.equal(game.api.state().level,1);
  console.log('PASS all ten levels complete in order, basket controls, no missing letters, final restart');

  game.api.load(1); game.api.finish(); game.elements.restartBtn.emit('click'); game.action('restart'); game.frames(60);
  assert(game.elements.finishOverlay.classes.has('hidden'), 'old completion timer cannot reopen overlay after restart');
  for (let i = 0; i < 5; i++) { game.api.state().player.invincible = 0; game.api.damage('test'); }
  game.elements.restartBtn.emit('click');
  game.action('restart');
  Object.assign(game.api.state().player, { x: 150 }); game.frames(100);
  assert.equal(game.api.state().player.x, 150, 'old death timer cannot unexpectedly reset a restarted game');
  console.log('PASS restart cancels delayed defeat/completion callbacks');

  // Land, ride the moving letter, then use the real jump button and land again.
  for (const holdFrames of [2, 20]) {
    game.api.load(1); game.frames(2);
    const s=game.api.state(), l=s.letter, p=s.player;
    Object.assign(p,{x:l.x+7,y:l.y+Math.sin(l.bob)*7-p.h-3,vy:50,onGround:false});
    game.frames(4);
    assert(p.onLetter && l.active,'first landing keeps the letter as a platform');
    game.frames(70);
    assert(p.onLetter && p.onGround && l.active,'bobbing letter keeps its rider and allows a later jump');
    const spokenBefore=game.spoken.length;
    game.press('jump',74); game.frames(holdFrames); game.release(74);
    assert(l.collectOnLanding && !p.onLetter,'jump from the letter arms the landing reward');
    for(let i=0;i<100 && l.index===0;i++) game.frames();
    assert.equal(l.index,1,'landing on the same letter collects it exactly once');
    assert(!l.active,'collected letter disappears');
    assert.equal(game.api.state().hearts,5,'top collection does not hurt');
    assert(game.elements.letterCard.classes.has('show'),'learning card appears');
    const currentWord=game.elements.letterWord.textContent;
    assert(['apple','ant'].includes(currentWord));
    game.frames(7);
    assert.equal(game.spoken.slice(spokenBefore).filter(t=>t===currentWord+'.').length,1,'only the selected word is narrated once');
    game.continueLesson();game.frames(45);
    assert.equal(l.collectOnLanding,false,'new letter starts without the previous jump state');
  }
  console.log('PASS riding a bobbing letter, short/long jump and top recollection with card, picture and narration');

  game.api.load(1);game.frames(2);
  const letter=game.api.state().letter;
  Object.assign(game.api.state().player,{x:letter.x-35,y:letter.y+8,vy:0,onGround:false});
  const hitX=game.api.state().player.x;
  game.api.updateLetter(0);
  assert.equal(game.api.state().hearts,5,'side collision with letter never deducts hearts');
  assert(game.api.state().player.x<hitX,'side collision visibly displaces player');
  game.api.load(3);game.api.spawnMeteor();
  const missed=game.api.state().meteor.meteors.find(m=>!m.rock).lessonIndex;
  game.api.state().meteor.meteors=[];game.api.spawnMeteor();
  assert.equal(game.api.state().meteor.meteors.find(m=>!m.rock).lessonIndex,missed,'missed letter is retried before advancing');
  for(let i=0;i<15;i++) game.api.spawnMeteor();
  assert(game.api.state().meteor.meteors.length<=3,'at most three falling objects');

  for(const level of [8,9]) {
    game.api.load(level);const s=game.api.state(),p=s.adventure.carrier;
    Object.assign(s.player,{x:p.x+20,y:p.y-s.player.h,riding:p,onGround:true});
    const before=p.x;game.press('right',45);game.frames(10);game.release(45);
    assert(p.x>before+25,'carrier can be steered in level '+level);
    if(level!==8){const beforeY=p.y;game.press('up',46);game.frames(20);game.release(46);assert(p.y<beforeY-25,'carrier lifts in level '+level);}
    assert.equal(game.api.state().hearts,5);
  }
  game.api.load(5);const trainX=game.api.state().adventure.platforms[0].x;game.frames(30);
  assert.notEqual(game.api.state().adventure.platforms[0].x,trainX,'train actually moves');
  game.api.load(7);const mushroom=game.api.state().adventure.platforms[0];
  Object.assign(game.api.state().player,{x:mushroom.x+20,y:mushroom.y-78,vy:50,onGround:false});game.frames();
  assert(game.api.state().player.vy<-500,'mushroom actually bounces');
  for(const level of [6,10]) {
    game.api.load(level);game.frames();const p=game.api.state().adventure.platforms[0];
    Object.assign(game.api.state().player,{x:p.x+30,y:p.y-78,onGround:true,riding:p,vy:0});
    const beforeY=p.baseY;game.press('up',47);game.frames(15);game.release(47);
    assert(p.baseY<beforeY-20,'lift control works in level '+level);
  }
  console.log('PASS harmless letter knockback, missed-meteor retries, boat/balloon steering, moving train, mushroom bounce and cloud/rainbow lifts');

  // Place Lisa on the safe ground under each new letter, then use only actual
  // jump input and physics. This catches letters/platforms beyond jump reach.
  for(let n=4;n<=10;n++) {
    if ([4,5,8,9,10].includes(n)) continue; // Fishing, flight and keys have their own controls below.
    for(let index=0;index<content.sets[n-1].length;index++) {
      game.api.load(n);
      const badge=game.api.state().adventure.badges[index];
      Object.assign(game.api.state().player,{x:badge.x,y:532,vy:0,vx:0,onGround:true,riding:null});
      let held=0;
      for(let f=0;f<720 && badge.active;f++) {
        const p=game.api.state().player;
        if(!held && p.onGround) {game.press('jump',60);held=1;}
        else if(held) {held++;if(held>23){game.release(60);held=0;}}
        game.api.physics();
      }
      game.release(60);
      assert(!badge.active,'letter '+content.lessons[badge.lessonIndex].char+' reachable by ground/platform jumps in level '+n);
    }
  }
  console.log('PASS remaining platform letters physically reachable through jump/platform physics');

  for (const level of [4,5,8,9,10]) {
    game.api.load(level);
    for (const badge of game.api.state().adventure.badges) {
      const s=game.api.state(),p=s.player,carrier=s.adventure.carrier;
      if(level===4) {
        Object.assign(p,{x:badge.platform.x+badge.platform.w/2-p.w/2,y:badge.platform.y-p.h-2,vy:50,onGround:false,riding:null});
        for(let f=0;f<100 && badge.active;f++) game.frames();
      } else if(level===5) {
        Object.assign(p,{x:badge.x+6,y:badge.y-p.h,vy:0,onGround:true,riding:badge.platform});
        game.press('down',91);game.frames(3);game.release(91);
      } else if(level===8) {
        approachFish(badge);
        game.frames(2);
      } else if(level===9) {
        Object.assign(p,{x:badge.x,y:badge.y,vy:0,onGround:false,riding:null});game.frames(2);
      } else {
        Object.assign(p,{x:badge.x,y:532,vy:0,onGround:true,riding:null});
        game.press('down',91);game.frames(3);game.release(91);
      }
      assert(!badge.active,'unique mechanic collects '+badge.lessonIndex+' in level '+level);
      game.continueLesson();
    }
    assert.equal(Object.keys(game.api.state().learned).length,content.sets[level-1].length);
    if(level===10) {
      Object.assign(game.api.state().player,{x:2320,y:532,vy:0});game.frames(2);
      assert(!game.api.state().won,'gift requires up input');
      game.press('up',91);game.frames(2);game.release(91);
      assert(game.api.state().finale.opened);assert(game.api.state().finale.sparks.length>=26);
      assert.equal(new Set(game.api.state().finale.sparks.map(s=>s.char)).size,26);
      game.frames(150);assert(game.elements.finishOverlay.classes.has('hidden'),'fireworks visible before completion panel');
      if(process.argv.includes('--render')) game.render('/workspace/scratch/lisa-finale.png');
      game.frames(290);assert(!game.elements.finishOverlay.classes.has('hidden'));
      game.api.load(1);assert.equal(game.api.state().finale.sparks.length,0);
    }
  }
  console.log('PASS trampoline bounce collections, moving train stamps, swimming fish collection, balloon rings, six keys and A–Z gift fireworks');

  }
  game.api.load(1);game.frames(2);
  let hill=game.api.state().spikeHill;
  Object.assign(game.api.state().player,{x:hill.x+10,y:hill.y-90,vy:150,onGround:false});
  for(let i=0;i<30 && game.api.state().hearts===5;i++) game.api.physics();
  assert.equal(game.api.state().hearts,4,'fall onto hill loses one heart');
  assert(game.api.state().player.vy>=0,'spiked hill does not launch Lisa');
  game.frames(4);assert.equal(game.api.state().hearts,4,'spike protection prevents repeated damage');
  game.api.load(1);game.frames(2);
  Object.assign(game.api.state().player,{x:1090,y:301,vy:0,onGround:true});
  game.press('right',120);game.press('jump',121);
  for(let i=0;i<75;i++){if(i===23)game.release(121);game.api.physics();}
  game.release(120);game.release(121);
  assert(game.api.state().player.x>1260,'can jump from blue block across the hill');
  assert.equal(game.api.state().hearts,5,'jumping over spikes is safe');
  game.api.load(4);
  let trampolines=game.api.state().adventure.platforms;
  assert.equal(trampolines.length,7,'one additional trampoline, seven total');
  for(let i=1;i<trampolines.length;i++) assert(trampolines[i].x-trampolines[i-1].x-trampolines[i-1].w<=95,'all trampoline gaps reduced to 95 pixels');
  for(const badge of game.api.state().adventure.badges){
    const p=game.api.state().player, platform=badge.platform;
    Object.assign(p,{x:platform.x+(platform.w-p.w)/2,y:platform.y-p.h-2,vy:50,onGround:false,riding:null});
    for(let i=0;i<100&&badge.active;i++)game.api.physics();
    assert(!badge.active,'all five letters remain reachable after spacing changes');
    game.continueLesson();
  }
  if(process.argv.includes('--render')) {
    game.api.load(1);Object.assign(game.api.state().player,{x:1150,y:301});game.frames(8);game.render('/workspace/scratch/lisa-spike-hill.png');
  }
  console.log('PASS spiked hill damage/protection, safe jump to ladder and seven closer trampolines with reachable letters');
  for (const level of [4,5,9]) {
    game.api.load(level);
    const s=game.api.state(), p=s.player, platform=s.adventure.platforms[0];
    s.adventure.badges.forEach(b=>b.active=false); // Isolate damage from automatic learning rewards.
    Object.assign(p,{x:platform.x+20,y:platform.y-p.h-2,vy:50,onGround:false});
    game.press('down',100); game.frames(4); game.release(100);
    assert.equal(s.adventure.checkpoint,platform,'landing saves recovery platform');
    Object.assign(p,{x:1000,y:650,vy:120,onGround:false,riding:null});
    game.frames();
    assert.equal(game.api.state().hearts,4,'fall costs exactly one heart in level '+level);
    assert(p.onGround && p.riding===platform,'fall returns to last safe platform');
    game.frames(5); assert.equal(game.api.state().hearts,4,'no immediate repeated damage');
    for(let i=0;i<4;i++) {p.invincible=0;Object.assign(p,{x:1000,y:650,vy:120,riding:null,onGround:false});game.frames();}
    game.frames(100); assert.equal(game.api.state().hearts,0,'zero hearts waits'); game.action('retry');
    assert.equal(game.api.state().hearts,5,'retry refills hearts');
    assert.equal(game.api.state().level,level,'restart stays in the same level');
  }
  // Test each gap using real held buttons and physics, including the final dock.
  for(const level of [4,5]) {
    game.api.load(level);
    const platforms=game.api.state().adventure.platforms;
    game.api.state().adventure.badges.forEach(b=>b.active=false); // Isolate gap navigation from learning pauses.
    for(let i=0;i<platforms.length;i++) {
      const state=game.api.state(), p=state.player, from=platforms[i];
      const target=platforms[i+1];
      Object.assign(p,{x:from.x+from.w-p.w-8,y:from.y-p.h,vy:0,vx:0,onGround:true,riding:from,jumping:false});
      game.press('right',110);
      if(level===5) game.press('jump',111);
      let reached=false;
      for(let f=0;f<120;f++) {
        if(f===23)game.release(111);
        game.api.physics();
        if(target ? state.adventure.checkpoint===target : p.x+p.w/2>2225) {reached=true;break;}
      }
      game.release(110);game.release(111);
      assert(reached,'physical jump crosses gap '+i+' in level '+level);
    }
  }
  console.log('PASS every train/trampoline gap and final dock reachable with actual movement');
  game.api.load(8);
  let s=game.api.state(), p=s.player;
  Object.assign(p,{x:950,y:560,vy:90,onGround:false,riding:null});game.frames(8);
  assert(p.swimming,'falling off boat enters swimming');assert.equal(game.api.state().hearts,5,'water is harmless');
  game.press('up',103);game.frames(60);game.release(103);
  assert(p.y+p.h>=615,'swim up stops at surface; cannot fly without jumping');
  game.press('down',101);game.frames(60);game.release(101);
  assert(p.y+p.h<=712,'sea bottom holds swimmer inside canvas');assert.equal(game.api.state().hearts,5);
  const shark=s.adventure.sharks[0];
  Object.assign(p,{x:shark.x+30,y:shark.y-10,vy:0,invincible:0});game.frames();
  assert.equal(game.api.state().hearts,4,'shark body contact removes one heart');
  Object.assign(p,{x:shark.x+30,y:shark.y-10,vy:0,onGround:false,riding:null});game.frames();
  assert.equal(game.api.state().hearts,4,'shark invincibility prevents damage every frame');
  const fish=s.adventure.badges[0], beforeSpeech=game.spoken.length;
  Object.assign(p,{x:fish.x,y:fish.y,vy:0,onGround:false,riding:null,jumping:false});game.frames(2);
  assert(!fish.active,'fish disappears on contact');assert.equal(game.api.state().hearts,5,'fish restores one heart');
  assert(game.elements.letterCard.classes.has('show'),'fish opens learning card');
  assert(['kite','koala'].includes(game.elements.letterWord.textContent),'fish word matches K');
  game.frames(8);assert.equal(game.spoken.slice(beforeSpeech).filter(t=>['kite.','koala.'].includes(t)).length,1,'fish narrates selected word exactly once');
  game.frames(2);assert.equal(game.api.state().hearts,5,'hearts capped at five');
  game.continueLesson();
  Object.assign(p,{x:950,y:590,vy:0,onGround:false,riding:null,swimming:true,jumping:false});
  game.press('jump',102);game.frames(18);game.release(102);
  assert(p.y<520,'jump can leave water and reach a boat');
  if(process.argv.includes('--render')) {
    game.api.load(8);Object.assign(game.api.state().player,{x:900,y:570,swimming:true});game.frames(2);game.render('/workspace/scratch/lisa-shark-water.png');
    game.api.load(4);game.frames(2);game.render('/workspace/scratch/lisa-trampoline.png');
  }
  console.log('PASS train/balloon/trampoline falls, safe checkpoint recovery, five-heart restart, harmless water, shark protection, fish lesson/healing and water exit');

  for (const touchOnly of [false, true]) {
    const g = await harness({ touchOnly, blockedStorage: true, badAudio: true });
    g.elements.startBtn.emit('click'); g.action('go'); g.frames(3);
    for (const action of ['up', 'down', 'left', 'right', 'jump']) {
      g.press(action, 31); assert.equal(g.api.state().input[action], true);
      g.release(31); assert.equal(g.api.state().input[action], false);
    }
    g.press('right', 32); g.win.emit('blur');
    assert(g.api.learning().paused); g.action('resume');
    g.press('right', 33); g.frames(10);
    assert(g.api.state().player.x > 80, 'can press with new finger ID after app switch');
    g.release(33);
    g.press('right', 34); g.press('jump', 35); g.release(35);
    assert(g.api.state().input.right, 'releasing jump keeps the other finger moving'); g.release(34);
    g.win.emit('keydown', { key: 'd' }); g.press('right', 36); g.release(36);
    assert(g.api.state().input.right, 'button release must not release held keyboard key');
    g.win.emit('keyup', { key: 'd' }); assert(!g.api.state().input.right);
    g.press('right', 37); g.elements.restartBtn.emit('click'); g.action('restart'); g.frames(15);
    assert.equal(g.api.state().player.x, 78, 'restart clears stuck held controls');
    g.press('left', 38); g.doc.emit('visibilitychange'); assert(!g.api.state().input.left);
  }
  console.log('PASS pointer/touch fallback, multiple fingers, keyboard fallback, app switch and blocked audio/storage');
})().catch(error => { console.error(error); process.exitCode = 1; });

// Uses the shipped script and real Canvas. This is not a real iPad/audio test.
const assert = require('node:assert/strict');
const { harness } = require('./game-regression.cjs');
const key = 'lisa-learning-progress-v1';
(async () => {
  const g = await harness();
  g.elements.startBtn.emit('click'); g.action('go');
  g.api.reward();
  const world = g.api.state().worldTime, x = g.api.state().player.x;
  g.frames(360); g.press('right'); g.api.damage('test');
  assert(g.api.learning().paused); assert.equal(g.api.state().worldTime, world);
  assert.equal(g.api.state().player.x, x); assert.equal(g.api.state().hearts,5);
  assert(g.elements.letterCard.classes.has('show'));
  g.continueLesson(); assert(!g.api.learning().paused);
  g.api.save();
  const loaded = await harness({saved: {...g.saved}});
  loaded.elements.startBtn.emit('click');
  assert(loaded.api.state().learned.A); assert.equal(loaded.api.state().letter.index,1);
  const forbiddenLevel = loaded.api.state().level;
  loaded.api.enter(10,true); assert.equal(loaded.api.state().level,forbiddenLevel);
  for(let i=0;i<5;i++) {loaded.api.state().player.invincible=0;loaded.api.damage('test');}
  loaded.frames(200); assert.equal(loaded.api.state().hearts,0);
  assert.equal(loaded.api.learning().mode,'defeat');
  loaded.action('retry'); assert.equal(loaded.api.state().hearts,5); assert(loaded.api.state().learned.A);
  console.log('PASS indefinite safe learning pause, disabled movement/damage, refresh resume, locked-level guard and defeat collection retention');

  for(let n=1;n<=10;n++) {
    g.api.load(n); const index=g.api.content().sets[n-1][0];
    g.api.reward(index); g.continueLesson(); g.api.save();
    const snapshot=JSON.parse(g.saved[key]);
    g.api.enter(n,true); assert(g.api.state().learned[String.fromCharCode(65+index)],'restored letter level '+n);
    assert.equal(g.api.state().hearts,snapshot.levels[n].hearts);
    assert(Number.isFinite(g.api.state().player.x));
    if(n===5) assert(g.api.state().adventure.badges[0].platform.stamped);
  }
  console.log('PASS all ten level save/restore paths and restored train stamp');

  g.api.load(1);
  for(let i=0;i<5;i++){g.api.reward(i);g.continueLesson();}
  g.api.finish(); assert(g.api.state().won); g.elements.againBtn.emit('click');
  const word=g.api.learning().review.lesson.word;
  const before=g.api.learning().progress.words[word].attempts;
  g.action('answer','wrong'); assert(!g.api.learning().review.answered);
  assert.equal(g.api.state().hearts,5); g.action('answer',word);
  assert.equal(g.api.learning().progress.words[word].attempts,before+1,'retry is not an extra first attempt');
  assert.equal(g.api.learning().progress.words[word].correct,0,'wrong first response remains review-needed');
  g.action('review-next');g.action('answer',g.api.learning().review.lesson.word);g.action('review-next');
  assert(g.elements.learningDialog.innerHTML.includes('小写伙伴'));
  g.action('answer',g.api.learning().review.lesson.word);g.action('review-next');g.action('next-level');
  assert.equal(g.api.state().level,2);
  console.log('PASS sound-picture review, retry without heart cost, honest first-answer record and case matching');

  g.api.load(2); const s=g.api.state(); s.rollingLetters.forEach(b=>b.active=false);
  Object.assign(s.ball,{x:850,y:g.api.ground(850)-78,onGround:true});
  Object.assign(s.player,{x:850-s.player.w/2,y:s.ball.y-78-s.player.h,onGround:true,onBall:true});
  g.press('right');for(let i=0;i<400;i++)g.api.physics();g.release();
  assert.equal(g.api.learning().mode,'slope');g.action('slope-go');assert(!g.api.learning().paused);
  console.log('PASS repeated blocked uphill movement opens contextual help');

  const malformed=await harness({saved:{[key]:JSON.stringify({version:1,current:1,unlocked:1,words:{},levels:{1:{learned:[null,{},'A'],words:{A:'apple'}}}})}});
  malformed.elements.startBtn.emit('click');assert(malformed.api.state().learned.A);
  console.log('PASS malformed saved letters are ignored safely');
})().catch(e=>{console.error(e);process.exitCode=1;});

import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../public/games/lisa-letter-adventure/', import.meta.url);
const manifest = {};
vm.runInNewContext(readFileSync(new URL('audio/manifest.js', root), 'utf8'), { window: manifest });
vm.runInNewContext(readFileSync(new URL('audio/accents.js', root), 'utf8'), { window: manifest });

for (const [file, lang] of [['index.html', 'zh'], ['index-en.html', 'en']]) {
  test(`${lang}: a failed recording offers a fresh retry without switching to device speech`, async () => {
    const html = readFileSync(new URL(file, root), 'utf8');
    const helper = html.slice(html.indexOf('      function speakLesson('), html.indexOf('      function setSound('));
    let requests = 0, starts = 0, speech = 0;
    const messages = [];
    const context = {
      soundEnabled: true, speechRunId: 0, lessonAudioTimer: 0, narrationSource: null,
      pendingSpeechLesson: {}, audioNeedsGesture: false, audioCache: { apple: Promise.resolve(null) },
      irisAudio: { stop() {} }, initAudio() {}, stopWordAudio() {},
      setTimeout: () => 1, clearTimeout() {}, showCoach: text => messages.push(text),
      window: { speechSynthesis: { cancel() {}, resume() {}, speak() { speech++; } } },
      audioContext: { state: 'running', destination: {}, decodeAudioData: async bytes => bytes,
        createBufferSource: () => ({ connect() {}, start() { starts++; } }) },
    };
    context.preloadWordAudio = word => {
      requests++;
      if (!context.audioCache[word]) context.audioCache[word] = Promise.resolve(new ArrayBuffer(8));
      return context.audioCache[word];
    };
    vm.createContext(context); vm.runInContext(readFileSync(new URL('iris-audio.js', root), 'utf8'), context); vm.runInContext(helper, context);
    context.speakLesson({ word: 'apple' });
    for (let i = 0; i < 12; i++) await Promise.resolve();
    assert.equal(starts, 0); assert.equal(speech, 0);
    assert.equal(messages.length, 1);
    assert.equal(context.audioCache.apple, undefined);
    context.window.ZideAudio={allows:()=>false};
    context.speakLesson({word:'apple'});
    assert.equal(requests,1);
    context.window.ZideAudio={allows:()=>true};
    context.speakLesson({ word: 'apple' });
    for (let i = 0; i < 12; i++) await Promise.resolve();
    assert.equal(requests, 2); assert.equal(starts, 1); assert.equal(speech, 0);
  });
  test(`${lang}: exceptional accents are labelled in both lessons and review`, () => {
    const html = readFileSync(new URL(file, root), 'utf8');
    const helper = html.slice(html.indexOf('      function wordAccentLabel('), html.indexOf('      function speakReviewWord('));
    const context = { window: manifest };
    vm.createContext(context); vm.runInContext(readFileSync(new URL('iris-audio.js', root), 'utf8'), context); vm.runInContext(helper, context);
    assert.equal(Object.keys(manifest.LISA_WORD_ACCENTS).length, 52);
    assert.match(context.wordAccentLabel('igloo'), lang === 'zh' ? /英式/ : /British/);
    for (const word of ['unicorn', 'yak']) assert.match(context.wordAccentLabel(word), lang === 'zh' ? /澳式/ : /Australian/);
    assert.match(context.wordAccentLabel('apple'), lang === 'zh' ? /美式/ : /US English/);
    assert.ok(html.includes('document.getElementById("wordAccent").textContent = wordAccentLabel(lesson.word)'));
    assert.ok(html.includes('class="word-accent">\'+wordAccentLabel(lesson.word)'));
  });
  test(`${lang}: review and retry share every word's main recording and cancel pending lesson audio`, () => {
    const html = readFileSync(new URL(file, root), 'utf8');
    const helper = html.slice(html.indexOf('      function speakReviewWord('), html.indexOf('      function answerReview('));
    const queues = [];
    let stops = 0, cancels = 0;
    const context = { window: { ...manifest, speechSynthesis: { cancel: () => cancels++ } }, speechRunId: 4, pendingSpeechLesson: {}, stopWordAudio: () => stops++, irisAudio: { sequence: paths => queues.push([...paths]) } };
    vm.createContext(context);
    vm.runInContext(helper, context);
    for (const [word, path] of Object.entries(manifest.LISA_WORD_AUDIO)) {
      for (const prompt of ['lisa_picture', 'lisa_retry']) {
        context.speakReviewWord({ word }, prompt);
        assert.deepEqual(queues.at(-1), [`audio/prompts/${lang}/${prompt}.mp3`, `../${path}`]);
      }
    }
    assert.equal(queues.length, 104);
    assert.equal(stops, 104);
    assert.equal(cancels, 104);
    assert.equal(context.speechRunId, 108);
    assert.equal(context.pendingSpeechLesson, null);
    context.window.speechSynthesis.cancel = () => { throw new Error('device speech blocked'); };
    assert.doesNotThrow(() => context.speakReviewWord({ word: 'apple' }, 'lisa_retry'));
    assert.equal(queues.at(-1)[1], '../' + manifest.LISA_WORD_AUDIO.apple);
    assert.ok(html.includes('speakReviewWord(lesson, "lisa_picture")'));
    assert.ok(html.includes('speakReviewWord(lesson, "lisa_retry")'));
    assert.ok(!html.includes('"audio/words/en/"+lesson.word'));
  });
}

import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../public/games/lisa-letter-adventure/', import.meta.url);
const manifest = {};
vm.runInNewContext(readFileSync(new URL('audio/manifest.js', root), 'utf8'), { window: manifest });

for (const [file, lang] of [['index.html', 'zh'], ['index-en.html', 'en']]) {
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

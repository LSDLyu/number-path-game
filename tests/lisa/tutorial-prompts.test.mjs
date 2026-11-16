import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped tutorial function, not a reimplementation.
for (const [page, language] of [['index.html', 'zh'], ['index-en.html', 'en']]) {
  const html = readFileSync(new URL(`../../public/games/lisa-letter-adventure/${page}`, import.meta.url), 'utf8');
  const tutorial = html.slice(html.indexOf('function showLevelTutorial()'), html.indexOf('function showLearningRecords()'));
  describe(`${language} tutorial audio context`, () => {
    for (let level = 1; level <= 10; level++) {
      it(`only explains jumping when level ${level} tutorial opens or reopens`, () => {
        const queues = [];
        const context = {
          currentLevel: level,
          LEVELS: Array.from({ length: 10 }, (_, i) => ({ name: `level ${i + 1}`, hint: 'hint' })),
          irisAudio: { sequence: queue => queues.push(Array.from(queue)) },
          showLearningDialog: () => {}
        };
        vm.runInNewContext(`${tutorial}; showLevelTutorial(); showLevelTutorial();`, context);
        expect(queues).toEqual(Array.from({ length: 2 }, () => [`audio/prompts/${language}/lisa_jump.mp3`]));
      });
    }
    it('does not schedule no-hearts reassurance at any gameplay opening', () => {
      expect(html).not.toContain('lisa_slow');
      expect(html).toContain('speakReviewWord(lesson, "lisa_retry")');
      expect(html).toContain('speakReviewWord(lesson, "lisa_picture")');
    });
  });
}

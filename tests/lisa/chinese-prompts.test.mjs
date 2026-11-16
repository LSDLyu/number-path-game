import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../../public/games/lisa-letter-adventure/iris/', import.meta.url);
const expected = {
  "common_listen_again.mp3": "a6817aa2114d6e73616c74f957bc0d07ee7f1cf344086e79edf80d6800179ef6",
  "common_continue.mp3": "3ec638a0b7e1e6a68fa2156d440ffe8baf2cce4cc0744fb8602a711fa56b6048",
  "common_correct.mp3": "52701e896d7e3b4ff55d051d53654b07e4e3793ff1ee0444348fae909e512476",
  "lisa_retry.mp3": "4124fe67adb1e7fb65c207a9f2d95dc54ac8caa13725e219bf2e19576ab19854",
  "lisa_picture.mp3": "94b76e2595114a3de8c49575ee292e1bbfca7f4b925c265e28b1562681a59386",
  "common_start.mp3": "f0879104ec8743b6d7e7bd351b892c1129cb0da994537ee2d7bba1af750c7624",
  "lisa_slow.mp3": "d99a9d5a3461355a275b6165b97fd44346a6de7dc2b70f6e89a08f0e240fa2af",
  "lisa_jump.mp3": "742e6e56151d5dfe650bac7d4a957e85e772492c5dfee8cc4a083d7aa1fb6b4e"
};
describe('user-provided Chinese prompt recordings', () => {
  for (const [name, sha256] of Object.entries(expected)) {
    it(`preserves the approved recording for ${name}`, () => {
      const bytes = readFileSync(new URL(`audio/prompts/zh/${name}`, root));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256);
      const manifest = JSON.parse(readFileSync(new URL('chinese-prompts.json', root), 'utf8'));
      const clip = manifest.clips.find(item => item.filename === `audio/prompts/zh/${name}`);
      expect(clip.sha256).toBe(sha256);
      expect(clip.source).toContain('User-provided original recording');
    });
  }
});

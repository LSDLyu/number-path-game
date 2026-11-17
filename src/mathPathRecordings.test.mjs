import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../public/iris/', import.meta.url);
const expected = {
  "audio/prompts/zh/path_rules.mp3": "6a1c3b5eb5885ffac43ad6f0ec06b6b3b3974ee3a91e76a57091a356b1fb6cf2",
  "audio/prompts/zh/path_dead_end.mp3": "e0310d6e2a5b8400496c83521d8f57dfc01ef973919b177ce92f830733b3a3c4",
  "audio/prompts/zh/path_solved.mp3": "38cebc08405c6dba5233ad4c967adaf0148aa150e2f13426a44caae833810a80"
};
describe('approved Chinese math-path original recordings', () => {
  for (const [filename, sha256] of Object.entries(expected)) {
    it(`preserves approved bytes and provenance for ${filename}`, () => {
      const bytes = readFileSync(new URL(filename, root));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256);
      const manifest = JSON.parse(readFileSync(new URL('chinese-prompts-20261117.json', root), 'utf8'));
      const clip = manifest.clips.find(item => item.filename === filename);
      expect(clip.sha256).toBe(sha256);
      expect(clip.source).toContain('User-provided original recording');
      expect(clip.game).toBe('numberpath');
      expect(readFileSync(new URL('SHA256SUMS.txt', root), 'utf8')).toContain(`${sha256}  ${filename}`);
      const eventMap = JSON.parse(readFileSync(new URL('event-map.json', root), 'utf8'));
      expect(eventMap.prompts[clip.id.replace(/_zh$/, '')].zh).toBe(filename);
    });
  }
});

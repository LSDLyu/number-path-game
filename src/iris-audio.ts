import { allowsAudio } from './site-audio.mjs';
/** Iris recordings: one narration channel, bounded effects, no autoplay on load. */
export class IrisAudio {
  private voice: HTMLAudioElement | null = null;
  private effects = new Set<HTMLAudioElement>();
  private last = new Map<string, number>();
  private enabled = true;
  private generation = 0;
  constructor(private base: string, private locale: 'zh' | 'en') {}
  setEnabled(value: boolean) { this.enabled = value; if (!value) this.stop(); }
  stop() {
    this.generation++;
    this.voice?.pause(); this.voice = null;
    this.effects.forEach(audio => audio.pause()); this.effects.clear();
  }
  prompt(name: string, cooldown = 0) { this.say(`audio/prompts/${this.locale}/${name}.mp3`, cooldown); }
  say(path: string, cooldown = 0) { this.sequence([path], cooldown); }
  sequence(paths: string[], cooldown = 0) {
    if (!this.enabled || !allowsAudio('voice') || typeof Audio === 'undefined' || !paths.length) return;
    const now = Date.now();
    if (now - (this.last.get(paths[0]) ?? -Infinity) < cooldown) return;
    this.last.set(paths[0], now);
    this.voice?.pause();
    const generation = ++this.generation;
    const next = (index: number) => {
      if (!this.enabled || !allowsAudio('voice') || generation !== this.generation || index >= paths.length) return;
      const audio = new Audio(this.base + paths[index]);
      this.voice = audio;
      audio.onended = () => { if (this.voice === audio) this.voice = null; next(index + 1); };
      audio.onerror = () => { if (this.voice === audio) this.voice = null; };
      void audio.play().catch(() => { if (this.voice === audio) this.voice = null; });
    };
    next(0);
  }
  effect(name: string, cooldown = 150) {
    if (!this.enabled || !allowsAudio('effects') || typeof Audio === 'undefined') return;
    const now = Date.now();
    if (now - (this.last.get(name) ?? -Infinity) < cooldown || this.effects.size >= 3) return;
    this.last.set(name, now);
    const audio = new Audio(`${this.base}sfx/${name}.mp3`);
    audio.volume = this.voice ? 0.18 : 0.45;
    this.effects.add(audio);
    const clear = () => this.effects.delete(audio);
    audio.onended = clear; audio.onerror = clear;
    void audio.play().catch(clear);
  }
}

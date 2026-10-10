/** Iris recordings: one narration channel, bounded effects, no autoplay on load. */
window.IrisAudio = class IrisAudio {
    base;
    locale;
    voice = null;
    effects = new Set();
    last = new Map();
    enabled = true;
    generation = 0;
    constructor(base, locale) {
        this.base = base;
        this.locale = locale;
    }
    setEnabled(value) { this.enabled = value; if (!value)
        this.stop(); }
    stop() {
        this.generation++;
        this.voice?.pause();
        this.voice = null;
        this.effects.forEach(audio => audio.pause());
        this.effects.clear();
    }
    prompt(name, cooldown = 0) { this.say(`audio/prompts/${this.locale}/${name}.mp3`, cooldown); }
    say(path, cooldown = 0) { this.sequence([path], cooldown); }
    sequence(paths, cooldown = 0) {
        if (!this.enabled || typeof Audio === 'undefined' || !paths.length)
            return;
        const now = Date.now();
        if (now - (this.last.get(paths[0]) ?? -Infinity) < cooldown)
            return;
        this.last.set(paths[0], now);
        this.voice?.pause();
        const generation = ++this.generation;
        const next = (index) => {
            if (!this.enabled || generation !== this.generation || index >= paths.length)
                return;
            const audio = new Audio(this.base + paths[index]);
            this.voice = audio;
            audio.onended = () => { if (this.voice === audio)
                this.voice = null; next(index + 1); };
            audio.onerror = () => { if (this.voice === audio)
                this.voice = null; };
            void audio.play().catch(() => { if (this.voice === audio)
                this.voice = null; });
        };
        next(0);
    }
    effect(name, cooldown = 150) {
        if (!this.enabled || typeof Audio === 'undefined')
            return;
        const now = Date.now();
        if (now - (this.last.get(name) ?? -Infinity) < cooldown || this.effects.size >= 3)
            return;
        this.last.set(name, now);
        const audio = new Audio(`${this.base}sfx/${name}.mp3`);
        audio.volume = this.voice ? 0.18 : 0.45;
        this.effects.add(audio);
        const clear = () => this.effects.delete(audio);
        audio.onended = clear;
        audio.onerror = clear;
        void audio.play().catch(clear);
    }
}

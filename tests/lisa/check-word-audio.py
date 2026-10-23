"""Release gate for Lisa's fixed word recordings and per-file attribution."""
import json
import hashlib
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2] / "public/games/lisa-letter-adventure"
WORDS = set("apple ant ball banana cat cake dog duck egg elephant fish frog goat grape hat horse igloo insect jam jelly kite koala lion lemon moon monkey nest nose octopus orange penguin panda queen quilt rabbit robot sun star turtle tiger umbrella unicorn violin volcano whale watermelon xylophone x-ray yo-yo yak zebra zoo".split())


def main():
    manifest_path = ROOT / "audio/manifest.js"
    match = re.fullmatch(r"\s*(?://[^\n]*\n)*\s*window\.LISA_WORD_AUDIO\s*=\s*(\{.*\})\s*;\s*", manifest_path.read_text(), re.S)
    if not match:
        raise ValueError("audio/manifest.js must contain a JSON word-to-path map")
    manifest = json.loads(match.group(1))
    credits_path = ROOT / "audio/credits.json"
    credits = json.loads(credits_path.read_text()) if credits_path.exists() else {}
    accents_match = re.fullmatch(r'window\.LISA_WORD_ACCENTS = (\{.*\});\s*', (ROOT / 'audio/accents.js').read_text())
    accents = json.loads(accents_match.group(1)) if accents_match else {}
    problems = []
    pending = []
    coverage = json.loads((ROOT / 'audio/coverage.json').read_text())
    for word in sorted(WORDS):
        expected = f"audio/{word}.mp3" if word in credits else f"iris/audio/words/en/{word}.mp3"
        if word not in credits:
            pending.append(word)
        if manifest.get(word) != expected:
            problems.append(f"{word}: manifest entry must be {expected}")
            continue
        attribution = credits.get(word)
        if word in credits and (not isinstance(attribution, dict) or any(not attribution.get(key) for key in ("original", "license", "source", "author", "changes"))):
            problems.append(f"{word}: source URL, original audio URL and license are required")
        if word in credits:
            if accents.get(word) != attribution.get('accent'):
                problems.append(f'{word}: accent label differs from its source')
            if not attribution.get('source_revision') or not re.fullmatch('[a-f0-9]{40}', attribution.get('original_sha1', '')):
                problems.append(f'{word}: source revision and original media checksum required')
        file = ROOT / expected
        if not file.is_file() or file.stat().st_size < 100:
            problems.append(f"{word}: MP3 missing or empty")
            continue
        if coverage.get(word, {}).get('file') != expected or coverage.get(word, {}).get('sha256') != hashlib.sha256(file.read_bytes()).hexdigest():
            problems.append(f"{word}: coverage does not match the actual recording")
        if word in credits and attribution.get('sha256') != hashlib.sha256(file.read_bytes()).hexdigest():
            problems.append(f'{word}: credited audio checksum differs from the file')
        result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name:format=duration", "-of", "json", str(file)], capture_output=True, text=True)
        try:
            info = json.loads(result.stdout)
            duration = float(info["format"]["duration"])
            codecs = {stream.get("codec_name") for stream in info["streams"]}
            if result.returncode or "mp3" not in codecs or not 0.15 <= duration <= 6:
                raise ValueError("invalid codec or duration")
        except (ValueError, KeyError, TypeError):
            problems.append(f"{word}: invalid MP3 or unexpected duration")
    extras = (set(manifest) | set(credits)) - WORDS
    if extras:
        problems.append("unexpected words: " + ", ".join(sorted(extras)))
    if problems:
        print(f"Fixed audio incomplete: {len(problems)} issue(s):", *problems, sep="\n- ")
        return 1
    print(f"PASS 52 playable MP3 files and checksums; {len(credits)} attributed Commons recordings")
    if pending:
        print("PENDING Commons recordings: " + ', '.join(pending))
        if '--allow-pending' not in sys.argv:
            print('Release blocked: Wikimedia replacement is not complete. --allow-pending is for draft validation only.')
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Release gate for Lisa's fixed word recordings and per-file attribution."""
import json
import pathlib
import re
import subprocess
import sys

SITE_ROOT = pathlib.Path(__file__).resolve().parents[1]
ROOT = SITE_ROOT / "dist" if (SITE_ROOT / "dist").is_dir() else SITE_ROOT.parent / "public/games/lisa-letter-adventure"
WORDS = set("apple ant ball banana cat cake dog duck egg elephant fish frog goat grape hat horse igloo insect jam jelly kite koala lion lemon moon monkey nest nose octopus orange penguin panda queen quilt rabbit robot sun star turtle tiger umbrella unicorn violin volcano whale watermelon xylophone x-ray yo-yo yak zebra zoo".split())


def main():
    manifest_path = ROOT / "audio/manifest.js"
    match = re.fullmatch(r"\s*(?://[^\n]*\n)*\s*window\.LISA_WORD_AUDIO\s*=\s*(\{.*\})\s*;\s*", manifest_path.read_text(), re.S)
    if not match:
        raise ValueError("audio/manifest.js must contain a JSON word-to-path map")
    manifest = json.loads(match.group(1))
    credits_path = ROOT / "audio/credits.json"
    credits = json.loads(credits_path.read_text()) if credits_path.exists() else {}
    problems = []
    for word in sorted(WORDS):
        expected = f"audio/{word}.mp3"
        if manifest.get(word) != expected:
            problems.append(f"{word}: manifest entry must be {expected}")
            continue
        attribution = credits.get(word)
        if not isinstance(attribution, dict) or any(not attribution.get(key) for key in ("original", "license", "source")):
            problems.append(f"{word}: source URL, original audio URL and license are required")
        file = ROOT / expected
        if not file.is_file() or file.stat().st_size < 100:
            problems.append(f"{word}: MP3 missing or empty")
            continue
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
    print("PASS 52 fixed MP3 pronunciations, audio duration and per-word source/license metadata")
    return 0


if __name__ == "__main__":
    sys.exit(main())

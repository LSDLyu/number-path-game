"""Download attributed pronunciation recordings; never import dictionary definitions."""
import concurrent.futures, json, pathlib, subprocess
from urllib.parse import urlparse
SITE_ROOT = pathlib.Path(__file__).resolve().parents[1]
ROOT = SITE_ROOT / 'dist' if (SITE_ROOT / 'dist').is_dir() else SITE_ROOT.parent / 'public/games/lisa-letter-adventure'
WORDS = 'apple ant ball banana cat cake dog duck egg elephant fish frog goat grape hat horse igloo insect jam jelly kite koala lion lemon moon monkey nest nose octopus orange penguin panda queen quilt rabbit robot sun star turtle tiger umbrella unicorn violin volcano whale watermelon xylophone x-ray yo-yo yak zebra zoo'.split()
CACHE = pathlib.Path('/tmp/lisa-pronunciations')
CACHE.mkdir(exist_ok=True)
(ROOT / 'audio').mkdir(exist_ok=True)

def get(url, target):
    if urlparse(url).scheme != 'https': return False
    temporary = target.with_name(target.name + '.partial')
    p = subprocess.run(['curl','--fail','--location','-sS','--max-time','45','--retry','1','-o',str(temporary),url], capture_output=True)
    if p.returncode == 0 and temporary.exists() and temporary.stat().st_size > 100:
        temporary.replace(target)
        return True
    temporary.unlink(missing_ok=True)
    return False

def word_audio(word):
    meta = CACHE / (word + '.json')
    if not meta.exists() and not get('https://api.dictionaryapi.dev/api/v2/entries/en/' + word, meta):
        return word, None
    try: data = json.loads(meta.read_text())
    except Exception: return word, None
    if not isinstance(data, list): return word, None
    choices = [p for d in data for p in d.get('phonetics', []) if
               (p.get('audio') or '').endswith('.mp3') and (p.get('sourceUrl') or '').startswith('https://commons.wikimedia.org/')
               and isinstance(p.get('license'), dict) and p['license'].get('name', '').startswith('CC BY')
               and p['license'].get('url', '').startswith('https://creativecommons.org/')]
    choices.sort(key=lambda p: (not p['audio'].endswith('-us.mp3'), not p['audio'].endswith('-uk.mp3')))
    for p in choices:
        target = ROOT / 'audio' / (word + '.mp3')
        if (target.exists() and target.stat().st_size > 100) or get(p['audio'], target):
            return word, dict(file='audio/' + word + '.mp3', original=p['audio'], source=p.get('sourceUrl'), license=p['license'], changes='Unmodified recording; original contributors credited at source URL.')
    return word, None

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = dict(pool.map(word_audio, WORDS))
    (ROOT / 'audio' / 'credits.json').write_text(json.dumps({k:v for k,v in results.items() if v}, indent=2, ensure_ascii=False))
    manifest = {word: item['file'] for word, item in results.items() if item}
    (ROOT / 'audio' / 'manifest.js').write_text('window.LISA_WORD_AUDIO = ' + json.dumps(manifest) + ';\n')
    print(json.dumps({'recordings':sum(v is not None for v in results.values()), 'missing':[k for k,v in results.items() if not v]}))

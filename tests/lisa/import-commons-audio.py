"""Import exact-word Commons pronunciations with author and license attribution."""
import concurrent.futures
import html
import json
import pathlib
import re
import subprocess
import threading
import urllib.parse
import urllib.request

SITE_ROOT = pathlib.Path(__file__).resolve().parents[1]
ROOT = SITE_ROOT / 'dist' if (SITE_ROOT / 'dist').is_dir() else SITE_ROOT.parent / 'public/games/lisa-letter-adventure'
WORDS = 'apple ant ball banana cat cake dog duck egg elephant fish frog goat grape hat horse igloo insect jam jelly kite koala lion lemon moon monkey nest nose octopus orange penguin panda queen quilt rabbit robot sun star turtle tiger umbrella unicorn violin volcano whale watermelon xylophone x-ray yo-yo yak zebra zoo'.split()
CACHE = pathlib.Path('/tmp/lisa-commons')
CACHE.mkdir(exist_ok=True)
(ROOT / 'audio').mkdir(exist_ok=True)
RATE_LIMITED = threading.Event()

def fetch(url, path):
    if path.exists() and path.stat().st_size > 100:
        return True
    if RATE_LIMITED.is_set():
        return False
    result = subprocess.run(['curl', '-fsSL', '--max-time', '20', '-w', '%{http_code}', '-o', str(path)+'.part', url], capture_output=True, text=True)
    if result.stdout.strip() == '429':
        RATE_LIMITED.set()
    partial = pathlib.Path(str(path)+'.part')
    if result.returncode == 0 and partial.exists() and partial.stat().st_size > 100:
        partial.replace(path)
        return True
    partial.unlink(missing_ok=True)
    return False

def plain(value):
    return html.unescape(re.sub('<[^>]+>', '', value)).strip()

def acquire(word):
    for prefix in ['En-us-', 'En-uk-', 'En-']:
        name = prefix + word + '.ogg'
        source = 'https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(name)
        page = CACHE / (name + '.html')
        if not fetch(source, page):
            continue
        content = html.unescape(page.read_text())
        original = re.search(r'class="fullMedia".*?href="(https://upload.wikimedia.org/[^\"]+)"', content, re.S)
        license_links = re.findall(r'<span class="licensetpl_link"[^>]*>(.*?)</span>', content, re.S)
        licenses = re.findall(r'https?://creativecommons.org/licenses/(by(?:-sa)?)/([\d.]+)/?', ' '.join(license_links))
        author = re.search(r'id="fileinfotpl_aut".*?</td>\s*<td[^>]*>(.*?)</td>', content, re.S)
        if not original or not licenses or not author:
            continue
        author_text = ' '.join(plain(author.group(1)).split())
        if not author_text:
            continue
        url = html.unescape(original.group(1)).split('?')[0]
        if urllib.parse.unquote(url.rsplit('/', 1)[-1]) != name:
            continue
        ogg = CACHE / name
        if not fetch(url, ogg):
            continue
        target = ROOT / 'audio' / (word + '.mp3')
        conversion = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ogg), '-codec:a', 'libmp3lame', '-q:a', '3', str(target)], capture_output=True)
        if conversion.returncode:
            continue
        kind, version = sorted(set(licenses), key=lambda pair: float(pair[1]), reverse=True)[0]
        credit = dict(file='audio/'+word+'.mp3', original=url, source=source, author=author_text,
                      license={'name':'CC '+kind.upper()+' '+version,'url':'https://creativecommons.org/licenses/'+kind+'/'+version+'/'},
                      changes='Converted from Ogg to MP3; pronunciation unchanged. MP3 retains the source license.')
        print('OK ' + word, flush=True)
        return word, credit
    print('MISSING ' + word, flush=True)
    return word, None

if __name__ == '__main__':
    credits_path = ROOT / 'audio/credits.json'
    credits = json.loads(credits_path.read_text()) if credits_path.exists() else {}
    pending = [w for w in WORDS if w not in credits]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for word, credit in pool.map(acquire, pending):
            if credit:
                credits[word] = credit
    credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=2))
    (ROOT / 'audio/manifest.js').write_text('window.LISA_WORD_AUDIO = '+json.dumps({w:c['file'] for w,c in credits.items()})+';\n')
    print(json.dumps({'recordings':len(credits),'missing':[w for w in WORDS if w not in credits]}), flush=True)

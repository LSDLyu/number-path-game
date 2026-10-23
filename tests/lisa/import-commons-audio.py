"""Import explicitly selected Commons pronunciations, hashes and attribution.

Defaults to Lisa's 52 words. For Typewriter, pass --root PUBLIC --words cat sun
hello. Original files are verified against Commons' SHA-1 before conversion.
Network denials/rate limits stop the run; TLS checks remain enabled.
"""
import argparse
import array
import hashlib
import html
import json
import math
import pathlib
import re
import runpy
import subprocess
import tempfile
import time
import urllib.parse
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1] / 'public/games/lisa-letter-adventure'
SELECTION = json.loads((HERE / 'commons-selection.json').read_text())
CACHE = pathlib.Path(tempfile.gettempdir()) / 'zide-commons-audio'
USER_AGENT = 'ZideLearningAudioReview/1.0 (https://edu.alading.org/)'
last_request = 0


def download(url, path):
    global last_request
    host = urllib.parse.urlparse(url).hostname
    if urllib.parse.urlparse(url).scheme != 'https' or host not in ('commons.wikimedia.org', 'upload.wikimedia.org'):
        raise ValueError('Unexpected audio/source destination')
    partial = path.with_suffix(path.suffix + '.partial')
    # Keep public media downloads slow; a rate-limit response stops this run.
    time.sleep(max(0, 3 - (time.monotonic() - last_request)))
    last_request = time.monotonic()
    headers = CACHE / 'last-response.headers'
    result = subprocess.run(['curl', '-sSL', '--max-time', '40', '-A', USER_AGENT, '-D', str(headers), '-w', '%{http_code}', '-o', str(partial), url], capture_output=True, text=True)
    if result.returncode or result.stdout != '200':
        partial.unlink(missing_ok=True)
        retry = re.findall(r'(?im)^retry-after:\s*(.+)$', headers.read_text()) if headers.exists() else []
        raise RuntimeError(f'HTTP {result.stdout}; Retry-After={retry}; {result.stderr.strip()}')
    partial.replace(path)


def plain(value):
    return ' '.join(html.unescape(re.sub('<[^>]+>', '', value)).split())


def metadata(words):
    pages = {}
    for start in range(0, len(words), 40):
        params = dict(action='query', prop='imageinfo|info', iiprop='url|extmetadata|sha1|size|timestamp',
                      titles='|'.join(SELECTION[w]['title'] for w in words[start:start+40]), format='json')
        path = CACHE / ('metadata-' + str(start) + '.json')
        download('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params), path)
        data = json.loads(path.read_text())
        if 'error' in data:
            raise ValueError(data['error'])
        pages.update({p['title']: p for p in data['query']['pages'].values()})
    return pages


def license_info(meta):
    get = lambda key: meta.get(key, {}).get('value', '')
    name, url = get('LicenseShortName'), get('LicenseUrl').replace('http://', 'https://')
    if name.startswith('CC BY') and re.fullmatch(r'https://creativecommons.org/licenses/by(?:-sa)?/[0-9.]+/?', url):
        return dict(name=name, url=url)
    if name == 'CC0' and url.startswith('https://creativecommons.org/publicdomain/zero/1.0'):
        return dict(name='CC0 1.0', url='https://creativecommons.org/publicdomain/zero/1.0/')
    if name == 'Public domain' and 'PD-self' in get('Categories').split('|'):
        return dict(name='Public domain (PD-self)', url='https://commons.wikimedia.org/wiki/Template:PD-self')
    raise ValueError('License needs manual review: ' + name)


def audio_stats(path):
    result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', '44100', '-'], capture_output=True, check=True)
    samples = array.array('f', result.stdout)
    duration = len(samples) / 44100
    if not .15 <= duration <= 6 or any(not math.isfinite(s) for s in samples):
        raise ValueError('Unexpected recording duration or samples')
    rms = math.sqrt(sum(s*s for s in samples) / len(samples))
    peak = max(abs(s) for s in samples)
    if rms <= .0001:
        raise ValueError('Recording is effectively silent')
    return dict(duration_seconds=round(duration, 4), rms_dbfs=round(20*math.log10(rms), 2), peak_dbfs=round(20*math.log10(peak), 2))


def acquire(word, page, root):
    info = page['imageinfo'][0]
    if info['size'] > 5_000_000:
        raise ValueError('Unexpectedly large pronunciation file')
    meta = info['extmetadata']
    author = plain(meta.get('Artist', {}).get('value', ''))
    author_evidence = 'Commons extmetadata.Artist'
    if not author:
        author = SELECTION[word].get('author_from_description')
        if not author:
            raise ValueError('Missing author: ' + word)
        # Confirm the manually reviewed attribution against current page source.
        params = dict(action='parse', oldid=page['lastrevid'], prop='wikitext', format='json')
        proof = CACHE / (word + '-author.json')
        download('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params), proof)
        if author not in json.loads(proof.read_text())['parse']['wikitext']['*']:
            raise ValueError('Attribution changed: ' + word)
        author_evidence = 'File-description wikitext at the recorded source revision'
    license = license_info(meta)
    url = info['url'].split('?')[0]
    original = CACHE / (word + pathlib.Path(urllib.parse.urlparse(url).path).suffix)
    if not original.exists() or hashlib.sha1(original.read_bytes()).hexdigest() != info['sha1']:
        download(url, original)
    if hashlib.sha1(original.read_bytes()).hexdigest() != info['sha1']:
        raise ValueError('Commons checksum mismatch: ' + word)
    before = audio_stats(original)
    # Constant gain only: no compression, time stretching, pitch shifts or cuts.
    gain = round(min(-24 - before['rms_dbfs'], -4 - before['peak_dbfs'], 12), 2)
    target = root / 'audio' / (word + '.mp3')
    partial = target.with_name(word + '.partial.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-af', f'volume={gain}dB', '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-q:a', '3', str(partial)], check=True)
    after = audio_stats(partial)
    if after['peak_dbfs'] > -2 or abs(before['duration_seconds'] - after['duration_seconds']) > .15:
        raise ValueError('Conversion needs review: ' + word)
    partial.replace(target)
    return dict(file='audio/'+word+'.mp3', title=page['title'], original=url, source=info['descriptionurl'],
                source_revision=page['lastrevid'], original_timestamp=info['timestamp'], author=author, author_evidence=author_evidence,
                accent=SELECTION[word]['accent'], accent_evidence=SELECTION[word].get('accent_evidence', info['descriptionurl']), license=license, original_sha1=info['sha1'], original_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),
                sha256=hashlib.sha256(target.read_bytes()).hexdigest(), gain_db=gain, audio=after,
                retrieved_utc=datetime.now(timezone.utc).date().isoformat(), pronunciation_listened=False,
                changes=f'Converted to mono MP3, 44.1 kHz; constant gain {gain:+.2f} dB. No cuts, pitch or speed changes. Source licensing status retained.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=pathlib.Path, default=ROOT)
    parser.add_argument('--words', nargs='+', default=[w for w in SELECTION if w != 'hello'])
    args = parser.parse_args()
    if not set(args.words) <= set(SELECTION):
        parser.error('Only explicitly selected words can be imported')
    CACHE.mkdir(exist_ok=True)
    (args.root / 'audio').mkdir(exist_ok=True)
    path = args.root / 'audio/credits.json'
    credits = json.loads(path.read_text()) if path.exists() else {}
    pages = metadata(args.words)
    for word in args.words:
        page = pages.get(SELECTION[word]['title'], {})
        if not page.get('imageinfo'):
            raise ValueError('Selected source missing: ' + word)
        credits[word] = acquire(word, page, args.root)
        path.write_text(json.dumps(credits, ensure_ascii=False, indent=2) + '\n')
        print('OK', word, credits[word]['accent'], credits[word]['license']['name'], flush=True)
    if args.root.resolve() == ROOT.resolve():
        runpy.run_path(str(HERE / 'build-word-audio.py'), run_name='__main__')


if __name__ == '__main__':
    main()

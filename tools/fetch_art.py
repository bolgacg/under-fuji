#!/usr/bin/env python3
"""Fetch public domain ukiyo-e prints from the Art Institute of Chicago open API
into assets/prints/<slot>.jpg and write assets/prints/credits.json.
Downloads are capped at 150 KB/s. Usage: fetch_art.py [slot ...] to redo single slots."""
import json, os, subprocess, sys, time, urllib.parse, urllib.request

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'prints')
UA = {'User-Agent': 'hobby-game-art-fetch', 'AIC-User-Agent': 'hobby-game-art-fetch'}
ARTISTS = ('Hokusai', 'Hiroshige', 'Kuniyoshi', 'Yoshitoshi', 'Kunisada', 'Utamaro', 'Harunobu', 'Kyosai', 'Kiyochika')
SLOTS = [
    ('bg', 'Hokusai Fine Wind Clear Weather'),
    ('edo', 'Hiroshige Nihonbashi'),
    ('festival', 'Hiroshige festival procession'),
    ('teahouse', 'Hiroshige Mariko teahouse'),
    ('foxshrine', 'Hiroshige foxfires Oji'),
    ('seashrine', 'Hiroshige torii shrine sea'),
    ('cloudshrine', 'Hiroshige Kinryuzan temple Asakusa'),
    ('forest', 'Hokusai Mishima Pass Kai Province'),
    ('coast', 'Hokusai Under the Wave off Kanagawa'),
    ('marsh', 'Hiroshige Horikiri iris'),
    ('pass', 'Hiroshige Hakone lake'),
    ('springs', 'Hiroshige Kanbara night snow'),
    ('battlefield', 'Yoshitoshi battle warriors'),
    ('fuji', 'Hokusai Rainstorm Beneath the Summit'),
    ('cave', 'Hokusai climbing Mount Fuji pilgrims'),
    ('ronin', 'Kuniyoshi Miyamoto Musashi'),
    ('talker', 'Utamaro woman reading letter'),
    ('bandit', 'Kuniyoshi Suikoden hero'),
    ('ghost', 'Hokusai ghost'),
    ('kappa', 'kappa'),
    ('fox', 'Yoshitoshi fox'),
    ('tengu', 'tengu'),
    ('oni', 'Kuniyoshi demon'),
    ('spider', 'Kuniyoshi earth spider'),
    ('armour', 'Kuniyoshi samurai armor'),
    ('skeleton', 'Kuniyoshi skeleton'),
    ('snow', 'Hiroshige snow woman'),
    ('dragon', 'Hokusai dragon'),
    ('moon', 'Yoshitoshi moon'),
    ('market', 'Hiroshige Suruga street'),
]


def search(q):
    url = ('https://api.artic.edu/api/v1/artworks/search?q=' + urllib.parse.quote(q) +
           '&query[term][is_public_domain]=true&limit=12&fields=id,title,image_id,artist_title,date_display')
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.load(r)['data']


def is_jpeg(path):
    return os.path.exists(path) and open(path, 'rb').read(2) == b'\xff\xd8'


def download(slot, image_id):
    """The image server wants the documented AIC-User-Agent header; without it a bot check page comes back."""
    path = os.path.join(OUT, slot + '.jpg')
    url = f"https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg"
    for _ in range(3):
        subprocess.run(['curl', '-s', '-m', '120', '--limit-rate', '150k', '-A', UA['User-Agent'],
                        '-H', 'AIC-User-Agent: ' + UA['AIC-User-Agent'], '-o', path, url], check=False)
        if is_jpeg(path):
            return True
        time.sleep(3)
    print(slot, 'NOT AN IMAGE', flush=True)
    return False


def main():
    os.makedirs(OUT, exist_ok=True)
    cpath = os.path.join(OUT, 'credits.json')
    credits = json.load(open(cpath)) if os.path.exists(cpath) else {}
    want = sys.argv[1:]
    used = {c['image_id'] for s, c in credits.items() if s not in want}
    for slot, c in credits.items():  # repair files that are not images
        if slot not in want and not is_jpeg(os.path.join(OUT, slot + '.jpg')):
            print('repair', slot, download(slot, c['image_id']), flush=True)
            time.sleep(1)
    for slot, q in SLOTS:
        if want and slot not in want:
            continue
        if not want and slot in credits:
            continue
        hits = [h for h in search(q) if h.get('image_id') and h['image_id'] not in used]
        pref = [h for h in hits if any(a in (h.get('artist_title') or '') for a in ARTISTS)] or hits
        if not pref:
            print(slot, 'NO HIT', flush=True)
            continue
        h = pref[0]
        used.add(h['image_id'])
        download(slot, h['image_id'])
        credits[slot] = {'title': h['title'], 'artist': h.get('artist_title'), 'date': h.get('date_display'),
                         'image_id': h['image_id'], 'source': f"https://www.artic.edu/artworks/{h['id']}"}
        json.dump(credits, open(cpath, 'w'), indent=1, ensure_ascii=False)
        print(slot, '|', h.get('artist_title'), '|', h['title'][:70], flush=True)
        time.sleep(1)
    print('DONE', flush=True)


if __name__ == '__main__':
    main()

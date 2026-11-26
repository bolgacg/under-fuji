#!/usr/bin/env python3
"""Download the verified Open Trivia DB questions (CC BY-SA 4.0) into data/questions.js.
One request per 5 seconds as the API asks. Rewrites the output after every category,
so the game can be tested while the download is still running."""
import json, os, time, urllib.parse, urllib.request

BASE = 'https://opentdb.com/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'questions.js')
DIFF = {'easy': 0, 'medium': 1, 'hard': 2}


def get(url):
    for i in range(8):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'hobby-trivia-fetch'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            print('  retry', i, e, flush=True)
            time.sleep(6 + 3 * i)
    return None


def write(cats, rows):
    with open(OUT + '.tmp', 'w', encoding='utf-8') as f:
        f.write('(globalThis.UF=globalThis.UF||{}).QCATS=' + json.dumps(cats, ensure_ascii=False) + ';\n')
        f.write('UF.Q=' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + ';\n')
    os.replace(OUT + '.tmp', OUT)


def main():
    u = urllib.parse.unquote
    token = get(BASE + 'api_token.php?command=request')['token']
    cats = {str(c['id']): c['name'].replace('Entertainment: ', '').replace('Science: ', '')
            for c in get(BASE + 'api_category.php')['trivia_categories']}
    rows, seen = [], set()
    for cid in sorted(cats, key=int):
        time.sleep(5.2)
        cnt = get(BASE + 'api_count.php?category=' + cid)
        remaining = cnt['category_question_count']['total_question_count'] if cnt else 0
        amount = min(50, remaining)
        got = 0
        while remaining > 0 and amount > 0:
            time.sleep(5.2)
            d = get(f'{BASE}api.php?amount={amount}&category={cid}&token={token}&encode=url3986')
            code = d['response_code'] if d else 5
            if code == 0:
                for q in d['results']:
                    text = u(q['question']).strip()
                    if text in seen:
                        continue
                    seen.add(text)
                    rows.append([int(cid), DIFF[u(q['difficulty'])], 'b' if u(q['type']) == 'boolean' else 'm',
                                 text, u(q['correct_answer']).strip(),
                                 [u(x).strip() for x in q['incorrect_answers']]])
                got += len(d['results'])
                remaining -= len(d['results'])
                amount = min(amount, remaining)
            elif code == 5:
                time.sleep(6)
            else:  # 1 or 4: fewer left than asked for
                amount //= 2
        write(cats, rows)
        print(cats[cid], got, 'total', len(rows), flush=True)
    print('DONE', len(rows), flush=True)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Pre-render the narrator with edge-tts (needs the network).
  render_voice.py --samples      one sample line in every voice of tools/voices.json
  render_voice.py VOICE_ID       every story text in that voice, into assets/voice/VOICE_ID/
Each clip is named after a hash of its text, so an edited text is simply rendered again.
One clip at a time, to stay gentle on the shared Wi-Fi."""
import asyncio, json, os, subprocess, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# a current edge-tts lives in tools/.pylib (pip install --target tools/.pylib edge-tts); older ones get refused
sys.path.insert(0, os.path.join(ROOT, 'tools', '.pylib'))
import edge_tts  # noqa: E402
OUT = os.path.join(ROOT, 'assets', 'voice')
RATE = '-4%'
VOICES = [v['id'] for v in json.load(open(os.path.join(ROOT, 'tools', 'voices.json')))]
SAMPLE = ('Late, near the moat, one soba cart is still lit. The broth smells wonderful. The cook turns to greet you '
          'and has no face at all, smooth as an egg. He is holding out two bowls.')


def h(s):  # FNV-1a, the same hash js/audio.js uses
    x = 0x811c9dc5
    for b in s.encode('utf-8'):
        x = ((x ^ b) * 0x01000193) & 0xffffffff
    return f'{x:08x}'


async def say(text, voice, path):
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, voice, rate=RATE).save(path + '.tmp')
            os.replace(path + '.tmp', path)
            return True
        except Exception as e:
            print('  retry', attempt, e, flush=True)
            await asyncio.sleep(3 + 3 * attempt)
    return False


def write_index():
    """assets/voice/index.json: which voices are rendered. A statically hosted copy reads this in place of the server."""
    out = []
    for v in json.load(open(os.path.join(ROOT, 'tools', 'voices.json'))):
        d = {'id': v['id'], 'label': v['label'], 'ready': 0, 'total': 0, 'done': False}
        try:
            j = json.load(open(os.path.join(OUT, v['id'], 'manifest.json')))
            d.update(ready=len(j['clips']), total=j['total'], done=bool(j['done']))
        except Exception:
            pass
        out.append(d)
    json.dump({'voices': out}, open(os.path.join(OUT, 'index.json'), 'w'))


async def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else ''
    if arg == '--index':
        write_index()
        return
    if arg == '--samples':
        os.makedirs(os.path.join(OUT, 'samples'), exist_ok=True)
        for v in VOICES:
            p = os.path.join(OUT, 'samples', v + '.mp3')
            if not os.path.exists(p):
                print(v, await say(SAMPLE, v, p), flush=True)
        return
    if arg not in VOICES:
        sys.exit('unknown voice; choose one of: ' + ', '.join(VOICES))
    lines = json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'tools', 'voice_lines.mjs')]))
    d = os.path.join(OUT, arg)
    os.makedirs(d, exist_ok=True)
    ready = []

    def manifest(done):
        json.dump({'voice': arg, 'total': len(lines), 'done': done, 'clips': ready}, open(os.path.join(d, 'manifest.json'), 'w'))

    for n, text in enumerate(lines):
        k = h(text)
        p = os.path.join(d, k + '.mp3')
        if os.path.exists(p) or await say(text, arg, p):
            ready.append(k)
        if n % 8 == 0:
            manifest(False)
            print(n + 1, 'of', len(lines), flush=True)
    keep = set(ready)
    for f in os.listdir(d):  # clips of texts that no longer exist
        if f.endswith('.mp3') and f[:-4] not in keep:
            os.remove(os.path.join(d, f))
    manifest(True)
    write_index()
    print('DONE', len(ready), 'of', len(lines), flush=True)


asyncio.run(main())

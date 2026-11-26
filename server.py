#!/usr/bin/env python3
"""Serves the game folder on port 4592. /status names the service, as the port registry asks.
/voice/status lists the narrator voices and how far each is rendered; /voice/render?v=ID starts a render."""
import http.server, json, os, subprocess, sys, urllib.parse

PORT = 4592
os.chdir(os.path.dirname(os.path.abspath(__file__)))
VOICES = json.load(open(os.path.join('tools', 'voices.json')))
RENDER = {'proc': None, 'voice': None}


def voice_status():
    out = []
    for v in VOICES:
        d = {'id': v['id'], 'label': v['label'], 'ready': 0, 'total': 0, 'done': False}
        try:
            j = json.load(open(os.path.join('assets', 'voice', v['id'], 'manifest.json')))
            d.update(ready=len(j['clips']), total=j['total'], done=bool(j['done']))
        except Exception:
            pass
        out.append(d)
    running = RENDER['voice'] if RENDER['proc'] and RENDER['proc'].poll() is None else None
    return {'service': 'under-fuji', 'pid': os.getpid(), 'voices': out, 'running': running}


def voice_render(v):
    if v not in [x['id'] for x in VOICES]:  # only the listed voices, never a free string
        return
    if RENDER['proc'] and RENDER['proc'].poll() is None:
        return
    log = open(os.path.join('tools', 'render_voice.log'), 'a')
    RENDER['proc'] = subprocess.Popen([sys.executable, os.path.join('tools', 'render_voice.py'), v], stdout=log, stderr=log)
    RENDER['voice'] = v


class H(http.server.SimpleHTTPRequestHandler):
    def send_json(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path in ('/status', '/healthz'):
            return self.send_json({'service': 'under-fuji', 'pid': os.getpid()})
        if u.path == '/voice/status':
            return self.send_json(voice_status())
        if u.path == '/voice/render':
            voice_render(urllib.parse.parse_qs(u.query).get('v', [''])[0])
            return self.send_json(voice_status())
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    try:
        srv = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), H)
    except OSError as e:
        sys.exit(f'port {PORT} is taken: {e}')
    print(f'Under Fuji: http://localhost:{PORT}', flush=True)
    srv.serve_forever()

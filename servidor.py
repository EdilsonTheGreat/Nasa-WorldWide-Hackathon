# Servidor local da app, sem internet.
#   python3 servidor.py            -> só neste computador: http://localhost:8000
#   python3 servidor.py --rede     -> também noutros aparelhos da mesma rede Wi-Fi, em https://<IP>:8443
# Noutros aparelhos tem de ser https: sem isso o browser bloqueia o microfone (voz) e a câmara.
# O certificado é feito aqui (autoassinado, pasta .cert/); na 1.ª vez o aparelho mostra um aviso:
# "Mostrar detalhes" / "Avançado" -> "visitar o site" e fica.
# Diz ao browser para NUNCA guardar cópias antigas dos ficheiros (Safari e Chrome guardavam o CSS/JS antigo).
import http.server, socketserver, sys, os, socket, ssl, subprocess
REDE = '--rede' in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith('--')]
PORTA = int(args[0]) if args else (8443 if REDE else 8000)
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class SemCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a):
        pass

def ip_local():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1)); return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()

def certificado(ip):
    pasta = '.cert'; crt, key = os.path.join(pasta, 'iris.crt'), os.path.join(pasta, 'iris.key')
    if not (os.path.exists(crt) and os.path.exists(key)):
        os.makedirs(pasta, exist_ok=True)
        subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '825',
                        '-keyout', key, '-out', crt, '-subj', '/CN=IRIS local',
                        '-addext', 'subjectAltName=IP:%s,IP:127.0.0.1,DNS:localhost' % ip],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return crt, key

socketserver.TCPServer.allow_reuse_address = True
if REDE:
    ip = ip_local()
    crt, key = certificado(ip)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); ctx.load_cert_chain(crt, key)
    with socketserver.ThreadingTCPServer(('0.0.0.0', PORTA), SemCache) as s:
        s.socket = ctx.wrap_socket(s.socket, server_side=True)
        print('IRIS na rede local (voz e câmara funcionam):')
        print('  neste computador: https://localhost:%d/app/visao/Main.html' % PORTA)
        print('  outros aparelhos: https://%s:%d/app/visao/Main.html' % (ip, PORTA))
        print('Na 1.ª vez o browser avisa do certificado: aceita e continua. Ctrl+C para parar.')
        s.serve_forever()
else:
    with socketserver.ThreadingTCPServer(('127.0.0.1', PORTA), SemCache) as s:
        print('Vision app: http://localhost:%d/app/visao/Main.html  (Ctrl+C to stop)' % PORTA)
        s.serve_forever()

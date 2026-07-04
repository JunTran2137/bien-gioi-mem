const { createServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
const next = require('next');
const { Server } = require('socket.io');
const { initSocketHandlers } = require('./lib/socket-server');
const { initDatabase } = require('./lib/db');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const httpsPort = parseInt(process.env.HTTPS_PORT || '3443', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

// Phones need HTTPS for camera access (getUserMedia only works in a secure
// context). We run an extra HTTPS listener alongside the normal HTTP one so the
// host PC can keep using http://localhost (Google login unaffected) while phones
// connect over https://<lan-ip>:3443 for the camera. Disable with USE_HTTPS=0.
const useHttps = process.env.USE_HTTPS !== '0' && process.env.USE_HTTPS !== 'false';

async function loadHttpsOptions() {
  const certDir = path.join(__dirname, 'certs');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  }
  // Generate a self-signed certificate. The browser will warn (self-signed),
  // but once accepted the page runs in a secure context so the camera works.
  const selfsigned = require('selfsigned');
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' }
  ];
  for (const ip of getLanIps()) altNames.push({ type: 7, ip });
  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: 'localhost' }],
    { days: 825, keySize: 2048, algorithm: 'sha256', extensions: [{ name: 'subjectAltName', altNames }] }
  );
  if (!pems || !pems.private || !pems.cert) {
    throw new Error('selfsigned returned no key/cert');
  }
  fs.mkdirSync(certDir, { recursive: true });
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
  console.log('> Generated self-signed certificate in ./certs');
  return { key: pems.private, cert: pems.cert };
}

function getLanIps() {
  const os = require('os');
  const ifaceMap = os.networkInterfaces();
  const isVirtual = (name) =>
    /vmware|virtualbox|vethernet|hyper-v|wsl|default switch|loopback|vmnet/i.test(name);
  const real = [];
  const others = [];
  for (const [name, ifaces] of Object.entries(ifaceMap)) {
    for (const i of ifaces || []) {
      if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) {
        (isVirtual(name) ? others : real).push({ name, addr: i.address });
      }
    }
  }
  // Wi-Fi first, then any real adapter, then virtual ones as a last resort.
  real.sort((a) => (/wi-?fi|wireless|wlan/i.test(a.name) ? -1 : 0));
  return [...real, ...others].map(c => c.addr);
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(async () => {
    initDatabase();

    const requestListener = (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      } catch (err) {
        console.error('[server] request error', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    };

    const httpServer = createServer(requestListener);

    const io = new Server(httpServer, {
      cors: { origin: '*' },
      path: '/socket.io'
    });
    global.io = io;
    initSocketHandlers(io);

    httpServer.listen(port, hostname, () => {
      const lan = getLanIps()[0];
      console.log(`> Ready on http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
      if (lan) console.log(`> LAN (HTTP):  http://${lan}:${port}`);
      console.log(`> Mode: ${dev ? 'development' : 'production'}`);
    });

    // Extra HTTPS listener for phone cameras (shares the same Socket.io).
    if (useHttps) {
      try {
        const httpsOptions = await loadHttpsOptions();
        const httpsServer = createHttpsServer(httpsOptions, requestListener);
        io.attach(httpsServer);
        httpsServer.listen(httpsPort, hostname, () => {
          const lan = getLanIps()[0];
          if (lan) console.log(`> LAN (HTTPS, camera điện thoại): https://${lan}:${httpsPort}`);
        });
      } catch (e) {
        console.warn('> HTTPS disabled (cert error):', e.message);
      }
    }
  })
  .catch(err => {
    console.error('[server] failed to start', err);
    process.exit(1);
  });


import { NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

function getLanIp(): string | null {
  const ifaceMap = os.networkInterfaces();
  // Virtual adapters (VMware/VirtualBox/WSL/Hyper-V) often share the 192.168.x
  // range but aren't the real Wi-Fi/LAN — skip them by interface name.
  const isVirtual = (name: string) =>
    /vmware|virtualbox|vethernet|hyper-v|wsl|default switch|loopback|vmnet/i.test(name);

  const candidates: { name: string; addr: string }[] = [];
  for (const [name, ifaces] of Object.entries(ifaceMap)) {
    for (const i of ifaces || []) {
      if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) {
        candidates.push({ name, addr: i.address });
      }
    }
  }
  const real = candidates.filter(c => !isVirtual(c.name));
  // Prefer a Wi-Fi/Wireless interface, then any real adapter, then anything.
  const wifi = real.find(c => /wi-?fi|wireless|wlan/i.test(c.name));
  if (wifi) return wifi.addr;
  if (real.length) return real[0].addr;
  return candidates.length ? candidates[0].addr : null;
}

export async function GET() {
  return NextResponse.json({
    lanIp: getLanIp(),
    httpPort: parseInt(process.env.PORT || '3000', 10),
    httpsPort: parseInt(process.env.HTTPS_PORT || '3443', 10),
    httpsEnabled: process.env.USE_HTTPS !== '0' && process.env.USE_HTTPS !== 'false'
  });
}

import os from "node:os";

const TUNNEL_INTERFACE_PATTERNS = [
  /^tun\d*$/i,
  /^tap\d*$/i,
  /^utun\d*$/i,
  /^wg\d*$/i,
  /(^|[-_.\s])(vpn|tun|tap|utun|wireguard|tailscale|zerotier|openvpn|sing|clash|outline|warp|ppp)($|[-_.\s\d])/i
];

export function detectEnvironment(networkInterfaces) {
  let interfaces = networkInterfaces;
  try {
    interfaces = interfaces || os.networkInterfaces();
  } catch {
    return {
      suspected_vpn_or_tunnel: false,
      warning_ru: null,
      warning: null
    };
  }
  const names = Object.keys(interfaces || {});
  const suspected = names.some((name) => TUNNEL_INTERFACE_PATTERNS.some((pattern) => pattern.test(name)));
  return {
    suspected_vpn_or_tunnel: suspected,
    warning_ru: suspected
      ? "Похоже, активен VPN/tun/proxy adapter. Отчёт может не отражать обычную сеть провайдера; детали интерфейсов не публикуются."
      : null,
    warning: suspected
      ? "A VPN/tun/proxy-like adapter appears to be active. The report may not represent the normal ISP path; interface details are not published."
      : null
  };
}

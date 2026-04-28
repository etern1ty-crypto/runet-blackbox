import { spawn } from "node:child_process";

export function buildIssueBody(report) {
  return `## Контекст / Context

- Я понимаю, что это публичный отчёт.
- Я не добавляю IP-адреса, точную локацию, cookies, headers, packet captures, private URLs или приватные логи.
- Если VPN/proxy/tun был включён, я явно укажу это в тексте issue и не буду выдавать отчёт за обычную сеть провайдера.
- Это не запрос инструкций по bypass/proxy/VPN.

English: this is a sanitized public measurement report, not a request for VPN/proxy/bypass instructions.

## Report JSON

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`
`;
}

export async function copyIssueBody(text) {
  const command = clipboardCommand(process.platform);
  if (!command) return false;
  try {
    await writeToCommand(command.file, command.args, text);
    return true;
  } catch {
    return false;
  }
}

function writeToCommand(file, args, text) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: ["pipe", "ignore", "ignore"], windowsHide: true });
    child.once("error", reject);
    child.once("close", (code) => (code === 0 ? resolve() : reject(new Error(`${file} exited with ${code}`))));
    child.stdin.end(text);
  });
}

function clipboardCommand(platform) {
  if (platform === "darwin") {
    return { file: "pbcopy", args: [] };
  }
  if (platform === "win32") {
    return { file: "clip.exe", args: [] };
  }
  return { file: "xclip", args: ["-selection", "clipboard"] };
}

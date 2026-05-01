import { spawn } from "node:child_process";
import { isReportBundle } from "./bundle.js";

export const GITHUB_NEW_ISSUE_URL = "https://github.com/etern1ty-crypto/runet-blackbox/issues/new";
export const ISSUE_URL_LENGTH_LIMIT = 7600;

export function buildIssueBody(payload) {
  const bundle = isReportBundle(payload);
  const jsonHeading = bundle ? "## Report JSON Bundle" : "## Report JSON";
  const json = JSON.stringify(payload, null, 2);
  return `## Контекст / Context

- Я понимаю, что это публичный отчёт.
- Я не добавляю IP-адреса, точную локацию, cookies, headers, packet captures, private URLs или приватные логи.
- Если VPN/proxy/tun был включён, я явно укажу это в тексте issue и не буду выдавать отчёт за обычную сеть провайдера.
- Это не запрос инструкций по bypass/proxy/VPN.
- ${bundle ? "Это batch-отчёт по pack; каждый вложенный отчёт уже очищен sanitizer." : "Это одиночный очищенный отчёт."}

English: this is a sanitized public measurement report, not a request for VPN/proxy/bypass instructions.

${jsonHeading}

\`\`\`json
${json}
\`\`\`
`;
}

export function buildIssueUrl(payload) {
  const params = new URLSearchParams({
    template: "measurement-report.yml",
    title: issueTitle(payload),
    labels: "measurement",
    report_json: JSON.stringify(payload, null, 2)
  });
  return `${GITHUB_NEW_ISSUE_URL}?${params.toString()}`;
}

export function issueUrlFits(url, limit = ISSUE_URL_LENGTH_LIMIT) {
  return Buffer.byteLength(url, "utf8") <= limit;
}

export async function copyIssueBody(text, platform = process.platform) {
  for (const command of clipboardCommands(platform)) {
    try {
      await writeToCommand(command.file, command.args, text);
      return true;
    } catch {
      // Try the next platform clipboard provider.
    }
  }
  return false;
}

export function clipboardCommands(platform = process.platform) {
  if (platform === "darwin") {
    return [{ file: "pbcopy", args: [] }];
  }
  if (platform === "win32") {
    return [{ file: "clip.exe", args: [] }];
  }
  return [
    { file: "wl-copy", args: [] },
    { file: "xclip", args: ["-selection", "clipboard"] },
    { file: "xsel", args: ["--clipboard", "--input"] }
  ];
}

export function clipboardCommandLabels(platform = process.platform) {
  return clipboardCommands(platform).map((command) => [command.file, ...command.args].join(" "));
}

function writeToCommand(file, args, text) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: ["pipe", "ignore", "ignore"], windowsHide: true });
    child.once("error", reject);
    child.once("close", (code) => (code === 0 ? resolve() : reject(new Error(`${file} exited with ${code}`))));
    child.stdin.end(text);
  });
}

function issueTitle(payload) {
  if (isReportBundle(payload)) {
    const packName = payload.pack?.name || "custom";
    return `[measurement] pack ${packName} (${payload.reports.length} targets)`;
  }
  const target = payload.target || "unknown target";
  const provider = payload.network?.provider || "unknown provider";
  const region = payload.region || "unknown region";
  return `[measurement] ${target} from ${provider}/${region}`;
}

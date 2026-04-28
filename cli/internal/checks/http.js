import http from "node:http";
import https from "node:https";
import { TOOL_VERSION } from "../../../src/constants.js";
import { sha256Hex, stableHash } from "../../../src/hash.js";
import { elapsedMs, errorMessage, statusFromNetworkError } from "./util.js";

const BLOCKPAGE_PATTERNS = [
  /access\s+denied/i,
  /blocked\s+by/i,
  /доступ\s+ограничен/i,
  /заблокирован/i,
  /роскомнадзор/i,
  /rkn/i
];

export function checkHttp(target, options = {}) {
  return requestWithRedirects(options.url || `https://${target}/`, options, 0);
}

function requestWithRedirects(url, options, depth) {
  const startedAt = performance.now();
  const timeoutMs = options.timeoutMs || 5000;
  const maxRedirects = options.maxRedirects ?? 5;
  const parsed = new URL(url);
  const client = parsed.protocol === "http:" ? http : https;

  return new Promise((resolve) => {
    const request = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        timeout: timeoutMs,
        rejectUnauthorized: false,
        headers: {
          "user-agent": `runet-blackbox/${options.toolVersion || TOOL_VERSION}`,
          accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5"
        }
      },
      (response) => {
        const chunks = [];
        let bytes = 0;
        response.on("data", (chunk) => {
          if (bytes < 65536) {
            chunks.push(chunk);
          }
          bytes += chunk.length;
        });
        response.on("end", async () => {
          const location = response.headers.location;
          if (isRedirect(response.statusCode) && location && depth < maxRedirects) {
            const nextUrl = new URL(location, url).toString();
            const redirected = await requestWithRedirects(nextUrl, options, depth + 1);
            resolve({
              ...redirected,
              redirect_count: Math.max(depth + 1, redirected.redirect_count || 0),
              redirect_cross_host: redirected.redirect_cross_host || new URL(nextUrl).hostname !== parsed.hostname
            });
            return;
          }

          const bodySample = Buffer.concat(chunks).subarray(0, 65536);
          const textSample = bodySample.toString("utf8");
          const blockpage = BLOCKPAGE_PATTERNS.some((pattern) => pattern.test(textSample));
          resolve({
            status: blockpage ? "blockpage_suspected" : "ok",
            latency_ms: elapsedMs(startedAt),
            status_code: response.statusCode,
            final_host: parsed.hostname,
            redirect_count: depth,
            redirect_cross_host: false,
            content_length: bytes,
            body_sha256: sha256Hex(bodySample),
            headers_hash: stableHash(publicHeaders(response.headers)),
            blockpage_suspected: blockpage
          });
        });
      }
    );

    request.once("timeout", () => {
      request.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }));
    });
    request.once("error", (error) => {
      resolve({ status: statusFromNetworkError(error), latency_ms: elapsedMs(startedAt), error: errorMessage(error) });
    });
    request.end();
  });
}

function isRedirect(statusCode) {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

function publicHeaders(headers) {
  const clean = {};
  for (const [key, value] of Object.entries(headers)) {
    if (["set-cookie", "cookie", "authorization", "proxy-authorization"].includes(key.toLowerCase())) {
      continue;
    }
    clean[key.toLowerCase()] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return clean;
}

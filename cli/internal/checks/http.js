import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import net from "node:net";
import { TOOL_VERSION } from "../../../src/constants.js";
import { sha256Hex } from "../../../src/hash.js";
import { assertMeasurementTarget, isPublicAddress } from "../../../src/target-policy.js";
import { checkDns } from "./dns.js";
import { elapsedMs, errorMessage, statusFromNetworkError, pinnedLookup, throwIfAborted, abortError } from "./util.js";

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const BLOCKPAGE_PATTERNS = [/доступ\s+(?:к\s+(?:данному\s+)?(?:сайту|ресурсу)\s+)?ограничен[\s\S]{0,120}роскомнадзор/i, /blocked\s+by\s+(?:your\s+)?(?:isp|internet service provider)/i];

/** Total deadline covers DNS, every redirect and reading at most 64 KiB. */
export async function checkHttp(target, options = {}) {
  throwIfAborted(options.signal);
  const startedAt = performance.now();
  const deadline = startedAt + (options.timeoutMs ?? 5000);
  const maxRedirects = options.maxRedirects ?? 3;
  const maxBytes = options.maxBodyBytes ?? 65536;
  let url;
  let redirects = 0;
  let crossHost = false;
  const visited = new Set();
  const pins = new Map();
  if (options.address) pins.set(target, { address: options.address, family: net.isIP(options.address) });
  try {
    url = new URL(options.url || "https://" + (net.isIP(target) === 6 ? `[${target}]` : target) + "/");
    while (true) {
      throwIfAborted(options.signal);
      if (performance.now() >= deadline) throw Object.assign(new Error("deadline"), { code: "ETIMEDOUT" });
      const hostname = safeUrl(url);
      if (visited.has(url.href)) return failure("unexpected_redirect", "ERR_REDIRECT_LOOP");
      visited.add(url.href);
      if (!pins.has(hostname)) {
        const resolved = await checkDns(hostname, { ...options, timeoutMs: Math.max(1, deadline - performance.now()) });
        if (resolved.status !== "ok") return failure(resolved.status === "suspicious_answer" ? "unexpected_redirect" : resolved.status, resolved.error || "ERR_REDIRECT_DNS");
        pins.set(hostname, resolved.addresses[0]);
      }
      const pin = pins.get(hostname);
      if (!pin || !isPublicAddress(pin.address)) return failure("unexpected_redirect", "ERR_UNSAFE_ADDRESS");
      const response = await requestOnce(url, hostname, pin, { ...options, timeoutMs: Math.max(1, deadline - performance.now()), maxBodyBytes: maxBytes });
      if (response.status !== "response") return { ...response, latency_ms: elapsedMs(startedAt), redirect_count: redirects, redirect_cross_host: crossHost };
      if (REDIRECTS.has(response.status_code)) {
        if (!response.location) return failure("unexpected_redirect", "ERR_REDIRECT_LOCATION");
        if (redirects >= maxRedirects) return failure("unexpected_redirect", "ERR_REDIRECT_LIMIT");
        const next = new URL(response.location, url);
        safeUrl(next);
        if (url.protocol === "https:" && next.protocol !== "https:") return failure("unexpected_redirect", "ERR_HTTPS_DOWNGRADE");
        crossHost ||= next.hostname !== url.hostname;
        redirects += 1;
        url = next;
        continue;
      }
      const body = response.body;
      const blockpage = /text\/html|text\/plain/i.test(response.contentType || "") && BLOCKPAGE_PATTERNS.some(pattern => pattern.test(body.toString("utf8")));
      const accepted = options.expectedStatusCodes
        ? options.expectedStatusCodes.includes(response.status_code)
        : response.status_code >= 200 && response.status_code < 300;
      return {
        ...(options.expectedStatusCodes ? { expected_status_codes: options.expectedStatusCodes } : {}),
        status: blockpage ? "blockpage_suspected" : accepted ? "ok" : "http_error",
        latency_ms: elapsedMs(startedAt), status_code: response.status_code,
        final_host: hostname, redirect_count: redirects, redirect_cross_host: crossHost,
        content_length: response.content_length, body_truncated: response.body_truncated,
        body_sha256: sha256Hex(body), blockpage_suspected: blockpage
      };
    }
  } catch (error) {
    if (error.code === "ABORT_ERR") throw error;
    return failure(error.code === "ERR_UNSAFE_URL" || error.exitCode === 64 || error.code === "ERR_INVALID_URL" ? "unexpected_redirect" : statusFromNetworkError(error), errorMessage(error));
  }

  function failure(status, error) {
    return { status, error, latency_ms: elapsedMs(startedAt), redirect_count: redirects, redirect_cross_host: crossHost };
  }
}

function safeUrl(url) {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port || url.href.length > 4096) {
    throw Object.assign(new Error("unsafe redirect"), { code: "ERR_UNSAFE_URL" });
  }
  url.hash = "";
  return assertMeasurementTarget(url.hostname.replace(/^\[|\]$/g, ""));
}

function requestOnce(url, hostname, pin, options) {
  return new Promise((resolve, reject) => {
    let request;
    let response;
    let settled = false;
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", aborted);
      response?.destroy();
      request?.destroy();
      if (error) reject(error); else resolve(value);
    };
    const onError = error => finish({ status: statusFromNetworkError(error), error: errorMessage(error) });
    const aborted = () => finish(null, abortError());
    const timer = setTimeout(() => finish({ status: "timeout", error: "ETIMEDOUT" }), options.timeoutMs);
    options.signal?.addEventListener("abort", aborted, { once: true });
    if (options.signal?.aborted) return aborted();
    try {
      const factory = options.request || (url.protocol === "http:" ? http.request : https.request);
      request = factory({
        protocol: url.protocol, hostname, port: url.protocol === "http:" ? 80 : 443,
        path: url.pathname + url.search, method: "GET", agent: false,
        lookup: pinnedLookup(pin.address, pin.family), family: pin.family,
        servername: net.isIP(hostname) ? undefined : hostname,
        rejectUnauthorized: true, minVersion: "TLSv1.2",
        checkServerIdentity: (_name, certificate) => tls.checkServerIdentity(hostname, certificate),
        ...(options.ca ? { ca: options.ca } : {}),
        maxHeaderSize: 16384,
        headers: { "user-agent": `runet-blackbox/${TOOL_VERSION}`, accept: "text/html,application/json;q=0.8,*/*;q=0.5", "accept-encoding": "identity" }
      }, incoming => {
        response = incoming;
        response.once("error", onError);
        response.once("aborted", () => onError({ code: "ERR_STREAM_PREMATURE_CLOSE" }));
        response.once("close", () => { if (!settled && !response.complete) onError({ code: "ERR_STREAM_PREMATURE_CLOSE" }); });
        if (REDIRECTS.has(response.statusCode)) {
          finish({ status: "response", status_code: response.statusCode, location: response.headers.location });
          return;
        }
        const chunks = [];
        let bytes = 0;
        const complete = truncated => finish({ status: "response", status_code: response.statusCode, body: Buffer.concat(chunks), content_length: bytes, body_truncated: truncated, contentType: response.headers["content-type"] });
        response.on("data", chunk => {
          if (settled) return;
          const remaining = options.maxBodyBytes - bytes;
          const sample = chunk.subarray(0, remaining);
          if (sample.length) chunks.push(sample);
          bytes += sample.length;
          if (bytes >= options.maxBodyBytes) complete(true);
        });
        response.once("end", () => complete(false));
      });
      request.once("error", onError);
      request.end();
    } catch (error) { onError(error); }
  });
}

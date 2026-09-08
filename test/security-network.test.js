import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import tls from "node:tls";
import net from "node:net";
import fs from "node:fs/promises";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { validateMeasurementTarget, isPublicAddress, assertRootTarget } from "../src/target-policy.js";
import { checkDns } from "../cli/internal/checks/dns.js";
import { checkHttp } from "../cli/internal/checks/http.js";
import { checkTls } from "../cli/internal/checks/tls.js";
import { checkTcp } from "../cli/internal/checks/tcp.js";
import { runCheck } from "../cli/internal/checks/run.js";
import { withTimeout } from "../cli/internal/checks/util.js";

const publicIP = "93.184.216.34";
for (const target of ["::ffff:127.0.0.1", "::ffff:7f00:1", "0:0:0:0:0:0:0:1", "64:ff9b::7f00:1", "2002:7f00:1::", "3fff::1", "bad_label.example", "ftp://example.com", "https://name:password@example.com/", "singlelabel", "127.1", "2130706433", "0x7f000001", "fe80::1%lo"]) {
  test(`security: refuses non-public or malformed target ${target}`, () => assert.equal(validateMeasurementTarget(target).valid, false));
}
for (const target of ["198.51.42.1", "203.0.114.1", "192.88.100.1", "2001:4860:4860:0:0:0:0:8888"]) {
  test(`security: does not overblock public subnet ${target}`, () => assert.equal(isPublicAddress(target), true));
}
for (const target of ["https://example.com/path", "https://example.com/?token=x", "http://example.com/", "https://example.com:8443/", "example.com/a"]) {
  test(`origin-only CLI rejects unsupported target form ${target}`, () => assert.throws(() => assertRootTarget(target), { exitCode: 64 }));
}

test("mixed public/private DNS answers block all transport probes", async () => {
  let connects = 0;
  const report = await runCheck("example.com", {
    lookup: async () => [{ address: publicIP }, { address: "127.0.0.1" }],
    connect: () => { connects++; throw new Error("must not connect"); }
  });
  assert.equal(connects, 0);
  assert.equal(report.diagnosis.category, "dns_suspicious_answer");
  assert.equal(report.results.tcp_443.status, "not_tested_due_to_dns_failure");
  assert.doesNotMatch(JSON.stringify(report), /127\.0\.0\.1|93\.184\.216\.34/);
});

test("resolved addresses remain in-memory only", async () => {
  const result = await checkDns("example.com", { lookup: async () => [{ address: publicIP }] });
  assert.equal(result.addresses[0].address, publicIP);
  assert.doesNotMatch(JSON.stringify(result), /93\.184\.216\.34/);
});

test("explicit DNS cancels active queries at the deadline", async () => {
  let cancelled = 0;
  const result = await checkDns("example.com", { dnsServer: "1.1.1.1", timeoutMs: 30, resolverFactory: () => ({
    setServers() {}, resolve4: () => new Promise(() => {}), resolve6: () => new Promise(() => {}), cancel: () => { cancelled++; }
  }) });
  assert.equal(result.status, "timeout");
  assert.ok(cancelled >= 1);
});

test("explicit DNS answers supply the actual TCP destination", async () => {
  const hosts = [];
  const report = await runCheck("example.com", { dnsServer: "1.1.1.1", resolverFactory: () => ({
    setServers() {}, resolve4: async () => [publicIP], resolve6: async () => [], cancel() {}
  }), connect: options => {
    hosts.push(options.host);
    const socket = new net.Socket();
    queueMicrotask(() => socket.emit("error", Object.assign(new Error("refused"), { code: "ECONNREFUSED" })));
    return socket;
  } });
  assert.deepEqual(hosts, [publicIP, publicIP]);
  assert.equal(report.results.dns.resolver, "explicit");
});

async function localHttp(t, handler) {
  const sockets = new Set();
  const server = http.createServer(handler);
  server.on("connection", socket => { sockets.add(socket); socket.once("close", () => sockets.delete(socket)); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  const port = server.address().port;
  let requests = 0;
  const request = (options, callback) => { requests++; return http.request({ ...options, protocol: "http:", hostname: "127.0.0.1", port, family: 4 }, callback); };
  return { options: { url: "http://example.com/", address: publicIP, request, timeoutMs: 250 }, requests: () => requests };
}

test("HTTP 503 is a failure, not a healthy transport response", async t => {
  const local = await localHttp(t, (_req, res) => { res.writeHead(503); res.end("maintenance"); });
  const result = await checkHttp("example.com", local.options);
  assert.equal(result.status, "http_error");
  assert.equal(result.status_code, 503);
});

test("HTTP status expectations can explicitly accept an authentication challenge", async t => {
  const local = await localHttp(t, (_req, res) => { res.writeHead(401); res.end(); });
  assert.equal((await checkHttp("example.com", local.options)).status, "http_error");
  const result = await checkHttp("example.com", { ...local.options, expectedStatusCodes: [401] });
  assert.equal(result.status, "ok");
  assert.deepEqual(result.expected_status_codes, [401]);
});

test("ordinary words do not trigger blockpage classification", async t => {
  const local = await localHttp(t, (_req, res) => { res.setHeader("content-type", "text/html"); res.end("darkness / rkn / access denied is discussed in this documentation"); });
  assert.equal((await checkHttp("example.com", local.options)).status, "ok");
});

for (const location of ["http://127.0.0.1/metadata", "http://[::ffff:127.0.0.1]/", "http://169.254.169.254/latest/", "http://192.168.0.1/", "file:///etc/passwd", "ftp://example.com/file", "https://user:pass@example.com/", "https://example.com:8080/", "http://["]) {
  test(`unsafe redirect is rejected without a second request: ${location}`, async t => {
    const local = await localHttp(t, (_req, res) => { res.writeHead(302, { location }); res.end(); });
    assert.equal((await checkHttp("example.com", local.options)).status, "unexpected_redirect");
    assert.equal(local.requests(), 1);
  });
}

test("HTTPS never downgrades to cleartext", async t => {
  const local = await localHttp(t, (_req, res) => { res.writeHead(302, { location: "http://example.com/plain" }); res.end(); });
  assert.equal((await checkHttp("example.com", { ...local.options, url: "https://example.com/" })).status, "unexpected_redirect");
  assert.equal(local.requests(), 1);
});

test("redirect hostname resolving privately is not dialled", async t => {
  const local = await localHttp(t, (_req, res) => { res.writeHead(302, { location: "http://other.example.com/" }); res.end(); });
  const result = await checkHttp("example.com", { ...local.options, lookup: async () => [{ address: "10.1.2.3" }] });
  assert.equal(result.status, "unexpected_redirect");
  assert.equal(local.requests(), 1);
});

test("same-host redirects reuse the vetted DNS address", async t => {
  const local = await localHttp(t, (req, res) => {
    if (req.url === "/") { res.writeHead(302, { location: "/final" }); res.end(); } else res.end("ok");
  });
  let lookups = 0;
  const seen = [];
  const result = await checkHttp("example.com", { ...local.options, address: undefined,
    lookup: async () => { lookups++; return [{ address: lookups === 1 ? publicIP : "127.0.0.1" }]; },
    request: (options, callback) => {
      options.lookup("example.com", {}, (_error, address) => seen.push(address));
      return local.options.request(options, callback);
    }
  });
  assert.equal(result.status, "ok");
  assert.equal(lookups, 1);
  assert.deepEqual(seen, [publicIP, publicIP]);
});

test("redirect loops and redirect budgets are failures", async t => {
  const local = await localHttp(t, (_req, res) => { res.writeHead(302, { location: "/" }); res.end(); });
  assert.equal((await checkHttp("example.com", local.options)).error, "ERR_REDIRECT_LOOP");
  assert.equal((await checkHttp("example.com", { ...local.options, maxRedirects: 0 })).error, "ERR_REDIRECT_LIMIT");
});

test("premature response close settles instead of hanging", async t => {
  const local = await localHttp(t, (_req, res) => {
    res.writeHead(200, { "content-length": "10000" }); res.write("incomplete"); setTimeout(() => res.destroy(), 10);
  });
  const result = await checkHttp("example.com", local.options);
  assert.equal(result.status, "reset");
});

test("slow-drip body cannot extend the absolute deadline", async t => {
  const local = await localHttp(t, (_req, res) => {
    res.writeHead(200); res.write("x");
    const timer = setInterval(() => res.write("x"), 5);
    res.once("close", () => clearInterval(timer));
  });
  const start = performance.now();
  const result = await checkHttp("example.com", { ...local.options, timeoutMs: 60 });
  assert.equal(result.status, "timeout");
  assert.ok(performance.now() - start < 1000);
});

test("large body is capped and reports truncation explicitly", async t => {
  const local = await localHttp(t, (_req, res) => res.end(Buffer.alloc(200000, 65)));
  const result = await checkHttp("example.com", { ...local.options, maxBodyBytes: 1024 });
  assert.equal(result.status, "ok");
  assert.equal(result.content_length, 1024);
  assert.equal(result.body_truncated, true);
  assert.match(result.body_sha256, /^[a-f0-9]{64}$/);
});

test("cancellation destroys an active HTTP request", async t => {
  const local = await localHttp(t, (_req, res) => { res.writeHead(200); res.write("waiting"); });
  const controller = new AbortController();
  const promise = checkHttp("example.com", { ...local.options, signal: controller.signal });
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(promise, { code: "ABORT_ERR" });
});

test("pre-aborted probes do not begin work", async () => {
  const signal = AbortSignal.abort();
  await assert.rejects(checkDns("example.com", { signal }), { code: "ABORT_ERR" });
  assert.throws(() => checkTcp(publicIP, 443, { signal }), { code: "ABORT_ERR" });
  assert.throws(() => checkTls("example.com", { signal }), { code: "ABORT_ERR" });
});

test("a throwing cleanup callback cannot prevent a deadline from settling", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 10, () => { throw new Error("cleanup failed"); }), { code: "ETIMEDOUT" });
});

const key = await fs.readFile(new URL("./fixtures/tls/key.pem", import.meta.url));
const cert = await fs.readFile(new URL("./fixtures/tls/cert.pem", import.meta.url));
const expired = await fs.readFile(new URL("./fixtures/tls/expired.pem", import.meta.url));
async function tlsServer(t, certificate = cert) {
  const sockets = new Set();
  const server = tls.createServer({ key, cert: certificate });
  server.on("connection", socket => { sockets.add(socket); socket.once("close", () => sockets.delete(socket)); });
  server.on("tlsClientError", () => {});
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  return { address: "127.0.0.1", port: server.address().port, timeoutMs: 1000 };
}

test("TLS self-signed certificates are rejected by default", async t => {
  const options = await tlsServer(t);
  const result = await checkTls("example.com", options);
  assert.equal(result.status, "certificate_error");
  assert.equal(result.authorized, false);
});

test("TLS accepts a trusted, matching certificate and publishes no certificate identity", async t => {
  const options = await tlsServer(t);
  const result = await checkTls("example.com", { ...options, ca: cert });
  assert.equal(result.status, "ok");
  assert.equal(result.authorized, true);
  assert.equal(result.certificate_subject, undefined);
});

test("TLS verifies hostname even with an explicitly trusted CA", async t => {
  const options = await tlsServer(t);
  const result = await checkTls("other.example.com", { ...options, ca: cert });
  assert.equal(result.status, "certificate_mismatch");
});

test("TLS rejects an expired certificate", async t => {
  const options = await tlsServer(t, expired);
  const result = await checkTls("example.com", { ...options, ca: expired });
  assert.equal(result.status, "certificate_error");
});

test("TCP and TLS have wall-clock deadlines and close silent sockets", async t => {
  const server = net.createServer();
  const sockets = new Set();
  server.on("connection", socket => { sockets.add(socket); socket.once("close", () => sockets.delete(socket)); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  const result = await checkTls("example.com", { address: "127.0.0.1", port: server.address().port, timeoutMs: 30 });
  assert.equal(result.status, "timeout");
  const socket = new net.Socket();
  const tcp = await checkTcp(publicIP, 443, { connect: () => socket, timeoutMs: 20 });
  assert.equal(tcp.status, "timeout");
  assert.equal(socket.destroyed, true);
  await delay(5);
});

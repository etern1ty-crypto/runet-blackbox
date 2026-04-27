import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { checkDns } from "../cli/internal/checks/dns.js";
import { checkHttp } from "../cli/internal/checks/http.js";
import { checkTcp } from "../cli/internal/checks/tcp.js";

const canUseLocalNetwork = await canListen();

test("checkDns resolves localhost", { skip: !canUseLocalNetwork && "sandbox blocks local networking" }, async () => {
  const result = await checkDns("localhost", { timeoutMs: 1000 });
  assert.equal(result.status, "ok");
  assert.ok(result.addresses_count >= 1);
});

test("checkTcp connects to local server", { skip: !canUseLocalNetwork && "sandbox blocks local networking" }, async () => {
  const server = net.createServer((socket) => socket.end());
  await listen(server);
  const { port } = server.address();
  const result = await checkTcp("127.0.0.1", port, { timeoutMs: 1000 });
  server.close();
  assert.equal(result.status, "ok");
  assert.equal(result.port, port);
});

test("checkTcp reports refused local port", { skip: !canUseLocalNetwork && "sandbox blocks local networking" }, async () => {
  const server = net.createServer();
  await listen(server);
  const { port } = server.address();
  await close(server);
  const result = await checkTcp("127.0.0.1", port, { timeoutMs: 1000 });
  assert.equal(result.status, "connection_refused");
});

test("checkHttp reads local HTTP response", { skip: !canUseLocalNetwork && "sandbox blocks local networking" }, async () => {
  const server = http.createServer((_, response) => response.end("hello"));
  await listen(server);
  const { port } = server.address();
  const result = await checkHttp("127.0.0.1", { url: `http://127.0.0.1:${port}/`, timeoutMs: 1000 });
  await close(server);
  assert.equal(result.status, "ok");
  assert.equal(result.status_code, 200);
  assert.equal(result.content_length, 5);
});

test("checkHttp detects blockpage text", { skip: !canUseLocalNetwork && "sandbox blocks local networking" }, async () => {
  const server = http.createServer((_, response) => response.end("Доступ ограничен Роскомнадзор"));
  await listen(server);
  const { port } = server.address();
  const result = await checkHttp("127.0.0.1", { url: `http://127.0.0.1:${port}/`, timeoutMs: 1000 });
  await close(server);
  assert.equal(result.status, "blockpage_suspected");
  assert.equal(result.blockpage_suspected, true);
});

test("checkHttp follows redirect", { skip: !canUseLocalNetwork && "sandbox blocks local networking" }, async () => {
  const server = http.createServer((request, response) => {
    if (request.url === "/") {
      response.writeHead(302, { location: "/final" });
      response.end();
      return;
    }
    response.end("final");
  });
  await listen(server);
  const { port } = server.address();
  const result = await checkHttp("127.0.0.1", { url: `http://127.0.0.1:${port}/`, timeoutMs: 1000 });
  await close(server);
  assert.equal(result.status, "ok");
  assert.equal(result.redirect_count, 1);
  assert.equal(result.redirect_chain.length, 1);
});

function listen(server) {
  return new Promise((resolve, reject) => {
    function onError(error) {
      server.off("listening", onListening);
      reject(error);
    }
    function onListening() {
      server.off("error", onError);
      resolve();
    }
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(0, "127.0.0.1");
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function canListen() {
  const server = net.createServer();
  try {
    await listen(server);
    await close(server);
    return true;
  } catch {
    return false;
  }
}

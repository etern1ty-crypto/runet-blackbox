import test from "node:test";
import assert from "node:assert/strict";
import { detectEnvironment } from "../cli/internal/environment.js";

test("detectEnvironment marks VPN-like interface names", () => {
  const result = detectEnvironment({
    Ethernet: [],
    tun0: []
  });
  assert.equal(result.suspected_vpn_or_tunnel, true);
  assert.match(result.warning_ru, /VPN\/tun/);
});

test("detectEnvironment does not expose interface details", () => {
  const result = detectEnvironment({
    "secret-wireguard-prod": []
  });
  assert.deepEqual(Object.keys(result).sort(), ["suspected_vpn_or_tunnel", "warning", "warning_ru"].sort());
  assert.equal(JSON.stringify(result).includes("secret-wireguard-prod"), false);
});

test("detectEnvironment ignores ordinary interface names", () => {
  const result = detectEnvironment({
    Ethernet: [],
    "Wi-Fi": []
  });
  assert.equal(result.suspected_vpn_or_tunnel, false);
  assert.equal(result.warning_ru, null);
});

test("detectEnvironment is non-fatal when OS interfaces are unavailable", () => {
  const result = detectEnvironment(null);
  assert.equal(typeof result.suspected_vpn_or_tunnel, "boolean");
});

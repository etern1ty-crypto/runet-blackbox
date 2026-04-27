import test from "node:test";
import assert from "node:assert/strict";
import { assertMeasurementTarget, validateMeasurementTarget } from "../src/target-policy.js";

const accepted = [
  "github.com",
  "пример.рф",
  "8.8.8.8",
  "1.1.1.1",
  "2001:4860:4860::8888"
];

for (const target of accepted) {
  test(`validateMeasurementTarget accepts ${target}`, () => {
    assert.equal(validateMeasurementTarget(target).valid, true);
  });
}

const rejected = [
  "localhost",
  "router.local",
  "service.internal",
  "example.test",
  "10.0.0.1",
  "127.0.0.1",
  "172.16.0.1",
  "192.168.1.1",
  "169.254.1.1",
  "198.18.0.1",
  "198.51.100.1",
  "203.0.113.1",
  "::1",
  "fc00::1",
  "fe80::1",
  "2001:db8::1"
];

for (const target of rejected) {
  test(`validateMeasurementTarget rejects ${target}`, () => {
    const validation = validateMeasurementTarget(target);
    assert.equal(validation.valid, false);
    assert.ok(validation.reason);
  });
}

test("assertMeasurementTarget attaches usage exit code", () => {
  assert.throws(
    () => assertMeasurementTarget("localhost"),
    (error) => error.exitCode === 64 && /unsafe measurement target/.test(error.message)
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { sha256Hex, stableHash, stableJson } from "../src/hash.js";
import { reportDay, roundTimestampUtc, toIsoTimestamp } from "../src/time.js";

test("toIsoTimestamp accepts Date", () => {
  assert.equal(toIsoTimestamp(new Date("2026-04-27T12:00:00Z")), "2026-04-27T12:00:00.000Z");
});

test("toIsoTimestamp rejects invalid dates", () => {
  assert.throws(() => toIsoTimestamp("nope"));
});

const roundCases = [
  ["2026-04-27T12:00:00Z", "2026-04-27T12:00:00.000Z"],
  ["2026-04-27T12:14:59Z", "2026-04-27T12:00:00.000Z"],
  ["2026-04-27T12:15:00Z", "2026-04-27T12:15:00.000Z"],
  ["2026-04-27T12:29:59Z", "2026-04-27T12:15:00.000Z"],
  ["2026-04-27T12:44:01Z", "2026-04-27T12:30:00.000Z"],
  ["2026-04-27T12:59:59Z", "2026-04-27T12:45:00.000Z"]
];

for (const [input, expected] of roundCases) {
  test(`roundTimestampUtc ${input}`, () => {
    assert.equal(roundTimestampUtc(input), expected);
  });
}

test("roundTimestampUtc rejects invalid timestamp", () => {
  assert.throws(() => roundTimestampUtc("invalid"));
});

test("reportDay returns yyyy-mm-dd", () => {
  assert.equal(reportDay("2026-04-27T23:59:59Z"), "2026-04-27");
});

test("sha256Hex returns stable hash", () => {
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("stableJson sorts object keys", () => {
  assert.equal(stableJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
});

test("stableJson handles arrays", () => {
  assert.equal(stableJson([{ b: 2, a: 1 }]), '[{"a":1,"b":2}]');
});

test("stableHash ignores object key order", () => {
  assert.equal(stableHash({ a: 1, b: 2 }), stableHash({ b: 2, a: 1 }));
});

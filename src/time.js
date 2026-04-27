import { PUBLIC_TIME_BUCKET_MINUTES } from "./constants.js";

export function toIsoTimestamp(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    throw new Error("invalid timestamp");
  }
  return value.toISOString();
}

export function roundTimestampUtc(timestamp, bucketMinutes = PUBLIC_TIME_BUCKET_MINUTES) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error("invalid timestamp");
  }
  const bucketMs = bucketMinutes * 60 * 1000;
  return new Date(Math.floor(date.getTime() / bucketMs) * bucketMs).toISOString();
}

export function reportDay(timestamp) {
  return roundTimestampUtc(timestamp, 15).slice(0, 10);
}

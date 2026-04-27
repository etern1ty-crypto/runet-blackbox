import { stripBom } from "./files.mjs";

export function extractReportJson(body) {
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = stripBom(fenced ? fenced[1] : body);
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("issue body does not contain a JSON object");
  }
  return JSON.parse(stripBom(candidate.slice(start, end + 1)));
}

export function extractReportJson(body) {
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : body;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("issue body does not contain a JSON object");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

import { throwIfAborted } from "./checks/util.js";

/** Bounded worker pool, stable input order, no detached promises on failure. */
export async function runBatch(targets, options, runCheck, onProgress = () => {}) {
  const controller = new AbortController();
  const forward = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", forward, { once: true });
  const reports = new Array(targets.length);
  let cursor = 0;
  let firstError;
  const worker = async () => {
    while (cursor < targets.length && !firstError) {
      const index = cursor++;
      try {
        throwIfAborted(controller.signal);
        const entry = targets[index];
        onProgress({ event: "probe_started", target: entry.target, index: index + 1, total: targets.length });
        reports[index] = await runCheck(entry.target, { ...options, ...entry, signal: controller.signal });
        onProgress({ event: "probe_completed", target: entry.target, category: reports[index].diagnosis.category });
      } catch (error) {
        firstError ||= error;
        controller.abort();
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(options.concurrency, targets.length) }, worker));
    if (firstError) throw firstError;
    throwIfAborted(controller.signal);
    return reports;
  } finally { options.signal?.removeEventListener("abort", forward); }
}

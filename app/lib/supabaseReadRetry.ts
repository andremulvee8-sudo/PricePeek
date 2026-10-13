type SupabaseReadResult = {
  error: unknown;
};

type RetryOptions = {
  delaysMs?: readonly number[];
  sleep?: (delayMs: number) => Promise<void>;
};

const DEFAULT_RETRY_DELAYS_MS = [250, 750] as const;

function readErrorField(error: unknown, field: "code" | "message") {
  if (!error || typeof error !== "object") return null;

  const value = Reflect.get(error, field);
  return typeof value === "string" ? value : null;
}

export function isTransientSupabaseJwtTimingError(error: unknown) {
  return (
    readErrorField(error, "code") === "PGRST303" &&
    readErrorField(error, "message")?.toLowerCase().includes("jwt issued at future") === true
  );
}

export async function withTransientSupabaseReadRetry<T extends SupabaseReadResult>(
  operation: () => PromiseLike<T>,
  options: RetryOptions = {}
) {
  const delaysMs = options.delaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const sleep =
    options.sleep ??
    ((delayMs: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, delayMs);
      }));

  for (let attempt = 0; ; attempt += 1) {
    const result = await operation();

    if (
      !isTransientSupabaseJwtTimingError(result.error) ||
      attempt >= delaysMs.length
    ) {
      return result;
    }

    await sleep(delaysMs[attempt]);
  }
}

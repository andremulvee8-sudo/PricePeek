export const FEEDBACK_CATEGORIES = [
  "bug",
  "idea",
  "confusing",
  "other",
] as const;

export const FEEDBACK_AREAS = [
  "tracking",
  "prices",
  "notifications",
  "installation",
  "account",
  "billing",
  "other",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];

export type ValidatedFeedback = {
  category: FeedbackCategory;
  area: FeedbackArea;
  message: string;
};

export type FeedbackValidationResult =
  | { ok: true; feedback: ValidatedFeedback }
  | { ok: false; error: string };

const MIN_MESSAGE_LENGTH = 20;
export const MAX_FEEDBACK_MESSAGE_LENGTH = 1_200;

function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return (
    typeof value === "string" &&
    FEEDBACK_CATEGORIES.includes(value as FeedbackCategory)
  );
}

function isFeedbackArea(value: unknown): value is FeedbackArea {
  return (
    typeof value === "string" &&
    FEEDBACK_AREAS.includes(value as FeedbackArea)
  );
}

function passesLuhnCheck(value: string) {
  let sum = 0;
  let doubleDigit = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);

    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return sum % 10 === 0;
}

function containsPaymentCardNumber(message: string) {
  const candidates = message.match(/(?:\d[ -]?){13,19}/g) ?? [];

  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19 && passesLuhnCheck(digits);
  });
}

export function containsSensitiveFeedbackContent(message: string) {
  const containsEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(
    message
  );
  const containsUrl = /(?:https?:\/\/|www\.)\S+/i.test(message);
  const containsSecret =
    /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_]+\b|\bwhsec_[A-Za-z0-9_]+\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(
      message
    );
  const containsJwt =
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(
      message
    );

  return (
    containsEmail ||
    containsUrl ||
    containsSecret ||
    containsJwt ||
    containsPaymentCardNumber(message)
  );
}

export function validateFeedback(input: Record<string, unknown>): FeedbackValidationResult {
  if (!isFeedbackCategory(input.category) || !isFeedbackArea(input.area)) {
    return { ok: false, error: "Choose a valid feedback type and area." };
  }

  if (typeof input.message !== "string") {
    return { ok: false, error: "Enter your feedback." };
  }

  const message = input.message.replace(/\r\n?/g, "\n").trim();

  if (message.length < MIN_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Please enter at least ${MIN_MESSAGE_LENGTH} characters.`,
    };
  }

  if (message.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Keep feedback under ${MAX_FEEDBACK_MESSAGE_LENGTH.toLocaleString()} characters.`,
    };
  }

  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(message)) {
    return { ok: false, error: "Feedback contains unsupported characters." };
  }

  if (containsSensitiveFeedbackContent(message)) {
    return {
      ok: false,
      error:
        "Remove email addresses, links, payment-card numbers, and secret values before sending.",
    };
  }

  return {
    ok: true,
    feedback: {
      category: input.category,
      area: input.area,
      message,
    },
  };
}

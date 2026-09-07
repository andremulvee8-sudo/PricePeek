export const MAGIC_LINK_COOLDOWN_MS = 60_000;

export function getRemainingMagicLinkCooldownSeconds(
  sentAt: number | null,
  now = Date.now()
) {
  if (sentAt == null || !Number.isFinite(sentAt)) return 0;

  return Math.max(0, Math.ceil((sentAt + MAGIC_LINK_COOLDOWN_MS - now) / 1000));
}

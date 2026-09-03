export function isAccountDeletionConfirmed(
  accountEmail: string | null | undefined,
  confirmationEmail: unknown
) {
  if (!accountEmail || typeof confirmationEmail !== "string") return false;

  return accountEmail.trim().toLowerCase() === confirmationEmail.trim().toLowerCase();
}

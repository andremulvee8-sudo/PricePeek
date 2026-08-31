export type RequestOwner =
  | { kind: "user"; userId: string }
  | { kind: "device"; deviceId: string };

export function getBearerToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function getOwnerColumn(owner: RequestOwner) {
  return owner.kind === "user"
    ? { column: "owner_user_id" as const, value: owner.userId }
    : { column: "device_id" as const, value: owner.deviceId };
}

export function shouldMergeClaimedProduct(
  existingUserProductId: string | null
) {
  return existingUserProductId !== null;
}

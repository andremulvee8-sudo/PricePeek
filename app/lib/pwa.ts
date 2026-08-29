export type InstallExperience = "hidden" | "browser-prompt" | "ios-help";

export function isAppleMobileDevice(
  userAgent: string,
  platform = "",
  maxTouchPoints = 0
) {
  return (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

export function isStandaloneDisplay(
  displayModeStandalone: boolean,
  navigatorStandalone = false
) {
  return displayModeStandalone || navigatorStandalone;
}

export function getInstallExperience({
  standalone,
  isAppleMobile,
  canPrompt,
}: {
  standalone: boolean;
  isAppleMobile: boolean;
  canPrompt: boolean;
}): InstallExperience {
  if (standalone) return "hidden";
  if (canPrompt) return "browser-prompt";
  if (isAppleMobile) return "ios-help";
  return "hidden";
}

export function isSafeShellRequest(pathname: string) {
  return (
    pathname.startsWith("/_next/static/") ||
    [
      "/",
      "/offline",
      "/manifest.webmanifest",
      "/icon-192x192.png",
      "/icon-512x512.png",
      "/icon-maskable-512x512.png",
      "/apple-touch-icon.png",
      "/notification-badge-96x96.png",
    ].includes(pathname)
  );
}

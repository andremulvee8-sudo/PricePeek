export function getOrCreateDeviceId() {
  let deviceId = window.localStorage.getItem("pricepeek-device-id");

  if (!deviceId) {
    deviceId = window.crypto.randomUUID();
    window.localStorage.setItem("pricepeek-device-id", deviceId);
  }

  return deviceId;
}

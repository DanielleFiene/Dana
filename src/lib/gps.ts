import { isFiniteCoord } from "@/lib/geo";

/** Already-granted GPS only. Must not prompt on first visit. Works outside Spain. */
export async function gpsIfAlreadyGranted(): Promise<{ lat: number; lon: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  try {
    const perms = navigator.permissions;
    if (!perms?.query) return null;
    const st = await perms.query({ name: "geolocation" });
    if (st.state !== "granted") return null;
  } catch {
    return null;
  }
  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        resolve(isFiniteCoord(lat, lon) ? { lat, lon } : null);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 180_000 },
    );
  });
}

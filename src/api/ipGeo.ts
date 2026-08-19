import { getJson } from "@/api/http";
import { isFiniteCoord } from "@/lib/geo";
import { z } from "zod";

const geoJsSchema = z.object({
  latitude: z.union([z.string(), z.number()]),
  longitude: z.union([z.string(), z.number()]),
  country_code: z.string().optional(),
  city: z.string().optional(),
});

const ipWhoSchema = z.object({
  success: z.boolean().optional(),
  latitude: z.number(),
  longitude: z.number(),
  country_code: z.string().optional(),
  city: z.string().optional(),
});

export type IpFix = {
  lat: number;
  lon: number;
  city: string;
  country: string;
};

function pack(lat: number, lon: number, city: string, country: string): IpFix | null {
  if (!isFiniteCoord(lat, lon)) return null;
  return { lat, lon, city: city.trim(), country: country.trim().toUpperCase() };
}

async function fromGeoJs(): Promise<IpFix | null> {
  const raw = await getJson(new URL("https://get.geojs.io/v1/ip/geo.json"), 4000);
  const parsed = geoJsSchema.safeParse(raw);
  if (!parsed.success) return null;
  return pack(
    Number(parsed.data.latitude),
    Number(parsed.data.longitude),
    parsed.data.city ?? "",
    parsed.data.country_code ?? "",
  );
}

async function fromIpWho(): Promise<IpFix | null> {
  const raw = await getJson(new URL("https://ipwho.is/"), 4000);
  const parsed = ipWhoSchema.safeParse(raw);
  if (!parsed.success || parsed.data.success === false) return null;
  return pack(parsed.data.latitude, parsed.data.longitude, parsed.data.city ?? "", parsed.data.country_code ?? "");
}

/** Browser IP geolocation. No permission prompt. Best-effort. */
export async function lookupIpFix(): Promise<IpFix | null> {
  try {
    return (await fromGeoJs()) ?? (await fromIpWho());
  } catch {
    try {
      return await fromIpWho();
    } catch {
      return null;
    }
  }
}

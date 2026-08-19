import { z } from "zod";

const numNull = z.union([z.number(), z.null()]);
const numNullArr = z.array(numNull);

export const forecastSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: numNullArr,
    dew_point_2m: numNullArr,
    relative_humidity_2m: numNullArr,
    precipitation: numNullArr,
    precipitation_probability: numNullArr,
    cape: numNullArr,
    lifted_index: numNullArr,
    convective_inhibition: numNullArr,
    temperature_850hPa: numNullArr,
    relative_humidity_850hPa: numNullArr,
    dew_point_850hPa: numNullArr,
    temperature_500hPa: numNullArr,
    geopotential_height_500hPa: numNullArr,
    wind_speed_10m: numNullArr,
    wind_direction_10m: numNullArr,
    wind_gusts_10m: numNullArr,
    wind_speed_850hPa: numNullArr,
    wind_direction_850hPa: numNullArr,
    wind_speed_700hPa: numNullArr,
    soil_moisture_0_to_7cm: numNullArr,
    weather_code: numNullArr,
    total_column_integrated_water_vapour: numNullArr,
  }),
});

export const marineSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    sea_surface_temperature: numNullArr,
  }),
});

export const geocodeSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
        admin2: z.string().optional(),
      }),
    )
    .optional(),
});

export const patternSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    temperature_500hPa: numNullArr,
    geopotential_height_500hPa: numNullArr,
  }),
});

export type ForecastJson = z.infer<typeof forecastSchema>;
export type MarineJson = z.infer<typeof marineSchema>;
export type GeocodeJson = z.infer<typeof geocodeSchema>;
export type PatternJson = z.infer<typeof patternSchema>;

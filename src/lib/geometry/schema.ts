import { z } from "zod";
import { LOCAL_CRS, type LocalMultiPolygon, type LocalPolygon } from "./types";

/**
 * YEREL METRİK GEOMETRİNİN ZOD ŞEMASI.
 *
 * `Parcel.geometry` ve `ZoningData.buildableEnvelope` Json kolonlarıdır.
 * Şekil GeoJSON'a benzer ama koordinatlar YEREL METRİKTİR — bu yüzden
 * `crs: "local-metric"` ayracı ZORUNLUDUR: bir haritalama kütüphanesine
 * WGS84 sanılarak beslenmesi sessizce yanlış sonuç verirdi.
 */

const pointSchema = z.tuple([z.number().finite(), z.number().finite()]);

/** Kapalı halka: en az 3 köşe + kapanış noktası. */
const ringSchema = z.array(pointSchema).min(4);

export const localPolygonSchema = z.object({
  crs: z.literal(LOCAL_CRS),
  type: z.literal("Polygon"),
  coordinates: z.array(ringSchema).min(1),
});

export const localMultiPolygonSchema = z.object({
  crs: z.literal(LOCAL_CRS),
  type: z.literal("MultiPolygon"),
  // Boş MultiPolygon GEÇERLİDİR: öteleme parseli yok etmiş olabilir.
  coordinates: z.array(z.array(ringSchema).min(1)),
});

/** Json kolonundan güvenli okuma. Bozuk veri null döner, patlamaz. */
export function parseLocalPolygon(value: unknown): LocalPolygon | null {
  const parsed = localPolygonSchema.safeParse(value);
  return parsed.success ? (parsed.data as LocalPolygon) : null;
}

export function parseLocalMultiPolygon(value: unknown): LocalMultiPolygon | null {
  const parsed = localMultiPolygonSchema.safeParse(value);
  return parsed.success ? (parsed.data as LocalMultiPolygon) : null;
}

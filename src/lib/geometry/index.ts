/**
 * GEOMETRİ MODÜLÜ — genel arayüz.
 *
 * SAF TypeScript: Prisma, Next veya veritabanı bağımlılığı YOK.
 * Sunucu ve tarayıcı AYNI dosyaları kullanır (kullanıcı kararı: tek uygulama).
 *
 * Koordinatlar YEREL METRİKTİR: origin parselin ağırlık merkezi, birim metre.
 * Enlem/boylamda alan veya öteleme hesabı yapılmaz.
 *
 * Bu dosya proj4 ve XML ayrıştırıcı İÇERMEZ — onlar `projection.ts` ve
 * `import/kml.ts` içinde, yalnızca sunucuda yüklenir. Tarayıcıya giden
 * çekirdek ≈ 49 KB gzip.
 */

export type {
  EdgeRole,
  EdgeSetback,
  GeometryResult,
  GeometryWarning,
  JoinType,
  LocalMultiPolygon,
  LocalPoint,
  LocalPolygon,
  LocalRing,
} from "./types";

export {
  EMPTY_MULTI_POLYGON,
  LOCAL_CRS,
  isEmpty,
  multiPolygon,
  polygon,
} from "./types";

export {
  edgeAt,
  edgeCount,
  isCounterClockwise,
  isSelfIntersecting,
  multiPolygonArea,
  normalizeRing,
  orientRing,
  partCount,
  polygonArea,
  polygonPerimeter,
  ringArea,
  ringCentroid,
  ringPerimeter,
  signedRingArea,
  vertexCount,
} from "./measure";

export { MITER_LIMIT, SCALE, booleanOp, simplifyPolygon } from "./clipper";

export { offsetByEdge, offsetUniform, type EdgeOffsetInput } from "./offset";

export {
  localToWgs84,
  ringFromProjectedGrid,
  ringFromWgs84,
  wgs84ToLocal,
  type LocalFrame,
} from "./frame";

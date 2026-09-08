/**
 * TÜRKÇE ARAYÜZ METİNLERİ.
 *
 * KONVANSİYON: kodda gömülü Türkçe metin YOKTUR. Arayüzde görünen her dize
 * bu katmandan gelir. Kod ve şema tanımlayıcıları İngilizcedir.
 *
 * Enum değerleri (yeniYapi, kentselDonusum, salon, mutfak…) TANIMLAYICIDIR,
 * metin değil — dokümanın sabitlediği kimliklerdir ve çevrilmez. Kullanıcıya
 * gösterilecek karşılıkları aşağıdaki sözlüklerdedir.
 */

export const tr = {
  app: {
    name: "Datum",
    tagline: "Etüt ve fizibilite",
  },

  project: {
    title: "Projeler",
    empty: "Henüz proje yok.",
    new: "Yeni proje",
    create: "Oluştur",
    save: "Kaydet",
    delete: "Sil",
    fields: {
      name: "Proje adı",
      projectType: "Proje tipi",
      status: "Durum",
      tier: "Kademe",
      regionPackageVersion: "Bölge paketi sürümü",
      currency: "Para birimi",
      priceReferenceDate: "Fiyat referans tarihi",
      notes: "Notlar",
    },
    unbound: "Pakete bağlı değil",
    bind: "Bölge paketine bağla",
    bound: "Sürüm donduruldu",
  },

  tier: {
    K1: "K1 — Ön eleme",
    K2: "K2 — Ön etüt",
    K3: "K3 — Detaylı etüt",
  } as const,

  projectType: {
    yeniYapi: "Yeni yapı",
    kentselDonusum: "Kentsel dönüşüm",
    ilaveKat: "İlave kat",
    guclendirme: "Güçlendirme",
  } as const,

  projectStatus: {
    taslak: "Taslak",
    onEleme: "Ön eleme",
    onEtut: "Ön etüt",
    detayliEtut: "Detaylı etüt",
    teklifVerildi: "Teklif verildi",
    sozlesme: "Sözleşme",
    iptal: "İptal",
  } as const,

  regionPackage: {
    status: {
      draft: "Taslak",
      published: "Yayımlandı",
      deprecated: "Kullanımdan kaldırıldı",
    },
    emptyContent: "Kural içeriği boş — pilot bölge paketi henüz doldurulmadı.",
  },

  override: {
    marker: "Ezildi",
    reason: "Ezme gerekçesi",
    computed: "Hesaplanan",
    overridden: "Kullanıcının yazdığı",
  },

  errors: {
    DATUM_NOT_FOUND: "Kayıt bulunamadı.",
    DATUM_SET_ONCE: "Dondurulmuş sürüm doğrudan değiştirilemez.",
    DATUM_NOT_PUBLISHED: "Yalnızca yayımlanmış bir sürüme bağlanılabilir.",
    DATUM_FROZEN: "Yayımlanmış bölge paketi sürümü değişmezdir.",
    DATUM_TENANT_SCOPE: "Kayıt bu organizasyonda bulunamadı.",
    DATUM_GENERATED_COLUMN: "Bu alan hesaplanır ve doğrudan yazılamaz.",
    DATUM_ALREADY_PUBLISHED: "Bu sürüm zaten yayımlanmış.",
    unknown: "Beklenmeyen bir hata oluştu.",
  } as const,
} as const;

/** Hata kodundan Türkçe mesaj. Kod içine Türkçe gömmemenin yolu budur. */
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code = raw.split(":")[0]?.trim();
  if (code && code in tr.errors) {
    return tr.errors[code as keyof typeof tr.errors];
  }
  return tr.errors.unknown;
}

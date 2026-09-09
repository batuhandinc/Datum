-- =============================================================================
-- CoreRule.minCirculationWidth — veri modeli sürüm 1.3
--
-- L1 çekirdeği asansör bandı + merdiven + HOL olarak boyutlandırıyor. Hol
-- genişliğinin şemada evi yoktu; `etut-portali-proje-dokumani.md` §5 katman 2
-- ise "Sirkülasyon alanı asgari genişlikleri"ni açıkça paket içeriği sayıyor.
-- Koda gömmek ilke 1'i ihlal ederdi (yerel bir ölçü).
--
-- Nullable: kural yoksa çekirdek hesaplanmaz + uyarı.
-- Kural tablosu sayısı DEĞİŞMEDİ (22) → dondurma trigger listesi aynı.
-- =============================================================================

ALTER TABLE "core_rule" ADD COLUMN "minCirculationWidth" DECIMAL(6,2);

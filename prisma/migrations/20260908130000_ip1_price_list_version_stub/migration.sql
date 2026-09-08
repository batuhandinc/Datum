-- =============================================================================
-- İP-1 eklemesi — PriceListVersion stub'ı
--
-- NEDEN: maliyet hesabı İP-6'da baştan SÜRÜM-BAZLI yazılsın diye. Fiyatı bir
-- TARİHE bağlamak dondurmaz; geri tarihli bir fiyat satırı eklenirse altı
-- aylık bir projenin fiyatı değişir — etut-veri-modeli.md:28'in tam olarak
-- yasakladığı şey. Dondurulan şey bir SÜRÜM olmalı.
--
-- Bölge paketi sürümünden AYRI bir eksendir: bölge paketi yerel MEVZUATTIR,
-- fiyat ise piyasa verisidir ve elle girilir (proje dokümanı §10.5).
--
-- İçi İP-6'da dolacak: PriceListEntry, eskime uyarısı, toplu güncelleme.
-- Bu migration'da değişmezlik trigger'ı YOK — sürüm yaşam döngüsü İP-6'da
-- tanımlanacak. Şimdi eklenmesinin tek sebebi FK'nın baştan yerinde olması.
-- =============================================================================

-- CreateEnum
CREATE TYPE "PriceListVersionStatus" AS ENUM ('draft', 'published', 'deprecated');

-- CreateTable
CREATE TABLE "price_list_version" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" "PriceListVersionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_list_version_organizationId_status_idx" ON "price_list_version"("organizationId", "status");

-- AlterTable
ALTER TABLE "project" ADD COLUMN "priceListVersionId" TEXT;

-- CreateIndex
CREATE INDEX "project_priceListVersionId_idx" ON "project"("priceListVersionId");

-- AddForeignKey
ALTER TABLE "price_list_version" ADD CONSTRAINT "price_list_version_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_priceListVersionId_fkey" FOREIGN KEY ("priceListVersionId") REFERENCES "price_list_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

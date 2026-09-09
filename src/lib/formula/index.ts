/**
 * FORMÜL MOTORU — bölge paketindeki metin formüllerini güvenle okur.
 *
 * Sözleşme `etut-veri-modeli.md` §12.5'te. Özet:
 *   - `eval`/`Function` YOK, kendi ayrıştırıcımız
 *   - dilbilgisi kapalı küme, tarih/saat/rastgelelik yok (determinizm)
 *   - değişken beyaz listesi KURAL TİPİNE özel
 *   - doğrulama YAYIM anında, okuma anında değil
 *
 * `parseFormula` ve `tokenize` doğrudan dışa açılmaz: bunlar iç adımlardır ve
 * sözleşme denetiminden geçmemiş bir AST üretirler. Dışarıya yalnızca
 * `validateFormula` (yayım kapısı) ve `evaluateFormula` (hesap) gerekir.
 */

export {
  FUNCTIONS,
  MAX_AST_DEPTH,
  MAX_FORMULA_LENGTH,
  astDepth,
  collectVariables,
  type FormulaError,
  type FormulaErrorCode,
  type Node as FormulaNode,
} from "./ast";

export {
  FORMULA_SLOTS,
  PARKING_REQUIREMENT,
  SERVICE_SPACE_AREA,
  type FormulaContract,
  type FormulaSlot,
  type FormulaUnit,
} from "./contracts";

export { validateFormula, type ValidationResult } from "./validate";

export {
  evaluateFormula,
  type FormulaContext,
  type FormulaResult,
} from "./evaluate";

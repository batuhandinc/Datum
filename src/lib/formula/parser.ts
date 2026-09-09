import {
  FUNCTIONS,
  FormulaSyntaxError,
  MAX_AST_DEPTH,
  MAX_FORMULA_LENGTH,
  astDepth,
  type BinaryOp,
  type CompareOp,
  type FormulaErrorCode,
  type FunctionName,
  type Node,
} from "./ast";

/**
 * SÖZCÜKLEYİCİ VE AYRIŞTIRICI.
 *
 * Dilbilgisi (öncelik artan sırada):
 *
 *   expression     := ternary
 *   ternary        := comparison ( "?" expression ":" expression )?
 *   comparison     := additive ( ("<"|"<="|">"|">="|"=="|"!=") additive )?
 *   additive       := multiplicative ( ("+"|"-") multiplicative )*
 *   multiplicative := unary ( ("*"|"/") unary )*
 *   unary          := "-" unary | primary
 *   primary        := NUMBER | IDENT | IDENT "(" args ")" | "(" expression ")"
 *
 * Karşılaştırma KASITEN zincirlenemez: `a < b < c` matematikte bir şey ifade
 * etmiyor ve çoğu dilde sessizce yanlış sonuç veriyor. Burada hata verir.
 */

type TokenType = "number" | "ident" | "punct" | "eof";

interface Token {
  readonly type: TokenType;
  readonly text: string;
  readonly at: number;
  /** Yalnızca number için. */
  readonly value?: number;
}

const PUNCT2 = ["<=", ">=", "==", "!="] as const;
const PUNCT1 = ["+", "-", "*", "/", "(", ")", ",", "?", ":", "<", ">"] as const;
const COMPARE_OPS: readonly string[] = [...PUNCT2, "<", ">"];

function fail(code: FormulaErrorCode, at: number, token?: string): never {
  throw new FormulaSyntaxError({ code, at, ...(token === undefined ? {} : { token }) });
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i]!;

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    // Sayı: 12 · 12.5 · .5 DEĞİL (baştaki nokta kabul edilmez, okunaksız).
    if (ch >= "0" && ch <= "9") {
      const start = i;
      while (i < source.length && source[i]! >= "0" && source[i]! <= "9") i++;
      if (source[i] === ".") {
        i++;
        if (!(source[i]! >= "0" && source[i]! <= "9")) fail("UNEXPECTED_CHARACTER", i, source[i]);
        while (i < source.length && source[i]! >= "0" && source[i]! <= "9") i++;
      }
      const text = source.slice(start, i);
      const value = Number(text);
      if (!Number.isFinite(value)) fail("NUMBER_NOT_FINITE", start, text);
      tokens.push({ type: "number", text, at: start, value });
      continue;
    }

    // Tanımlayıcı: harf ile başlar, harf/rakam/alt çizgi ile sürer. ASCII.
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
      const start = i;
      while (
        i < source.length &&
        /[A-Za-z0-9_]/.test(source[i]!)
      ) {
        i++;
      }
      tokens.push({ type: "ident", text: source.slice(start, i), at: start });
      continue;
    }

    const two = source.slice(i, i + 2);
    if ((PUNCT2 as readonly string[]).includes(two)) {
      tokens.push({ type: "punct", text: two, at: i });
      i += 2;
      continue;
    }
    if ((PUNCT1 as readonly string[]).includes(ch)) {
      tokens.push({ type: "punct", text: ch, at: i });
      i++;
      continue;
    }

    // Buraya düşen her şey dilin DIŞINDADIR: `=`, `&`, `|`, `.`, tırnak,
    // köşeli parantez, süslü parantez… Sessizce yok saymak yerine patlar.
    fail("UNEXPECTED_CHARACTER", i, ch);
  }

  tokens.push({ type: "eof", text: "", at: source.length });
  return tokens;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private next(): Token {
    return this.tokens[this.pos++]!;
  }

  private eat(text: string): boolean {
    const t = this.peek();
    if (t.type === "punct" && t.text === text) {
      this.pos++;
      return true;
    }
    return false;
  }

  private expect(text: string): Token {
    const t = this.peek();
    if (t.type === "punct" && t.text === text) return this.next();
    if (t.type === "eof") fail("UNEXPECTED_END", t.at, text);
    fail("UNEXPECTED_TOKEN", t.at, t.text);
  }

  parseExpression(): Node {
    return this.parseTernary();
  }

  private parseTernary(): Node {
    const condition = this.parseComparison();
    if (!this.eat("?")) return condition;
    const whenTrue = this.parseExpression();
    this.expect(":");
    const whenFalse = this.parseExpression();
    return { kind: "ternary", condition, whenTrue, whenFalse };
  }

  private parseComparison(): Node {
    const left = this.parseAdditive();
    const t = this.peek();
    if (t.type !== "punct") return left;
    if (!COMPARE_OPS.includes(t.text)) return left;
    this.next();
    const right = this.parseAdditive();

    // Zincirleme yasak: `a < b < c`.
    const after = this.peek();
    if (after.type === "punct" && COMPARE_OPS.includes(after.text)) {
      fail("UNEXPECTED_TOKEN", after.at, after.text);
    }
    return { kind: "compare", op: t.text as CompareOp, left, right };
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();
    for (;;) {
      const t = this.peek();
      if (t.type !== "punct" || (t.text !== "+" && t.text !== "-")) return left;
      this.next();
      left = { kind: "binary", op: t.text as BinaryOp, left, right: this.parseMultiplicative() };
    }
  }

  private parseMultiplicative(): Node {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t.type !== "punct" || (t.text !== "*" && t.text !== "/")) return left;
      this.next();
      left = { kind: "binary", op: t.text as BinaryOp, left, right: this.parseUnary() };
    }
  }

  private parseUnary(): Node {
    if (this.eat("-")) return { kind: "unary", op: "-", operand: this.parseUnary() };
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const t = this.next();

    if (t.type === "number") return { kind: "number", value: t.value! };

    if (t.type === "ident") {
      if (this.eat("(")) {
        if (!(FUNCTIONS as readonly string[]).includes(t.text)) {
          fail("UNKNOWN_FUNCTION", t.at, t.text);
        }
        const args: Node[] = [];
        if (!this.eat(")")) {
          do {
            args.push(this.parseExpression());
          } while (this.eat(","));
          this.expect(")");
        }
        return { kind: "call", name: t.text as FunctionName, args, at: t.at };
      }
      return { kind: "variable", name: t.text, at: t.at };
    }

    if (t.type === "punct" && t.text === "(") {
      const inner = this.parseExpression();
      this.expect(")");
      return inner;
    }

    if (t.type === "eof") fail("UNEXPECTED_END", t.at);
    fail("UNEXPECTED_TOKEN", t.at, t.text);
  }

  atEnd(): boolean {
    return this.peek().type === "eof";
  }

  position(): number {
    return this.peek().at;
  }

  currentText(): string {
    return this.peek().text;
  }
}

/**
 * Metni AST'ye çevirir. Sözdizimi hatasında `FormulaSyntaxError` fırlatır.
 * Anlamsal denetim (bilinmeyen değişken, tip uyumu) ayrı adımdır — bkz. `validate.ts`.
 */
export function parseFormula(source: string): Node {
  if (source.trim().length === 0) fail("EMPTY", 0);
  if (source.length > MAX_FORMULA_LENGTH) fail("TOO_LONG", MAX_FORMULA_LENGTH, String(source.length));

  const parser = new Parser(tokenize(source));
  const node = parser.parseExpression();

  if (!parser.atEnd()) fail("TRAILING_INPUT", parser.position(), parser.currentText());

  // Derinlik ayrıştırmadan SONRA denetlenir: özyinelemeli iniş zaten yığını
  // tüketiyor, ama 500 karakter sınırı yığını taşırmaya yetmiyor.
  if (astDepth(node) > MAX_AST_DEPTH) fail("DEPTH_EXCEEDED", 0, String(astDepth(node)));

  return node;
}

import { safeNum, type SeedFood } from './types';

const SOURCE_URL =
  'https://raw.githubusercontent.com/nodef/ifct2017/main/compositions/index.csv';

// Minimal CSV parser that respects double-quoted fields containing commas/newlines.
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else if (ch === '\r') {
        // skip
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = r[i] ?? '';
    });
    return obj;
  });
}

// IFCT `lang` column is a list like:
//   "A. Moricha guti; H. Ramdana; Mar. Cavali biya; Tam. Keerai vidai"
// where prefixes mark the language (H. = Hindi). Pull the first Hindi entry.
function extractHindi(lang: string): string | null {
  if (!lang) return null;
  for (const part of lang.split(';')) {
    const trimmed = part.trim();
    const m = trimmed.match(/^H\.\s+(.+?)\.?$/);
    if (m) return m[1].trim();
  }
  return null;
}

const KJ_TO_KCAL = 1 / 4.184;

export async function fetchIFCT(): Promise<SeedFood[]> {
  console.log('[ifct] downloading', SOURCE_URL);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`IFCT fetch failed: ${res.status}`);
  const csv = await res.text();
  const rows = parseCSV(csv);
  console.log(`[ifct] parsed ${rows.length} rows`);

  const out: SeedFood[] = [];
  for (const r of rows) {
    if (!r.code || !r.name) continue;

    // IFCT energy is kJ/100g; nutrients we care about:
    // protcnt = protein g, fatce = fat g, choavldf = available carbs g,
    // fibtg = total fibre g, vita = retinol mcg/100g (often 0),
    // vitc = vitamin C g/100g (rare; convert to mg),
    // vitd = vitamin D g/100g (convert to mcg),
    // ca, fe in g/100g (convert to mg).
    const enercKj = safeNum(r.enerc);
    const calories = enercKj > 0 ? enercKj * KJ_TO_KCAL : 0;

    out.push({
      source: 'ifct',
      external_id: r.code,
      name: r.name,
      name_hindi: extractHindi(r.lang ?? ''),
      brand: null,
      category: r.grup || null,
      cuisine: 'indian',
      serving_size_g: 100,
      calories_kcal: round(calories, 1),
      protein_g: round(safeNum(r.protcnt), 2),
      carbs_g: round(safeNum(r.choavldf), 2),
      fats_g: round(safeNum(r.fatce), 2),
      fibre_g: round(safeNum(r.fibtg), 2),
      vitamin_a_mcg: round(safeNum(r.vita), 2),
      vitamin_c_mg: round(safeNum(r.vitc) * 1000, 2),
      vitamin_d_mcg: round(safeNum(r.vitd) * 1_000_000, 3),
      vitamin_b12_mcg: 0, // IFCT doesn't break out B12
      iron_mg: round(safeNum(r.fe) * 1000, 3),
      calcium_mg: round(safeNum(r.ca) * 1000, 1),
      extra_nutrients: {},
    });
  }

  // Drop rows with zero calories AND zero protein (clearly garbage)
  const filtered = out.filter((f) => f.calories_kcal > 0 || f.protein_g > 0);
  console.log(`[ifct] kept ${filtered.length} rows after filtering`);
  return filtered;
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * Common Indian single-molecule and FDC SKUs with a matching MediHome composition.
 * This is a representative NLEM / high-volume retail set, not the full CDSCO register.
 */
export function buildIndiaCombos(withHouseBrand, startId = 1000) {
  let id = startId;
  const nextId = () => id++;
  const rows = [];

  const add = ({
    salt,
    strength,
    category,
    pack = "10 tablets",
    mhMrp,
    mhPrice,
    rx = true,
    brands = [],
    aliases = [],
  }) => {
    const composition = `${salt} ${strength}`;
    rows.push(
      withHouseBrand({
        id: nextId(),
        name: `MediHome ${salt} ${strength}`,
        salt,
        strength,
        composition,
        packSize: pack,
        category,
        mrp: mhMrp,
        price: mhPrice,
        prescription: rx,
        aliases: [...aliases, ...brands.map((item) => item.brand)],
      })
    );
    brands.forEach((item) => {
      rows.push(
        withHouseBrand({
          id: nextId(),
          name: item.name || `${item.brand} ${strength}`,
          brand: item.brand,
          salt,
          strength,
          composition,
          packSize: pack,
          category,
          mrp: item.mrp,
          price: item.price ?? Math.round(item.mrp * 0.92),
          prescription: rx,
          isMediHome: false,
          aliases: [salt, ...aliases],
        })
      );
    });
  };

  add({
    salt: "Metformin",
    strength: "250 mg",
    category: "Diabetes",
    mhMrp: 32,
    mhPrice: 28,
    brands: [
      { brand: "Glycomet", name: "Glycomet 250", mrp: 28, price: 25 },
      { brand: "Glucophage", name: "Glucophage 250", mrp: 34, price: 30 },
    ],
    aliases: ["Glyciphage"],
  });
  add({
    salt: "Metformin",
    strength: "500 mg",
    category: "Diabetes",
    mhMrp: 50,
    mhPrice: 45,
    brands: [
      { brand: "Glycomet", name: "Glycomet 500", mrp: 42, price: 38 },
      { brand: "Glucophage", name: "Glucophage 500", mrp: 46, price: 40 },
      { brand: "Glyciphage", name: "Glyciphage 500", mrp: 40, price: 36 },
    ],
  });
  add({
    salt: "Metformin",
    strength: "850 mg",
    category: "Diabetes",
    mhMrp: 68,
    mhPrice: 58,
    brands: [
      { brand: "Glycomet", name: "Glycomet 850", mrp: 62, price: 56 },
      { brand: "Glucophage", name: "Glucophage 850", mrp: 70, price: 64 },
    ],
  });
  add({
    salt: "Metformin",
    strength: "1000 mg",
    category: "Diabetes",
    mhMrp: 78,
    mhPrice: 65,
    brands: [
      { brand: "Glycomet", name: "Glycomet 1000", mrp: 72, price: 66 },
      { brand: "Glucophage", name: "Glucophage 1000", mrp: 82, price: 74 },
    ],
  });
  add({
    salt: "Metformin XR",
    strength: "500 mg",
    category: "Diabetes",
    mhMrp: 62,
    mhPrice: 52,
    brands: [
      { brand: "Glycomet SR", name: "Glycomet SR 500", mrp: 58, price: 52 },
      { brand: "Gluconorm SR", name: "Gluconorm SR 500", mrp: 64, price: 58 },
    ],
    aliases: ["Metformin SR"],
  });
  add({
    salt: "Metformin XR",
    strength: "1000 mg",
    category: "Diabetes",
    mhMrp: 92,
    mhPrice: 78,
    brands: [
      { brand: "Glycomet SR", name: "Glycomet SR 1000", mrp: 88, price: 80 },
      { brand: "Gluconorm SR", name: "Gluconorm SR 1000", mrp: 96, price: 88 },
    ],
  });
  add({
    salt: "Glimepiride",
    strength: "1 mg",
    category: "Diabetes",
    mhMrp: 48,
    mhPrice: 38,
    brands: [
      { brand: "Amaryl", name: "Amaryl 1", mrp: 72, price: 66 },
      { brand: "Glimestar", name: "Glimestar 1", mrp: 44, price: 40 },
    ],
  });
  add({
    salt: "Glimepiride",
    strength: "2 mg",
    category: "Diabetes",
    mhMrp: 68,
    mhPrice: 52,
    brands: [
      { brand: "Amaryl", name: "Amaryl 2", mrp: 98, price: 90 },
      { brand: "Glimestar", name: "Glimestar 2", mrp: 62, price: 56 },
    ],
  });
  add({
    salt: "Glimepiride",
    strength: "3 mg",
    category: "Diabetes",
    mhMrp: 88,
    mhPrice: 68,
    brands: [
      { brand: "Amaryl", name: "Amaryl 3", mrp: 128, price: 118 },
      { brand: "Glimestar", name: "Glimestar 3", mrp: 82, price: 74 },
    ],
  });
  add({
    salt: "Glimepiride",
    strength: "4 mg",
    category: "Diabetes",
    mhMrp: 108,
    mhPrice: 82,
    brands: [{ brand: "Amaryl", name: "Amaryl 4", mrp: 158, price: 145 }],
  });
  add({
    salt: "Metformin + Glimepiride",
    strength: "500 mg + 1 mg",
    category: "Diabetes",
    mhMrp: 95,
    mhPrice: 85,
    brands: [
      { brand: "Glycomet GP", name: "Glycomet GP 1", mrp: 118, price: 108 },
      { brand: "Gluconorm G", name: "Gluconorm G 1", mrp: 122, price: 112 },
    ],
  });
  add({
    salt: "Metformin + Glimepiride",
    strength: "500 mg + 2 mg",
    category: "Diabetes",
    mhMrp: 115,
    mhPrice: 98,
    brands: [
      { brand: "Glycomet GP", name: "Glycomet GP 2", mrp: 142, price: 130 },
      { brand: "Gemer", name: "Gemer 2", mrp: 138, price: 126 },
    ],
  });
  add({
    salt: "Metformin + Glimepiride",
    strength: "1000 mg + 1 mg",
    category: "Diabetes",
    mhMrp: 128,
    mhPrice: 108,
    brands: [{ brand: "Glycomet GP", name: "Glycomet GP 1 Forte", mrp: 158, price: 145 }],
  });
  add({
    salt: "Metformin + Glimepiride",
    strength: "1000 mg + 2 mg",
    category: "Diabetes",
    mhMrp: 148,
    mhPrice: 122,
    brands: [{ brand: "Glycomet GP", name: "Glycomet GP 2 Forte", mrp: 178, price: 162 }],
  });
  add({
    salt: "Sitagliptin",
    strength: "25 mg",
    category: "Diabetes",
    mhMrp: 95,
    mhPrice: 72,
    brands: [
      { brand: "Januvia", name: "Januvia 25", mrp: 270, price: 248 },
      { brand: "Zita", name: "Zita 25", mrp: 145, price: 132 },
    ],
  });
  add({
    salt: "Sitagliptin",
    strength: "50 mg",
    category: "Diabetes",
    mhMrp: 145,
    mhPrice: 108,
    brands: [
      { brand: "Januvia", name: "Januvia 50", mrp: 325, price: 298 },
      { brand: "Zita", name: "Zita 50", mrp: 185, price: 168 },
    ],
  });
  add({
    salt: "Sitagliptin",
    strength: "100 mg",
    category: "Diabetes",
    mhMrp: 220,
    mhPrice: 165,
    brands: [
      { brand: "Januvia", name: "Januvia 100", mrp: 540, price: 498 },
      { brand: "Zita", name: "Zita 100", mrp: 265, price: 242 },
    ],
  });
  add({
    salt: "Sitagliptin + Metformin",
    strength: "50 mg + 500 mg",
    category: "Diabetes",
    mhMrp: 165,
    mhPrice: 118,
    brands: [
      { brand: "Janumet", name: "Janumet 50/500", mrp: 345, price: 318 },
      { brand: "Istamet", name: "Istamet 50/500", mrp: 198, price: 182 },
    ],
    aliases: ["Sitagliptin combination"],
  });
  add({
    salt: "Sitagliptin + Metformin",
    strength: "50 mg + 1000 mg",
    category: "Diabetes",
    mhMrp: 195,
    mhPrice: 138,
    brands: [
      { brand: "Janumet", name: "Janumet 50/1000", mrp: 385, price: 352 },
      { brand: "Istamet", name: "Istamet 50/1000", mrp: 228, price: 208 },
    ],
  });
  add({
    salt: "Vildagliptin",
    strength: "50 mg",
    category: "Diabetes",
    mhMrp: 98,
    mhPrice: 72,
    brands: [
      { brand: "Galvus", name: "Galvus 50", mrp: 285, price: 262 },
      { brand: "Jalra", name: "Jalra 50", mrp: 168, price: 152 },
    ],
  });
  add({
    salt: "Vildagliptin + Metformin",
    strength: "50 mg + 500 mg",
    category: "Diabetes",
    mhMrp: 125,
    mhPrice: 92,
    brands: [
      { brand: "Galvus Met", name: "Galvus Met 50/500", mrp: 312, price: 286 },
      { brand: "Jalra M", name: "Jalra M 50/500", mrp: 188, price: 172 },
    ],
  });
  add({
    salt: "Vildagliptin + Metformin",
    strength: "50 mg + 1000 mg",
    category: "Diabetes",
    mhMrp: 148,
    mhPrice: 108,
    brands: [{ brand: "Galvus Met", name: "Galvus Met 50/1000", mrp: 348, price: 318 }],
  });
  add({
    salt: "Teneligliptin",
    strength: "20 mg",
    category: "Diabetes",
    mhMrp: 88,
    mhPrice: 62,
    brands: [
      { brand: "Teniva", name: "Teniva 20", mrp: 145, price: 132 },
      { brand: "Zita Plus", name: "Zita Plus 20", mrp: 128, price: 116 },
    ],
  });
  add({
    salt: "Teneligliptin + Metformin",
    strength: "20 mg + 500 mg",
    category: "Diabetes",
    mhMrp: 108,
    mhPrice: 78,
    brands: [{ brand: "Teniva M", name: "Teniva M 20/500", mrp: 168, price: 154 }],
  });
  add({
    salt: "Dapagliflozin",
    strength: "5 mg",
    category: "Diabetes",
    mhMrp: 145,
    mhPrice: 108,
    brands: [
      { brand: "Forxiga", name: "Forxiga 5", mrp: 540, price: 498 },
      { brand: "Oxra", name: "Oxra 5", mrp: 198, price: 182 },
    ],
  });
  add({
    salt: "Dapagliflozin",
    strength: "10 mg",
    category: "Diabetes",
    mhMrp: 185,
    mhPrice: 138,
    brands: [
      { brand: "Forxiga", name: "Forxiga 10", mrp: 620, price: 570 },
      { brand: "Oxra", name: "Oxra 10", mrp: 248, price: 228 },
    ],
  });
  add({
    salt: "Dapagliflozin + Metformin",
    strength: "10 mg + 500 mg",
    category: "Diabetes",
    mhMrp: 198,
    mhPrice: 148,
    brands: [{ brand: "Xigduo", name: "Xigduo 10/500", mrp: 425, price: 390 }],
  });
  add({
    salt: "Empagliflozin",
    strength: "10 mg",
    category: "Diabetes",
    mhMrp: 198,
    mhPrice: 148,
    brands: [
      { brand: "Jardiance", name: "Jardiance 10", mrp: 620, price: 570 },
      { brand: "Gibtulio", name: "Gibtulio 10", mrp: 268, price: 245 },
    ],
  });
  add({
    salt: "Empagliflozin",
    strength: "25 mg",
    category: "Diabetes",
    mhMrp: 248,
    mhPrice: 185,
    brands: [{ brand: "Jardiance", name: "Jardiance 25", mrp: 720, price: 662 }],
  });
  add({
    salt: "Pioglitazone",
    strength: "15 mg",
    category: "Diabetes",
    mhMrp: 58,
    mhPrice: 42,
    brands: [{ brand: "Pioz", name: "Pioz 15", mrp: 78, price: 70 }],
  });
  add({
    salt: "Pioglitazone",
    strength: "30 mg",
    category: "Diabetes",
    mhMrp: 78,
    mhPrice: 56,
    brands: [{ brand: "Pioz", name: "Pioz 30", mrp: 108, price: 98 }],
  });
  add({
    salt: "Voglibose",
    strength: "0.2 mg",
    category: "Diabetes",
    mhMrp: 62,
    mhPrice: 45,
    brands: [{ brand: "Volix", name: "Volix 0.2", mrp: 92, price: 84 }],
  });
  add({
    salt: "Voglibose",
    strength: "0.3 mg",
    category: "Diabetes",
    mhMrp: 78,
    mhPrice: 56,
    brands: [{ brand: "Volix", name: "Volix 0.3", mrp: 118, price: 108 }],
  });
  add({
    salt: "Metformin + Glimepiride + Voglibose",
    strength: "500 mg + 1 mg + 0.2 mg",
    category: "Diabetes",
    mhMrp: 148,
    mhPrice: 112,
    brands: [{ brand: "Glycomet Trio", name: "Glycomet Trio 1", mrp: 198, price: 182 }],
  });
  add({
    salt: "Metformin + Glimepiride + Pioglitazone",
    strength: "500 mg + 1 mg + 15 mg",
    category: "Diabetes",
    mhMrp: 138,
    mhPrice: 105,
    brands: [{ brand: "Triglycomet", name: "Triglycomet 1", mrp: 188, price: 172 }],
  });

  add({
    salt: "Telmisartan",
    strength: "20 mg",
    category: "Hypertension",
    mhMrp: 48,
    mhPrice: 36,
    brands: [
      { brand: "Telma", name: "Telma 20", mrp: 78, price: 70 },
      { brand: "Telvas", name: "Telvas 20", mrp: 58, price: 52 },
    ],
  });
  add({
    salt: "Telmisartan",
    strength: "40 mg",
    category: "Hypertension",
    mhMrp: 58,
    mhPrice: 42,
    brands: [
      { brand: "Telma", name: "Telma 40", mrp: 108, price: 98 },
      { brand: "Telvas", name: "Telvas 40", mrp: 72, price: 66 },
      { brand: "Tazloc", name: "Tazloc 40", mrp: 82, price: 74 },
    ],
  });
  add({
    salt: "Telmisartan",
    strength: "80 mg",
    category: "Hypertension",
    mhMrp: 88,
    mhPrice: 64,
    brands: [
      { brand: "Telma", name: "Telma 80", mrp: 158, price: 145 },
      { brand: "Telvas", name: "Telvas 80", mrp: 108, price: 98 },
    ],
  });
  add({
    salt: "Amlodipine",
    strength: "2.5 mg",
    category: "Hypertension",
    mhMrp: 28,
    mhPrice: 22,
    brands: [
      { brand: "Amlong", name: "Amlong 2.5", mrp: 38, price: 34 },
      { brand: "Amlovas", name: "Amlovas 2.5", mrp: 32, price: 28 },
    ],
  });
  add({
    salt: "Amlodipine",
    strength: "5 mg",
    category: "Hypertension",
    mhMrp: 38,
    mhPrice: 28,
    brands: [
      { brand: "Amlong", name: "Amlong 5", mrp: 52, price: 46 },
      { brand: "Stamlo", name: "Stamlo 5", mrp: 58, price: 52 },
      { brand: "Amlovas", name: "Amlovas 5", mrp: 42, price: 38 },
    ],
  });
  add({
    salt: "Amlodipine",
    strength: "10 mg",
    category: "Hypertension",
    mhMrp: 52,
    mhPrice: 38,
    brands: [
      { brand: "Amlong", name: "Amlong 10", mrp: 72, price: 66 },
      { brand: "Stamlo", name: "Stamlo 10", mrp: 82, price: 74 },
    ],
  });
  add({
    salt: "Telmisartan + Amlodipine",
    strength: "40 mg + 5 mg",
    category: "Hypertension",
    mhMrp: 88,
    mhPrice: 64,
    brands: [
      { brand: "Telma AM", name: "Telma AM 40/5", mrp: 148, price: 135 },
      { brand: "Tazloc AM", name: "Tazloc AM", mrp: 118, price: 108 },
    ],
  });
  add({
    salt: "Telmisartan + Amlodipine",
    strength: "80 mg + 5 mg",
    category: "Hypertension",
    mhMrp: 118,
    mhPrice: 86,
    brands: [{ brand: "Telma AM", name: "Telma AM 80/5", mrp: 188, price: 172 }],
  });
  add({
    salt: "Telmisartan + Hydrochlorothiazide",
    strength: "40 mg + 12.5 mg",
    category: "Hypertension",
    mhMrp: 78,
    mhPrice: 58,
    brands: [
      { brand: "Telma H", name: "Telma H 40", mrp: 128, price: 116 },
      { brand: "Telvas H", name: "Telvas H 40", mrp: 92, price: 84 },
    ],
  });
  add({
    salt: "Telmisartan + Hydrochlorothiazide",
    strength: "80 mg + 12.5 mg",
    category: "Hypertension",
    mhMrp: 108,
    mhPrice: 78,
    brands: [{ brand: "Telma H", name: "Telma H 80", mrp: 168, price: 154 }],
  });
  add({
    salt: "Telmisartan + Amlodipine + Hydrochlorothiazide",
    strength: "40 mg + 5 mg + 12.5 mg",
    category: "Hypertension",
    mhMrp: 128,
    mhPrice: 92,
    brands: [{ brand: "Telma AMH", name: "Telma AMH", mrp: 198, price: 182 }],
  });
  add({
    salt: "Losartan",
    strength: "25 mg",
    category: "Hypertension",
    mhMrp: 38,
    mhPrice: 28,
    brands: [
      { brand: "Losar", name: "Losar 25", mrp: 48, price: 42 },
      { brand: "Repace", name: "Repace 25", mrp: 52, price: 46 },
    ],
  });
  add({
    salt: "Losartan",
    strength: "50 mg",
    category: "Hypertension",
    mhMrp: 52,
    mhPrice: 38,
    brands: [
      { brand: "Losar", name: "Losar 50", mrp: 72, price: 66 },
      { brand: "Repace", name: "Repace 50", mrp: 78, price: 70 },
    ],
  });
  add({
    salt: "Losartan + Hydrochlorothiazide",
    strength: "50 mg + 12.5 mg",
    category: "Hypertension",
    mhMrp: 68,
    mhPrice: 48,
    brands: [{ brand: "Losar H", name: "Losar H", mrp: 92, price: 84 }],
  });
  add({
    salt: "Olmesartan",
    strength: "20 mg",
    category: "Hypertension",
    mhMrp: 72,
    mhPrice: 52,
    brands: [
      { brand: "Olmezest", name: "Olmezest 20", mrp: 118, price: 108 },
      { brand: "Olmat", name: "Olmat 20", mrp: 98, price: 88 },
    ],
  });
  add({
    salt: "Olmesartan",
    strength: "40 mg",
    category: "Hypertension",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "Olmezest", name: "Olmezest 40", mrp: 158, price: 145 }],
  });
  add({
    salt: "Cilnidipine",
    strength: "10 mg",
    category: "Hypertension",
    mhMrp: 68,
    mhPrice: 48,
    brands: [{ brand: "Cilacar", name: "Cilacar 10", mrp: 98, price: 88 }],
  });
  add({
    salt: "Cilnidipine",
    strength: "20 mg",
    category: "Hypertension",
    mhMrp: 88,
    mhPrice: 64,
    brands: [{ brand: "Cilacar", name: "Cilacar 20", mrp: 128, price: 116 }],
  });
  add({
    salt: "Ramipril",
    strength: "2.5 mg",
    category: "Hypertension",
    mhMrp: 42,
    mhPrice: 32,
    brands: [
      { brand: "Cardace", name: "Cardace 2.5", mrp: 78, price: 70 },
      { brand: "Ramcor", name: "Ramcor 2.5", mrp: 48, price: 42 },
    ],
  });
  add({
    salt: "Ramipril",
    strength: "5 mg",
    category: "Hypertension",
    mhMrp: 58,
    mhPrice: 42,
    brands: [{ brand: "Cardace", name: "Cardace 5", mrp: 108, price: 98 }],
  });
  add({
    salt: "Enalapril",
    strength: "5 mg",
    category: "Hypertension",
    mhMrp: 32,
    mhPrice: 24,
    brands: [{ brand: "Envas", name: "Envas 5", mrp: 42, price: 38 }],
  });
  add({
    salt: "Enalapril",
    strength: "10 mg",
    category: "Hypertension",
    mhMrp: 42,
    mhPrice: 32,
    brands: [{ brand: "Envas", name: "Envas 10", mrp: 58, price: 52 }],
  });

  add({
    salt: "Atorvastatin",
    strength: "10 mg",
    category: "Cholesterol",
    mhMrp: 58,
    mhPrice: 42,
    brands: [
      { brand: "Atorva", name: "Atorva 10", mrp: 88, price: 80 },
      { brand: "Lipitor", name: "Lipitor 10", mrp: 145, price: 132 },
      { brand: "Storvas", name: "Storvas 10", mrp: 78, price: 70 },
    ],
  });
  add({
    salt: "Atorvastatin",
    strength: "20 mg",
    category: "Cholesterol",
    mhMrp: 88,
    mhPrice: 64,
    brands: [
      { brand: "Atorva", name: "Atorva 20", mrp: 128, price: 116 },
      { brand: "Storvas", name: "Storvas 20", mrp: 112, price: 102 },
    ],
  });
  add({
    salt: "Atorvastatin",
    strength: "40 mg",
    category: "Cholesterol",
    mhMrp: 118,
    mhPrice: 86,
    brands: [{ brand: "Atorva", name: "Atorva 40", mrp: 178, price: 162 }],
  });
  add({
    salt: "Atorvastatin",
    strength: "80 mg",
    category: "Cholesterol",
    mhMrp: 148,
    mhPrice: 108,
    brands: [{ brand: "Atorva", name: "Atorva 80", mrp: 228, price: 208 }],
  });
  add({
    salt: "Rosuvastatin",
    strength: "5 mg",
    category: "Cholesterol",
    mhMrp: 72,
    mhPrice: 52,
    brands: [
      { brand: "Rozavel", name: "Rozavel 5", mrp: 108, price: 98 },
      { brand: "Crestor", name: "Crestor 5", mrp: 198, price: 182 },
    ],
  });
  add({
    salt: "Rosuvastatin",
    strength: "10 mg",
    category: "Cholesterol",
    mhMrp: 98,
    mhPrice: 72,
    brands: [
      { brand: "Rozavel", name: "Rozavel 10", mrp: 148, price: 135 },
      { brand: "Rosuvas", name: "Rosuvas 10", mrp: 128, price: 116 },
    ],
  });
  add({
    salt: "Rosuvastatin",
    strength: "20 mg",
    category: "Cholesterol",
    mhMrp: 138,
    mhPrice: 98,
    brands: [{ brand: "Rozavel", name: "Rozavel 20", mrp: 198, price: 182 }],
  });
  add({
    salt: "Rosuvastatin",
    strength: "40 mg",
    category: "Cholesterol",
    mhMrp: 178,
    mhPrice: 128,
    brands: [{ brand: "Rozavel", name: "Rozavel 40", mrp: 258, price: 236 }],
  });
  add({
    salt: "Atorvastatin + Fenofibrate",
    strength: "10 mg + 160 mg",
    category: "Cholesterol",
    mhMrp: 118,
    mhPrice: 86,
    brands: [{ brand: "Lipicard", name: "Atorva TG", mrp: 168, price: 154 }],
  });
  add({
    salt: "Rosuvastatin + Fenofibrate",
    strength: "10 mg + 160 mg",
    category: "Cholesterol",
    mhMrp: 138,
    mhPrice: 98,
    brands: [{ brand: "Rozavel F", name: "Rozavel F 10", mrp: 198, price: 182 }],
  });
  add({
    salt: "Fenofibrate",
    strength: "160 mg",
    category: "Cholesterol",
    mhMrp: 78,
    mhPrice: 56,
    brands: [{ brand: "Lipicard", name: "Lipicard 160", mrp: 118, price: 108 }],
  });
  add({
    salt: "Ezetimibe",
    strength: "10 mg",
    category: "Cholesterol",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "Ezedoc", name: "Ezedoc 10", mrp: 148, price: 135 }],
  });

  add({
    salt: "Clopidogrel",
    strength: "75 mg",
    category: "Cardiology",
    mhMrp: 72,
    mhPrice: 52,
    brands: [
      { brand: "Clopitab", name: "Clopitab 75", mrp: 98, price: 88 },
      { brand: "Plavix", name: "Plavix 75", mrp: 168, price: 154 },
    ],
  });
  add({
    salt: "Aspirin",
    strength: "75 mg",
    category: "Cardiology",
    mhMrp: 18,
    mhPrice: 12,
    rx: false,
    brands: [
      { brand: "Ecosprin", name: "Ecosprin 75", mrp: 22, price: 18 },
      { brand: "Disprin", name: "Disprin 75", mrp: 20, price: 16 },
    ],
  });
  add({
    salt: "Aspirin",
    strength: "150 mg",
    category: "Cardiology",
    mhMrp: 22,
    mhPrice: 16,
    brands: [{ brand: "Ecosprin", name: "Ecosprin 150", mrp: 28, price: 24 }],
  });
  add({
    salt: "Aspirin + Clopidogrel",
    strength: "75 mg + 75 mg",
    category: "Cardiology",
    mhMrp: 88,
    mhPrice: 64,
    brands: [{ brand: "Clopitab A", name: "Clopitab-A 75", mrp: 128, price: 116 }],
  });
  add({
    salt: "Aspirin + Atorvastatin",
    strength: "75 mg + 10 mg",
    category: "Cardiology",
    mhMrp: 78,
    mhPrice: 56,
    brands: [{ brand: "Ecosprin AV", name: "Ecosprin AV 75/10", mrp: 118, price: 108 }],
  });
  add({
    salt: "Aspirin + Atorvastatin + Clopidogrel",
    strength: "75 mg + 10 mg + 75 mg",
    category: "Cardiology",
    mhMrp: 128,
    mhPrice: 92,
    brands: [{ brand: "Deplatt CV", name: "Deplatt CV 20", mrp: 178, price: 162 }],
  });
  add({
    salt: "Metoprolol",
    strength: "25 mg",
    category: "Cardiology",
    mhMrp: 42,
    mhPrice: 32,
    brands: [
      { brand: "Metolar", name: "Metolar 25", mrp: 58, price: 52 },
      { brand: "Starpress", name: "Starpress 25", mrp: 52, price: 46 },
    ],
  });
  add({
    salt: "Metoprolol",
    strength: "50 mg",
    category: "Cardiology",
    mhMrp: 58,
    mhPrice: 42,
    brands: [
      { brand: "Metolar", name: "Metolar 50", mrp: 82, price: 74 },
      { brand: "Starpress XL", name: "Starpress XL 50", mrp: 78, price: 70 },
    ],
  });
  add({
    salt: "Metoprolol XL",
    strength: "25 mg",
    category: "Cardiology",
    mhMrp: 48,
    mhPrice: 36,
    brands: [{ brand: "Metolar XR", name: "Metolar XR 25", mrp: 68, price: 62 }],
  });
  add({
    salt: "Metoprolol XL",
    strength: "50 mg",
    category: "Cardiology",
    mhMrp: 68,
    mhPrice: 48,
    brands: [{ brand: "Metolar XR", name: "Metolar XR 50", mrp: 98, price: 88 }],
  });
  add({
    salt: "Atenolol",
    strength: "25 mg",
    category: "Cardiology",
    mhMrp: 28,
    mhPrice: 20,
    brands: [{ brand: "Aten", name: "Aten 25", mrp: 32, price: 28 }],
  });
  add({
    salt: "Atenolol",
    strength: "50 mg",
    category: "Cardiology",
    mhMrp: 36,
    mhPrice: 26,
    brands: [{ brand: "Aten", name: "Aten 50", mrp: 42, price: 38 }],
  });
  add({
    salt: "Nebivolol",
    strength: "2.5 mg",
    category: "Cardiology",
    mhMrp: 72,
    mhPrice: 52,
    brands: [{ brand: "Nebicard", name: "Nebicard 2.5", mrp: 108, price: 98 }],
  });
  add({
    salt: "Nebivolol",
    strength: "5 mg",
    category: "Cardiology",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "Nebicard", name: "Nebicard 5", mrp: 148, price: 135 }],
  });
  add({
    salt: "Ivabradine",
    strength: "5 mg",
    category: "Cardiology",
    mhMrp: 128,
    mhPrice: 92,
    brands: [{ brand: "Ivabrad", name: "Ivabrad 5", mrp: 188, price: 172 }],
  });
  add({
    salt: "Nicorandil",
    strength: "5 mg",
    category: "Cardiology",
    mhMrp: 88,
    mhPrice: 64,
    brands: [{ brand: "Nikoran", name: "Nikoran 5", mrp: 128, price: 116 }],
  });
  add({
    salt: "Isosorbide Mononitrate",
    strength: "30 mg",
    category: "Cardiology",
    mhMrp: 48,
    mhPrice: 36,
    brands: [{ brand: "Monotrate", name: "Monotrate 30", mrp: 68, price: 62 }],
  });

  add({
    salt: "Thyroxine",
    strength: "12.5 mcg",
    category: "Thyroid",
    mhMrp: 68,
    mhPrice: 52,
    brands: [
      { brand: "Thyronorm", name: "Thyronorm 12.5", mrp: 98, price: 88 },
      { brand: "Eltroxin", name: "Eltroxin 12.5", mrp: 88, price: 80 },
    ],
  });
  add({
    salt: "Thyroxine",
    strength: "25 mcg",
    category: "Thyroid",
    mhMrp: 72,
    mhPrice: 54,
    brands: [
      { brand: "Thyronorm", name: "Thyronorm 25", mrp: 108, price: 98 },
      { brand: "Eltroxin", name: "Eltroxin 25", mrp: 92, price: 84 },
    ],
  });
  add({
    salt: "Thyroxine",
    strength: "50 mcg",
    category: "Thyroid",
    mhMrp: 78,
    mhPrice: 58,
    brands: [
      { brand: "Thyronorm", name: "Thyronorm 50", mrp: 118, price: 108 },
      { brand: "Eltroxin", name: "Eltroxin 50", mrp: 98, price: 88 },
    ],
  });
  add({
    salt: "Thyroxine",
    strength: "75 mcg",
    category: "Thyroid",
    mhMrp: 82,
    mhPrice: 62,
    brands: [{ brand: "Thyronorm", name: "Thyronorm 75", mrp: 128, price: 116 }],
  });
  add({
    salt: "Thyroxine",
    strength: "88 mcg",
    category: "Thyroid",
    mhMrp: 86,
    mhPrice: 64,
    brands: [{ brand: "Thyronorm", name: "Thyronorm 88", mrp: 132, price: 120 }],
  });
  add({
    salt: "Thyroxine",
    strength: "100 mcg",
    category: "Thyroid",
    mhMrp: 88,
    mhPrice: 66,
    brands: [
      { brand: "Thyronorm", name: "Thyronorm 100", mrp: 138, price: 126 },
      { brand: "Eltroxin", name: "Eltroxin 100", mrp: 112, price: 102 },
    ],
  });
  add({
    salt: "Thyroxine",
    strength: "112 mcg",
    category: "Thyroid",
    mhMrp: 92,
    mhPrice: 68,
    brands: [{ brand: "Thyronorm", name: "Thyronorm 112", mrp: 142, price: 130 }],
  });
  add({
    salt: "Thyroxine",
    strength: "125 mcg",
    category: "Thyroid",
    mhMrp: 96,
    mhPrice: 72,
    brands: [{ brand: "Thyronorm", name: "Thyronorm 125", mrp: 148, price: 135 }],
  });
  add({
    salt: "Thyroxine",
    strength: "150 mcg",
    category: "Thyroid",
    mhMrp: 102,
    mhPrice: 76,
    brands: [{ brand: "Thyronorm", name: "Thyronorm 150", mrp: 158, price: 145 }],
  });

  add({
    salt: "Pantoprazole",
    strength: "40 mg",
    category: "Gastric",
    mhMrp: 68,
    mhPrice: 48,
    brands: [
      { brand: "Pan", name: "Pan 40", mrp: 98, price: 88 },
      { brand: "Pantocid", name: "Pantocid 40", mrp: 108, price: 98 },
    ],
  });
  add({
    salt: "Pantoprazole + Domperidone",
    strength: "40 mg + 30 mg",
    category: "Gastric",
    mhMrp: 88,
    mhPrice: 62,
    brands: [
      { brand: "Pan-D", name: "Pan-D", mrp: 138, price: 126 },
      { brand: "Pantop-D", name: "Pantop-D", mrp: 118, price: 108 },
    ],
  });
  add({
    salt: "Rabeprazole",
    strength: "20 mg",
    category: "Gastric",
    mhMrp: 62,
    mhPrice: 45,
    brands: [
      { brand: "Razo", name: "Razo 20", mrp: 98, price: 88 },
      { brand: "Rabicip", name: "Rabicip 20", mrp: 78, price: 70 },
    ],
  });
  add({
    salt: "Rabeprazole + Domperidone",
    strength: "20 mg + 30 mg",
    category: "Gastric",
    mhMrp: 82,
    mhPrice: 58,
    brands: [{ brand: "Razo D", name: "Razo-D", mrp: 128, price: 116 }],
  });
  add({
    salt: "Omeprazole",
    strength: "20 mg",
    category: "Gastric",
    mhMrp: 38,
    mhPrice: 26,
    brands: [
      { brand: "Omez", name: "Omez 20", mrp: 58, price: 52 },
      { brand: "Ocid", name: "Ocid 20", mrp: 48, price: 42 },
    ],
  });
  add({
    salt: "Esomeprazole",
    strength: "40 mg",
    category: "Gastric",
    mhMrp: 78,
    mhPrice: 56,
    brands: [{ brand: "Nexpro", name: "Nexpro 40", mrp: 118, price: 108 }],
  });
  add({
    salt: "Esomeprazole + Domperidone",
    strength: "40 mg + 30 mg",
    category: "Gastric",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "Nexpro RD", name: "Nexpro RD 40", mrp: 148, price: 135 }],
  });
  add({
    salt: "Ranitidine",
    strength: "150 mg",
    category: "Gastric",
    mhMrp: 22,
    mhPrice: 16,
    brands: [{ brand: "Rantac", name: "Rantac 150", mrp: 28, price: 24 }],
  });
  add({
    salt: "Sucralfate",
    strength: "1 g",
    category: "Gastric",
    pack: "10 sachets",
    mhMrp: 88,
    mhPrice: 64,
    rx: false,
    brands: [{ brand: "Sucrafil", name: "Sucrafil O", mrp: 118, price: 108 }],
  });
  add({
    salt: "Ondansetron",
    strength: "4 mg",
    category: "Gastric",
    mhMrp: 42,
    mhPrice: 32,
    brands: [{ brand: "Emeset", name: "Emeset 4", mrp: 58, price: 52 }],
  });

  add({
    salt: "Paracetamol",
    strength: "500 mg",
    category: "Pain Relief",
    mhMrp: 18,
    mhPrice: 12,
    rx: false,
    brands: [
      { brand: "Crocin", name: "Crocin 500", mrp: 22, price: 18 },
      { brand: "Calpol", name: "Calpol 500", mrp: 20, price: 16 },
      { brand: "Dolo", name: "Dolo 500", mrp: 24, price: 20 },
    ],
  });
  add({
    salt: "Paracetamol",
    strength: "650 mg",
    category: "Pain Relief",
    mhMrp: 22,
    mhPrice: 15,
    rx: false,
    brands: [
      { brand: "Dolo", name: "Dolo 650", mrp: 30, price: 27 },
      { brand: "Crocin", name: "Crocin 650 Advance", mrp: 32, price: 28 },
      { brand: "Calpol", name: "Calpol 650", mrp: 28, price: 24 },
    ],
  });
  add({
    salt: "Ibuprofen",
    strength: "400 mg",
    category: "Pain Relief",
    mhMrp: 28,
    mhPrice: 20,
    rx: false,
    brands: [{ brand: "Brufen", name: "Brufen 400", mrp: 38, price: 34 }],
  });
  add({
    salt: "Ibuprofen + Paracetamol",
    strength: "400 mg + 325 mg",
    category: "Pain Relief",
    mhMrp: 32,
    mhPrice: 22,
    rx: false,
    brands: [{ brand: "Combiflam", name: "Combiflam", mrp: 42, price: 38 }],
  });
  add({
    salt: "Aceclofenac",
    strength: "100 mg",
    category: "Bone & Joint",
    mhMrp: 48,
    mhPrice: 36,
    brands: [{ brand: "Hifenac", name: "Hifenac 100", mrp: 68, price: 62 }],
  });
  add({
    salt: "Aceclofenac + Paracetamol",
    strength: "100 mg + 325 mg",
    category: "Bone & Joint",
    mhMrp: 58,
    mhPrice: 42,
    brands: [
      { brand: "Hifenac P", name: "Hifenac-P", mrp: 82, price: 74 },
      { brand: "Zerodol P", name: "Zerodol-P", mrp: 78, price: 70 },
    ],
  });
  add({
    salt: "Aceclofenac + Paracetamol + Serratiopeptidase",
    strength: "100 mg + 325 mg + 15 mg",
    category: "Bone & Joint",
    mhMrp: 88,
    mhPrice: 64,
    brands: [{ brand: "Hifenac SP", name: "Hifenac-SP", mrp: 128, price: 116 }],
  });
  add({
    salt: "Diclofenac",
    strength: "50 mg",
    category: "Pain Relief",
    mhMrp: 28,
    mhPrice: 20,
    brands: [{ brand: "Voveran", name: "Voveran 50", mrp: 42, price: 38 }],
  });
  add({
    salt: "Etoricoxib",
    strength: "90 mg",
    category: "Bone & Joint",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "Etoshine", name: "Etoshine 90", mrp: 148, price: 135 }],
  });
  add({
    salt: "Tramadol + Paracetamol",
    strength: "37.5 mg + 325 mg",
    category: "Pain Relief",
    mhMrp: 78,
    mhPrice: 56,
    brands: [{ brand: "Ultracet", name: "Ultracet", mrp: 118, price: 108 }],
  });
  add({
    salt: "Gabapentin",
    strength: "100 mg",
    category: "Neurology",
    mhMrp: 68,
    mhPrice: 48,
    brands: [{ brand: "Gabapin", name: "Gabapin 100", mrp: 98, price: 88 }],
  });
  add({
    salt: "Gabapentin",
    strength: "300 mg",
    category: "Neurology",
    mhMrp: 108,
    mhPrice: 78,
    brands: [{ brand: "Gabapin", name: "Gabapin 300", mrp: 158, price: 145 }],
  });
  add({
    salt: "Pregabalin",
    strength: "75 mg",
    category: "Neurology",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "Lyrica", name: "Lyrica 75", mrp: 198, price: 182 }],
  });
  add({
    salt: "Pregabalin + Methylcobalamin",
    strength: "75 mg + 750 mcg",
    category: "Neurology",
    mhMrp: 118,
    mhPrice: 86,
    brands: [{ brand: "Pregaba M", name: "Pregaba-M 75", mrp: 168, price: 154 }],
  });

  add({
    salt: "Azithromycin",
    strength: "250 mg",
    category: "Infection",
    mhMrp: 68,
    mhPrice: 48,
    brands: [
      { brand: "Azithral", name: "Azithral 250", mrp: 98, price: 88 },
      { brand: "Azee", name: "Azee 250", mrp: 88, price: 80 },
    ],
  });
  add({
    salt: "Azithromycin",
    strength: "500 mg",
    category: "Infection",
    mhMrp: 88,
    mhPrice: 62,
    brands: [
      { brand: "Azithral", name: "Azithral 500", mrp: 128, price: 116 },
      { brand: "Azee", name: "Azee 500", mrp: 118, price: 108 },
    ],
  });
  add({
    salt: "Amoxicillin",
    strength: "500 mg",
    category: "Infection",
    mhMrp: 48,
    mhPrice: 36,
    brands: [{ brand: "Mox", name: "Mox 500", mrp: 62, price: 56 }],
  });
  add({
    salt: "Amoxicillin + Clavulanate",
    strength: "375 mg",
    category: "Infection",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "Augmentin", name: "Augmentin 375", mrp: 148, price: 135 }],
  });
  add({
    salt: "Amoxicillin + Clavulanate",
    strength: "625 mg",
    category: "Infection",
    mhMrp: 128,
    mhPrice: 92,
    brands: [
      { brand: "Augmentin", name: "Augmentin 625", mrp: 198, price: 182 },
      { brand: "Clavam", name: "Clavam 625", mrp: 158, price: 145 },
    ],
  });
  add({
    salt: "Amoxicillin + Clavulanate",
    strength: "1000 mg",
    category: "Infection",
    mhMrp: 168,
    mhPrice: 122,
    brands: [{ brand: "Augmentin", name: "Augmentin 1000", mrp: 248, price: 228 }],
  });
  add({
    salt: "Cefixime",
    strength: "200 mg",
    category: "Infection",
    mhMrp: 88,
    mhPrice: 64,
    brands: [
      { brand: "Taxim-O", name: "Taxim-O 200", mrp: 128, price: 116 },
      { brand: "Mahacef", name: "Mahacef 200", mrp: 108, price: 98 },
    ],
  });
  add({
    salt: "Cefixime + Ofloxacin",
    strength: "200 mg + 200 mg",
    category: "Infection",
    mhMrp: 128,
    mhPrice: 92,
    brands: [{ brand: "Mahacef Plus", name: "Mahacef-Plus", mrp: 178, price: 162 }],
  });
  add({
    salt: "Ciprofloxacin",
    strength: "500 mg",
    category: "Infection",
    mhMrp: 58,
    mhPrice: 42,
    brands: [{ brand: "Cifran", name: "Cifran 500", mrp: 78, price: 70 }],
  });
  add({
    salt: "Ofloxacin",
    strength: "200 mg",
    category: "Infection",
    mhMrp: 52,
    mhPrice: 38,
    brands: [{ brand: "Oflox", name: "Oflox 200", mrp: 72, price: 66 }],
  });
  add({
    salt: "Ofloxacin",
    strength: "400 mg",
    category: "Infection",
    mhMrp: 72,
    mhPrice: 52,
    brands: [{ brand: "Oflox", name: "Oflox 400", mrp: 98, price: 88 }],
  });
  add({
    salt: "Ofloxacin + Ornidazole",
    strength: "200 mg + 500 mg",
    category: "Infection",
    mhMrp: 88,
    mhPrice: 64,
    brands: [{ brand: "Oflox OZ", name: "Oflox OZ", mrp: 128, price: 116 }],
  });
  add({
    salt: "Metronidazole",
    strength: "400 mg",
    category: "Infection",
    mhMrp: 22,
    mhPrice: 16,
    brands: [{ brand: "Flagyl", name: "Flagyl 400", mrp: 28, price: 24 }],
  });
  add({
    salt: "Nitrofurantoin",
    strength: "100 mg",
    category: "Infection",
    mhMrp: 68,
    mhPrice: 48,
    brands: [{ brand: "Martifur", name: "Martifur 100", mrp: 98, price: 88 }],
  });
  add({
    salt: "Doxycycline",
    strength: "100 mg",
    category: "Infection",
    mhMrp: 48,
    mhPrice: 36,
    brands: [{ brand: "Doxt", name: "Doxt 100", mrp: 68, price: 62 }],
  });
  add({
    salt: "Levofloxacin",
    strength: "500 mg",
    category: "Infection",
    mhMrp: 78,
    mhPrice: 56,
    brands: [{ brand: "Levoflox", name: "Levoflox 500", mrp: 108, price: 98 }],
  });

  add({
    salt: "Cetirizine",
    strength: "10 mg",
    category: "Allergy",
    mhMrp: 22,
    mhPrice: 14,
    rx: false,
    brands: [
      { brand: "Okacet", name: "Okacet 10", mrp: 28, price: 24 },
      { brand: "Cetrizine", name: "Cetrizet 10", mrp: 26, price: 22 },
    ],
  });
  add({
    salt: "Levocetirizine",
    strength: "5 mg",
    category: "Allergy",
    mhMrp: 32,
    mhPrice: 22,
    rx: false,
    brands: [
      { brand: "Xyzal", name: "Xyzal 5", mrp: 78, price: 70 },
      { brand: "Levocet", name: "Levocet 5", mrp: 42, price: 38 },
    ],
  });
  add({
    salt: "Fexofenadine",
    strength: "120 mg",
    category: "Allergy",
    mhMrp: 78,
    mhPrice: 56,
    rx: false,
    brands: [{ brand: "Allegra", name: "Allegra 120", mrp: 128, price: 116 }],
  });
  add({
    salt: "Fexofenadine",
    strength: "180 mg",
    category: "Allergy",
    mhMrp: 98,
    mhPrice: 72,
    rx: false,
    brands: [{ brand: "Allegra", name: "Allegra 180", mrp: 158, price: 145 }],
  });
  add({
    salt: "Montelukast",
    strength: "10 mg",
    category: "Respiratory",
    mhMrp: 88,
    mhPrice: 64,
    brands: [
      { brand: "Montair", name: "Montair 10", mrp: 148, price: 135 },
      { brand: "Montek", name: "Montek 10", mrp: 118, price: 108 },
    ],
  });
  add({
    salt: "Montelukast + Levocetirizine",
    strength: "10 mg + 5 mg",
    category: "Allergy",
    mhMrp: 98,
    mhPrice: 72,
    brands: [
      { brand: "Montair LC", name: "Montair-LC", mrp: 168, price: 154 },
      { brand: "Montek LC", name: "Montek-LC", mrp: 138, price: 126 },
    ],
  });
  add({
    salt: "Montelukast + Fexofenadine",
    strength: "10 mg + 120 mg",
    category: "Allergy",
    mhMrp: 118,
    mhPrice: 86,
    brands: [{ brand: "Allegra M", name: "Allegra-M", mrp: 188, price: 172 }],
  });
  add({
    salt: "Budesonide",
    strength: "200 mcg",
    category: "Respiratory",
    pack: "1 inhaler",
    mhMrp: 228,
    mhPrice: 168,
    brands: [{ brand: "Budecort", name: "Budecort 200 Inhaler", mrp: 318, price: 292 }],
  });
  add({
    salt: "Salbutamol",
    strength: "100 mcg",
    category: "Respiratory",
    pack: "1 inhaler",
    mhMrp: 128,
    mhPrice: 92,
    brands: [{ brand: "Asthalin", name: "Asthalin Inhaler", mrp: 168, price: 154 }],
  });
  add({
    salt: "Formoterol + Budesonide",
    strength: "6 mcg + 200 mcg",
    category: "Respiratory",
    pack: "1 inhaler",
    mhMrp: 298,
    mhPrice: 218,
    brands: [{ brand: "Foracort", name: "Foracort 200", mrp: 398, price: 365 }],
  });
  add({
    salt: "Acebrophylline",
    strength: "100 mg",
    category: "Respiratory",
    mhMrp: 88,
    mhPrice: 64,
    brands: [{ brand: "AB Phylline", name: "AB Phylline 100", mrp: 128, price: 116 }],
  });
  add({
    salt: "Acebrophylline + Montelukast",
    strength: "200 mg + 10 mg",
    category: "Respiratory",
    mhMrp: 128,
    mhPrice: 92,
    brands: [{ brand: "AB Phylline M", name: "AB Phylline-M", mrp: 178, price: 162 }],
  });
  add({
    salt: "Ambroxol + Guaifenesin + Levosalbutamol",
    strength: "30 mg + 50 mg + 1 mg",
    category: "Respiratory",
    pack: "100 ml syrup",
    mhMrp: 88,
    mhPrice: 64,
    rx: false,
    brands: [{ brand: "Ascoril LS", name: "Ascoril LS Syrup", mrp: 118, price: 108 }],
  });

  add({
    salt: "Calcium + Vitamin D3",
    strength: "500 mg + 250 IU",
    category: "Bone & Joint",
    mhMrp: 68,
    mhPrice: 48,
    rx: false,
    brands: [
      { brand: "Shelcal", name: "Shelcal 500", mrp: 108, price: 98 },
      { brand: "Calcimax", name: "Calcimax 500", mrp: 88, price: 80 },
    ],
  });
  add({
    salt: "Calcium + Vitamin D3 + Vitamin K2-7 + Magnesium",
    strength: "500 mg + 400 IU + 50 mcg + 50 mg",
    category: "Bone & Joint",
    mhMrp: 148,
    mhPrice: 108,
    rx: false,
    brands: [{ brand: "Shelcal XT", name: "Shelcal XT", mrp: 198, price: 182 }],
  });
  add({
    salt: "Vitamin D3",
    strength: "60,000 IU",
    category: "Supplements",
    pack: "4 capsules",
    mhMrp: 78,
    mhPrice: 52,
    rx: false,
    brands: [
      { brand: "Uprise D3", name: "Uprise-D3 60K", mrp: 128, price: 116 },
      { brand: "D-Rise", name: "D-Rise 60K", mrp: 98, price: 88 },
    ],
  });
  add({
    salt: "Methylcobalamin",
    strength: "1500 mcg",
    category: "Supplements",
    mhMrp: 88,
    mhPrice: 62,
    rx: false,
    brands: [{ brand: "Nurokind", name: "Nurokind 1500", mrp: 128, price: 116 }],
  });
  add({
    salt: "Methylcobalamin + Alpha Lipoic Acid + Folic Acid + Pyridoxine",
    strength: "1500 mcg + 100 mg + 1.5 mg + 3 mg",
    category: "Supplements",
    mhMrp: 148,
    mhPrice: 108,
    rx: false,
    brands: [{ brand: "Nurokind Next", name: "Nurokind-Next", mrp: 198, price: 182 }],
  });
  add({
    salt: "Ferrous Ascorbate + Folic Acid",
    strength: "100 mg + 1.5 mg",
    category: "Supplements",
    mhMrp: 88,
    mhPrice: 64,
    rx: false,
    brands: [{ brand: "Orofer XT", name: "Orofer XT", mrp: 138, price: 126 }],
  });
  add({
    salt: "Multivitamin",
    strength: "Once daily",
    category: "Supplements",
    mhMrp: 98,
    mhPrice: 72,
    rx: false,
    brands: [
      { brand: "A to Z", name: "A to Z Gold", mrp: 148, price: 135 },
      { brand: "Becosules", name: "Becosules Z", mrp: 118, price: 108 },
    ],
  });

  add({
    salt: "Sevelamer",
    strength: "400 mg",
    category: "Kidney Care",
    mhMrp: 148,
    mhPrice: 108,
    brands: [{ brand: "Sevcar", name: "Sevcar 400", mrp: 218, price: 200 }],
  });
  add({
    salt: "Sevelamer",
    strength: "800 mg",
    category: "Kidney Care",
    mhMrp: 198,
    mhPrice: 148,
    brands: [{ brand: "Sevcar", name: "Sevcar 800", mrp: 288, price: 264 }],
  });
  add({
    salt: "Sodium Bicarbonate",
    strength: "500 mg",
    category: "Kidney Care",
    mhMrp: 28,
    mhPrice: 18,
    rx: false,
    brands: [{ brand: "Sodamint", name: "Nodosis 500", mrp: 38, price: 34 }],
  });
  add({
    salt: "Febuxostat",
    strength: "40 mg",
    category: "Kidney Care",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "Feburic", name: "Feburic 40", mrp: 148, price: 135 }],
  });
  add({
    salt: "Febuxostat",
    strength: "80 mg",
    category: "Kidney Care",
    mhMrp: 128,
    mhPrice: 92,
    brands: [{ brand: "Feburic", name: "Feburic 80", mrp: 188, price: 172 }],
  });
  add({
    salt: "Tamsulosin",
    strength: "0.4 mg",
    category: "Urology",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "Urimax", name: "Urimax 0.4", mrp: 148, price: 135 }],
  });
  add({
    salt: "Silodosin",
    strength: "8 mg",
    category: "Urology",
    mhMrp: 148,
    mhPrice: 108,
    brands: [{ brand: "Silodal", name: "Silodal 8", mrp: 198, price: 182 }],
  });
  add({
    salt: "Tamsulosin + Dutasteride",
    strength: "0.4 mg + 0.5 mg",
    category: "Urology",
    mhMrp: 168,
    mhPrice: 122,
    brands: [{ brand: "Urimax D", name: "Urimax D", mrp: 228, price: 208 }],
  });
  add({
    salt: "Finasteride",
    strength: "5 mg",
    category: "Urology",
    mhMrp: 88,
    mhPrice: 64,
    brands: [{ brand: "Finast", name: "Finast 5", mrp: 128, price: 116 }],
  });

  add({
    salt: "Tranexamic Acid + Mefenamic Acid",
    strength: "500 mg + 250 mg",
    category: "Women's Health",
    mhMrp: 118,
    mhPrice: 86,
    brands: [{ brand: "Pause MF", name: "Pause-MF", mrp: 168, price: 154 }],
  });
  add({
    salt: "Dydrogesterone",
    strength: "10 mg",
    category: "Women's Health",
    mhMrp: 198,
    mhPrice: 148,
    brands: [{ brand: "Duphaston", name: "Duphaston 10", mrp: 628, price: 575 }],
  });
  add({
    salt: "Norethisterone",
    strength: "5 mg",
    category: "Women's Health",
    mhMrp: 68,
    mhPrice: 48,
    brands: [{ brand: "Primolut N", name: "Primolut-N", mrp: 98, price: 88 }],
  });
  add({
    salt: "Clotrimazole",
    strength: "1% cream",
    category: "Dermatology",
    pack: "15 g",
    mhMrp: 48,
    mhPrice: 36,
    rx: false,
    brands: [{ brand: "Candid", name: "Candid Cream", mrp: 78, price: 70 }],
  });
  add({
    salt: "Mupirocin",
    strength: "2% ointment",
    category: "Dermatology",
    pack: "5 g",
    mhMrp: 98,
    mhPrice: 72,
    brands: [{ brand: "T-Bact", name: "T-Bact 2%", mrp: 148, price: 135 }],
  });
  add({
    salt: "Fusidic Acid",
    strength: "2% cream",
    category: "Dermatology",
    pack: "10 g",
    mhMrp: 88,
    mhPrice: 64,
    brands: [{ brand: "Fucidin", name: "Fucidin Cream", mrp: 128, price: 116 }],
  });
  add({
    salt: "Ketoconazole",
    strength: "2% shampoo",
    category: "Dermatology",
    pack: "100 ml",
    mhMrp: 148,
    mhPrice: 108,
    rx: false,
    brands: [{ brand: "Nizral", name: "Nizral 2%", mrp: 198, price: 182 }],
  });
  add({
    salt: "Hydroxyzine",
    strength: "25 mg",
    category: "Allergy",
    mhMrp: 38,
    mhPrice: 28,
    brands: [{ brand: "Atarax", name: "Atarax 25", mrp: 58, price: 52 }],
  });

  return rows;
}

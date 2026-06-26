/* ---------------------------------------------------------------------------
   Reusable UK vehicle data.

   Used by the vehicle form (brand + model dropdowns) and reusable anywhere
   else in the app. Keep this file as the single source of truth for:
     - Vehicle brands and their models
     - Fuel types
     - Vehicle types

   Notes:
   - OTHER_BRAND ("Other / Imported Vehicle") lets users add any vehicle
     whose brand is not listed.
   - OTHER_MODEL ("Other Model") is always available for every brand, so the
     user can type a custom model when theirs is not in the list.
--------------------------------------------------------------------------- */

export interface VehicleBrand {
  name: string;
  models: string[];
}

export const OTHER_BRAND = "Other / Imported Vehicle";
export const OTHER_MODEL = "Other Model";

/**
 * UK vehicle brands with common UK-market models.
 * The model lists are representative (not exhaustive) — users can always
 * pick "Other Model" to type one that is not listed.
 */
export const VEHICLE_BRANDS: VehicleBrand[] = [
  { name: "Abarth", models: ["500", "595", "695", "124 Spider"] },
  { name: "Alfa Romeo", models: ["Giulia", "Stelvio", "Tonale", "Giulietta", "MiTo"] },
  { name: "Alpine", models: ["A110"] },
  { name: "Aston Martin", models: ["DB11", "DB12", "DBX", "Vantage", "DBS"] },
  { name: "Audi", models: ["A1", "A3", "A4", "A5", "A6", "Q2", "Q3", "Q5", "Q7", "Q8", "e-tron", "TT", "RS3"] },
  { name: "Bentley", models: ["Continental GT", "Flying Spur", "Bentayga"] },
  { name: "BMW", models: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "X1", "X2", "X3", "X5", "i4", "iX", "M3"] },
  { name: "BYD", models: ["Atto 3", "Dolphin", "Seal", "Han"] },
  { name: "Cadillac", models: ["Escalade", "CT5", "Lyriq"] },
  { name: "Caterham", models: ["Seven 270", "Seven 360", "Seven 420", "Seven 620"] },
  { name: "Chevrolet", models: ["Camaro", "Spark", "Aveo", "Captiva"] },
  { name: "Chery", models: ["Tiggo 4", "Tiggo 7", "Tiggo 8"] },
  { name: "Chrysler", models: ["300C", "Grand Voyager", "Ypsilon"] },
  { name: "Citroen", models: ["C1", "C3", "C3 Aircross", "C4", "C5 Aircross", "Berlingo", "e-C4"] },
  { name: "Corvette", models: ["Stingray", "Z06", "E-Ray"] },
  { name: "Cupra", models: ["Formentor", "Born", "Leon", "Ateca", "Tavascan"] },
  { name: "Dacia", models: ["Sandero", "Duster", "Jogger", "Spring"] },
  { name: "Daihatsu", models: ["Terios", "Sirion", "Materia", "Copen"] },
  { name: "Dodge", models: ["Charger", "Challenger", "Durango", "RAM 1500"] },
  { name: "DS Automobiles", models: ["DS 3", "DS 4", "DS 7", "DS 9"] },
  { name: "Ferrari", models: ["Roma", "296 GTB", "SF90", "Purosangue", "812"] },
  { name: "Fiat", models: ["500", "500X", "Panda", "Tipo", "600", "Doblo"] },
  { name: "Ford", models: ["Fiesta", "Focus", "Puma", "Kuga", "Mondeo", "EcoSport", "Mustang", "Mustang Mach-E", "Ranger", "Transit"] },
  { name: "Genesis", models: ["G70", "G80", "GV60", "GV70", "GV80"] },
  { name: "GWM ORA", models: ["03", "Funky Cat"] },
  { name: "Honda", models: ["Jazz", "Civic", "CR-V", "HR-V", "e:Ny1", "ZR-V"] },
  { name: "Hyundai", models: ["i10", "i20", "i30", "Tucson", "Kona", "Santa Fe", "IONIQ 5", "IONIQ 6"] },
  { name: "INEOS", models: ["Grenadier"] },
  { name: "Infiniti", models: ["Q30", "Q50", "QX30", "QX70"] },
  { name: "Isuzu", models: ["D-Max"] },
  { name: "Jaguar", models: ["XE", "XF", "F-Pace", "E-Pace", "I-Pace", "F-Type"] },
  { name: "JAECOO", models: ["7"] },
  { name: "Jeep", models: ["Renegade", "Compass", "Wrangler", "Grand Cherokee", "Avenger"] },
  { name: "KGM", models: ["Torres", "Korando", "Tivoli", "Musso", "Rexton"] },
  { name: "Kia", models: ["Picanto", "Rio", "Ceed", "Sportage", "Niro", "Sorento", "EV6", "EV9", "Stonic"] },
  { name: "Lamborghini", models: ["Huracan", "Revuelto", "Urus"] },
  { name: "Land Rover", models: ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar"] },
  { name: "Leapmotor", models: ["T03", "C10"] },
  { name: "Lexus", models: ["UX", "NX", "RX", "ES", "LBX", "RZ"] },
  { name: "Lotus", models: ["Emira", "Eletre", "Evija"] },
  { name: "Maserati", models: ["Ghibli", "Levante", "Grecale", "MC20", "Quattroporte"] },
  { name: "Mazda", models: ["Mazda2", "Mazda3", "CX-30", "CX-5", "CX-60", "MX-5", "MX-30"] },
  { name: "McLaren", models: ["Artura", "750S", "GT", "765LT"] },
  { name: "Mercedes-Benz", models: ["A-Class", "B-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLB", "GLC", "GLE", "CLA", "EQA", "EQB", "EQC"] },
  { name: "MG", models: ["MG3", "MG4 EV", "MG5 EV", "HS", "ZS", "ZS EV", "Cyberster"] },
  { name: "MINI", models: ["Hatch", "Clubman", "Countryman", "Convertible", "Electric"] },
  { name: "Mitsubishi", models: ["ASX", "Outlander", "Eclipse Cross", "Mirage", "Shogun"] },
  { name: "Morgan", models: ["Plus Four", "Plus Six", "Super 3"] },
  { name: "Nissan", models: ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "Ariya", "Note"] },
  { name: "OMODA", models: ["5"] },
  { name: "Peugeot", models: ["108", "208", "308", "2008", "3008", "5008", "e-208", "Partner", "Rifter"] },
  { name: "Polestar", models: ["Polestar 2", "Polestar 3", "Polestar 4"] },
  { name: "Porsche", models: ["911", "718 Cayman", "718 Boxster", "Cayenne", "Macan", "Panamera", "Taycan"] },
  { name: "Renault", models: ["Clio", "Captur", "Megane", "Scenic", "Arkana", "Austral", "Zoe", "Kangoo"] },
  { name: "Rolls-Royce", models: ["Phantom", "Ghost", "Cullinan", "Spectre", "Wraith"] },
  { name: "Saab", models: ["9-3", "9-5"] },
  { name: "SEAT", models: ["Ibiza", "Leon", "Arona", "Ateca", "Tarraco"] },
  { name: "Skoda", models: ["Fabia", "Octavia", "Scala", "Kamiq", "Karoq", "Kodiaq", "Superb", "Enyaq"] },
  { name: "Smart", models: ["fortwo", "forfour", "#1", "#3"] },
  { name: "Subaru", models: ["Impreza", "XV", "Forester", "Outback", "Solterra", "BRZ"] },
  { name: "Suzuki", models: ["Swift", "Ignis", "Vitara", "S-Cross", "Jimny", "Across"] },
  { name: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X"] },
  { name: "Toyota", models: ["Aygo X", "Yaris", "Yaris Cross", "Corolla", "C-HR", "RAV4", "Highlander", "bZ4X", "Prius", "Hilux"] },
  { name: "Vauxhall", models: ["Corsa", "Astra", "Mokka", "Crossland", "Grandland", "Corsa Electric", "Combo"] },
  { name: "Volkswagen", models: ["Polo", "Golf", "T-Cross", "T-Roc", "Tiguan", "Passat", "ID.3", "ID.4", "ID.5", "Touareg"] },
  { name: "Volvo", models: ["XC40", "XC60", "XC90", "S60", "S90", "V60", "EX30", "EX90", "C40"] },
  { name: "XPENG", models: ["G6", "G9", "P7"] },
  // Always keep this last: lets users add any vehicle not listed above.
  { name: OTHER_BRAND, models: [] },
];

/** Fuel types (Phase 3 list). */
export const FUEL_TYPES: string[] = [
  "Petrol",
  "Diesel",
  "Hybrid",
  "Plug-in Hybrid",
  "Electric",
  "LPG",
  "Other",
];

/** Vehicle types (Phase 3 list). */
export const VEHICLE_TYPES: string[] = [
  "Hatchback",
  "Saloon",
  "Estate",
  "SUV",
  "Coupe",
  "Convertible",
  "Van",
  "MPV",
  "Pickup",
  "Other",
];

/** Just the brand names, handy for dropdowns. */
export const BRAND_NAMES: string[] = VEHICLE_BRANDS.map((b) => b.name);

/**
 * Get the model options for a brand.
 * "Other Model" is always appended so the user can type a custom model.
 * For "Other / Imported Vehicle" only "Other Model" is offered.
 */
export function getModelsForBrand(brandName: string): string[] {
  const brand = VEHICLE_BRANDS.find((b) => b.name === brandName);
  const base = brand ? brand.models : [];
  return [...base, OTHER_MODEL];
}

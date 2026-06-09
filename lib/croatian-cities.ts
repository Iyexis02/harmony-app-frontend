/**
 * Static list of Croatian cities, towns, and major settlements.
 * Used for city autocomplete in the location step.
 * Coordinates are resolved separately via Nominatim when a city is selected.
 */
export const CROATIAN_CITIES: string[] = [
  // Major cities
  'Zagreb',
  'Split',
  'Rijeka',
  'Osijek',
  'Zadar',
  'Slavonski Brod',
  'Pula',
  'Karlovac',
  'Sisak',
  'Varaždin',
  'Šibenik',
  'Dubrovnik',
  'Bjelovar',
  'Vinkovci',
  'Koprivnica',
  'Vukovar',
  'Požega',
  'Čakovec',
  'Petrinja',
  'Gospić',
  'Virovitica',
  'Đakovo',
  'Knin',
  // Zagreb county
  'Samobor',
  'Dugo Selo',
  'Velika Gorica',
  'Zaprešić',
  'Sveti Ivan Zelina',
  'Jastrebarsko',
  'Vrbovec',
  'Ivanić-Grad',
  // Split-Dalmatia
  'Solin',
  'Kaštela',
  'Sinj',
  'Trogir',
  'Omiš',
  'Makarska',
  'Metković',
  'Imotski',
  'Vrgorac',
  'Trilj',
  'Ploče',
  'Opuzen',
  // Istria
  'Rovinj',
  'Poreč',
  'Umag',
  'Pazin',
  'Labin',
  'Novigrad',
  'Buje',
  'Buzet',
  'Vodnjan',
  // Kvarner
  'Opatija',
  'Crikvenica',
  'Krk',
  'Mali Lošinj',
  'Rab',
  'Novi Vinodolski',
  'Senj',
  'Delnice',
  'Čabar',
  // Dalmatia
  'Biograd na Moru',
  'Benkovac',
  'Drniš',
  'Skradin',
  'Vodice',
  'Murter',
  'Tisno',
  // Islands
  'Korčula',
  'Hvar',
  'Supetar',
  'Vis',
  'Stari Grad',
  'Jelsa',
  'Bol',
  'Komiža',
  'Novalja',
  'Pag',
  'Vir',
  'Ugljan',
  'Biograd',
  // Primorje / Gorski kotar
  'Ogulin',
  'Otočac',
  'Kutina',
  'Novska',
  // Slavonia / Baranja
  'Nova Gradiška',
  'Đurđevac',
  'Križevci',
  'Beli Manastir',
  'Našice',
  'Orahovica',
  'Slatina',
  'Donji Miholjac',
  'Valpovo',
  'Županja',
  'Ilok',
  'Lipik',
  'Pakrac',
  // Zagorje / Međimurje
  'Krapina',
  'Zabok',
  'Ivanec',
  'Ludbreg',
  'Prelog',
  'Mursko Središće',
  'Donja Stubica',
  'Oroslavje',
  'Pregrada',
  'Klanjec',
  // Coastal towns
  'Brela',
  'Baška Voda',
  'Podgora',
  'Gradac',
  'Drvenik',
  'Živogošće',
  'Omiš',
  'Kaštel Stari',
  'Kaštel Novi',
  'Kaštel Lukšić',
  'Kaštel Kambelovac',
  'Kaštel Gomilica',
  'Kaštel Sućurac',
  'Tučepi',
  'Promajna',
  'Mimice',
  'Pisak',
  'Duće',
  'Stobreč',
  'Podstrana',
  // Other notable
  'Čazma',
  'Garešnica',
  'Grubišno Polje',
  'Daruvar',
  'Pakrac',
  'Popovača',
  'Glina',
  'Hrvatska Kostajnica',
  'Duga Resa',
  'Slunj',
  'Vrlika',
  'Sinj',
  'Trilj',
  'Vrgorac',
  'Ploče',
];

/**
 * Search Croatian cities by query string.
 * Case-insensitive, accent-insensitive prefix/substring match.
 */
export function searchCroatianCities(query: string): string[] {
  if (!query || query.length < 2) return [];

  const normalized = normalizeStr(query);

  return CROATIAN_CITIES.filter((city) => normalizeStr(city).includes(normalized)).slice(0, 7);
}

function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (š→s, č→c, ž→z, ć→c, đ→d)
    .replace(/[đ]/g, 'd');
}

// src/lib/location/countries.ts
// Build a localized list of countries with value = ISO-3166 alpha-2 (US, PT, BR, ...)
// and label = full country name in the current UI language.

export interface CountryOption {
  value: string; // "PT"
  label: string; // "Portugal"
}

// Complete ISO 3166-1 alpha-2 list (official codes; 249 entries)
const ISO_ALPHA2: readonly string[] = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
  "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","EH","ER","ES","ET",
  "FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
  "HK","HM","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
  "JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ",
  "OM",
  "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
  "QA",
  "RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
  "TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","UM","US","UY","UZ",
  "VA","VC","VE","VG","VI","VN","VU",
  "WF","WS",
  "YE","YT",
  "ZA","ZM","ZW"
];

// Localize a single country name; fall back to a tiny hand map, then code itself.
const regionDisplayName = (code: string, locale: string): string => {
  try {
    // Some older browsers might not have Intl.DisplayNames
    if (typeof Intl.DisplayNames === "function") {
      const dn = new Intl.DisplayNames([locale], { type: "region" });
      const name = dn.of(code);
      if (name) return name;
    }
  } catch {
    // ignore and fallback
  }
  const tinyFallback: Record<string, string> = {
    US: "United States",
    GB: "United Kingdom",
    PT: "Portugal",
    BR: "Brazil",
    ES: "Spain",
    FR: "France",
    DE: "Germany",
    IT: "Italy",
    NL: "Netherlands",
    CA: "Canada",
    AU: "Australia",
    JP: "Japan",
    CN: "China",
    IN: "India"
  };
  return tinyFallback[code] ?? code;
};

export const getCountries = (locale = "en"): CountryOption[] => {
  const items: CountryOption[] = ISO_ALPHA2.map((c) => ({
    value: c,
    label: regionDisplayName(c, locale)
  }));
  items.sort((a, b) => a.label.localeCompare(b.label, locale));
  return items;
};

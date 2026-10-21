// constants/countryConfig.ts
//
// Task 8, pointer 8.b.i. Country presentation config for the mobile app,
// generated from the web's src/config/countries/*.ts (the source of truth)
// so the app stops hardcoding Nigeria. Carries only the fields the app
// renders with: currency/symbol, locale, phone digit bounds, the per-country
// telecom (network) list, and the payment gateway (which decides how the
// wallet is funded - virtual account vs mobile money). The flag is
// intentionally omitted - the web's flag is a React component, which does
// not port to React Native; flagEmoji is carried instead.
//
// Regenerate with scripts/gen-country-config (kept in the web repo's Task 8
// tooling) whenever the web country set changes.

export interface CountryTelecom {
  id: string;
  name: string;
  code: string;
}

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  phoneCode: string;
  locale: string;
  phoneNumber: { minDigits: number; maxDigits: number };
  /** How this country's wallet is funded; NG is the only virtual-account market. */
  paymentGateway: { provider: "xixapay" | "korapay" | "flutterwave"; methods: string[] };
  telecoms: CountryTelecom[];
}

export const DEFAULT_COUNTRY = "ng";

export const COUNTRIES: Record<string, CountryConfig> = {
  bf: {
    code: "bf",
    name: "Burkina Faso",
    currency: "XOF",
    currencySymbol: "CFA",
    phoneCode: "+226",
    locale: "fr-BF",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 8, maxDigits: 8 },
    telecoms: [
      { id: "onatel", name: "Onatel", code: "ONATEL" },
      { id: "orange", name: "Orange", code: "ORANGE" },
      { id: "telecel", name: "Telecel", code: "TELECEL" },
    ],
  },
  bj: {
    code: "bj",
    name: "Benin",
    currency: "XOF",
    currencySymbol: "CFA",
    phoneCode: "+229",
    locale: "fr-BJ",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 10, maxDigits: 10 },
    telecoms: [
      { id: "moov", name: "Moov", code: "MOOV" },
      { id: "mtn", name: "MTN", code: "MTN" },
    ],
  },
  cd: {
    code: "cd",
    name: "DRC",
    currency: "CDF",
    currencySymbol: "FC",
    phoneCode: "+243",
    locale: "fr-CD",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "africell", name: "Africell", code: "AFRICELL" },
      { id: "airtel", name: "Airtel", code: "AIRTEL" },
      { id: "orange", name: "Orange", code: "ORANGE" },
    ],
  },
  cf: {
    code: "cf",
    name: "Central African Republic",
    currency: "XAF",
    currencySymbol: "FCFA",
    phoneCode: "+236",
    locale: "fr-CF",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 8, maxDigits: 8 },
    telecoms: [
      { id: "telecel", name: "Telecel", code: "TELECEL" },
    ],
  },
  cg: {
    code: "cg",
    name: "Congo",
    currency: "XAF",
    currencySymbol: "FCFA",
    phoneCode: "+242",
    locale: "fr-CG",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "mtn", name: "MTN", code: "MTN" },
    ],
  },
  ci: {
    code: "ci",
    name: "Ivory Coast",
    currency: "XOF",
    currencySymbol: "CFA",
    phoneCode: "+225",
    locale: "fr-CI",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 10, maxDigits: 10 },
    telecoms: [
      { id: "moov", name: "Moov", code: "MOOV" },
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "orange", name: "Orange", code: "ORANGE" },
    ],
  },
  cm: {
    code: "cm",
    name: "Cameroon",
    currency: "XAF",
    currencySymbol: "FCFA",
    phoneCode: "+237",
    locale: "fr-CM",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "camtel", name: "Camtel", code: "CAMTEL" },
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "orange", name: "Orange", code: "ORANGE" },
    ],
  },
  eg: {
    code: "eg",
    name: "Egypt",
    currency: "EGP",
    currencySymbol: "E£",
    phoneCode: "+20",
    locale: "ar-EG",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 10, maxDigits: 10 },
    telecoms: [
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "orange", name: "Orange", code: "ORANGE" },
      { id: "moov", name: "Moov", code: "MOOV" },
      { id: "wave", name: "Wave", code: "WAVE" },
    ],
  },
  ga: {
    code: "ga",
    name: "Gabon",
    currency: "XAF",
    currencySymbol: "FCFA",
    phoneCode: "+241",
    locale: "fr-GA",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 8, maxDigits: 8 },
    telecoms: [
      { id: "moov", name: "Moov", code: "MOOV" },
    ],
  },
  gh: {
    code: "gh",
    name: "Ghana",
    currency: "GHS",
    currencySymbol: "₵",
    phoneCode: "+233",
    locale: "en-GH",
    paymentGateway: { provider: "korapay", methods: ["mobile_money", "bank_transfer"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "airtel_tigo", name: "AirtelTigo", code: "AIRTEL_TIGO" },
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "telecel", name: "Telecel", code: "TELECEL" },
    ],
  },
  gn: {
    code: "gn",
    name: "Guinea",
    currency: "XOF",
    currencySymbol: "CFA",
    phoneCode: "+224",
    locale: "fr-GN",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "cellcom", name: "Cellcom", code: "CELLCOM" },
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "orange", name: "Orange", code: "ORANGE" },
    ],
  },
  gq: {
    code: "gq",
    name: "Equatorial Guinea",
    currency: "XAF",
    currencySymbol: "FCFA",
    phoneCode: "+240",
    locale: "es-GQ",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "orange", name: "Orange", code: "ORANGE" },
    ],
  },
  ke: {
    code: "ke",
    name: "Kenya",
    currency: "KES",
    currencySymbol: "KSh",
    phoneCode: "+254",
    locale: "en-KE",
    paymentGateway: { provider: "korapay", methods: ["mobile_money", "bank_transfer"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "airtel", name: "Airtel", code: "AIRTEL" },
      { id: "kenyatelkom", name: "KenyaTelkom", code: "KENYATELKOM" },
      { id: "safaricom", name: "Safaricom", code: "SAFARICOM" },
    ],
  },
  ma: {
    code: "ma",
    name: "Morocco",
    currency: "MAD",
    currencySymbol: "DH",
    phoneCode: "+212",
    locale: "fr-MA",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "orange", name: "Orange", code: "ORANGE" },
    ],
  },
  ml: {
    code: "ml",
    name: "Mali",
    currency: "XOF",
    currencySymbol: "CFA",
    phoneCode: "+223",
    locale: "fr-ML",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 8, maxDigits: 8 },
    telecoms: [
      { id: "malitel", name: "Malitel", code: "MALITEL" },
      { id: "orange", name: "Orange", code: "ORANGE" },
      { id: "telecel", name: "Telecel", code: "TELECEL" },
    ],
  },
  ne: {
    code: "ne",
    name: "Niger",
    currency: "XOF",
    currencySymbol: "CFA",
    phoneCode: "+227",
    locale: "fr-NE",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 8, maxDigits: 8 },
    telecoms: [
      { id: "airtel", name: "Airtel", code: "AIRTEL" },
      { id: "moov", name: "Moov", code: "MOOV" },
      { id: "orange", name: "Orange", code: "ORANGE" },
    ],
  },
  ng: {
    code: "ng",
    name: "Nigeria",
    currency: "NGN",
    currencySymbol: "₦",
    phoneCode: "+234",
    locale: "en-NG",
    paymentGateway: { provider: "xixapay", methods: ["virtual_account", "card"] },
    phoneNumber: { minDigits: 10, maxDigits: 10 },
    telecoms: [
      { id: "9mobile", name: "9MOBILE", code: "9MOBILE" },
      { id: "airtel", name: "Airtel", code: "AIRTEL" },
      { id: "glo", name: "GLO", code: "GLO" },
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "ninemobile", name: "NineMobile", code: "NINEMOBILE" },
    ],
  },
  rw: {
    code: "rw",
    name: "Rwanda",
    currency: "RWF",
    currencySymbol: "FRw",
    phoneCode: "+250",
    locale: "en-RW",
    paymentGateway: { provider: "flutterwave", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "airtel", name: "Airtel", code: "AIRTEL" },
      { id: "mtn", name: "MTN", code: "MTN" },
    ],
  },
  sn: {
    code: "sn",
    name: "Senegal",
    currency: "XOF",
    currencySymbol: "CFA",
    phoneCode: "+221",
    locale: "fr-SN",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "expresso", name: "Expresso", code: "EXPRESSO" },
      { id: "orange", name: "Orange", code: "ORANGE" },
      { id: "yas", name: "YAS", code: "YAS" },
    ],
  },
  td: {
    code: "td",
    name: "Chad",
    currency: "XAF",
    currencySymbol: "FCFA",
    phoneCode: "+235",
    locale: "fr-TD",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 8, maxDigits: 8 },
    telecoms: [
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "orange", name: "Orange", code: "ORANGE" },
    ],
  },
  tg: {
    code: "tg",
    name: "Togo",
    currency: "XOF",
    currencySymbol: "CFA",
    phoneCode: "+228",
    locale: "fr-TG",
    paymentGateway: { provider: "korapay", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 8, maxDigits: 8 },
    telecoms: [
      { id: "moov", name: "Moov", code: "MOOV" },
      { id: "togocel", name: "Togocel", code: "TOGOCEL" },
    ],
  },
  ug: {
    code: "ug",
    name: "Uganda",
    currency: "UGX",
    currencySymbol: "USh",
    phoneCode: "+256",
    locale: "en-UG",
    paymentGateway: { provider: "flutterwave", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "airtel", name: "Airtel", code: "AIRTEL" },
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "telecom", name: "Telecom", code: "TELECOM" },
    ],
  },
  za: {
    code: "za",
    name: "South Africa",
    currency: "ZAR",
    currencySymbol: "R",
    phoneCode: "+27",
    locale: "en-ZA",
    paymentGateway: { provider: "korapay", methods: ["bank_transfer"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "cellc", name: "CellC", code: "CELLC" },
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "telkommobile", name: "TelkomMobile", code: "TELKOMMOBILE" },
      { id: "vodacom", name: "Vodacom", code: "VODACOM" },
    ],
  },
  zm: {
    code: "zm",
    name: "Zambia",
    currency: "ZMW",
    currencySymbol: "ZK",
    phoneCode: "+260",
    locale: "en-ZM",
    paymentGateway: { provider: "flutterwave", methods: ["mobile_money"] },
    phoneNumber: { minDigits: 9, maxDigits: 9 },
    telecoms: [
      { id: "airtel", name: "Airtel", code: "AIRTEL" },
      { id: "mtn", name: "MTN", code: "MTN" },
      { id: "zamtel", name: "Zamtel", code: "ZAMTEL" },
    ],
  },
};

/** Country config for a code, falling back to the default country. */
export function getCountryConfig(code: string | null | undefined): CountryConfig {
  return COUNTRIES[(code || "").toLowerCase()] || COUNTRIES[DEFAULT_COUNTRY];
}

/**
 * Airtime quick-select denominations for a country's currency. The global_*
 * catalog defines the real denominations; these are the common presets shown
 * before the user types an amount. High-inflation currencies (XAF/XOF, RWF,
 * UGX) need larger presets than the NGN/GHS tier.
 */
export function getQuickAmounts(country: CountryConfig): string[] {
  const values = (() => {
    switch (country.currency) {
      case "XAF":
      case "XOF":
        return [500, 1000, 2000, 5000];
      case "RWF":
      case "UGX":
        return [500, 1000, 2000, 5000];
      case "GNF":
        return [5000, 10000, 20000, 50000];
      case "CDF":
        return [1000, 5000, 10000, 20000];
      case "ZMW":
        return [5, 10, 20, 50];
      case "GHS":
        return [1, 2, 5, 10];
      case "KES":
        return [20, 50, 100, 200];
      case "ZAR":
        return [10, 20, 50, 100];
      case "MAD":
      case "EGP":
        return [10, 20, 50, 100];
      default:
        // NGN and anything unmapped.
        return [100, 200, 500, 1000];
    }
  })();
  return values.map(String);
}

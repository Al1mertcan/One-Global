// ONE Global — dünya para birimleri listesi + tarayıcı diline göre otomatik tahmin.
// Kapsam notu: ISO 4217'deki neredeyse tüm ülke para birimlerini içerir
// (bazı küçük ada ülkeleri komşu büyük ülkenin parasını -ör. USD, AUD, EUR-
// paylaştığı için ayrı satır olarak listelenmemiştir). Otomatik tahmin,
// navigator.language'daki ülke koduna bakan basit bir eşleme kullanır —
// %100 kesin değildir (VPN, çok dilli tarayıcı ayarları vb. yanıltabilir),
// bu yüzden kullanıcı her zaman elle değiştirebilir.
(function (global) {
  'use strict';

  var CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
    { code: 'EGP', symbol: '£', name: 'Egyptian Pound' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
    { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
    { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
    { code: 'COP', symbol: '$', name: 'Colombian Peso' },
    { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
    { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
    { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
    { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
    { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
    { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
    { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham' },
    { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar' },
    { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' },
    { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
    { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
    { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
    { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
    { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
    { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal' },
    { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
    { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar' },
    { code: 'OMR', symbol: '﷼', name: 'Omani Rial' },
    { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar' },
    { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound' },
    { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar' },
    { code: 'IRR', symbol: '﷼', name: 'Iranian Rial' },
    { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
    { code: 'LKR', symbol: '₨', name: 'Sri Lankan Rupee' },
    { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee' },
    { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat' },
    { code: 'KHR', symbol: '៛', name: 'Cambodian Riel' },
    { code: 'LAK', symbol: '₭', name: 'Lao Kip' },
    { code: 'MNT', symbol: '₮', name: 'Mongolian Tögrög' },
    { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge' },
    { code: 'UZS', symbol: 'сўм', name: 'Uzbekistani Som' },
    { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat' },
    { code: 'GEL', symbol: '₾', name: 'Georgian Lari' },
    { code: 'AMD', symbol: '֏', name: 'Armenian Dram' },
    { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble' },
    { code: 'RSD', symbol: 'дин', name: 'Serbian Dinar' },
    { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar' },
    { code: 'ALL', symbol: 'L', name: 'Albanian Lek' },
    { code: 'BAM', symbol: 'KM', name: 'Bosnia-Herzegovina Mark' },
    { code: 'ISK', symbol: 'kr', name: 'Icelandic Króna' },
    { code: 'NZD', symbol: '$', name: 'New Zealand Dollar' },
    { code: 'FJD', symbol: '$', name: 'Fijian Dollar' },
    { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina' },
    { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
    { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar' },
    { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar' },
    { code: 'MOP', symbol: 'MOP$', name: 'Macanese Pataca' },
    { code: 'BND', symbol: '$', name: 'Brunei Dollar' },
    { code: 'XCD', symbol: '$', name: 'East Caribbean Dollar' },
    { code: 'JMD', symbol: '$', name: 'Jamaican Dollar' },
    { code: 'TTD', symbol: '$', name: 'Trinidad & Tobago Dollar' },
    { code: 'BBD', symbol: '$', name: 'Barbadian Dollar' },
    { code: 'BSD', symbol: '$', name: 'Bahamian Dollar' },
    { code: 'BZD', symbol: '$', name: 'Belize Dollar' },
    { code: 'GYD', symbol: '$', name: 'Guyanese Dollar' },
    { code: 'SRD', symbol: '$', name: 'Surinamese Dollar' },
    { code: 'HTG', symbol: 'G', name: 'Haitian Gourde' },
    { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso' },
    { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },
    { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal' },
    { code: 'HNL', symbol: 'L', name: 'Honduran Lempira' },
    { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Córdoba' },
    { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa' },
    { code: 'PYG', symbol: '₲', name: 'Paraguayan Guaraní' },
    { code: 'BOB', symbol: 'Bs.', name: 'Bolivian Boliviano' },
    { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
    { code: 'VES', symbol: 'Bs.S', name: 'Venezuelan Bolívar' },
    { code: 'CUP', symbol: '$', name: 'Cuban Peso' },
    { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder' },
    { code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin' },
    { code: 'BMD', symbol: '$', name: 'Bermudian Dollar' },
    { code: 'KYD', symbol: '$', name: 'Cayman Islands Dollar' },
    { code: 'CDF', symbol: 'FC', name: 'Congolese Franc' },
    { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
    { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc' },
    { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha' },
    { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha' },
    { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical' },
    { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza' },
    { code: 'NAD', symbol: '$', name: 'Namibian Dollar' },
    { code: 'BWP', symbol: 'P', name: 'Botswana Pula' },
    { code: 'SZL', symbol: 'L', name: 'Eswatini Lilangeni' },
    { code: 'LSL', symbol: 'L', name: 'Lesotho Loti' },
    { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee' },
    { code: 'SCR', symbol: '₨', name: 'Seychellois Rupee' },
    { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary' },
    { code: 'SOS', symbol: 'Sh', name: 'Somali Shilling' },
    { code: 'SDG', symbol: 'ج.س', name: 'Sudanese Pound' },
    { code: 'SSP', symbol: '£', name: 'South Sudanese Pound' },
    { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa' },
    { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc' },
    { code: 'LYD', symbol: 'ل.د', name: 'Libyan Dinar' },
    { code: 'YER', symbol: '﷼', name: 'Yemeni Rial' },
    { code: 'SYP', symbol: '£', name: 'Syrian Pound' },
    { code: 'BTN', symbol: 'Nu.', name: 'Bhutanese Ngultrum' },
    { code: 'MVR', symbol: '.ރ', name: 'Maldivian Rufiyaa' },
    { code: 'WST', symbol: 'T', name: 'Samoan Tālā' },
    { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga' },
    { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu' },
    { code: 'SBD', symbol: '$', name: 'Solomon Islands Dollar' },
    { code: 'TMT', symbol: 'm', name: 'Turkmenistani Manat' },
    { code: 'KGS', symbol: 'с', name: 'Kyrgyzstani Som' },
    { code: 'TJS', symbol: 'SM', name: 'Tajikistani Somoni' },
  ];

  // ISO 3166 ülke kodu -> ISO 4217 para birimi kodu (otomatik tahmin için).
  var COUNTRY_TO_CURRENCY = {
    US: 'USD', GB: 'GBP', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR',
    NL: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
    EE: 'EUR', LV: 'EUR', LT: 'EUR', CY: 'EUR', MT: 'EUR', HR: 'EUR',
    TR: 'TRY', BR: 'BRL', RU: 'RUB', KR: 'KRW', AU: 'AUD', CA: 'CAD', CH: 'CHF', MX: 'MXN',
    ID: 'IDR', NG: 'NGN', ZA: 'ZAR', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', TH: 'THB',
    MY: 'MYR', PH: 'PHP', VN: 'VND', EG: 'EGP', SA: 'SAR', AE: 'AED', IL: 'ILS', PK: 'PKR',
    BD: 'BDT', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', UA: 'UAH', CZ: 'CZK', HU: 'HUF',
    RO: 'RON', BG: 'BGN', KE: 'KES', GH: 'GHS', MA: 'MAD', DZ: 'DZD', TN: 'TND', ET: 'ETB',
    TZ: 'TZS', UG: 'UGX', SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF',
    CM: 'XAF', GA: 'XAF', CG: 'XAF', TD: 'XAF', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
    JO: 'JOD', LB: 'LBP', IQ: 'IQD', IR: 'IRR', AF: 'AFN', LK: 'LKR', NP: 'NPR', MM: 'MMK',
    KH: 'KHR', LA: 'LAK', MN: 'MNT', KZ: 'KZT', UZ: 'UZS', AZ: 'AZN', GE: 'GEL', AM: 'AMD',
    BY: 'BYN', RS: 'RSD', MK: 'MKD', AL: 'ALL', BA: 'BAM', IS: 'ISK', NZ: 'NZD', FJ: 'FJD',
    PG: 'PGK', SG: 'SGD', HK: 'HKD', TW: 'TWD', MO: 'MOP', BN: 'BND', JM: 'JMD', TT: 'TTD',
    BB: 'BBD', BS: 'BSD', BZ: 'BZD', GY: 'GYD', SR: 'SRD', HT: 'HTG', DO: 'DOP', CR: 'CRC',
    GT: 'GTQ', HN: 'HNL', NI: 'NIO', PA: 'PAB', PY: 'PYG', BO: 'BOB', UY: 'UYU', VE: 'VES',
    CU: 'CUP', CD: 'CDF', RW: 'RWF', BI: 'BIF', MW: 'MWK', ZM: 'ZMW', MZ: 'MZN', AO: 'AOA',
    NA: 'NAD', BW: 'BWP', SZ: 'SZL', LS: 'LSL', MU: 'MUR', SC: 'SCR', MG: 'MGA', SO: 'SOS',
    SD: 'SDG', SS: 'SSP', ER: 'ERN', DJ: 'DJF', LY: 'LYD', YE: 'YER', SY: 'SYP', BT: 'BTN',
    MV: 'MVR', WS: 'WST', TO: 'TOP', VU: 'VUV', SB: 'SBD', TM: 'TMT', KG: 'KGS', TJ: 'TJS',
    IN: 'INR', CN: 'CNY', JP: 'JPY',
  };

  function guessCurrency() {
    try {
      var loc = navigator.language || navigator.userLanguage || 'en-US';
      var parts = loc.split('-');
      var region = (parts[1] || '').toUpperCase();
      if (COUNTRY_TO_CURRENCY[region]) return COUNTRY_TO_CURRENCY[region];
    } catch (e) {}
    return 'USD';
  }

  // Ülkeye göre fiyat istisnaları: varsayılan model "her yerde ayda 1 birim"
  // olsa da, yıllık enflasyonu ~%15 ve üzerinde olan ülkelerde (IMF'in 2026
  // tahminlerine göre) "1 birim" o ülkenin zayıf/aşırı değer kaybetmiş para
  // biriminde neredeyse sıfıra denk geldiği için aylık ücret bilinçli olarak
  // 10 birim olacak şekilde ayarlandı: Türkiye (TRY), Venezuela (VES), Sudan
  // (SDG), İran (IRR), Arjantin (ARS), Yemen (YER), Malavi (MWK), Haiti
  // (HTG), Bolivya (BOB), Myanmar (MMK), Nijerya (NGN). Burada listelenmeyen
  // tüm para birimleri varsayılan olarak 1 birim/ay olmaya devam eder. Bu
  // eşleme, sunucu tarafındaki netlify/functions/create-checkout-session.js
  // dosyasındaki PRICE_OVERRIDES ile birebir aynı tutulmalıdır (gerçek
  // tahsilat orada yapılır) — burası sadece kullanıcıya ödeme öncesi doğru
  // fiyatı göstermek için var.
  var PRICE_OVERRIDES = {
    TRY: 10, VES: 10, SDG: 10, IRR: 10, ARS: 10, YER: 10,
    MWK: 10, HTG: 10, BOB: 10, MMK: 10, NGN: 10,
  };

  function getPrice(code) {
    return PRICE_OVERRIDES.hasOwnProperty(code) ? PRICE_OVERRIDES[code] : 1;
  }

  global.ONE_CURRENCIES = { list: CURRENCIES, guess: guessCurrency, getPrice: getPrice };
})(window);

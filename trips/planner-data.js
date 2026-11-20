/* planner-data.js — 여행 플래너 정적 데이터: 통화, 나라별 통화, 지출 분류·결제 수단, 준비물 틀, 참고용 환율.
   - 표시 이름은 한국어가 키(i18n.js). 통화·나라 이름은 Intl.DisplayNames 로 현재 언어에 맞춘다.
   - 참고용 환율(REF_FX)은 서버에서 환율을 한 번도 받지 못했을 때만 쓰는 대략값이다. 화면에 항상 '참고용'이라고 표시한다. */
(function (root) {
'use strict';

// 통화: 기호, 소수 자리, 고시 단위(엔·동·루피아는 100단위로 적는다: "100엔 = 930원")
const CUR = {
  KRW: ['₩', 0, 1], JPY: ['¥', 0, 100], USD: ['$', 2, 1], EUR: ['€', 2, 1], CNY: ['¥', 2, 1], TWD: ['NT$', 0, 1], HKD: ['HK$', 2, 1], MOP: ['MOP$', 2, 1],
  THB: ['฿', 2, 1], VND: ['₫', 0, 100], PHP: ['₱', 2, 1], SGD: ['S$', 2, 1], MYR: ['RM', 2, 1], IDR: ['Rp', 0, 100], KHR: ['៛', 0, 100], LAK: ['₭', 0, 100],
  MNT: ['₮', 0, 100], INR: ['₹', 2, 1], AED: ['AED', 2, 1], TRY: ['₺', 2, 1], GBP: ['£', 2, 1], CHF: ['CHF', 2, 1], CZK: ['Kč', 2, 1], HUF: ['Ft', 0, 100],
  PLN: ['zł', 2, 1], DKK: ['kr', 2, 1], SEK: ['kr', 2, 1], NOK: ['kr', 2, 1], ISK: ['kr', 0, 1], AUD: ['A$', 2, 1], NZD: ['NZ$', 2, 1], CAD: ['C$', 2, 1],
  MXN: ['MX$', 2, 1], BRL: ['R$', 2, 1], EGP: ['E£', 2, 1], ZAR: ['R', 2, 1], UZS: ['soʻm', 0, 100], KZT: ['₸', 0, 100], FJD: ['FJ$', 2, 1], RUB: ['₽', 2, 1],
};

// 나라 → 통화
const CC_CUR = {
  KR: 'KRW', JP: 'JPY', CN: 'CNY', TW: 'TWD', HK: 'HKD', MO: 'MOP', TH: 'THB', VN: 'VND', PH: 'PHP', SG: 'SGD', MY: 'MYR', ID: 'IDR', KH: 'KHR', LA: 'LAK',
  MN: 'MNT', IN: 'INR', AE: 'AED', TR: 'TRY', US: 'USD', GU: 'USD', MP: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', GB: 'GBP', CH: 'CHF', CZ: 'CZK', HU: 'HUF',
  PL: 'PLN', DK: 'DKK', SE: 'SEK', NO: 'NOK', IS: 'ISK', AU: 'AUD', NZ: 'NZD', EG: 'EGP', ZA: 'ZAR', UZ: 'UZS', KZ: 'KZT', FJ: 'FJD', RU: 'RUB',
  FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', LU: 'EUR', AT: 'EUR', IE: 'EUR', GR: 'EUR', FI: 'EUR', HR: 'EUR', SK: 'EUR',
  SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', MT: 'EUR', CY: 'EUR', MC: 'EUR', VA: 'EUR', SM: 'EUR',
};

// 언어별 기본 기준 통화(설정에서 바꿀 수 있다)
const HOME_BY_LANG = { ko: 'KRW', ja: 'JPY', en: 'USD', 'zh-Hans': 'CNY', 'zh-Hant': 'TWD', es: 'EUR', fr: 'EUR', de: 'EUR', 'pt-BR': 'BRL', it: 'EUR', ru: 'RUB', id: 'IDR', th: 'THB', vi: 'VND' };

// 지출 분류 [id, 한국어 이름, 색]
const CATS = [
  ['food', '식비', '#F5A623'], ['move', '교통', '#3182F6'], ['shop', '쇼핑', '#F04452'],
  ['sight', '관광', '#03B26C'], ['stay', '숙박', '#7A4FE0'], ['etc', '기타', '#8B95A1'],
];
// 결제 수단 [id, 한국어 이름]
const METHODS = [['cash', '현금'], ['card', '카드'], ['tcard', '외화 카드'], ['pay', '간편결제']];
// 예약 종류 [id, 한국어 이름]
const BOOKINGS = [['flight', '항공'], ['stay', '숙소'], ['car', '렌터카'], ['rail', '기차·버스'], ['ticket', '입장권·패스'], ['insure', '여행자 보험'], ['sim', 'eSIM·로밍'], ['etc', '기타']];

// 준비물·할 일 틀 (한국어가 키)
const CHECK = {
  pack: ['여권', '항공권(e티켓)', '숙소 예약 확인서', '신용카드·체크카드', '현금', '휴대폰 충전기', '보조 배터리', '멀티 어댑터', '상비약', '세면도구', '갈아입을 옷', '우산', '선크림', '이어폰'],
  todo: ['여권 만료일 확인', '환전하기', '로밍·eSIM 준비', '여행자 보험 가입', '입국 신고·비자 확인(공식 사이트)', '항공·숙소 예약 다시 확인', '카드 해외 결제 설정'],
  JP: { pack: ['110V 어댑터', '동전 지갑'], todo: ['Visit Japan Web 등록 여부 확인'] },
};

// 참고용 환율: 1 외화 단위당 원(KRW), 2026-11-12 값. 서버 환율을 한 번도 못 받았을 때만 쓰는 대략값(오래될수록 실제와 벌어진다)
const REF_FX = {
  date: '2026-11-12', base: 'KRW', approx: true,
  rates: {
    KRW: 1, JPY: 8.393, USD: 1335.0, EUR: 1488.0, CNY: 200.4, TWD: 40.66, HKD: 170.2, MOP: 165.5, THB: 39.66, VND: 0.05207, PHP: 21.1, SGD: 1042.0,
    MYR: 328.1, IDR: 0.07359, KHR: 0.329, LAK: 0.05967, MNT: 0.3704, INR: 14.24, AED: 364.0, TRY: 26.6, GBP: 1779.0, CHF: 1610.0, CZK: 60.96,
    HUF: 4.074, PLN: 337.4, DKK: 199.2, SEK: 134.6, NOK: 140.2, ISK: 10.88, AUD: 916.6, NZD: 745.2, CAD: 939.8, MXN: 71.74, BRL: 240.0, EGP: 24.97,
    ZAR: 80.68, UZS: 0.1119, KZT: 2.991, FJD: 590.3, RUB: 16.15 },
};

root.PLANNER_DATA = { CUR, CC_CUR, HOME_BY_LANG, CATS, METHODS, BOOKINGS, CHECK, REF_FX };
})(typeof self !== 'undefined' ? self : globalThis);

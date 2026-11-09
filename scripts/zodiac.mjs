// 띠·년생 계산과 '행운의 색·물건·숫자·방향' 고르기.
// 행운 항목은 날짜+띠로 정해지는 난수로 고른다 — 같은 날짜는 언제 다시 만들어도 같은 결과(밤 순위 게시물과 아침 상세 게시물이 일치).
// 운세 문장(점수·총운·년생별 한 줄)만 예약 작업이 inbox/<날짜>.json 으로 써 준다.

export const CONFIG = {
  handle: "@ttiunse.daily",   // 2026-11-10 개설한 계정
  brand: "오늘의 띠운세",
  startDate: "2026-11-12",     // 첫 발행일(아침 기준) — 표지의 'N일째' 연재 번호. 실제 첫 발행일로 바꾼다
  minAge: 18,                 // 년생 범위: (올해-53) ~ (올해-18) = 연속 36년 → 띠마다 정확히 3개
  maxAge: 53,
};

export const TTI = [
  { key: "쥐", hanja: "子", color: "#3f5d8a" },
  { key: "소", hanja: "丑", color: "#8a6a3f" },
  { key: "호랑이", hanja: "寅", color: "#c2672a" },
  { key: "토끼", hanja: "卯", color: "#b0577a" },
  { key: "용", hanja: "辰", color: "#2f7a6b" },
  { key: "뱀", hanja: "巳", color: "#6b4f8f" },
  { key: "말", hanja: "午", color: "#b8432f" },
  { key: "양", hanja: "未", color: "#7d8a3f" },
  { key: "원숭이", hanja: "申", color: "#c08a1e" },
  { key: "닭", hanja: "酉", color: "#a6452f" },
  { key: "개", hanja: "戌", color: "#5e6b74" },
  { key: "돼지", hanja: "亥", color: "#3d6f8f" },
];

const STEM = "갑을병정무기경신임계";
const STEM_H = "甲乙丙丁戊己庚辛壬癸";
const BRANCH = "자축인묘진사오미신유술해";

/** 해당 연도의 띠 인덱스(0=쥐). 띠는 설 기준이지만 년생 표기는 양력 연도로 한다(캡션에 안내). */
export const ttiIndex = (year) => (((year - 4) % 12) + 12) % 12;
export const ganji = (year) => {
  const s = (((year - 4) % 10) + 10) % 10, b = ttiIndex(year);
  return { ko: STEM[s] + BRANCH[b] + "년", stem: STEM_H[s] };
};

/** 띠별 년생 3개(오래된 순). base = 운세 날짜의 연도 */
export function yearsFor(ti, base) {
  const out = [];
  for (let y = base - CONFIG.maxAge; y <= base - CONFIG.minAge; y++) if (ttiIndex(y) === ti) out.push(y);
  return out;
}

export const COLORS = [
  ["연두", "#9ccc65"], ["올리브", "#7d8a3f"], ["민트", "#7fd1b9"], ["청록", "#1f8a8a"], ["하늘색", "#7fb8e6"],
  ["남색", "#2c3e75"], ["보라", "#7b5ea7"], ["라벤더", "#b9a6dd"], ["분홍", "#f19bb5"], ["코랄", "#f08a6c"],
  ["다홍", "#e2543b"], ["버건디", "#7c2338"], ["주황", "#f0913a"], ["살구", "#f6bf97"], ["노랑", "#f2c94c"],
  ["머스터드", "#c9a227"], ["베이지", "#d9c5a3"], ["카멜", "#b07d48"], ["갈색", "#7a5233"], ["카키", "#7a7a52"],
  ["회색", "#9aa0a6"], ["차콜", "#3b3f45"], ["검정", "#1f1f1f"], ["흰색", "#ffffff"], ["아이보리", "#f6f0dc"],
  ["은색", "#c7ccd1"], ["금색", "#d4af37"], ["와인", "#6d1f3a"], ["진초록", "#1f5c3a"], ["파랑", "#2f6fd6"],
];

export const ITEMS = [
  "손수건", "볼펜", "머리끈", "립밤", "텀블러", "이어폰", "손목시계", "반지", "목도리", "우산",
  "수첩", "포스트잇", "향수", "핸드크림", "거울", "열쇠고리", "동전 지갑", "책갈피", "안경", "모자",
  "운동화", "양말", "에코백", "머리핀", "선글라스", "카드지갑", "보조배터리", "사탕", "초콜릿", "따뜻한 차",
  "커피", "생수", "귤", "사과", "견과류", "꽃 한 송이", "작은 화분", "향초", "스카프", "가죽 벨트",
  "팔찌", "귀걸이", "목걸이", "메모지", "연필", "형광펜", "노트", "달력", "사진 한 장", "마스크",
  "물티슈", "손거울", "니트", "장갑", "털모자", "쿠션", "엽서", "스티커", "동전", "자동차 키",
];

export const DIRECTIONS = ["동쪽", "서쪽", "남쪽", "북쪽", "동남쪽", "동북쪽", "서남쪽", "서북쪽"];

// 날짜+띠 → 같은 값이 나오는 난수
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** 하루 12띠 행운 항목. 같은 날 색·물건이 띠끼리 겹치지 않게 섞어서 앞에서부터 나눠 준다. */
export function luckyFor(date) {
  const r = seeded("ttiunse|" + date);
  const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cs = shuffle(COLORS), its = shuffle(ITEMS);
  return TTI.map((t, i) => {
    const n1 = 1 + Math.floor(r() * 9);
    let n2 = 1 + Math.floor(r() * 9); if (n2 === n1) n2 = (n1 % 9) + 1;
    return {
      color: { name: cs[i][0], hex: cs[i][1] },
      item: its[i],
      numbers: [n1, n2].sort((a, b) => a - b),
      direction: DIRECTIONS[Math.floor(r() * DIRECTIONS.length)],
    };
  });
}

export const stars = (score) => (score >= 90 ? 5 : score >= 78 ? 4 : score >= 64 ? 3 : score >= 50 ? 2 : 1);

export const WEEK = "일월화수목금토";
export function dateLabel(date) {
  const d = new Date(date + "T12:00:00+09:00");
  return { md: `${d.getUTCMonth() + 1}.${String(d.getUTCDate()).padStart(2, "0")}`, wd: WEEK[d.getUTCDay()], long: `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEK[d.getUTCDay()]})` };
}

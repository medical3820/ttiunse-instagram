# 오늘의 띠운세 — 인스타 자동 발행

매일 띠별 운세를 카드로 만들어 올린다.

| 시각 (KST) | 게시물 | 장수 |
|---|---|---|
| 전날 21:00 | 내일의 띠별 운세 순위 (1~12위 · 띠별 행운의 색·물건) | 5장 |
| 당일 06:00 | ① 쥐띠~뱀띠 년생별 운세 | 8장 |
| 당일 06:00 | ② 말띠~돼지띠 년생별 운세 | 8장 |

- 띠마다 년생 3개: (올해−53)~(올해−18)년생 = 연속 36년. 2026년은 1973~2008년생(10대 후반~50대 초반). 해가 바뀌면 자동으로 1년씩 밀린다.
- 띠 카드: 별점·키워드·총평(제목 한 줄 + 한두 문장) · 년생별 한 줄 · 행운의 색/물건/숫자/방향
- 운세 문장·점수: 클라우드 예약 작업이 `inbox/<날짜>.json` 으로 씀 (ROUTINE_PROMPT.md)
- 행운의 색·물건·숫자·방향: `scripts/zodiac.mjs` 가 날짜로 정함 (밤 순위와 아침 상세가 항상 같음)
- 검사: 띠·년생 누락, 길이 초과, 점수 중복, 금지 표현(질병·사고·투자·로또 등)이면 발행 중단

## 로컬 시험
```
INBOX=examples/2026-11-11.json node scripts/build.mjs 2026-11-11 pm
INBOX=examples/2026-11-11.json node scripts/build.mjs 2026-11-11 am
PW_CHANNEL=msedge node scripts/render.mjs TP20261111 TA20261111_1 TA20261111_2
```

## 계정 연결 체크리스트
1. 인스타 새 계정 만들기 (원장님 직접) → 프로페셔널(크리에이터) 계정으로 전환
2. `scripts/zodiac.mjs` 의 `CONFIG.handle` 을 실제 핸들로
3. GitHub public 저장소 `ttiunse-instagram` 만들고 push
4. Meta 앱 dr-kevin-publisher 에 새 계정을 Instagram 테스터로 추가·수락 → 토큰 발급
5. 저장소 Secrets `IG_USER_ID`, `IG_ACCESS_TOKEN`, Variables `IG_USERNAME`(핸들, @ 없이)
6. Actions → Run workflow (publish=false) 로 만들어 보기
7. 클라우드 예약 작업 2개: 매일 20:40 (ROUTINE_PROMPT.md), 매일 05:50 (ROUTINE_PROMPT_AM.md)

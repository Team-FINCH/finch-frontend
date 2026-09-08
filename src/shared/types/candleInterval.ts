import { z } from 'zod';

/**
 * 캔들 간격(봉 종류) — **TODO(계약): 캔들 interval — 이슈 #37 회신 전 임시값.**
 *
 * **임시인 것은 `period`가 아니라 이 `interval`이다.** 처음에는 이 파일이
 * `period`(조회 기간, `1M`·`3M`·`1Y`)를 봉 종류로 덮어써서 만들었는데, 그건
 * 틀린 전제였다 — `docs/api/apiSpec.md` §5.3 응답에는 **`period`와 `interval`이
 * 이미 나뉘어** 있다(`{ period: "1M", interval: "DAY", candles: [...] }`). `period`
 * 는 apiSpec 문서 그대로(`shared/types/stock.ts`)라 손대지 않는다. **주봉·월봉이
 * 있다고 가정하는 쪽은 `interval`이고, 그 가정이 이 파일의 임시값이다.**
 *
 * apiSpec §5.3은 지금 `interval: DAY` 하나뿐이고, 확장 계획표(apiSpec 1437행)는
 * "분봉 도입 시 `candles`의 `period`/`interval` 확장"이라고만 적었지 주봉·월봉을
 * 확정하지 않았다. 백엔드가 "일봉·주봉·월봉을 준다"고 구두로 말했고, GitLab
 * 이슈 #37 을 **`[요청] 캔들 interval 을 주봉·월봉까지 확장`** 으로 문의 중이다.
 * 이 글을 쓰는 시점(2026-09-07)까지 회신이 없다.
 *
 * **엔드포인트는 아직 구현 전이다** — `backend/.../domain/stock/` 에는
 * `StockErrorCode.java` 하나뿐이고 컨트롤러가 없다. 그래서 지금 이 값을 써도
 * 실서버와 부딪히지 않는다. 이 값을 쓰는 것은 목 서버(`mocks/handlers/stocks.ts`)뿐이다.
 *
 * **값 선택 근거** — 기존 유일 값 `DAY`가 이미 영문 전체 단어 표기라, 새로 더하는
 * `WEEK`·`MONTH`도 같은 규칙(축약하지 않은 영문 대문자)을 따랐다. `D`·`W`·`M` 처럼
 * 줄이지 않은 이유는 `DAY`만 전체 단어이고 나머지가 축약형이면 한 enum 안에서
 * 표기가 섞이기 때문이다.
 *
 * **회신이 오면 여기만 고친다** — 아래 `CandleIntervalSchema` 의 enum 값과
 * `CANDLE_INTERVAL_OPTIONS` 의 `value` 만 바꾸면 된다. 다른 코드는 전부
 * `CandleInterval` 타입과 `CANDLE_INTERVAL_OPTIONS` 를 통해서만 값을 참조한다.
 * **최악의 경우**(주봉·월봉 확장 자체가 없다는 회신) 이 파일과
 * `frontend/src/mocks/handlers/stocks.ts` 의 캔들 핸들러, `ChartPeriodSegment.tsx`,
 * `features/stocks/lib/stockDetailParams.ts` 의 interval 관련 부분을 이전 커밋으로
 * 되돌린다.
 */
export const CandleIntervalSchema = z.enum(['DAY', 'WEEK', 'MONTH']);
export type CandleInterval = z.infer<typeof CandleIntervalSchema>;

/**
 * 봉 종류 탭에 보일 목록과 라벨. "일봉·주봉·월봉" — 사용자가 그렇게 부른다.
 * 값과 라벨을 한 배열에 모아 둬서, 회신이 와서 값이 바뀌어도 이 배열만 고치면
 * `ChartPeriodSegment` 를 비롯한 소비처는 그대로 쓴다.
 */
export const CANDLE_INTERVAL_OPTIONS: readonly {
  value: CandleInterval;
  label: string;
}[] = [
  { value: CandleIntervalSchema.parse('DAY'), label: '일봉' },
  { value: CandleIntervalSchema.parse('WEEK'), label: '주봉' },
  { value: CandleIntervalSchema.parse('MONTH'), label: '월봉' },
];

/** 기본 봉 종류. 일봉이 가장 익숙한 해상도라 맨 앞이자 기본값이다. */
export const DEFAULT_CANDLE_INTERVAL: CandleInterval =
  CandleIntervalSchema.parse('DAY');

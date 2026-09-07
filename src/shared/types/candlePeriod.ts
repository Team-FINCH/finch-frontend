import { z } from 'zod';

/**
 * 캔들 봉 종류 — **TODO(계약): 캔들 period — 이슈 #37 회신 전 임시값.**
 *
 * **문서와 어긋난 채로 만든 것이다.** `docs/api/apiSpec.md` §5.3 은
 * `period: 1M | 3M | 1Y`(모두 일봉 기준)이고, `docs/erd/erd.md` §2.8 은
 * `daily_candle` 테이블 하나뿐이라 주봉·월봉을 담을 테이블이 없다. 그런데도
 * 이 값을 쓰는 이유 — 백엔드가 "일봉·주봉·월봉을 준다"고 구두로 말했고, 화면을
 * 먼저 만들어 보기로 했다. 확인은 GitLab 이슈 #37 로 문의 중이고 이 글을 쓰는
 * 시점(2026-09-07)까지 회신이 없다.
 *
 * **엔드포인트는 아직 구현 전이다** — `backend/.../domain/stock/` 에는
 * `StockErrorCode.java` 하나뿐이고 컨트롤러가 없다. 그래서 지금 이 값을 써도
 * 실서버와 부딪히지 않는다. 이 값을 쓰는 것은 목 서버(`mocks/handlers/stocks.ts`)뿐이다.
 *
 * **값 선택 근거** — 한 글자 표기 `D`·`W`·`M` 을 골랐다. apiSpec 의 기존 `period`
 * 표기(`1M`·`3M`·`1Y`)와 길이·형태가 비슷해서, 나중에 실제 값으로 바뀌어도 UI
 * 쪽 자리 배치가 크게 안 흔들린다. `DAY`·`WEEK`·`MONTH` 대안도 고려했지만,
 * 다른 열거값들(`MarketSchema` 의 `KOSPI`·`KOSDAQ` 등)이 이미 존재하는 실제 값을
 * 그대로 옮긴 것과 달리 이건 처음부터 우리가 지어내는 값이라 짧은 쪽이 "임시값"
 * 이라는 인상도 더 준다고 판단했다.
 *
 * **회신이 오면 여기만 고친다** — 아래 `CandlePeriodSchema` 의 enum 값과
 * `CANDLE_PERIOD_OPTIONS` 의 `value` 만 바꾸면 된다. 다른 코드는 전부 `CandlePeriod`
 * 타입과 `CANDLE_PERIOD_OPTIONS` 를 통해서만 값을 참조한다.
 * **최악의 경우**(주봉·월봉을 아예 안 준다는 회신) 이 파일과
 * `frontend/src/mocks/handlers/stocks.ts` 의 캔들 핸들러, `ChartPeriodSegment.tsx` 를
 * 이 변경 이전 커밋으로 되돌린다.
 */
export const CandlePeriodSchema = z.enum(['D', 'W', 'M']);
export type CandlePeriod = z.infer<typeof CandlePeriodSchema>;

/**
 * 봉 종류 탭에 보일 목록과 라벨. "일봉·주봉·월봉" — 사용자가 그렇게 부른다.
 * 값과 라벨을 한 배열에 모아 둬서, 회신이 와서 값이 바뀌어도 이 배열만 고치면
 * `ChartPeriodSegment` 를 비롯한 소비처는 그대로 쓴다.
 */
export const CANDLE_PERIOD_OPTIONS: readonly {
  value: CandlePeriod;
  label: string;
}[] = [
  { value: CandlePeriodSchema.parse('D'), label: '일봉' },
  { value: CandlePeriodSchema.parse('W'), label: '주봉' },
  { value: CandlePeriodSchema.parse('M'), label: '월봉' },
];

/** 기본 봉 종류. 일봉이 가장 익숙한 해상도라 맨 앞이자 기본값이다. */
export const DEFAULT_CANDLE_PERIOD: CandlePeriod =
  CandlePeriodSchema.parse('D');

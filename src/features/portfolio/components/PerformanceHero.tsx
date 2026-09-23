import {
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';

import {
  formatSignedPercentPoint,
  resolveExcessNote,
} from '../lib/attributionInsight';

/**
 * 화면에서 가장 먼저 읽히는 자리 — 질문 1·2 "이번 기간 성과가 어땠나 / 시장보다
 * 잘했나" (FINCH-308 · 333).
 *
 * ## 카드를 벗었다 (FINCH-333, 2026-09-23)
 *
 * **"핵심 메시지보다 박스 구조가 먼저 보인다" 의 원인이 여기였다.** 흰 면 +
 * 테두리 + 20px 여백이 `+2.13%` 를 감싸고 있었고, 그 아래 탭·분석 카드·AI 카드가
 * 모두 비슷한 무게의 상자라 **화면이 상자 넷의 목록**으로 읽혔다. 어느 상자를
 * 먼저 봐야 하는지 표시가 없었다.
 *
 * 지금은 페이지 배경 위에 글자만 선다. 테두리도 면도 없으니 **36px 숫자 자체가
 * 이 화면에서 가장 무거운 것**이 되고, 아래 흰 카드가 "분석" 이라는 다음 덩어리로
 * 자연스럽게 갈린다. 상자를 하나 지워서 위계를 만든 것이다.
 *
 * FINCH-327 이 이 자리에 카드를 준 이유는 *"이 화면에서 면을 가질 자격이
 * 있는 것은 여기와 FINCH 해석 둘뿐인데 둘 다 면이 없었다"* 였다. 그때는 아래가
 * 전부 평면이라 면 하나가 시작점을 표시했다. **지금은 아래에 흰 카드가 있어서
 * 반대가 됐다** — 히어로가 면을 가지면 아래 카드와 같은 층이 된다.
 *
 * ## 값 → 라벨이 아니라 라벨 → 값이다
 *
 * 전에는 큰 값이 먼저, 라벨이 아래였다(*"금융 화면이라 숫자가 설명보다 먼저"*).
 * 카드를 벗으면서 뒤집었다 — 면이 없어지면 덩어리의 시작을 표시하는 것이
 * 없어서, 13px 라벨이 머리 노릇을 해야 36px 숫자가 어디서부터 시작하는
 * 이야기인지 알 수 있다. 라벨이 작고 옅어 시선을 뺏지 않는다.
 *
 * ## 서브카피는 한 줄, 가장 작게
 *
 * `시장보다 앞선 기간이에요.` 는 `resolveExcessNote` 가 `excessReturn` 의 부호를
 * 말로 옮긴 것이다 — AI 가 쓰지 않는다. 숫자 둘(`+2.13%` · `+1.24%p`)을 읽기 전에
 * **결론을 한 번 말해 주는 자리**라 큰 값 바로 아래 붙이고 13px 로 둔다.
 *
 * ## `초과수익` 대신 `시장 대비`
 *
 * `excessReturn` 의 사전적 번역은 초과수익이지만 그 말을 아는 사용자에게만 통한다.
 * 화면이 답하는 질문은 "시장보다 얼마나 잘했나" 이므로 그 질문의 말을 그대로 쓴다.
 *
 * ## 단위
 *
 * 기간 수익률·시장은 `%`, 시장 대비는 `%p` 다. 두 퍼센트의 차라서 그렇다 —
 * 근거는 `attributionInsight.ts` 의 `formatSignedPercentPoint` 주석에 있다.
 *
 * ## 거래일 수를 라벨에서 뺐다
 *
 * 라벨이 `최근 21거래일 수익률` 이었다. **기간 탭이 바로 위에 있어서** 지금 무엇을
 * 보고 있는지는 이미 그 줄이 말하고, 라벨이 길어지면 그 아래 36px 숫자로 넘어가는
 * 눈이 한 번 걸린다. 개수는 아래 메타 줄로 내렸다 — 값을 버리지 않았다.
 *
 * ## 탭이 바뀌어도 이 블록은 그대로 선다
 *
 * 2차 탭(`요약`·`기여 분석`·`종목별`) 위에 있고 셋이 공유한다. 어느 탭에서든
 * "그래서 얼마 벌었나" 가 화면 맨 위에 남아 있어야 아래 기여도·종목 수치가
 * 무엇의 조각인지 읽힌다.
 */

const RATIO_TEXT_CLASS = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
} as const;

type PerformanceHeroProps = {
  /** 기간 수익률. 0~1 소수다 (백엔드 `changeRate` 계열의 백분율과 다르다) */
  portfolioReturn: number;
  /** 보유 종목 유니버스를 시가총액으로 합성한 시장 전체 수익률 */
  benchmarkReturn: number;
  /** `portfolioReturn - benchmarkReturn`. 엔진이 계산해 내려준다 */
  excessReturn: number;
  /** 되짚은 거래일 수. `period` 만으로는 알 수 없어 응답이 따로 준다 */
  tradingDays: number;
};

export function PerformanceHero({
  portfolioReturn,
  benchmarkReturn,
  excessReturn,
  tradingDays,
}: PerformanceHeroProps) {
  return (
    <section className="mt-5">
      <p className="text-caption text-text-muted">이번 기간 수익률</p>

      <p
        className={`mt-1 text-display tabular-nums ${RATIO_TEXT_CLASS[getPriceDirection(portfolioReturn)]}`}
      >
        {formatSignedPercent(portfolioReturn)}
      </p>

      <p className="mt-1.5 text-caption text-text-secondary">
        {resolveExcessNote(excessReturn)}
      </p>

      {/* 값 둘을 0%·50% 에 고정한다 — 값이 길어져도 `시장 대비` 가 움직이지 않고
          아래 카드의 좌우 정렬과도 눈이 맞는다. */}
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <HeroMetric label="시장" text={formatSignedPercent(benchmarkReturn)} />
        <HeroMetric
          label="시장 대비"
          text={formatSignedPercentPoint(excessReturn)}
          ratio={excessReturn}
        />
      </dl>

      {/* 거래일 수는 방향이 없는 개수라 등락색을 얹지 않는다. */}
      <p className="mt-3 text-caption text-text-muted tabular-nums">
        최근 {tradingDays}거래일 기준
      </p>
    </section>
  );
}

/**
 * 보조 수치 하나. 값이 위, 라벨이 아래다 — 히어로 본문과 순서가 반대인데,
 * 여기는 라벨이 둘을 **구분**하는 표지라 값 뒤에 와도 무엇인지 찾을 수 있다.
 *
 * `ratio` 를 넘기면 등락색이 붙는다. **시장 수익률에는 넘기지 않는다** — 그 값은
 * 사용자의 성과가 아니라 비교 기준이라 잘잘못의 색을 입히면 읽는 사람이 자기
 * 성과로 오인한다. 색이 뜻을 갖는 자리는 "내가 시장보다 나았는가" 하나다.
 *
 * 확정 등락색(`--color-stock-up`)을 쓰는 자리는 이 블록의 큰 숫자와 `시장 대비`
 * 둘뿐이다. 아래 카드의 수치는 전부 저채도 짝을 쓴다 —
 * `styles/index.css` 의 `--color-stock-up-muted` 주석 참고.
 */
function HeroMetric({
  label,
  text,
  ratio,
}: {
  label: string;
  text: string;
  ratio?: number;
}) {
  const tone =
    ratio === undefined
      ? 'text-text-primary'
      : RATIO_TEXT_CLASS[getPriceDirection(ratio)];

  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="mt-0.5 text-caption text-text-muted">{label}</dt>
      <dd className={`text-body-1 font-semibold tabular-nums ${tone}`}>
        {text}
      </dd>
    </div>
  );
}

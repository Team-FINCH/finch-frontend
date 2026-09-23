import { type AiFinding } from '@/shared/types/ai/diagnosis';

import { shadeAt, type ConcentrationSlice } from '../lib/concentration';
import { RISK_GRADE } from '../lib/riskGrade';

/**
 * 종목 집중도 — 머리줄(종목 수 · 등급) + 스택 바 + 상위 종목
 * (FINCH-325 · 334 · 341).
 *
 * ## 아래 두 줄을 걷고 등급만 머리로 올렸다 (FINCH-341)
 *
 * 배포 화면을 본 사용자 지적이다 — *"이 글씨가 아래에 있으니까 보기가 안 좋다"*.
 * 목록이 끝난 뒤에 작은 글씨 두 줄이 더 붙어 섹션이 언제 끝나는지 흐렸다.
 *
 * | 걷은 것 | 어떻게 됐나 |
 * | --- | --- |
 * | `가장 비중이 큰 종목 하나가 41.68%예요.` (AI insight 한 줄) | **없앴다** |
 * | `집중도 판정 높음` | 머리줄 오른쪽으로 올렸다 |
 *
 * **insight 줄을 없앤 것이 덤으로 오래된 문제 하나를 닫는다.** 그 문장은 AI 가 쓴
 * `findings[].text` 를 그대로 옮긴 것이라 안의 퍼센트를 프론트가 고칠 수 없었고
 * (`ia.md` §4 — AI 문장을 다시 쓰지 않는다), 엔진 원값이 소수로 들어와 `41.68%`
 * 로 찍혔다. **화면의 다른 퍼센트는 전부 정수인데 그 줄만 소수 둘째 자리였다.**
 * 같은 값(1위 비중)이 바로 위 목록에 `38%` 로 이미 있으니 문장이 없어도 잃는
 * 정보가 없다.
 *
 * 그래서 `lib/concentration.ts` 주석이 적어 둔 "AI 파트 확인 필요" 는 이 화면
 * 기준으로는 닫힌다 — 다만 **`findings[].text` 자체는 진단 모달에 그대로 나가므로**
 * 소수 표기 문제는 AI 쪽에 남아 있다.
 *
 * ## 카드를 벗었다 (FINCH-334)
 *
 * 흰 면 + 테두리였다. 이제 페이지 배경 위 flat 섹션이고 위 위험도와 36px 여백으로만
 * 갈린다 — 이 화면에서 면을 갖는 것은 검정 AI 카드 하나뿐이다.
 *
 * ## 색이 아니라 명도로 순위를 말한다
 *
 * 전에는 종목코드 해시로 틴트 다섯 쌍(파랑·주황·초록·보라·청록)을 배정했다.
 * 두 가지가 잘못이었다.
 *
 * - **색이 순위를 말해 주지 않았다.** 3위가 가장 진해 보이는 날이 생겨서, 스택
 *   바를 보고 어느 칸이 1위인지 길이를 재야 알 수 있었다
 * - 다섯 쌍에 적색·청색 계열이 섞여 있어 **등락색과 눈으로 겹쳤다**
 *
 * 이제 1위 `--t1` → 2위 `#8B95A1` → 3위 `--border2` → 그 아래 한 단계 더 연하게다
 * (`shadeAt`). 진할수록 크다는 것이 규칙이라 막대와 목록이 같은 이야기를 한다.
 *
 * ## 스택 바
 *
 * 높이 10px, 조각 사이 3px 간격, **양 끝만** 라운드. 전에는 14px 에 흰 1px
 * 구분선이었는데, 틴트가 사라지면서 구분선도 필요 없어졌다 — 명도 계단이 이미
 * 칸을 가르고, 3px 간격이 그것을 확실히 한다.
 *
 * 칸 너비는 반올림하지 않은 비중이다. 정수로 자르면 합이 100 을 벗어난다.
 *
 * ## 목록
 *
 * 10px 색 사각 + 종목명 16px/500 + 비중 16px/700, 행 여백 12px, 사이에
 * `--color-border` 구분선이다.
 *
 * **`다소 높음` 라벨을 각 행에서 없앴다.** 종목별 비중 구간으로 매긴 값
 * (`CONCENTRATION_LEVELS`)이었는데, 카드 머리의 등급(규칙 엔진이 계좌 전체를
 * 판정한 값)과 **같은 말을 다른 눈금으로** 쓰고 있었다. 한 화면에 `다소 높음` 이
 * 둘 있으면 어느 쪽이 무엇에 대한 판정인지 알 수 없다. 머리의 것만 남긴다.
 *
 * ## 비중은 정수다 (FINCH-334)
 *
 * `Math.round` 다. 화면의 모든 퍼센트가 정수라야 `41.68%` 같은 값이 섞여 들어와도
 * 그것이 우리가 쓴 것이 아님이 드러난다.
 *
 * ## 계산을 밖으로 꺼냈다
 *
 * 비중은 `lib/concentration.ts` 의 `resolveConcentration` 이 낸다. 위험도 지표
 * 3열의 `집중도` 가 **같은 값**을 써야 해서다 — 화면 안에서 최대 종목 비중이 두
 * 숫자로 갈리던 문제의 답이고, 근거는 그 파일 주석에 있다.
 */

/** 접었을 때 보여 줄 종목 수. 나머지는 `그 외 N종목` 한 줄로 합친다. */
const VISIBLE_SLICE_COUNT = 3;

type ConcentrationCardProps = {
  slices: readonly ConcentrationSlice[];
  findings: AiFinding[];
  intro: boolean;
};

export function ConcentrationCard({
  slices,
  findings,
  intro,
}: ConcentrationCardProps) {
  if (slices.length === 0) {
    return null;
  }

  const finding = findings.find((item) => item.id === 'ticker_concentration');
  const visible = slices.slice(0, VISIBLE_SLICE_COUNT);
  const rest = slices.slice(VISIBLE_SLICE_COUNT);
  const restPercent = rest.reduce((sum, slice) => sum + slice.percent, 0);

  return (
    <section
      className={`mt-9 ${
        intro
          ? 'animate-[diag-fade_480ms_var(--ease-standard)_380ms_both] motion-reduce:animate-none'
          : ''
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 text-[19px] leading-[26px] font-bold tracking-[-.01em] text-text-primary">
          종목 집중도
        </h2>
        {/* 오른쪽은 종목 수 + 등급이다 (FINCH-341).

            **등급이 맨 아래에서 여기로 올라왔다.** 전에는 목록 밑 insight 문장
            아래에 `집중도 판정 높음` 으로 있었다. 그 자리에 둔 이유가 *"목록 옆에
            있으면 방금 읽은 종목 하나에 대한 판정으로 읽힌다"* 였는데, 머리줄은
            목록 옆이 아니라 **스택 바보다도 위**라 그 걱정이 닿지 않는다. 오히려
            섹션 제목과 같은 줄에 있어 "이 섹션 전체에 대한 판정" 으로 읽힌다.

            `집중도 판정` 이라는 라벨은 뗐다. 바로 왼쪽이 `종목 집중도` 라 같은
            말을 두 번 하는 것이고, 라벨을 붙이면 320px 에서 머리줄이 넘친다.

            등급 글자에만 상태색을 쓴다 — `RISK_GRADE` 의 색이고 `보통` 은
            중립이라 색이 없다(그 파일 주석). 종목 수는 muted 그대로다. */}
        <span className="flex-none text-label text-text-muted tabular-nums">
          {slices.length}종목
          {finding !== undefined && (
            <>
              {' · '}
              <span
                className="font-semibold"
                style={{ color: RISK_GRADE[finding.severity].color }}
              >
                {RISK_GRADE[finding.severity].label}
              </span>
            </>
          )}
        </span>
      </div>

      {/* 스택 바. `gap` 이 조각 사이 3px 을 내고, 양 끝 라운드는 바깥 span 이
          `overflow-hidden` 으로 만든다 — 조각마다 반경을 주면 가운데 칸들도 둥글어진다. */}
      <span
        aria-hidden="true"
        className={`mt-4 flex h-2.5 w-full origin-left gap-[3px] overflow-hidden rounded-full ${
          intro
            ? 'animate-[diag-grow_900ms_cubic-bezier(.2,.8,.2,1)_460ms_both] motion-reduce:animate-none'
            : ''
        }`}
      >
        {slices.map((slice, index) => (
          <span
            key={slice.stockCode}
            className="block h-full"
            style={{ width: `${slice.percent}%`, background: shadeAt(index) }}
          />
        ))}
      </span>

      <div className="mt-4 flex flex-col">
        {visible.map((slice, index) => (
          <div
            key={slice.stockCode}
            className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0 first:pt-0"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-2.5 flex-none rounded-[3px]"
                style={{ background: shadeAt(index) }}
              />
              <span className="truncate text-body-1 font-medium text-text-primary">
                {slice.stockName}
              </span>
            </span>
            <span className="flex-none text-body-1 font-bold text-text-primary tabular-nums">
              {Math.round(slice.percent)}%
            </span>
          </div>
        ))}

        {rest.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border py-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-2.5 flex-none rounded-[3px]"
                style={{ background: shadeAt(VISIBLE_SLICE_COUNT) }}
              />
              <span className="truncate text-body-1 font-medium text-text-secondary">
                그 외 {rest.length}종목
              </span>
            </span>
            <span className="flex-none text-body-1 font-medium text-text-secondary tabular-nums">
              {Math.round(restPercent)}%
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

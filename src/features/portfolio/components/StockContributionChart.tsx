import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionRow } from '@/shared/types/ai/attribution';
import { StockLogo } from '@/shared/ui/StockLogo';

import { divergingScale, divergingWidth } from '../lib/attributionInsight';

/**
 * "종목별 기여" — 종목마다 기여도 막대 한 줄 (FINCH-308).
 *
 * ## 정렬을 화면이 다시 하지 않는다
 *
 * 들어오는 순서가 이미 기여도 내림차순이다. 엔진이 §4.1 기여도(`w × r`)를 Carino
 * 로 링킹해 `Σ C_i = R_p` 를 맞춘 뒤 정렬한 결과라, 화면이 기준을 새로 만들면
 * 엔진이 보증한 순서와 어긋날 수 있다.
 *
 * **수익률이 아니라 기여도 순이다.** 비중 1% 가 20% 오른 것과 비중 20% 가 1%
 * 오른 것은 전체에 같은 영향을 준다 — 그래서 막대 길이도 기여도로 그린다.
 * 수익률은 옆에 작게만 둔다.
 *
 * ## 막대 기준을 위 차트와 나눠 쓰지 않는다
 *
 * `divergingScale` 을 이 목록 안에서 다시 잡는다. 요인 분해(시장·업종·선택)와
 * 종목 기여는 크기 범위가 다르다 — 요인 축을 그대로 가져오면 종목 막대가 전부
 * 실오라기로 눌린다. **두 차트의 막대 길이를 서로 비교하지 않는다는 뜻이고,**
 * 그래서 양쪽 다 막대 옆에 값을 적는다.
 *
 * ## 종목 로고와 공시 제목은 남긴다
 *
 * 개편에서 값과 해석을 갈랐지만 공시 제목은 **AI 가 쓴 문장이 아니라 응답의
 * `events[]` 에 담겨 온 자료다.** 엔진이 §5.1 로 근접도를 계산해 붙인 것이라
 * 계산 데이터 쪽에 남는다. 다만 이 자리는 제목만 보여 줄 뿐이고, 그 공시를
 * 원인으로 읽어도 되는지는 여기서 말하지 않는다 — 인과 판단은 AI 카드 몫이다.
 */

const DIRECTION_TEXT_CLASS = {
  up: 'text-stock-up',
  down: 'text-stock-down',
} as const;

/** 프로토타입이 이 탭의 소제목을 `.sht` 위에 20px 로 덮어 쓴다 (proto L2305). */
const SUBTITLE_CLASS =
  'text-[20px] font-bold tracking-[-0.02em] text-text-primary';

type StockContributionChartProps = {
  /** 기여도 내림차순. `contributors` 뒤에 `detractors` 를 이어 붙인 목록이다 */
  rows: readonly AiAttributionRow[];
};

export function StockContributionChart({ rows }: StockContributionChartProps) {
  const scale = divergingScale(rows.map((row) => row.contribution));

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className={SUBTITLE_CLASS}>종목별 기여</h2>
        <span className="text-caption text-text-muted">{rows.length}종목</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-3.5 text-body-1 text-text-secondary">
          이 기간 동안 특별한 기여가 없었어요.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <ContributionRow key={row.ticker} row={row} scale={scale} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * 종목 한 줄. 위는 `로고 · 이름 · 기여도`, 아래는 `공시/업종 · 막대 · 수익률` 이다.
 *
 * 막대를 이름 아래 같은 칸에 넣어 두 줄로 끝낸다. 막대를 따로 한 줄 더 두면
 * 종목 열 개짜리 목록이 화면 세 배가 되고, 그러면 위 요인 차트가 스크롤 밖으로
 * 밀려 "무엇이 컸나" 를 먼저 보게 한 개편 의도가 뒤집힌다.
 */
function ContributionRow({
  row,
  scale,
}: {
  row: AiAttributionRow;
  scale: number;
}) {
  const positive = row.contribution >= 0;
  const tone = positive ? 'up' : 'down';
  const width = divergingWidth(row.contribution, scale);
  const event = row.events[0];

  return (
    <div className="flex items-center gap-3 py-3.5">
      {/* 로고가 없는 종목이면 이니셜 뱃지로 돌아간다 (FINCH-299).
          `ticker` 는 `StockCodeSchema` 라 6자리가 검증된 값이다. */}
      <StockLogo stockCode={row.ticker} stockName={row.name} size="sub" />

      <span className="flex min-w-0 flex-1 flex-col gap-1.25">
        <span className="truncate text-body-1 font-medium text-text-primary">
          {row.name}
        </span>

        {/* 막대는 같은 값이 오른쪽에 글자로 있어 낭독기에 내보내지 않는다. */}
        <span aria-hidden="true" className="relative h-1.5 w-full">
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong" />
          {row.contribution !== 0 && (
            <span
              className={`absolute inset-y-0 rounded-full ${positive ? 'bg-stock-up' : 'bg-stock-down'}`}
              style={
                positive
                  ? { left: '50%', width: `${width}%` }
                  : { right: '50%', width: `${width}%` }
              }
            />
          )}
        </span>

        <span className="truncate text-caption text-text-secondary">
          {event === undefined ? row.sector : event.title}
        </span>
      </span>

      <span className="flex-none text-right">
        <span
          className={`block text-body-1 font-bold tabular-nums ${DIRECTION_TEXT_CLASS[tone]}`}
        >
          {formatSignedPercent(row.contribution)}
        </span>
        <span
          className={`text-caption tabular-nums ${DIRECTION_TEXT_CLASS[tone]}`}
        >
          {formatSignedPercent(row.return)}
        </span>
      </span>
    </div>
  );
}

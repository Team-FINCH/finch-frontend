import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { formatAmount, formatKrw } from '@/shared/lib/formatNumber';
import { type Holding } from '@/shared/types/portfolio';

/**
 * "아직 적지 않은 종목" — 매수 이유를 남기지 않은 보유 종목 (프로토타입
 * `unrecorded`, FINCH-154). 종목이 없으면 섹션 자체가 나오지 않는다.
 *
 * ## "이유 적기" 가 채팅으로 가는 이유
 *
 * **프론트에는 논지를 새로 만들 경로가 없다.** 가진 것은 수정(`PUT /wiki/theses/
 * {stockCode}`)뿐이고, 그것도 활성 논지가 없으면 서버가 `InvalidRequest` 를
 * 던진다(`ai/app/wiki/store.py` `update_active_thesis`). `POST /wiki/theses` 는
 * AI 가 대화 안에서 스스로 부르는 경로다(ia.md §1).
 *
 * 그래서 여기서 시트를 열어 봐야 저장할 곳이 없다. 프로토타입은 시트를 열지만
 * 로컬 상태만 바꾸는 목이라 이 제약이 드러나지 않았다. **실제로 논지가 생기는
 * 유일한 길인 AI 채팅으로 보낸다** — 종목 맥락(`screen=stock_detail&ticker=`)을
 * 실어 보내 대화가 어느 종목 얘기인지 알고 시작하게 한다.
 *
 * 계약이 열리면(미확정 P34) 이 링크를 기록 시트로 바꾸면 된다. 목록과 문구는
 * 그대로 쓴다.
 */
type UnrecordedStockListProps = {
  holdings: Holding[];
};

export function UnrecordedStockList({ holdings }: UnrecordedStockListProps) {
  if (holdings.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="flex items-baseline gap-2">
        <span className="text-[15px] font-semibold text-text-primary">
          아직 적지 않은 종목
        </span>
        <span className="text-caption text-text-secondary">
          {holdings.length}개
        </span>
      </div>
      <p className="mt-1.25 text-caption text-text-secondary">
        종목을 고르면 매수 이유를 적을 수 있어요.
      </p>

      <div className="mt-3 flex flex-col gap-0.5">
        {holdings.map((holding) => (
          <Link
            key={holding.stockCode}
            to={`${ROUTES.chat}?screen=stock_detail&ticker=${holding.stockCode}`}
            className="flex items-center gap-3 py-2.75"
          >
            <span className="flex size-8 flex-none items-center justify-center rounded-[11px] bg-primary-soft text-[13px] font-semibold text-text-secondary">
              {holding.stockName.slice(0, 1)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] leading-5 font-medium text-text-primary">
                {holding.stockName}
              </span>
              <span className="text-caption text-text-secondary">
                {formatAmount(holding.quantity)}주 ·{' '}
                {formatKrw(holding.avgBuyPrice)}
              </span>
            </span>
            <span className="flex flex-none items-center gap-1 text-[14px] font-medium text-text-secondary">
              이유 적기
              <span aria-hidden="true" className="text-text-muted">
                ›
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

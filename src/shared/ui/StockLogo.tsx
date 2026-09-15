import { useState } from 'react';

import { STOCK_LOGO_CODES, stockLogoUrl } from '@/shared/config/stockLogos';

import { STOCK_BADGE_BOX_CLASS, type StockBadgeSize } from './stockBadgeSize';
import { StockInitialBadge } from './StockInitialBadge';

/**
 * 종목 자리에 그리는 기업 로고. 홈 · 포트폴리오 · 브리핑 · 주문이 같은 것을 쓴다.
 *
 * **이니셜 뱃지를 대신한다.** 목록에서 종목을 알아보는 자리가 종목명 첫 글자
 * 하나였는데(`StockInitialBadge`, FINCH-261), 서비스 종목이 30개로 닫히면서
 * 30개 전부 로고를 넣을 수 있게 됐다 — 왜 이제 가능한지는
 * `shared/config/stockLogos.ts` 주석에 적어 두었다.
 *
 * ## 폴백이 있어야 하는 이유
 *
 * 화면에 뜨는 종목이 전부 서비스 30종목인 것은 아니다. 보유·거래내역은 과거에
 * 담은 종목을 그대로 보여주고, 유니버스가 개편되거나 상장폐지되면 목록 밖 코드가
 * 남는다. 그런 종목도 **행은 그려야 한다.** 그래서 로고가 없으면 예전 이니셜
 * 뱃지로 돌아간다. 자리와 크기는 그대로라 목록이 밀리지 않는다.
 *
 * 폴백은 두 겹이다.
 *
 * 1. `STOCK_LOGO_CODES` 에 없는 코드 — 아예 `<img>` 를 만들지 않는다. 404 를
 *    쏘지 않고 깨진 이미지가 잠깐 비치지도 않는다
 * 2. 있는데 못 불러온 경우 — 파일이 빠졌거나(배포 사고) 네트워크가 끊겼을 때다.
 *    `onError` 로 그때 뱃지로 바꾼다
 *
 * ## 화면 낭독기에는 없는 것으로 둔다
 *
 * 뱃지가 `aria-hidden` 이던 이유가 로고에도 그대로 있다 — **바로 옆에 종목명이
 * 글자로 서 있다.** 로고에 `alt="삼성전자"` 를 붙이면 낭독기가 "삼성전자 삼성전자"
 * 를 읽는다. 로고는 눈으로 훑을 때 걸리라고 있는 장식이고, 종목을 가리키는
 * 정보는 언제나 옆의 글자다.
 */

type StockLogoProps = {
  /** 6자리 문자열. 로고 파일 이름이자 있는지 없는지를 가르는 값이다 */
  stockCode: string;
  /** 로고가 없을 때 뱃지에 넣을 첫 글자. 아직 모르면 `null` */
  stockName: string | null;
  size?: StockBadgeSize;
  className?: string;
};

export function StockLogo({
  stockCode,
  stockName,
  size = 'md',
  className = '',
}: StockLogoProps) {
  /**
   * **불린이 아니라 실패한 코드를 담는다.** 목록 행은 스크롤하면서 같은
   * 컴포넌트가 다른 종목을 그리는 일이 흔한데, 불린으로 두면 한 번 실패한 자리가
   * 그 뒤로 어떤 종목이 와도 계속 뱃지만 그린다.
   */
  const [failedCode, setFailedCode] = useState<string | null>(null);

  const hasLogo = STOCK_LOGO_CODES.has(stockCode) && failedCode !== stockCode;

  if (!hasLogo) {
    return (
      <StockInitialBadge
        stockCode={stockCode}
        stockName={stockName}
        size={size}
        className={className}
      />
    );
  }

  return (
    <img
      src={stockLogoUrl(stockCode)}
      alt=""
      aria-hidden="true"
      decoding="async"
      onError={() => setFailedCode(stockCode)}
      /* `size-*` 가 width 와 height 를 둘 다 고정한다. 그래서 로고가 아직 안 와도
         칸이 먼저 서 있고, 목록을 스크롤하는 중에 행이 밀리지 않는다 — width·height
         속성을 따로 적지 않는 이유다(적으면 md·sm 두 벌을 또 관리해야 한다). */
      className={`flex-none ${STOCK_BADGE_BOX_CLASS[size]} ${className}`}
    />
  );
}

import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';

import {
  isUpdateNoticeSeenToday,
  markUpdateNoticeSeenToday,
} from '../lib/updateNoticeSeen';

/**
 * 서비스 갱신 규칙 안내 (FINCH-262). 홈에 처음 닿았을 때 하루 한 번 뜬다.
 *
 * ## 왜 필요한가
 *
 * **장이 닫힌 시간에 들어온 사람은 값이 멈춘 것을 고장으로 읽는다.** 시세가 언제
 * 움직이고 AI 가 언제 도는지를 지금은 화면 어디에서도 말하지 않는다. 주문 화면의
 * `OrderBlockNotice` 가 유일하게 비슷한 말을 하지만, 그건 이미 사려고 들어간
 * 사람에게 거절 사유를 알리는 자리다.
 *
 * ## 현재 상태를 말하지 않는다 — 이 화면의 유일한 함정
 *
 * `지금은 장 시간이 아니에요` 같은 문장을 **쓰면 안 된다.** 두 가지 이유다.
 *
 * 1. **프론트에 "지금 장이 열렸나" 를 알려 주는 API 가 없다.** 있는 것은
 *    `GET /orders/available` 의 `tradable` 뿐이고 그것은 종목별 주문 가능 여부다.
 *    브라우저 시계로 판정하는 것은 ia.md §1:133 이 명시적으로 막는다
 * 2. **`finch.market.always-open` 이 있다.** 발표(9/28)가 장 마감 뒤일 수 있어 그때는
 *    장 시간 판정을 통째로 끈다(`FinchProperties.Market` 주석). 그 상태에서 이 안내가
 *    "지금은 거래할 수 없어요" 라고 말하면 **바로 옆에서 주문이 되는 채로 거짓말을 한다**
 *
 * 그래서 이 시트는 시제가 없는 **규칙**만 적는다. 조건 분기가 하나도 없는 것이
 * 게을러서가 아니라 그것이 이 화면의 설계다.
 *
 * ## 적은 것의 출처
 *
 * | 문장 | 출처 |
 * | --- | --- |
 * | 정규장 평일 09:00~15:30 | `global/util/MarketClock.java` (양 끝 포함) |
 * | 그 시간에만 시세가 움직이고 주문이 된다 | 같은 파일 · apiSpec §7.2 |
 * | 일봉은 장 마감 뒤 정리된다 | `domain/stock/StockProperties.java` (16:00 KST) |
 * | 브리핑은 하루 한 번 | `ai/docs/api-spec.md` "일 1회 배치 생성" |
 *
 * **공휴일을 말하지 않는다.** `MarketClock` 이 휴장일 달력을 다루지 않는다고 스스로
 * 적어 뒀다(출처가 MVP 범위 밖). 우리가 모르는 것을 안내가 아는 척하지 않는다.
 *
 * **일봉 16:00 도 숫자를 적지 않는다.** 배치 시각은 `finch.stock.cron` 설정값이라
 * 운영에서 옮길 수 있다. 옮겨져도 틀리지 않는 문장("장 마감 뒤")으로 적는다.
 */

/** 안내 한 줄. 글리프는 장식이라 `aria-hidden` 이고 뜻은 글자가 나른다. */
const NOTICE_ITEMS = [
  {
    glyph: '🕘',
    title: '거래 시간은 평일 09:00~15:30이에요',
    body: '이 시간에만 시세가 움직이고 주문이 체결돼요. 그 밖에는 마지막 시세가 그대로 보여요.',
  },
  {
    glyph: '📊',
    title: '차트의 일봉은 장 마감 뒤에 정리돼요',
    body: '그날 봉이 확정된 다음 들어와서, 장중에는 어제까지가 마지막이에요.',
  },
  {
    glyph: '✨',
    title: 'FINCH의 브리핑은 하루 한 번이에요',
    body: '보유·관심 종목의 공시와 뉴스를 모아 하루 한 번 정리해요. 종목 분석과 대화는 언제든 눌러서 받아볼 수 있어요.',
  },
] as const;

export function UpdateNoticeSheet() {
  /**
   * 초기화 함수로 한 번만 판정한다.
   *
   * **이펙트에서 `setOpen(true)` 를 부르지 않는다.** 그 모양은
   * `react-hooks/set-state-in-effect` 가 막는다 — 첫 렌더를 버리고 곧바로 다시
   * 그리게 되는데, 여기서 읽는 것은 `localStorage` 한 줄이라 렌더 중에 읽어도
   * 되는 값이다. 외부 시스템과 동기화할 것이 없으니 이펙트를 쓸 이유가 없다.
   *
   * 매 렌더 다시 읽지 않는 이유 — `markUpdateNoticeSeenToday()` 가 날짜를 적은
   * 직후의 리렌더에서 다시 읽으면, 닫히는 애니메이션 도중에 판정이 뒤집혀
   * 시트가 그 자리에서 사라진다.
   *
   * StrictMode 가 초기화 함수를 두 번 불러도 안전하다. 읽기만 하고 아무것도
   * 바꾸지 않는다.
   *
   * 홈은 탭을 오갈 때마다 다시 마운트되지만 두 번 뜨지 않는다 — `오늘 하루 보지
   * 않기` 를 누른 뒤라면 날짜가 적혀 있고, 누르지 않았다면 아직 안 읽은 것이라
   * 다시 뜨는 편이 맞다.
   */
  const [open, setOpen] = useState(() => !isUpdateNoticeSeenToday());

  /**
   * 닫는 방법이 둘이지만 결과가 다르다.
   *
   * - `오늘 하루 보지 않기` — 날짜를 적는다. 오늘은 다시 뜨지 않는다
   * - 스크림 · ESC · `확인` — 적지 않는다. **이번 진입에서만 닫힌다**
   *
   * 스크림을 잘못 눌러 닫힌 것까지 "봤다" 로 세면, 정작 읽으려던 사람이 오늘 안에
   * 다시 열 방법이 없다. 명시적으로 누른 것만 기억한다.
   */
  const dismissForToday = () => {
    markUpdateNoticeSeenToday();
    setOpen(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="FINCH는 이렇게 움직여요"
      /* 같은 제목이 아래에 시각적으로 있다. Radix 가 `aria-labelledby` 로 쓰는
         제목은 남기고 화면에서만 숨긴다 (`BottomSheet` 주석 · `OrderResultSheet`
         가 같은 모양이다). 빼면 같은 문장이 두 번 보인다. */
      hideTitle
    >
      <p className="text-title-3 font-bold text-text-primary">
        FINCH는 이렇게 움직여요
      </p>
      <p className="mt-1.5 text-body-2 text-text-secondary">
        모의투자지만 시세와 일정은 실제 장을 따라가요.
      </p>

      <ul className="mt-5 flex flex-col gap-4">
        {NOTICE_ITEMS.map((item) => (
          <li key={item.title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 flex-none items-center justify-center rounded-md bg-surface-soft text-body-2"
            >
              {item.glyph}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-body-2 font-medium text-text-primary">
                {item.title}
              </span>
              <span className="text-caption text-pretty break-keep text-text-secondary">
                {item.body}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={() => setOpen(false)}>확인</Button>
        {/* `Button` 의 secondary 를 쓰지 않는다. 두 버튼이 같은 무게로 서면
            "오늘 하루 보지 않기" 가 기본 동작처럼 읽히는데, 이 시트의 기본은
            읽고 닫는 것이다. */}
        <button
          type="button"
          onClick={dismissForToday}
          className="py-2 text-label font-medium text-text-secondary underline underline-offset-3"
        >
          오늘 하루 보지 않기
        </button>
      </div>
    </BottomSheet>
  );
}

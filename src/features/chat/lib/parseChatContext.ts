import { z } from 'zod';

import { AI_CHAT_SCREENS, type AiChatScreen } from '@/shared/types/ai/chat';
import { StockCodeSchema, type StockCode } from '@/shared/types/primitives';

/**
 * 종목명 쿼리 파라미터 이름. **`ticker` 옆에 `stockName` 을 둔다.**
 *
 * `ticker` 가 그 이름인 것은 AI 명세가 그렇게 정해서다(이슈 #11 1번 회신,
 * `shared/types/ai/chat.ts`). 종목명은 AI 요청에 실리는 값이 아니라 **화면이
 * 문구를 짓는 데만 쓰는 값**이라 AI 쪽 이름을 물려받을 이유가 없다. 실리는 값은
 * 백엔드 상세 응답의 `stockName`(`StockDetailResponse`) 그대로이므로 그 이름을
 * 쓴다 — `stockName` 을 grep 하면 싣는 쪽과 읽는 쪽이 한 번에 잡힌다.
 */
const STOCK_NAME_PARAM = 'stockName';

/**
 * 주소창에서 오는 값이라 길이를 묶는다. 한국 종목명은 길어야 스무 자 남짓이고
 * (`에이치엘비생명과학` 아홉 자) 이 값은 빈 상태 헤드라인과 추천 질문 넷에 그대로
 * 박히므로, 검증 없이 받으면 주소 하나로 화면이 무너진다. 넘치면 이름이 없는 것으로
 * 보고 대체 라벨로 떨어뜨린다 — 잘라 쓰면 존재하지 않는 종목명이 화면에 남는다.
 */
const StockNameSchema = z.string().trim().min(1).max(40);

/**
 * `/chat` 은 전용 화면만이 아니다 — 값이 있는 화면에서 열면 `screen`·`ticker` 를
 * 쿼리로 실어 보낸다(`ia.md` §2 "채팅은 `/chat` 전용 화면만이 아니다"). 이 화면
 * 자체로 들어오면(플로팅 버튼 없이 직접 `/chat`) `screen` 은 여섯 열거값 중
 * `chat` 을 쓴다(티켓 프롬프트).
 *
 * **`stock_detail` 인데 `ticker` 가 없거나 6자리 종목코드가 아니면 맥락을 신뢰하지
 * 않는다** — "이거"가 무엇을 가리키는지 AI 가 되물어야 하는 상태를 화면이 만들지 않는다.
 *
 * **`stockName` 은 종목 맥락이 성립할 때만 읽는다** (FINCH-248). 빈 상태의 맥락
 * 문구와 추천 질문이 종목명을 쓰는데 `ticker` 는 6자리 코드라 이름을 따로 받아야 한다.
 * 진입하는 쪽(종목 상세)이 이미 갖고 있는 이름을 쿼리에 얹는다 — **채팅 화면에서
 * `GET /stocks/{stockCode}` 를 부를 수 없어서다.** 그 호출 자체가 최근 본 종목
 * 기록이라(contracts C51) 보지도 않은 조회가 기록에 남고 최근 본 종목 목록까지
 * 무효화된다.
 *
 * 이 값은 **AI 요청의 `context` 에 실리지 않는다.** AI 명세 §4 의 `context` 는
 * `screen`·`ticker` 둘뿐이고(`AiChatRequestSchema`), 종목명은 화면이 문구를 짓는
 * 데만 쓴다. 호출부가 `context` 를 만들 때 이 필드를 함께 넘기지 않도록 주의한다.
 */
export function parseChatContext(searchParams: URLSearchParams): {
  screen: AiChatScreen;
  ticker: StockCode | null;
  /** 화면 문구용 종목명. 쿼리에 없거나 형식이 어긋나면 `null` 이다 */
  stockName: string | null;
} {
  const screenParam = searchParams.get('screen');
  const tickerParam = searchParams.get('ticker');

  const screen = (AI_CHAT_SCREENS as readonly string[]).includes(
    screenParam ?? '',
  )
    ? (screenParam as AiChatScreen)
    : 'chat';

  if (screen !== 'stock_detail') {
    return { screen, ticker: null, stockName: null };
  }

  const parsedTicker = StockCodeSchema.safeParse(tickerParam);
  if (!parsedTicker.success) {
    return { screen: 'chat', ticker: null, stockName: null };
  }

  const parsedName = StockNameSchema.safeParse(
    searchParams.get(STOCK_NAME_PARAM),
  );

  return {
    screen,
    ticker: parsedTicker.data,
    stockName: parsedName.success ? parsedName.data : null,
  };
}

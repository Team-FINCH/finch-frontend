import { AI_CHAT_SCREENS, type AiChatScreen } from '@/shared/types/ai/chat';
import { StockCodeSchema, type StockCode } from '@/shared/types/primitives';

/**
 * `/chat` 은 전용 화면만이 아니다 — 값이 있는 화면에서 열면 `screen`·`ticker` 를
 * 쿼리로 실어 보낸다(`ia.md` §2 "채팅은 `/chat` 전용 화면만이 아니다"). 이 화면
 * 자체로 들어오면(플로팅 버튼 없이 직접 `/chat`) `screen` 은 여섯 열거값 중
 * `chat` 을 쓴다(티켓 프롬프트).
 *
 * **`stock_detail` 인데 `ticker` 가 없거나 6자리 종목코드가 아니면 맥락을 신뢰하지
 * 않는다** — "이거"가 무엇을 가리키는지 AI 가 되물어야 하는 상태를 화면이 만들지 않는다.
 */
export function parseChatContext(searchParams: URLSearchParams): {
  screen: AiChatScreen;
  ticker: StockCode | null;
} {
  const screenParam = searchParams.get('screen');
  const tickerParam = searchParams.get('ticker');

  const screen = (AI_CHAT_SCREENS as readonly string[]).includes(
    screenParam ?? '',
  )
    ? (screenParam as AiChatScreen)
    : 'chat';

  if (screen !== 'stock_detail') {
    return { screen, ticker: null };
  }

  const parsedTicker = StockCodeSchema.safeParse(tickerParam);
  if (!parsedTicker.success) {
    return { screen: 'chat', ticker: null };
  }

  return { screen, ticker: parsedTicker.data };
}

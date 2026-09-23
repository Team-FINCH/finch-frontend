import { type ReactNode } from 'react';

/**
 * 차트 아래 결론 한 줄 — `종목 선택의 영향이 가장 컸어요.` (FINCH-333).
 *
 * ## 무게를 한 단 더 내렸다
 *
 * 첫 판은 `text-body-2`(15px) · `--color-surface-soft` · 안쪽 여백 14/12 였다.
 * **보조 정보인데 존재감이 본문만 했다** — 위 막대 셋을 읽고 난 요약인데 글자
 * 크기가 그 행들의 라벨과 같아서, 한 층 아래로 내려가지 않고 옆에 나란히 섰다.
 *
 * 지금은 `text-caption`(13px) · `--color-text-secondary` · 여백 12/10 이다.
 * 크기·색·여백 셋이 동시에 내려가서 **읽히긴 하되 먼저 읽히지는 않는다.**
 *
 * ## 면색을 세그먼티드 트랙과 갈랐다
 *
 * `--color-note-surface`(#F4F6F8)다. 전에 쓰던 `--color-surface-soft`(#F1F3F6)는
 * 2차 탭 트랙이 쓰는 값이라, 한 화면에 **같은 회색 면이 둘** 서서 "회색 박스가
 * 반복돼 화면이 탁하다" 는 지적의 절반을 이 상자가 만들고 있었다.
 *
 * `--color-note-surface` 는 프로토타입이 `안내 카드` 네 자리에 쓰라고 둔 값이고
 * (`--note`/`--note-b`), 반톤 더 옅어서 흰 카드 안에 들어가도 상자로 도드라지지
 * 않는다. 테두리(`--color-note-border`)는 쓰지 않는다 — 카드 안에 선이 또 생기면
 * 카드 속 카드가 된다.
 *
 * ## 표식은 점 하나다
 *
 * 전 판에는 아무 표식도 없었고 *"전구나 ✦ 를 붙이면 `AiCard` 의 글리프와 섞여
 * 엔진이 쓴 문장을 AI 가 쓴 것으로 읽히게 한다"* 고 적어 두었다. **그 걱정은
 * 그대로 유효하고, 점은 거기 걸리지 않는다** — ✦·전구·말풍선처럼 뜻을 가진
 * 그림이 아니라 줄의 시작을 잡아 주는 부호다.
 *
 * 점이 하는 일은 **글줄 머리를 맞추는 것**이다. 문장이 두 줄로 넘어갈 때 둘째
 * 줄이 점 아래가 아니라 글자 아래로 들어와서(`gap` + `flex`) 덩어리가 사각으로
 * 선다. 여백만 있을 때는 두 줄이 상자 왼쪽 벽에 붙어 흘렀다.
 *
 * 크기 4px · `--color-text-muted` 다. 글자(13px)보다 작고 옅어서 읽는 순서를
 * 가져가지 않는다.
 *
 * ## 등락색을 쓰지 않는다
 *
 * 이 상자 안의 글자는 언제나 중립색이다. 바로 위에 등락색 막대와 수치가 여섯 개
 * 서 있는 자리라, 결론 줄까지 칠하면 **적색이 한 번 더 늘 뿐 어느 것이 결론인지는
 * 오히려 흐려진다.** 위계는 면과 크기로 주고 색은 숫자에 남긴다.
 *
 * 부호를 말하지 않는 문장이라 색을 붙일 근거도 없다 — `resolveMainFactor` 는
 * 절댓값으로 고르므로 가장 크게 *깎은* 요인도 여기 들어온다.
 */

type InsightNoteProps = {
  children: ReactNode;
  className?: string;
};

export function InsightNote({ children, className = '' }: InsightNoteProps) {
  return (
    <p
      className={`flex items-start gap-2 rounded-sm bg-note-surface px-3 py-2.5 ${className}`}
    >
      <span
        aria-hidden="true"
        className="mt-[6px] size-1 flex-none rounded-full bg-text-muted"
      />
      <span className="min-w-0 flex-1 text-caption text-pretty break-keep text-text-secondary">
        {children}
      </span>
    </p>
  );
}

import { InboxList } from '@/features/inbox';
import { useCreateWikiThesis } from '@/features/portfolio/api/useCreateWikiThesis';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

/**
 * 알림함 — Finch 가 물어다 놓는 것 열람: 적어야 할 것(`record`, 매수 이유 기록 요청) ·
 * 확인해야 할 것(`wiki`, AI 추측 확인) · 읽을 것(`news`, 그 종목의 소식).
 * **화면 경로는 미확정** — `/inbox` 는 프론트가 제안한 값이고 팀 확인을 받지 않았다
 * (`ia.md` §1 "AI" 절). API 경로가 `/api/v1/inbox` 로 확정된 것과는 별개다.
 *
 * 티켓: FINCH-141. (`ia.md` 2026-09-05판은 아직 "미발행"으로 적혀 있다 —
 * 이 값은 이후 발행된 Jira 티켓이다.)
 *
 * 근거: `ia.md` §1 "AI" 표, "알림함" 절 · design.md §7.11 알림함 · 프로토타입
 * `isMail` 블록(마크업 최종 근거, 내부 식별자는 여전히 `isMail`·`goMail` 이다).
 * API: `GET /inbox` · `POST /inbox/{itemId}/read` (apiSpec §6.4 v0.8.9 ·
 * `contracts.md` C99, 이슈 #57). 이전 판은 계약이 없어 프론트가 지어낸 스키마로
 * 돌고 있었고 티켓 240 에서 계약으로 갈아 끼웠다.
 *
 * 상단 헤더는 `shared/ui/SubPageHeader` 다(FINCH-196). 뒤로가기가 언제나 홈으로
 * 가던 것을 프로토타입 `closeMail`→`back()` 과 같이 스택을 되돌리는 것으로 바꿨다 —
 * 알림함은 홈·포트폴리오·마이페이지 세 헤더의 뱃지에서 들어오므로(ia.md §1 "알림함")
 * 홈으로 고정하면 포트폴리오에서 온 사용자가 엉뚱한 곳에 떨어진다.
 */
export function InboxPage() {
  /*
    "왜 담으셨나요?" 시트의 저장이 이 자리를 지난다. 매수 이유는
    `POST /ai/wiki/theses` 하나로 가는데(contracts C97 · C99, 알림함 전용 저장
    경로는 없다) 그 훅은 티켓 238 이 `features/portfolio` 에 만들어 뒀고
    **feature 끼리는 import 할 수 없다**(컨벤션 §2). 조합이 필요하면 pages 에서
    props 로 내리는 것이 규약이라 여기서 부른다.
  */
  const createThesis = useCreateWikiThesis();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* 앱 셸 — 본문만 이 안에서 굴러간다 (FINCH-297, `shared/ui/PageMain` 주석). */}
      <SubPageHeader title="알림함" className="pb-1" />
      <PageMain>
        <InboxList
          recordSubmit={{
            mutate: createThesis.mutate,
            isPending: createThesis.isPending,
            isError: createThesis.isError,
            error: createThesis.error,
            reset: createThesis.reset,
          }}
        />
      </PageMain>
    </div>
  );
}

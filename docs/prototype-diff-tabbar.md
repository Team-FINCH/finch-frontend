# 프로토타입 ↔ 구현 대조 — 하단 탭바 (4탭 공통)

- 작성: 2026-09-09 / 기준 커밋 `fa5850d` (master)
- **1차 `prototype-diff.md` 와 같은 형식이다.** 표 칸 · 근거 표기 · 화면 경계 기준 · 상태 분기를 세는 법이 모두 같다. 새 형식을 만들지 않았다
- **판정 규칙은 [`prototype-diff.md` 의 "판정 규칙" 절](./prototype-diff.md)에 있다.** 여기서 다시 적지 않는다
- **`판정` 칸은 비어 있다. 사용자가 채운다.** `(잠정) 의견` 은 워커의 한 줄 소견이고 결정이 아니다
- `proto L####` 는 디코드본 기준 줄 번호다(4,164줄). `app-logic.js` 의 줄 번호 `N` 은 디코드본 `L(N+3033)` 이다

## 이번 범위 — 탭바만

탭바는 화면이 아니라 4탭이 공유하는 공통 요소다. 디코드본에서 `is404` 뒤쪽(`__GLOBAL_after_404__`, **L2855–L3032**)에 FAB · 탭바 · 바텀시트 8종이 함께 들어 있고, 이번 묶음에서는 **탭바만** 다룬다.

| 대상                  | 프로토타입 마크업 | 우리 파일                            | 이 문서의 절 |
| --------------------- | ----------------- | ------------------------------------ | ------------ |
| 탭바 셸 (`.tabbar`)   | L2861–L2889       | `shared/ui/TabBar.tsx` `TabBarShell` | A            |
| 4탭 캡슐 (`.tabpill`) | L2863–L2870       | `shared/ui/TabBar.tsx` `TabBar`      | B            |
| AI 버튼 (`.tabai`)    | L2885–L2887       | `shared/ui/AiEntryButton.tsx`        | C            |
| 본문 하단 여백        | L1043 · L1146     | `app/layouts/TabBarLayout.tsx`       | D            |

**다루지 않는 것** — `.fab`(브리핑 전용, L2855–L2859)과 매수/매도 변형(`.tabpill.trade`, L2871–L2884)은 이번 범위(4탭) 밖이라 표에서 뺐다. `.fab` 는 브리핑 화면, `.trade` 는 종목 상세 묶음에서 다룰 자리다. 다만 두 변형이 같은 셸을 쓰기 때문에 A 절의 셸 항목은 셋에 공통으로 걸린다. 바텀시트 8종(L2891–L3032)은 다음 묶음이다.

## 상태 분기를 어떻게 셌나

`__GLOBAL_after_404__` 안에서 탭바에 걸리는 `sc-if` 는 다섯이다.

| 조건 태그   | 위치  | 갈래                                                           |
| ----------- | ----- | -------------------------------------------------------------- |
| `showFab`   | L2855 | 브리핑 화면에만 `.fab` (**이번 범위 밖**)                      |
| `showTabs`  | L2861 | 탭바 자체를 그릴지 — 시트가 열려 있거나 5화면 밖이면 안 그린다 |
| `tabNav`    | L2863 | 4탭 캡슐 (종목 상세가 아닐 때)                                 |
| `tabTrade`  | L2871 | 매수/매도 캡슐 (종목 상세, **이번 범위 밖**)                   |
| `showTabAi` | L2885 | AI 버튼 — **탐색 화면에서는 안 그린다**                        |

`showTabs`·`tabNav`·`showTabAi` 세 조건의 실제 값은 app-logic.js:369-371 (→ L3402–L3404) 에 있다.

```
showTabs: !s.sheet && ["home","search","portfolio","mypage","detail"].includes(s.screen),
tabNav: s.screen!=="detail", tabTrade: s.screen==="detail",
showTabAi: s.screen!=="search",
```

---

## 대조표

### A. 탭바 셸 (`.tabbar`)

| 화면 | 항목               | 프로토타입                                                                                                            | 우리 구현                                                                                                               | 근거                                                                                            | (잠정) 의견                                                                                             | 판정 |
| ---- | ------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---- |
| 탭바 | 높이               | `height:98px;min-height:98px;max-height:98px` (고정)                                                                  | `h-[98px]`                                                                                                              | proto L1146 · `TabBar.tsx:102` · `design.md` L251 "98px 고정"                                   | 일치. 세 근거가 같다                                                                                    |      |
| 탭바 | 위치               | `position:absolute;left:0;right:0;bottom:0;z-index:20`                                                                | `fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-30`                                                             | proto L1146 · `TabBar.tsx:102`                                                                  | 프로토타입은 고정 크기 기기 프레임 안의 `absolute` 다. 실기기 safe-area 처리가 우리 쪽 추가분이다       |      |
| 탭바 | 가로 폭            | 프레임 전체                                                                                                           | `mx-auto w-full max-w-md` — 넓은 화면에서 본문과 같은 폭으로 가운데 정렬                                                | proto L1146 · `TabBar.tsx:102` (사유는 `ActionBar.tsx` 주석)                                    | 우리 쪽 추가분. 프로토타입은 넓은 화면 개념이 없다                                                      |      |
| 탭바 | 안쪽 여백·정렬     | `display:flex;align-items:flex-end;gap:10px;padding:0 16px 16px`                                                      | 같다 — `flex items-end gap-2.5 px-4 pb-4` (10 · 16 · 16px)                                                              | proto L1146 · `TabBar.tsx:102`                                                                  | 일치                                                                                                    |      |
| 탭바 | 상단 테두리        | **없다** (`border-top:0`)                                                                                             | 없다                                                                                                                    | proto L1146 · `TabBar.tsx:102` · `design.md` L252 "상단 테두리 없음"                            | 일치. 세 근거가 같다                                                                                    |      |
| 탭바 | 글래스 배경        | `::before` — `linear-gradient(to top, rgba(248,249,251,.7), rgba(248,249,251,0))` + `blur(14px)` + 위로 페이드 마스크 | 같다 — `bg-gradient-to-t from-bg/70 to-bg/0` + `blur(14px)` + `mask-image:linear-gradient(to_top,#000_58%,transparent)` | proto L1147 · `TabBar.tsx:107` · `design.md` L252                                               | 일치. 마스크 58% 지점까지 옮겨졌다. 색은 `rgba(248,249,251,...)` 을 `--color-bg` 토큰으로 옮긴 것이다   |      |
| 탭바 | 배경 클릭 통과     | `pointer-events:none`                                                                                                 | 같다 — `pointer-events-none`                                                                                            | proto L1147 · `TabBar.tsx:107`                                                                  | 일치                                                                                                    |      |
| 탭바 | 다크 모드 배경     | `.dark .tabbar::before` 로 어두운 그라디언트를 따로 준다                                                              | 없다 (레포에 다크 모드가 없다)                                                                                          | proto L1148 · `TabBar.tsx:107` · `design.md` (다크 모드 규정 없음)                              | 프로토타입에 `.dark` 규칙이 있지만 `dark: false` 로 고정돼 있다(app-logic.js:254 → L3287) — 죽은 갈래다 |      |
| 탭바 | 탭바를 그리는 화면 | `["home","search","portfolio","mypage","detail"]` **5화면**                                                           | 라우터 `TabBarLayout` 이 감싼 화면. 종목 상세는 `TradeTabBar` 를 따로 쓴다                                              | proto app-logic.js:369 (L3402) · `TabBarLayout.tsx:31-40` · `TabBar.tsx:218` · `design.md` L263 | 일치로 보인다. 종목 상세가 매수/매도 변형으로 갈리는 구조까지 같다                                      |      |
| 탭바 | 시트 열림 시 처리  | `showTabs: !s.sheet` — 렌더에서 뺀다                                                                                  | 같다 — `useIsAnySheetOpen()` 이 참이면 `null` 을 반환한다                                                               | proto app-logic.js:369 (L3402) · `TabBar.tsx:93-96` · `design.md` L279                          | 일치. 세 근거가 같다. `opacity:0` 이 아니라 렌더에서 빼는 것까지 같다                                   |      |
| 탭바 | 접근 이름          | 없다                                                                                                                  | `<nav aria-label="주요 화면 전환">`                                                                                     | proto L2862 · `TabBar.tsx:101-103`                                                              | 우리 쪽 추가분                                                                                          |      |

### B. 4탭 캡슐 (`.tabpill`)

| 화면 | 항목                     | 프로토타입                                                                                            | 우리 구현                                                                                        | 근거                                                                                              | (잠정) 의견                                                                                             | 판정 |
| ---- | ------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---- |
| 탭바 | 탭 개수                  | 4개                                                                                                   | 4개                                                                                              | proto L2865–L2868 · `routes.ts:112-117` · `ia.md` L336-345 · `design.md` L253                     | 일치. 네 근거가 같다                                                                                    |      |
| 탭바 | 탭 라벨 1~3              | `홈` · `탐색` · `포트폴리오`                                                                          | 같다                                                                                             | proto L2865-2867 · `routes.ts:113-115`                                                            | 일치                                                                                                    |      |
| 탭바 | 탭 라벨 4                | **`내 정보`**                                                                                         | **`마이페이지`**                                                                                 | proto L2868 · `routes.ts:116` · 1차 부록 #30 · `design.md` L253,L263 · `ia.md` L339               | 용어 통일(MR !148) 뒤의 차이다. **프로토타입뿐 아니라 `design.md`·`ia.md` 도 아직 `내 정보` 다**        |      |
| 탭바 | 캡슐 치수                | `flex:1;height:58px`(고정) `padding:5px`, `border-radius:999px`, 안쪽 간격 4px                        | 같다 — `h-[58px] flex-1 rounded-full p-[5px] gap-1`                                              | proto L1149 · `TabBar.tsx:117,155` · `design.md` L253 "58px"                                      | 일치. 세 근거가 같다                                                                                    |      |
| 탭바 | 캡슐 면·테두리           | `background:rgba(255,255,255,.72)`, `border:1px solid rgba(31,35,40,.07)`, `blur(18px) saturate(1.6)` | 같다 — `bg-surface/72 border-text-primary/7`, `blur(18px) saturate(1.6)`                         | proto L1149 · `TabBar.tsx:117-119`                                                                | 일치. 알파값까지 옮겨졌다                                                                               |      |
| 탭바 | 캡슐 그림자              | `box-shadow:0 8px 24px rgba(31,35,40,.1)`                                                             | 같다 — `shadow-[0_8px_24px_rgba(31,35,40,0.1)]`                                                  | proto L1149 · `TabBar.tsx:118`                                                                    | 일치                                                                                                    |      |
| 탭바 | 탭 버튼 치수             | `flex:1;height:48px`, `border-radius:999px`, 아이콘·라벨 간격 8px                                     | 같다 — `h-12`(48px) `rounded-full gap-2`                                                         | proto L1150 · `TabBar.tsx:135`                                                                    | 일치                                                                                                    |      |
| 탭바 | 탭 버튼 글자             | 14px/500 `--t3`                                                                                       | `text-label`(14px/500) `text-text-muted`                                                         | proto L1150 · `TabBar.tsx:135,140` · `styles/index.css:230-232`                                   | 일치                                                                                                    |      |
| 탭바 | 선택 탭 표현             | `flex:2.2` 로 넓어지고 `background:#EEF1F5`, 글자 `--t1`                                              | 같다 — `flex-[2.2] bg-primary-soft text-text-primary`                                            | proto L1152 · `TabBar.tsx:139` · `design.md` L253 "선택 탭만 진한 글씨 + 얕은 배경"               | 일치. 세 근거가 같다                                                                                    |      |
| 탭바 | 선택 탭 라벨 노출        | 선택 시에만 — `max-width:0;opacity:0` → `max-width:80px;opacity:1`                                    | 같다 — `max-w-0 opacity-0` ↔ `max-w-20`(80px) `opacity-100`                                      | proto L1151-1153 · `TabBar.tsx:144-148`                                                           | 일치. 비선택 탭은 아이콘만 보인다                                                                       |      |
| 탭바 | 폭 전환 모션             | `transition:flex 220ms, background 160ms, color 140ms`                                                | `transition-[flex,background-color,color] duration-(--motion-normal)`(200ms) — **하나로 묶었다** | proto L1150 · `TabBar.tsx:136` · `styles/index.css:333`                                           | 220/160/140 세 값을 200ms 하나로 합쳤다                                                                 |      |
| 탭바 | 라벨 전환 모션           | `transition:max-width 220ms, opacity 160ms`                                                           | `duration-(--motion-normal)`(200ms) 하나                                                         | proto L1151 · `TabBar.tsx:146`                                                                    | 같은 문제                                                                                               |      |
| 탭바 | 탭 아이콘                | `.n1`~`.n4::before` 24px 마스크 SVG (집 · 돋보기 · 막대 3개 · 사람)                                   | 같다 — `TAB_ICON_SVG` 가 네 SVG 경로 문자열을 그대로 옮겼다                                      | proto L1155, L1182–L1185 · `TabBar.tsx:41-50,169-171`                                             | 일치. 경로 데이터가 문자 단위로 같다                                                                    |      |
| 탭바 | 아이콘 색                | `background:currentColor` — 버튼 글자색을 따라간다                                                    | 같다 — `bg-current`                                                                              | proto L1155 · `TabBar.tsx:169`                                                                    | 일치                                                                                                    |      |
| 탭바 | 순차 등장 애니메이션     | `tin 420ms cubic-bezier(.2,0,0,1) both` — `from{opacity:0;transform:translateY(6px) scale(.97)}`      | 같다 — `tab-item-in var(--motion-tab-swap)`(420ms) `ease-standard both`, `keyframes` 내용도 같다 | proto L1163, L1168 · `TabBar.tsx:130-131` · `styles/index.css:324,334,378-387` · `design.md` L277 | 일치. `--ease-standard` 가 `cubic-bezier(0.2, 0, 0, 1)` 이라 곡선까지 같다                              |      |
| 탭바 | 등장 지연                | 2번째 50ms · 3번째 100ms · 4번째 150ms (첫 탭 지연 없음)                                              | 같다 — `animationDelay: ${index * 50}ms`                                                         | proto L1169–L1171 · `TabBar.tsx:161-162`                                                          | 일치                                                                                                    |      |
| 탭바 | `prefers-reduced-motion` | 없다                                                                                                  | `motion-reduce:animate-none`                                                                     | proto L1163-1171 · `TabBar.tsx:131`                                                               | 우리 쪽 추가분. 하단에서 네 개가 튀어 오르는 움직임이라 필요해 보인다                                   |      |
| 탭바 | 선택 판정                | `s.screen === "..."` 문자열 비교                                                                      | `NavLink` + `end` (경로 정확 일치)                                                               | proto app-logic.js:402-403 (L3435–L3436) · `TabBar.tsx:157-163`                                   | 일치로 보인다. `end` 를 준 것은 홈(`/`)이 모든 경로의 접두사라서다                                      |      |
| 탭바 | 탭 이동 히스토리         | `tabTo` 가 `stack:[]` 으로 스택을 비운다                                                              | `NavLink` — 히스토리에 쌓인다(`push`)                                                            | proto app-logic.js:148 (L3181) · `TabBar.tsx:157`                                                 | 모름 — `frontConvention.md` §10 이 "화면 이동은 push" 라고 적었지만 탭 전환이 화면 이동인지는 안 적혔다 |      |
| 탭바 | 탭 접근 역할             | 없다 (그냥 `<button>`)                                                                                | `<nav>` 안의 `NavLink`(`<a>`)                                                                    | proto L2865-2868 · `TabBar.tsx:157`                                                               | 우리 쪽이 링크라 새 탭 열기·주소 복사가 된다                                                            |      |

### C. AI 버튼 (`.tabai`)

| 화면 | 항목                   | 프로토타입                                                                           | 우리 구현                                                              | 근거                                                                                                           | (잠정) 의견                                                                                                                                                                                           | 판정 |
| ---- | ---------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 탭바 | **탐색 화면에서 숨김** | **숨긴다** — `showTabAi: s.screen!=="search"`                                        | **숨기지 않는다** — `TabBarShell` 이 `AiEntryButton` 을 무조건 그린다  | proto L2885, app-logic.js:371 (L3404) · `TabBar.tsx:110` · `design.md` L263 "(탐색은 숨김)" · `design.md` L395 | **프로토타입·design.md 두 근거가 같은데 구현만 어긋난다.** 탐색 문서에도 같은 행이 있다                                                                                                               |      |
| 탭바 | 치수                   | `width:58px;height:58px`(고정), `border-radius:999px`, `flex:none`                   | 같다 — `h-[58px] min-w-[58px] flex-none rounded-full`                  | proto L1156 · `AiEntryButton.tsx:82-83` · `design.md` L254 "58px 원형"                                         | 일치. 세 근거가 같다                                                                                                                                                                                  |      |
| 탭바 | 면색·글자색            | `background:var(--t1)`, `color:#fff`                                                 | `bg-primary text-surface` (`--color-primary` 가 `--t1` 과 같은 값이다) | proto L1156 · `AiEntryButton.tsx:83` (사유 주석 L14-17) · `design.md` L254 "`--t1` 배경"                       | 일치                                                                                                                                                                                                  |      |
| 탭바 | 그림자                 | `box-shadow:0 8px 24px rgba(31,35,40,.16)`                                           | `shadow-float` = **`0 6px 20px rgba(31,35,40,0.2)`** — 값이 다르다     | proto L1156 · `AiEntryButton.tsx:83` (사유 주석 L16-17) · `styles/index.css:321`                               | 실측값 대신 있는 토큰을 재사용한 것이 주석에 있다. 결과적으로 그림자가 더 짧고 진하다                                                                                                                 |      |
| 탭바 | 눌림 모션              | `:active{transform:scale(.94)}`, `transition:transform 140ms`                        | `active:scale-[.94]`                                                   | proto L1157 · `AiEntryButton.tsx:84-85`                                                                        | 일치. 전환 시간은 우리 쪽이 300ms 묶음에 들어가 있다                                                                                                                                                  |      |
| 탭바 | 아이콘                 | `.tabai::before` 24px 마스크 SVG (말풍선)                                            | 같은 자리에 24px 마스크 — **경로 데이터가 다르다**                     | proto L1176 · `AiEntryButton.tsx:27-29,89-93`                                                                  | 앞부분은 같고 꼬리가 다르다 — proto `…-1.5 3.1-.3.4.1.9.5.7 1.9-.6 3.3-1.5 4.2-2.2.7.1 1.4.2 2.2.2…` ↔ ours `…-1.5 3.2-.2.3.1.7.5.5 1.6-.7 2.9-1.6 3.7-2.2.9.2 1.8.3 2.7.3…`. 다시 그린 것으로 보인다 |      |
| 탭바 | 기본 라벨              | `AI에게 묻기` (`tabaiLabel` 의 기본값)                                               | 같다 — `DEFAULT_LABEL`                                                 | proto L2886, app-logic.js:376 (L3409) · `AiEntryButton.tsx:32`                                                 | 일치                                                                                                                                                                                                  |      |
| 탭바 | 4탭에서 라벨 펼침      | **펼치지 않는다** — `tabaiCls` 가 `screen==="detail"` 에서만 `peek` 가 된다          | 같다 — `expandedLabel` 을 넘기지 않으면 원형 고정                      | proto L2886, app-logic.js:375 (L3408) · `TabBar.tsx:154` · `AiEntryButton.tsx:44-49,66-72`                     | 일치                                                                                                                                                                                                  |      |
| 탭바 | 라벨 글자              | 15px/500                                                                             | `text-label` — **14px/500**                                            | proto L1159 · `AiEntryButton.tsx:97` · `styles/index.css:230`                                                  | 15 ↔ 14px. 4탭에서는 안 보이지만 종목 상세에서 보인다                                                                                                                                                 |      |
| 탭바 | 라벨 접근성            | `<span>` 에 라벨 + `aria-label` 둘 다 있다 (라벨이 `max-width:0` 로 접혀도 읽힌다)   | `<span aria-hidden>` + `aria-label` — 시각 라벨을 보조 기술에서 숨긴다 | proto L2886 · `AiEntryButton.tsx:79,90,95`                                                                     | 우리 쪽이 중복 낭독을 피한다. 프로토타입은 같은 문구를 두 번 읽힐 수 있다                                                                                                                             |      |
| 탭바 | 펼침 폭                | `.tabai.peek{max-width:240px;padding:0 20px 0 16px;gap:8px}`, 라벨 `max-width:160px` | `max-w-[240px] gap-2 pr-5 pl-4`, 라벨 `max-w-[180px]`                  | proto L1160-1161 · `AiEntryButton.tsx:85,98`                                                                   | 버튼 폭·여백은 일치. 라벨 최대폭이 160 ↔ 180px 다 (우리는 `.fab` 쪽 값 180px 을 썼다)                                                                                                                 |      |
| 탭바 | 펼침 지연              | `_peek` 타이머 40ms                                                                  | 같다 — `PEEK_DELAY_MS = 40`                                            | proto app-logic.js:375 (L3408) · `AiEntryButton.tsx:38,70`                                                     | 일치                                                                                                                                                                                                  |      |
| 탭바 | 펼침 모션              | `max-width 300ms cubic-bezier(.2,0,0,1)`, `padding`·`gap` 300ms                      | 같다 — `duration-300 ease-standard`                                    | proto L1158-1159 · `AiEntryButton.tsx:84` · `styles/index.css:324`                                             | 일치. `--ease-standard` 가 같은 곡선이다                                                                                                                                                              |      |
| 탭바 | 도착지                 | `openChatCtx` — 채팅 화면으로 가면서 종목 상세일 때만 `chatCtx` 에 종목명을 싣는다   | `ROUTES.chat` — 맥락을 싣지 않는다                                     | proto L2886, app-logic.js:469 (L3502) · `AiEntryButton.tsx:80` (사유 주석 L19-21)                              | `ia.md` §2 가 맥락 쿼리를 확인 대기로 남겨 임의로 만들지 않은 것이 주석에 있다 (계약 문제)                                                                                                            |      |
| 탭바 | 시트 열림 시 처리      | `showTabs: !s.sheet` 안에 있어 탭바와 함께 사라진다                                  | 같다 — `TabBarShell` 이 `null` 을 반환하면 이 버튼도 사라진다          | proto L2861,2885 · `TabBar.tsx:93-96,110` · `AiEntryButton.tsx:23-25` · `design.md` L279                       | 일치. 판정을 셸 한 곳에만 둔 것까지 같다                                                                                                                                                              |      |
| 탭바 | 캡슐 오른쪽 자리       | 탭바 `flex` 줄의 마지막 항목, 셸의 `gap:10px` 로 떨어진다                            | 같다 — `TabBarShell` 의 `children` 뒤에 온다                           | proto L2862–L2888 · `TabBar.tsx:109-110` · `design.md` L254                                                    | 일치. 세 근거가 같다                                                                                                                                                                                  |      |

### D. 본문 하단 여백

| 화면 | 항목           | 프로토타입                                             | 우리 구현                                                      | 근거                                                                                          | (잠정) 의견                                                                   | 판정 |
| ---- | -------------- | ------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---- |
| 탭바 | 본문 하단 여백 | `.sc` 의 `padding-bottom:28px` + 탭바 98px = **126px** | `TabBarLayout` 의 `98px + safe-area` + `PageMain` `py-6`(24px) | proto L1043, L1146 · `TabBarLayout.tsx:33` · `PageMain.tsx:18` · `design.md` L255 "**132px**" | **세 근거가 다 다른 값이다** — 126 · 122+safe · 132. 아래 "어긋남" 2번을 본다 |      |
| 탭바 | safe-area 처리 | 없다 (고정 크기 기기 프레임)                           | 탭바는 `bottom` 에, 본문은 `padding-bottom` 에 각각 더한다     | proto L1146 · `TabBar.tsx:102` · `TabBarLayout.tsx:33` (사유 주석 L17-21)                     | 우리 쪽 추가분. 이중으로 차지하지 않게 맞춘 계산이 주석에 있다                |      |
| 탭바 | 탭바 없는 화면 | `showTabs` 목록 밖 화면은 탭바 없이 그린다             | `TabBarLayout` 밖 라우트는 탭바가 없다                         | proto app-logic.js:369 (L3402) · `TabBarLayout.tsx:31` · `design.md` L259                     | 일치                                                                          |      |

---

## 일치 확인한 항목

표에 이미 넣은 것 말고, 따로 확인해 어긋나지 않은 것들이다.

- 탭 4개와 그 순서 (홈 · 탐색 · 포트폴리오 · 4번째)
- `.tabbar` 실측값 전부 (98px 고정 · `gap:10px` · `padding:0 16px 16px` · 상단 테두리 없음)
- 글래스 배경의 그라디언트 · 블러 14px · 페이드 마스크 58%
- `.tabpill` 실측값 전부 (58px · `padding:5px` · `rgba(255,255,255,.72)` · 테두리 알파 .07 · 블러 18px saturate 1.6 · 그림자)
- 탭 버튼 48px · 반경 999px · 아이콘 간격 8px · 글자 14px/500
- 선택 탭의 `flex:2.2` 와 `#EEF1F5` 배경
- 비선택 탭은 아이콘만, 선택 탭만 라벨을 펼치는 방식
- 탭 아이콘 네 SVG 의 경로 데이터
- 아이콘 색을 `currentColor` 로 두는 방식
- 순차 등장 420ms 와 50 / 100 / 150ms 지연
- 바텀시트가 열리면 탭바와 AI 버튼을 렌더에서 빼는 처리
- `.tabai` 58px 원형 · `--t1` 면 · 흰 글자 · `scale(.94)` 눌림
- AI 버튼 기본 라벨 `AI에게 묻기`
- 4탭에서 AI 버튼 라벨을 펼치지 않는 것
- 펼침 지연 40ms 와 펼침 폭 240px
- AI 버튼이 캡슐 오른쪽 마지막 자리에 오는 것
- 탭바를 그리는 화면이 5개(4탭 + 종목 상세)인 것

---

## 프로토타입 ↔ `design.md`·`ia.md` 어긋남

**고치지 않았다.** 두 근거가 서로 다른 말을 하는 자리만 모았다.

1. **4번째 탭 라벨** — 프로토타입 `내 정보`(L2868) · `design.md` L253·L263 `내 정보` · `ia.md` L339 `내 정보` 셋이 모두 옛 용어이고 **우리 구현만 `마이페이지`**(`routes.ts:116`)다. MR !148 이 화면 용어를 통일했는데 세 근거 전부 갱신되지 않았다. **프로토타입은 재내보내기를 기다리면 되지만 `design.md`·`ia.md` 는 우리 레포 문서라 고칠 자리다**
2. **본문 하단 여백** — `design.md` L255 는 132px, 프로토타입은 `.sc` 28px + 탭바 98px = 126px, 우리 구현은 탭바 98px + safe-area + `PageMain` 24px 이다. 세 값이 다르고 어느 것이 기준인지 정해져 있지 않다. 홈·탐색·포트폴리오 문서에도 같은 행이 있다
3. **탭 바 변형 표의 `거래정지` 라벨** — `design.md` L275 는 `거래정지` 한 줄, 프로토타입은 `거래정지된 종목이에요`(L2881)다. 우리 구현은 `거래정지 · 주문 불가`(`TabBar.tsx:228`)로 **셋 다 다르다.** 이번 범위(4탭) 밖이라 표에 넣지 않았고 종목 상세 묶음에서 다룰 자리다
4. **AI 버튼이 탭바 안인가 밖인가** — 이 어긋남은 이미 정리됐다. `design.md` L249 가 "AI 진입점은 플로팅이 아니라 탭바 안에 있다" 로 프로토타입 쪽으로 확정됐고 `TabBar.tsx:16-33` 이 그 경과를 적어 두었다. **다만 그 주석은 "모든 화면에 AI 버튼을 둔다" 고 적었는데 `showTabAi` 는 탐색을 뺀다** — 재실측 당시 이 한 갈래를 놓친 것으로 보인다. C 절 첫 행이 그 결과다

---

## 용어

| 화면 | 항목                     | 프로토타입              | 우리 구현    | 근거                                         | (잠정) 의견                   | 판정                          |
| ---- | ------------------------ | ----------------------- | ------------ | -------------------------------------------- | ----------------------------- | ----------------------------- |
| 탭바 | 용어(내 정보→마이페이지) | 4번째 탭 라벨 `내 정보` | `마이페이지` | proto L2868 · `routes.ts:116` · 1차 부록 #30 | 판정 불필요 — 재내보내기 대기 | 판정 불필요 — 재내보내기 대기 |

1차 문서 부록의 `내 정보` 2건 중 **1건**(#30, 디코드본 L2868)이 이 탭바다. 나머지 1건(#29)은 마이페이지 네비 제목이다.

**다만 이 건은 재내보내기만으로 끝나지 않는다** — 위 "어긋남" 1번에 적은 대로 `design.md`·`ia.md` 도 아직 `내 정보` 라서 우리 레포 문서 쪽에 고칠 자리가 남는다.

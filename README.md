<div align="center">

<img src="docs/images/banner.png" alt="FINCH" />

[![시연 영상](https://img.shields.io/badge/시연_영상-FF0000?style=for-the-badge&logo=youtube&logoColor=white&labelColor=15181C)](https://youtu.be/4Cbu0-vMve4)
[![finchapp.org](https://img.shields.io/badge/finchapp.org-F2B705?style=for-the-badge&labelColor=15181C)](https://finchapp.org)
[![Docs](https://img.shields.io/badge/finch--docs-343A42?style=for-the-badge&labelColor=15181C)](https://github.com/Team-FINCH/finch-docs)
[![About FINCH](https://img.shields.io/badge/About_FINCH-EC1C24?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)](docs/finch-presentation.pdf)

</div>

## 📱 화면

|                    홈                     |              데일리 브리핑              |                  종목 상세                   |               AI 종목 분석                |
| :---------------------------------------: | :-------------------------------------: | :------------------------------------------: | :---------------------------------------: |
|    <img src="docs/images/home.png" />     | <img src="docs/images/briefing.png" />  |     <img src="docs/images/stock.gif" />      |  <img src="docs/images/stock-ai.png" />   |
|            **주문 전 AI 점검**            |         **AI 포트폴리오 진단**          |               **수익률 분석**                |                **AI 채팅**                |
| <img src="docs/images/order-check.gif" /> | <img src="docs/images/diagnosis.png" /> | <img src="docs/images/returns-factor.png" /> | <img src="docs/images/chat-answer.gif" /> |

## ✨ 주요 기능

| 흐름        | 기능                   | 설명                                                                |
| ----------- | ---------------------- | ------------------------------------------------------------------- |
| 오늘의 시장 | **데일리 브리핑**      | 보유 종목 관련 소식을 추려 중요한 것부터 보여줌                     |
| 투자 판단   | **AI 종목 분석**       | 최근 1년 공시 + 최신 뉴스로 현재 상황·최근 변화·주목 요인·위험 정리 |
| 매매 실행   | **주문 전 AI 점검**    | 체결 뒤 종목·업종 비중 변화를 계산하고 기준 초과 항목 표시          |
| 계좌 관리   | **AI 포트폴리오 진단** | 위험도 점수(0–100)와 종목 집중도·업종 집중·변동성                   |
| 계좌 관리   | **수익률 분석**        | 기간 수익률을 시장 영향·업종 배분·종목 선택으로 분해                |
| 어디서나    | **AI 채팅**            | 보유 종목·거래 내역 기반 답변, 공시·뉴스 근거 표시                  |

## 🛠️ Tech Stack

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-433E38?style=flat-square&logo=react&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)
![lightweight-charts](https://img.shields.io/badge/lightweight--charts-131722?style=flat-square&logo=tradingview&logoColor=white)
![react-markdown](https://img.shields.io/badge/react--markdown-000000?style=flat-square&logo=markdown&logoColor=white)
![MSW](https://img.shields.io/badge/MSW-FF6A33?style=flat-square&logo=mockserviceworker&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=flat-square&logo=prettier&logoColor=black)

<details open>
<summary><b>📋 분류별로 보기</b></summary>
<br />

| 분류           | 사용 기술                                      |
| -------------- | ---------------------------------------------- |
| 기반           | React 19 · TypeScript · Vite 8                 |
| 상태 관리      | TanStack Query · Zustand                       |
| 라우팅         | React Router 7                                 |
| 스타일 · UI    | Tailwind CSS 4 · Radix Primitives · Pretendard |
| 차트           | lightweight-charts                             |
| 검증 · 목 서버 | Zod · MSW                                      |
| AI 응답 렌더링 | react-markdown · remark-gfm                    |
| 앱 배포        | vite-plugin-pwa                                |
| 코드 품질      | ESLint · Prettier                              |

</details>

<details open>
<summary><b>🧭 아키텍처</b></summary>
<br />

**전체 구조** — 화면 → 상태 → 네트워크 → 서버, 위에서 아래로 한 방향으로 흐릅니다.

```mermaid
flowchart TB
    subgraph VIEW["🖥️ 화면 · features/"]
        H["🏠 홈"]
        S["📈 종목"]
        O["🧾 주문"]
        P["💼 포트폴리오"]
        C["💬 AI 채팅"]
    end

    subgraph STATE["🧠 상태"]
        QS["⚡ useQuoteSubscription<br/>시세 구독 추상화"]
        RQ["🔄 TanStack Query<br/>서버 상태 · 캐시"]
        ZS["🗂️ Zustand<br/>세션 · UI 상태"]
    end

    subgraph NET["🌐 네트워크"]
        HC["🔐 httpClient<br/>JWT 첨부 · 401 → 토큰 재발급"]
    end

    subgraph SERVER["☁️ 서버"]
        BE["🚀 Backend<br/>/api/v1"]
        MSW["🧪 MSW 목 서버<br/>개발 모드 · API 계약 재현"]
        STOMP["📡 STOMP<br/>실시간 시세 · 예정"]
    end

    H & S & O --> QS
    VIEW --> RQ
    VIEW --> ZS
    QS -->|"지금은 폴링"| RQ
    QS -.->|"교체 지점"| STOMP
    RQ --> HC
    HC -->|"운영"| BE
    HC -.->|"개발"| MSW

    classDef view fill:#F2B705,stroke:#C99400,color:#15181C,font-weight:bold
    classDef state fill:#343A42,stroke:#15181C,color:#FFFFFF
    classDef net fill:#15181C,stroke:#F2B705,stroke-width:2px,color:#F2B705
    classDef server fill:#FFFFFF,stroke:#343A42,color:#15181C
    classDef future fill:#FFFFFF,stroke:#EC1C24,stroke-dasharray:5 5,color:#EC1C24

    class H,S,O,P,C view
    class QS,RQ,ZS state
    class HC net
    class BE,MSW server
    class STOMP future

    style VIEW fill:none,stroke:#F2B705,stroke-width:2px
    style STATE fill:none,stroke:#343A42,stroke-width:2px
    style NET fill:none,stroke:#15181C,stroke-width:2px
    style SERVER fill:none,stroke:#8A929C,stroke-width:2px,stroke-dasharray:4 4
```

**AI 채팅 응답 흐름** — 오래 걸리는 답변은 job으로 받고, 도착하면 타자 효과로 보여줍니다.

```mermaid
flowchart LR
    Q["💬 질문 입력"] --> JOB["① job 생성"] --> POLL["② job 폴링<br/>완료까지만"] --> TW["③ 타자 효과"] --> MD["④ Markdown 렌더<br/>원시 HTML 차단"]

    classDef start fill:#F2B705,stroke:#C99400,color:#15181C,font-weight:bold
    classDef step fill:#343A42,stroke:#15181C,color:#FFFFFF
    classDef safe fill:#15181C,stroke:#F2B705,stroke-width:2px,color:#F2B705

    class Q start
    class JOB,POLL,TW step
    class MD safe
```

**폴더 구조**

```
src/
├── app/        라우터 · 레이아웃 · 전역 Provider
├── features/   auth · home · stocks · order · portfolio · chat · deposit
│               transactions · inbox · onboarding · mypage
├── shared/     공용 UI · 타입 · API 계약
└── mocks/      MSW 핸들러
```

</details>

## 🚀 실행

```bash
cp .env.example .env   # 목 서버(MSW)로 띄운다. 없으면 API 가 전부 실패한다
npm ci
npm run dev
```

`.env` 의 `VITE_ENABLE_MSW` 가 목 서버를 켜는 유일한 스위치다. **기본값은 꺼짐이라
변수를 주지 않으면 실제 백엔드로 요청이 나간다.** 목으로 띄우면 카카오 로그인이
실제 카카오를 거치지 않고 바로 로그인된 상태가 된다.

### Vercel 배포 (목 서버)

프레임워크 프리셋 `Vite`, 빌드 명령과 출력 폴더는 기본값 그대로 두고 **환경변수
하나만** 넣는다.

```
VITE_ENABLE_MSW = true
```

백엔드 주소·카카오 키·카카오 콘솔의 redirect URI 등록은 필요 없다. SPA 라우팅
폴백은 `vercel.json` 이 담고 있다. 목 모드에서는 PWA 서비스 워커를 만들지 않아
앱으로 설치되지는 않는다 — 목 워커가 같은 스코프를 써야 하기 때문이다.

대신 목 빌드는 **스스로를 지우는 `/sw.js`** 를 하나 내보낸다. 이 도메인을 전에
방문해 실배포 PWA 워커가 설치된 브라우저가, 갱신을 확인할 때 이것으로 교체되고
등록을 지운 뒤 목 앱으로 넘어온다. 이 파일이 없으면 그런 브라우저는 예전 화면에
갇힌 채 API 가 전부 실패한다.

### 빌드가 갈리는지 확인하는 법

**셸 환경변수로만 확인하지 않는다.** `vite.config.ts` 는 `loadEnv` 로 `.env` 와
셸 양쪽을 보지만, 한쪽으로만 재면 다른 쪽이 어긋나도 드러나지 않는다.

```bash
printf 'VITE_ENABLE_MSW=true
' > .env && npm run build
#  dist/sw.js          → 자기해제 스크립트 (registration.unregister 가 들어 있다)
#  dist/workbox-*.js   → 없다 (PWA 가 꺼졌다)
#  목 청크             → 있다

rm .env && npm run build
#  dist/sw.js          → 워크박스가 만든 진짜 PWA 워커
#  dist/workbox-*.js   → 있다
#  목 청크             → 없다 (트리셰이킹)
```

## 🧑🏻‍💻 Developers

| <img src="https://github.com/TrossYou.png" width="100" /> | <img src="https://github.com/xxj15.png" width="100" /> |
| :-------------------------------------------------------: | :----------------------------------------------------: |
|                        **유승주**                         |                       **안서진**                       |
|         [@TrossYou](https://github.com/TrossYou)          |           [@xxj15](https://github.com/xxj15)           |

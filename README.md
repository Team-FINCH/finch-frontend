<div align="center">

<img src="docs/images/banner.png" alt="FINCH" />

[![finchapp.org](https://img.shields.io/badge/finchapp.org-F2B705?style=for-the-badge&labelColor=15181C)](https://finchapp.org)
[![Docs](https://img.shields.io/badge/finch--docs-343A42?style=for-the-badge&labelColor=15181C)](https://github.com/Team-FINCH/finch-docs)
[![PDF](https://img.shields.io/badge/서비스_소개서-EC1C24?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)](docs/finch-presentation.pdf)

</div>

## 📱 화면

|                    홈                     |              데일리 브리핑              |                  종목 상세                   |               AI 종목 분석                |
| :---------------------------------------: | :-------------------------------------: | :------------------------------------------: | :---------------------------------------: |
|    <img src="docs/images/home.png" />     | <img src="docs/images/briefing.png" />  |     <img src="docs/images/stock.png" />      |  <img src="docs/images/stock-ai.png" />   |
|            **주문 전 AI 점검**            |         **AI 포트폴리오 진단**          |               **수익률 분석**                |                **AI 채팅**                |
| <img src="docs/images/order-check.png" /> | <img src="docs/images/diagnosis.png" /> | <img src="docs/images/returns-factor.png" /> | <img src="docs/images/chat-answer.png" /> |

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

<div align="center">

<img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind" />

<br /><br />

![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-433E38?style=flat-square&logo=react&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)
![MSW](https://img.shields.io/badge/MSW-FF6A33?style=flat-square&logo=mockserviceworker&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![lightweight-charts](https://img.shields.io/badge/lightweight--charts-131722?style=flat-square&logo=tradingview&logoColor=white)

</div>

| 분류           | 사용 기술                                      |
| -------------- | ---------------------------------------------- |
| 기반           | React 19 · TypeScript · Vite 8                 |
| 상태 관리      | TanStack Query · Zustand                       |
| 스타일 · UI    | Tailwind CSS 4 · Radix Primitives · Pretendard |
| 차트           | lightweight-charts                             |
| 검증 · 목 서버 | Zod · MSW                                      |
| AI 응답 렌더링 | react-markdown · remark-gfm                    |
| 앱 배포        | vite-plugin-pwa                                |

<details>
<summary><b>🧭 아키텍처</b></summary>
<br />

```mermaid
flowchart TB
    subgraph UI["화면 — features/"]
        H["홈"]
        S["종목"]
        O["주문"]
        P["포트폴리오"]
        C["AI 채팅"]
    end

    UI --> RQ["TanStack Query<br/>서버 상태 · 캐시"]
    UI --> ZS["Zustand<br/>세션 · UI 상태"]
    S --> QS["useQuoteSubscription<br/>구독 추상화"]
    H --> QS
    O --> QS
    QS -->|지금은 폴링| RQ
    QS -.->|교체 지점| STOMP["STOMP"]

    RQ --> HC["httpClient<br/>JWT 첨부 · 401 시 토큰 재발급"]
    HC -->|"/api/v1"| BE["Backend"]
    HC -.->|개발 모드| MSW["MSW 목 서버<br/>API 계약 재현"]

    C -->|"채팅 요청"| JOB["job 생성"] --> POLLJ["job 폴링<br/>완료까지만"]
    POLLJ --> TW["타자 효과"] --> MD["Markdown 렌더<br/>원시 HTML 차단"]
```

```
src/
├── app/        라우터 · 레이아웃 · 전역 Provider
├── features/   auth · home · stocks · order · portfolio · chat · deposit
│               transactions · inbox · onboarding · mypage
├── shared/     공용 UI · 타입 · API 계약
└── mocks/      MSW 핸들러
```

</details>

## 🧑🏻‍💻 Developers

| <img src="https://github.com/TrossYou.png" width="100" /> | <img src="https://github.com/xxj15.png" width="100" /> |
| :-------------------------------------------------------: | :----------------------------------------------------: |
|                        **유승주**                         |                       **안서진**                       |
|         [@TrossYou](https://github.com/TrossYou)          |           [@xxj15](https://github.com/xxj15)           |

# FINCH Frontend

**AI 설명이 붙는 모바일 투자 앱** — [FINCH](https://github.com/Team-FINCH/finch-docs) 의 프론트엔드입니다.

[**finchapp.org**](https://finchapp.org) 에서 설치형 앱(PWA)으로 사용할 수 있습니다.

![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white)

> 담당: 유승주 [@TrossYou](https://github.com/TrossYou) · 안서진 [@xxj15](https://github.com/xxj15)

## 화면

| 영역 | 내용 |
|---|---|
| 홈 | 데일리 브리핑, 수익률 원인 요약 |
| 종목 | 실시간 시세 차트, AI 종목 분석, 관심 종목 |
| 주문 | 시장가 매수·매도, 주문 전 AI 점검 |
| 포트폴리오 | 보유 현황, AI 진단 |
| AI 채팅 | 타자 효과, Markdown 렌더링, 근거 각주 |
| 온보딩 · 충전 · 거래내역 · 알림함 · 마이페이지 | |

## 이렇게 만들었습니다

- **백엔드 없이도 전 화면이 돕니다** — MSW 목 서버가 API 계약을 그대로 흉내 내서, 백엔드 개발과 병렬로 화면을 완성했습니다
- **API 계약을 타입으로 고정** — 응답·에러 코드를 공유 타입으로 정의해 계약 변경이 컴파일 오류로 드러납니다
- **AI 응답의 수치 강조** — AI 가 보낸 텍스트·수치 조각(`segments`)을 받아 수치만 따로 강조합니다
- **설치형 PWA** — 홈 화면 설치, 서비스 워커 캐시 전략

## 기술 스택

React 19 · TypeScript · Vite 8 · TanStack Query · Zustand · React Router 7 · Tailwind CSS 4 · lightweight-charts · react-markdown · MSW · vite-plugin-pwa

## 구조

```
src/
├── features/   auth · home · stocks · order · portfolio · chat · deposit
│               transactions · inbox · onboarding · mypage
├── shared/     공용 UI · 타입 · API 계약
└── mocks/      MSW 핸들러
```

## 실행

```bash
npm ci
npm run dev   # MSW 목 서버로 백엔드 없이 실행
```

import './LoginHero.css';
import { LoginHeroChart } from './LoginHeroChart';

/** 서브셋 서체. `styles/index.css` 의 `@font-face` 와 같은 주소여야 한다. */
const HERO_FONT_URL = '/fonts/gmarket-sans-bold-hero.woff2';

/**
 * 헤드라인 두 줄의 앞부분. 세 낱말이 차례로 올라오고 세 번째에서 멈춘다.
 * 멈춘 문구가 화면의 결론이라 순서를 바꾸면 마지막 칸이 달라진다.
 */
const HEADLINE_SLOTS = [
  { words: ['펀드', '세금', '주식'], rest: '에는', widening: false },
  { words: ['매니저', '세무사', 'FINCH'], rest: '가 있다.', widening: true },
];

/** 슬롯이 멈춘 뒤의 문구. 화면 낭독기에는 이것만 읽힌다. */
const HEADLINE_FINAL = '주식에는 FINCH가 있다.';

const STATS = [
  { caption: '종목 분석', value: ['7개', '핵심 항목'], delay: '1.1s' },
  { caption: '계좌 진단', value: ['3개', '핵심 지표'], delay: '1.55s' },
  { caption: '주문 점검', value: ['매수 전·후', '비교'], delay: '2s' },
];

/**
 * 로그인 전 히어로 (프로토타입 `isLanding`).
 *
 * 로고·헤드라인·설명·차트·지표 3열까지가 이 컴포넌트다. 카카오 버튼과 약관
 * 문구는 화면 하단에 고정되므로 `pages/LoginPage` 가 따로 들고 있다.
 *
 * ## 움직임
 *
 * 슬롯 전환과 차트 등장은 사용자가 아무것도 하지 않아도 자동으로 돈다.
 * `prefers-reduced-motion` 에서는 전부 멈추고 최종 상태로 바로 보인다 —
 * 끝값을 다시 적는 일은 `LoginHero.css` 가 한다.
 *
 * ## 읽히는 문구
 *
 * 슬롯 안에는 낱말이 세 벌 들어 있어서, 그대로 두면 낭독기가
 * "펀드세금주식에는 매니저세무사FINCH가 있다." 로 읽는다. 그래서 `h1` 의 이름을
 * 최종 문구로 고정하고 움직이는 마크업은 접근성 트리에서 뺀다.
 */
export function LoginHero() {
  return (
    <div className="flex flex-1 flex-col justify-center px-6.5">
      {/*
        서체를 미리 받는다. `crossorigin` 이 없으면 브라우저가 preload 와
        `@font-face` 요청을 다른 것으로 보고 같은 파일을 두 번 받는다 —
        서체는 같은 출처라도 CORS 모드로 요청되기 때문이다.
        React 19 가 이 `link` 를 `head` 로 올려 준다.
      */}
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href={HERO_FONT_URL}
        crossOrigin=""
      />

      {/* 폭·높이 속성은 원본 크기다. 서체가 바뀌기 전에도 자리를 잡아 준다. */}
      <img
        src="/brand/finch-logo.png"
        alt="FINCH"
        width={1198}
        height={681}
        className="mb-4.5 h-auto w-25"
      />

      <h1
        aria-label={HEADLINE_FINAL}
        className="hero-headline text-text-primary"
      >
        <span aria-hidden="true">
          {HEADLINE_SLOTS.map((slot) => (
            <span key={slot.rest} className="block">
              {/* 클래스를 템플릿 리터럴로 잇지 않는다. prettier 의 tailwind
                  플러그인이 `${}` 안쪽 문자열을 정렬하면서 앞 공백을 지워
                  두 클래스가 한 이름으로 붙어 버린다. */}
              <span
                className={
                  slot.widening ? 'hero-slot hero-slot--widening' : 'hero-slot'
                }
              >
                <span>
                  {slot.words.map((word) => (
                    <i key={word}>{word}</i>
                  ))}
                </span>
              </span>
              {/* 뒤따르는 조사는 흐린 색으로 남아 앞 낱말만 갈린다는 것을 보인다.
                  #B6C0CC 는 프로토타입이 이 자리에만 쓴 값이라 토큰이 없다. */}
              <span className="text-[#B6C0CC]">{slot.rest}</span>
            </span>
          ))}
        </span>
      </h1>

      <p className="mt-5.5 max-w-[296px] text-body-2 leading-[25px] text-text-secondary">
        쏟아지는 공시와 뉴스에서
        <br />내 종목에 필요한 정보만 골라내고,
        <br />
        계좌 전체의 흐름까지 함께 정리합니다.
      </p>

      <div className="mt-10">
        <LoginHeroChart />
        <dl className="mt-4 grid grid-cols-3">
          {STATS.map((stat) => (
            <div
              key={stat.caption}
              className="hero-stat text-center"
              style={{ animationDelay: stat.delay }}
            >
              <dt className="mb-[5px] text-caption text-text-secondary">
                {stat.caption}
              </dt>
              <dd className="text-body-1 leading-[22px] font-bold text-text-primary">
                {stat.value[0]}
                <br />
                {stat.value[1]}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

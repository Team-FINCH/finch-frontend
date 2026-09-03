import { type ComponentProps } from 'react';
import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'kakao';

/**
 * 색·높이·반경은 모두 토큰이다 (styles/index.css).
 * primary 면색은 프로토타입 `.btn` 의 그래파이트다. --color-primary 와
 * --color-text-primary 가 지금 같은 값이지만, 여기서는 "주요 버튼의 면색" 이라는
 * 역할에 맞는 --color-primary 를 쓴다. 액센트가 갈라지면 이 버튼이 따라가야 한다.
 * secondary 는 프로토타입 `.btn2`(흰 면 + --border2 테두리)와 같다.
 */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-surface',
  secondary: 'border border-border-strong bg-surface text-text-primary',
  // 카카오 디자인 가이드가 지정한 색이다. 등락 색과 달리 우리가 정하는 값이 아니다.
  kakao: 'bg-[#FEE500] text-[#191600]',
};

/**
 * 높이 54px 는 design.md §9.3, 최소 터치 영역 44px 와 §15 의 "주요 CTA 52px 이상"을
 * 함께 만족한다. 반경은 --radius-md(14px).
 *
 * 글자는 --text-button(text-button). 프로토타입 `.btn`·`.btn2` 값이고 둘이 같다.
 * 전에 쓰던 text-label(14px)은 주요 CTA 글자를 프로토타입보다 작게 내보냈다.
 *
 * 비활성은 opacity 가 아니라 전용 색을 쓴다. opacity 는 자식 아이콘·스피너까지
 * 함께 흐려져 로딩 표시가 사라진다.
 */
const BASE_CLASS =
  'flex min-h-[54px] w-full items-center justify-center gap-2 rounded-md px-4 text-button ' +
  'transition-colors duration-(--motion-fast) ease-standard ' +
  'disabled:bg-disabled-surface disabled:text-disabled-text disabled:border-transparent';

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant };

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`${BASE_CLASS} ${VARIANT_CLASS[variant]} ${className}`}
    />
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

export function LinkButton({
  variant = 'primary',
  className = '',
  ...props
}: LinkButtonProps) {
  return (
    <Link
      {...props}
      className={`${BASE_CLASS} ${VARIANT_CLASS[variant]} ${className}`}
    />
  );
}

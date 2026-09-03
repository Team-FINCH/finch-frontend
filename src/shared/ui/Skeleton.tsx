type SkeletonProps = {
  className?: string;
};

/**
 * 로딩 자리표시자 (컨벤션 §7).
 * 스피너 대신 실제 레이아웃과 같은 크기를 차지해 레이아웃이 흔들리지 않게 한다.
 * 크기는 쓰는 쪽이 className 으로 정한다.
 *
 * 반경은 --radius-xs(rounded-xs). 프로토타입 `.sk` 값이다.
 * rounded-sm 은 자리표시자에 비해 모서리가 둥글어 카드처럼 보인다.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xs bg-skeleton ${className}`}
      aria-hidden="true"
    />
  );
}

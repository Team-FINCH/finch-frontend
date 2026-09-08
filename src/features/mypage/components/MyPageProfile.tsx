import { useState } from 'react';

import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * 이 컴포넌트는 쿼리를 직접 부르지 않는다. `features/mypage` 가 `features/auth`
 * 를 import 하면 ESLint `import-x/no-restricted-paths`(컨벤션 §2, feature 끼리
 * 서로 import 할 수 없다)에 걸린다. 그래서 `MyPage.tsx`(페이지 계층)가 `useMe()`
 * 를 부르고 이미 풀린 값만 props 로 내려준다.
 */
type MyPageProfileProps = {
  nickname: string | undefined;
  profileImageUrl: string | null | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
};

function AvatarFallback({ nickname }: { nickname: string }) {
  const initial = nickname.trim().charAt(0) || '?';
  return (
    <span
      aria-hidden="true"
      className="flex size-14 flex-none items-center justify-center rounded-full bg-primary text-[20px] font-bold text-surface"
    >
      {initial}
    </span>
  );
}

/**
 * 프로필 (프로토타입 `isMy` 블록 맨 위 — 이니셜/사진 + 닉네임 + "카카오 계정 연결").
 *
 * **`profileImageUrl` 은 `null` 일 수 있다** (`shared/types/auth.ts` — 카카오 프로필
 * 사진은 선택 동의 항목). `null` 이면 프로토타입처럼 닉네임 첫 글자를 원형 배지에
 * 넣는다. URL 이 와도 깨질 수 있어 `onError` 로 같은 대체 배지로 내려앉는다.
 *
 * "카카오 계정 연결" 문구는 프로토타입에 데이터 바인딩 없이 고정 텍스트로 박혀
 * 있다 — 로그인 수단이 카카오 하나뿐이라 항상 참이라서다. 그대로 고정 텍스트로 둔다.
 */
export function MyPageProfile({
  nickname,
  profileImageUrl,
  isPending,
  isError,
  onRetry,
}: MyPageProfileProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (isPending) {
    return (
      <div className="flex items-center gap-3.5 pt-2 pb-5">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
    );
  }

  if (isError || nickname === undefined) {
    return (
      <div className="pt-2 pb-5">
        <p className="text-body-1 font-medium text-text-primary">
          내 정보를 불러오지 못했어요
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-label font-medium text-text-primary underline underline-offset-3"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3.5 pt-2 pb-5">
      {profileImageUrl !== null &&
      profileImageUrl !== undefined &&
      !imageFailed ? (
        <img
          src={profileImageUrl}
          alt=""
          className="size-14 flex-none rounded-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <AvatarFallback nickname={nickname} />
      )}
      <div>
        <p className="text-title-3 text-text-primary">{nickname}</p>
        <p className="mt-0.5 text-caption text-text-muted">카카오 계정 연결</p>
      </div>
    </div>
  );
}

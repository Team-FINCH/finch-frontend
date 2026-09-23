import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * `수익률 기여도란?` — 제목 옆 `?` 가 여는 시트 (FINCH-345).
 *
 * ## 왜 필요했나
 *
 * 화면에 `시장 영향 -0.40%p` 가 서 있을 때 처음 보는 사람이 묻는 것은 둘이다 —
 * **"이게 시장 수익률인가?"** 와 **"`%p` 는 `%` 와 뭐가 다른가?"** 앞엣것은 요인
 * 라벨과 설명 문장이 답하지만, 뒤엣것은 단위 표기라 본문 어디에도 답할 자리가
 * 없었다. 단위를 풀어 쓰면(`퍼센트포인트`) 더 어려워지고, 본문에 각주를 달면
 * 매번 읽는 글이 된다.
 *
 * ## `AnalysisInfoSheet` 와 무엇이 다른가
 *
 * 화면 맨 아래 `분석 기준 및 안내` 와 묻는 것이 다르다.
 *
 * | | 이 시트 | `AnalysisInfoSheet` |
 * | --- | --- | --- |
 * | 질문 | 이 화면이 **무엇인가** | 이 숫자를 **어디서 가져왔나** |
 * | 내용 | 기여도의 뜻 · 단위 · 반올림 | 계산 단서 · 근거 목록 · 면책 |
 * | 범위 | `요인별` 탭 | 수익률 분석 화면 전체 |
 *
 * 그쪽에도 *"세 값을 더하면 기간 수익률과 같아요"* 한 줄이 있다. 지우지 않는다 —
 * `요약`·`종목별` 탭에서 들어온 사람은 이 시트를 볼 수 없다.
 *
 * ## 본문에서 걷어낸 설명이 여기로 온다 (FINCH-345)
 *
 * 요인 셋의 정의를 본문에 한 줄씩 붙였다가 걷었다. **설명이 많아져서 오히려 안
 * 보였다**(사용자 지적) — 세 행이 각자 같은 꼴의 문장을 달고 있으면 목록이
 * 글 덩어리가 되고 막대와 숫자가 그 사이에 묻힌다.
 *
 * 지우지 않고 여기로 옮긴다. **시트는 묻는 사람만 읽고 본문은 모두가 읽는다** —
 * 매번 읽을 글이 아닌 것을 본문에 두지 않는다는 `AnalysisInfoSheet` 의 판단과
 * 같다. 본문에서 방향과 단위는 축 라벨이, 크기는 값이 말한다.
 *
 * ## 예시 숫자를 적지 않는다
 *
 * `-0.40%p 는 …라는 뜻이에요` 처럼 쓰면 읽기는 쉬워지지만 **화면의 실제 값과
 * 다른 숫자가 시트 안에 굳는다.** 기간을 바꾸면 본문은 따라 바뀌고 이 시트만
 * 옛 값을 말한다. 설명은 값 없이 쓴다.
 *
 * ## 반올림을 숨기지 않는다
 *
 * 마지막 줄이 *"끝자리가 1 다를 수 있다"* 고 적는다. 화면이 소수 둘째 자리에서
 * 반올림하므로 `-0.404`·`-0.064` 는 `-0.40`·`-0.06` 으로 보이는데 합은
 * `-0.47%p` 다. 덧셈이 맞아떨어지는 화면을 만들어 놓고 안 맞는 날을 숨기면,
 * 그날 사용자는 화면 전체를 의심한다.
 */
export function AttributionGuideSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 눈에 보이는 원은 20px 인데 `-m-2 p-2` 로 누를 수 있는 넓이를 36px 로
          넓힌다. 제목 옆이라 원 자체를 키우면 제목보다 무거워진다. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="수익률 기여도가 무엇인지 보기"
        className="-m-2 flex flex-none p-2"
      >
        <span
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded-full bg-surface-soft text-[11px] leading-none font-bold text-text-muted"
        >
          ?
        </span>
      </button>

      <BottomSheet open={open} onOpenChange={setOpen} title="수익률 기여도란?">
        <p className="text-body-2 text-pretty break-keep text-text-secondary">
          내 포트폴리오의 최종 수익률을 시장 · 업종 배분 · 종목 선택의 영향으로
          나누어 보여주는 분석이에요. 세 요인을 모두 더하면 최종 수익률이 돼요.
        </p>

        <h3 className="mt-6 text-body-1 font-semibold text-text-primary">
          세 요인이 각각 뭔가요?
        </h3>
        <dl className="mt-3 flex flex-col gap-3">
          <div>
            <dt className="text-body-2 font-semibold text-text-primary">
              시장 영향
            </dt>
            <dd className="mt-0.5 text-body-2 text-pretty break-keep text-text-secondary">
              전체 시장이 움직여서 내 수익률이 밀리거나 당겨진 만큼이에요.
            </dd>
          </div>
          <div>
            <dt className="text-body-2 font-semibold text-text-primary">
              업종 배분
            </dt>
            <dd className="mt-0.5 text-body-2 text-pretty break-keep text-text-secondary">
              어떤 업종을 얼마나 담았는지로 생긴 만큼이에요.
            </dd>
          </div>
          <div>
            <dt className="text-body-2 font-semibold text-text-primary">
              종목 선택
            </dt>
            <dd className="mt-0.5 text-body-2 text-pretty break-keep text-text-secondary">
              업종 안에서 어떤 종목을 골랐는지로 생긴 만큼이에요.
            </dd>
          </div>
        </dl>

        <h3 className="mt-6 text-body-1 font-semibold text-text-primary">
          %와 %p가 어떻게 다른가요?
        </h3>
        <dl className="mt-3 flex flex-col gap-3">
          <div className="flex gap-3">
            <dt className="w-8 flex-none text-body-2 font-bold text-text-primary">
              %
            </dt>
            <dd className="min-w-0 flex-1 text-body-2 text-pretty break-keep text-text-secondary">
              실제 수익률이에요. 내 계좌가 그 기간에 얼마나 움직였는지를 말해요.
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-8 flex-none text-body-2 font-bold text-text-primary">
              %p
            </dt>
            <dd className="min-w-0 flex-1 text-body-2 text-pretty break-keep text-text-secondary">
              각 요인이 그 수익률을 얼마나 더하거나 뺐는지예요. 요인 하나만 따로
              떼어 보는 수익률이 아니에요.
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-caption text-pretty break-keep text-text-muted">
          각 값은 소수점 아래 둘째 자리에서 반올림해 보여드려요. 화면에 보이는
          숫자를 그대로 더하면 끝자리가 1 다를 수 있어요.
        </p>
      </BottomSheet>
    </>
  );
}

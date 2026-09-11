import { useState, type FormEvent } from 'react';

const MESSAGE_MAX_LENGTH = 2000;

/**
 * 입력창. `message` 검증(공백만 금지, 2,000자 초과 금지)은 `AiChatRequestSchema`
 * 와 같은 기준이다 — 화면에서 먼저 걸러 왕복 하나를 아낀다.
 *
 * 프로토타입 실측 — 입력 높이 48px · 캡슐(radius 999) · 1px `--border2` ·
 * 좌우 18px · 16px 글자 · placeholder `무엇이든 물어보세요`, 전송은 48px 원형에
 * 19px `↑` 다. 전에는 44px 사각 입력에 `궁금한 것을 물어보세요` · `전송` 글자
 * 버튼이었다 (FINCH-245).
 *
 * **`input` 이 아니라 `textarea` 인 것은 우리 쪽 추가분이다.** 프로토타입은 한 줄
 * `input` 이고, 여러 줄 질문을 입력하는 동안 내용이 보이는 편이 낫다고 판단해
 * 남겨 뒀다. `rows={1}` 이라 기본 높이는 프로토타입과 같은 한 줄이다.
 *
 * `↑` 를 `aria-hidden` 으로 덮고 버튼 이름을 `aria-label` 로 준다 — 글리프를
 * 그대로 읽히면 스크린 리더가 화살표 문자를 읽는다.
 */
export function ChatComposer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed === '' || disabled) {
      return;
    }
    onSend(trimmed);
    setText('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
      <textarea
        value={text}
        onChange={(event) =>
          setText(event.target.value.slice(0, MESSAGE_MAX_LENGTH))
        }
        placeholder="무엇이든 물어보세요"
        rows={1}
        className="min-h-12 flex-1 resize-none rounded-full border border-border-strong bg-surface px-4.5 py-3 text-body-1 text-text-primary outline-none focus:border-text-primary"
      />
      <button
        type="submit"
        aria-label="전송"
        disabled={disabled || text.trim() === ''}
        className="flex size-12 flex-none items-center justify-center rounded-full bg-primary text-[19px] leading-none text-surface transition-transform duration-(--motion-fast) ease-standard active:scale-[0.98] disabled:bg-disabled-surface disabled:text-disabled-text"
      >
        <span aria-hidden="true">↑</span>
      </button>
    </form>
  );
}

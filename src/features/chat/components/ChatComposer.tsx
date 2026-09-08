import { useState, type FormEvent } from 'react';

const MESSAGE_MAX_LENGTH = 2000;

/**
 * 입력창. `message` 검증(공백만 금지, 2,000자 초과 금지)은 `AiChatRequestSchema`
 * 와 같은 기준이다 — 화면에서 먼저 걸러 왕복 하나를 아낀다.
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
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <textarea
        value={text}
        onChange={(event) =>
          setText(event.target.value.slice(0, MESSAGE_MAX_LENGTH))
        }
        placeholder="궁금한 것을 물어보세요"
        rows={1}
        className="min-h-11 flex-1 resize-none rounded-sm border border-border-strong bg-surface px-4 py-2.5 text-body-2 text-text-primary outline-none focus:border-text-primary"
      />
      <button
        type="submit"
        disabled={disabled || text.trim() === ''}
        className="flex h-11 min-w-16 items-center justify-center rounded-sm bg-primary px-4 text-label text-surface disabled:bg-disabled-surface disabled:text-disabled-text"
      >
        전송
      </button>
    </form>
  );
}

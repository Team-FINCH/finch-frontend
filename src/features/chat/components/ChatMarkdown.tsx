import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * AI 답변 본문의 Markdown 렌더러 (GitLab #85).
 *
 * **원시 HTML 을 허용하지 않는다.** `react-markdown` 은 기본적으로 HTML 노드를
 * 문자 그대로만 다루고 실행하지 않는다 — `rehype-raw` 를 얹지 않는 한 그대로다
 * (`5a1b453` 커밋 메시지). 그래서 별도 sanitize 없이도 XSS 요구를 만족한다.
 *
 * 지원 범위는 이슈의 최소 범위(제목·굵게·목록·문단·인라인 코드·링크)를 그대로
 * 두되, `remark-gfm` 이 여는 표·취소선·자동 링크도 기본 마크다운 태그로 함께
 * 그려진다 — 별도로 막을 이유가 없다.
 *
 * 커스텀 렌더러는 스타일이 아니라 안전·레이아웃 때문에 있는 세 가지뿐이다.
 * - `a`: 외부 링크는 새 탭 + `rel="noopener noreferrer"` (이슈 요구). 상대
 *   경로(AI 가 그런 링크를 주는 일은 없지만)까지 새 탭으로 열지 않게 절대
 *   URL 만 "외부"로 본다
 * - `code`/`pre`: 모바일 폭에서 긴 토큰이 말풍선을 밀어내지 않게 `break-all`·
 *   `overflow-x-auto` 를 준다
 * - `ul`/`ol`/`li`: Tailwind preflight 가 지운 목록 기본 스타일(글머리표·들여쓰기)을
 *   되살린다
 *
 * 링크 색은 `AiCitationList` 가 검정 면(`--color-ai-surface`)에서 쓰는 것과
 * 맞춘다(`ChatBubble` 의 `[&_a]:text-ai-text-primary`) — 같은 면 위에서 본문
 * 링크와 근거 링크의 색이 다르면 근거만 다른 종류로 읽힌다.
 */
const components: Components = {
  h1: ({ children }) => <h1 className="text-body-1 font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="text-body-1 font-bold">{children}</h2>,
  h3: ({ children }) => <h3 className="text-body-2 font-bold">{children}</h3>,
  h4: ({ children }) => <h4 className="text-body-2 font-bold">{children}</h4>,
  h5: ({ children }) => <h5 className="text-body-2 font-bold">{children}</h5>,
  h6: ({ children }) => <h6 className="text-body-2 font-bold">{children}</h6>,
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="break-words">{children}</li>,
  code: ({ children, className }) => (
    <code
      className={`rounded-xs bg-ai-text-primary/10 px-1 py-0.5 text-caption break-all ${className ?? ''}`}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-xs bg-ai-text-primary/10 p-2 text-caption">
      {children}
    </pre>
  ),
  a: ({ href, children }) => {
    const external = href !== undefined && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="font-medium break-all underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
};

type ChatMarkdownProps = {
  text: string;
};

/**
 * 문단 사이 간격은 태그별로 나눠 주지 않고 `space-y-3` 하나로 통일한다 —
 * `react-markdown` 이 최상위 블록(제목·목록·문단 …)을 형제로 그려서, 부모에
 * `space-y-*` 를 주면 태그 종류와 무관하게 `> * + *` 로 걸린다.
 */
export function ChatMarkdown({ text }: ChatMarkdownProps) {
  return (
    <div className="space-y-3 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

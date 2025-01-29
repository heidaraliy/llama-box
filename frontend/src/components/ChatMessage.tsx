import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import { Prism, SyntaxHighlighterProps } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// really, *really* bad hack to get the syntax highlighter to work...
const SyntaxHighlighter = Prism as unknown as React.FC<SyntaxHighlighterProps>;

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  thinking,
}) => {
  const components: Components = {
    p: ({ children }) => <p className="mb-4 whitespace-pre-line">{children}</p>,
    hr: () => <hr className="my-4 border-t border-gray-300" />,

    /*
     * related to the syntax highlighter issue above. dumb hack, but whatever --
     * i don't think it's that bad, just a little ugly.
     **/

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code: ({ className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      const content = String(children).replace(/\n$/, "");

      // handle inline code (single backtick) so that it doesn't
      // take up the entire width of the chat message.
      if (props.inline) {
        return (
          <code className="px-1 py-0.5 bg-gray-100 rounded text-sm font-mono">
            {content}
          </code>
        );
      }

      // handle code blocks (triple backticks) so that we only render as a
      // syntax highlighted block if we have multiple lines or a language specified!
      const shouldHighlight = language || content.includes("\n");
      if (!shouldHighlight) {
        return (
          <code className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm font-mono">
            {content}
          </code>
        );
      }

      return (
        <div className="my-4">
          {language && (
            <div className="bg-gray-800 text-gray-200 text-[12px] px-3 py-1 rounded-t">
              {language}
            </div>
          )}
          <SyntaxHighlighter
            language={language || "text"}
            style={oneDark}
            customStyle={{
              margin: 0,
              borderTopLeftRadius: language ? 0 : "0.375rem",
              borderTopRightRadius: language ? 0 : "0.375rem",
              borderBottomLeftRadius: "0.375rem",
              borderBottomRightRadius: "0.375rem",
              fontSize: "12px",
            }}
            PreTag="div"
            {...props}
          >
            {content}
          </SyntaxHighlighter>
        </div>
      );
    },
  };

  return (
    <div className="mb-4">
      <span
        className={`font-bold ${
          role === "user" ? "text-blue-600" : "text-green-600"
        }`}
      >
        {role === "user" ? "User" : "Assistant"}:
      </span>

      {thinking && (
        <div className="ml-4 mt-1 p-2 bg-gray-100 rounded-md italic text-gray-600">
          <p className="text-sm mb-1 font-semibold">Thinking:</p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {thinking}
          </div>
        </div>
      )}

      <div className="ml-4 mt-2">
        <ReactMarkdown
          className="prose prose-sm max-w-none"
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

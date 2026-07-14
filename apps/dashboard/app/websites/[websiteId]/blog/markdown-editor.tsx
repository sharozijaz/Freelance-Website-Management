"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";
import { Button } from "@agency/ui";

interface MarkdownEditorProps {
  help?: string;
  label: string;
  name: string;
  value?: string | undefined;
}

type FormatAction =
  | { kind: "block"; prefix: string }
  | { kind: "inline"; placeholder: string; suffix: string; wrapper: string }
  | { kind: "insert"; value: string };

const tools: {
  action: FormatAction;
  icon: typeof Bold;
  label: string;
}[] = [
  { action: { kind: "block", prefix: "# " }, icon: Heading1, label: "Heading 1" },
  { action: { kind: "block", prefix: "## " }, icon: Heading2, label: "Heading 2" },
  { action: { kind: "block", prefix: "### " }, icon: Heading3, label: "Heading 3" },
  { action: { kind: "block", prefix: "#### " }, icon: Heading4, label: "Heading 4" },
  { action: { kind: "block", prefix: "##### " }, icon: Heading5, label: "Heading 5" },
  { action: { kind: "block", prefix: "###### " }, icon: Heading6, label: "Heading 6" },
  {
    action: { kind: "inline", placeholder: "bold text", suffix: "**", wrapper: "**" },
    icon: Bold,
    label: "Bold",
  },
  {
    action: { kind: "inline", placeholder: "italic text", suffix: "*", wrapper: "*" },
    icon: Italic,
    label: "Italic",
  },
  {
    action: { kind: "inline", placeholder: "struck text", suffix: "~~", wrapper: "~~" },
    icon: Strikethrough,
    label: "Strikethrough",
  },
  {
    action: { kind: "inline", placeholder: "code", suffix: "`", wrapper: "`" },
    icon: Code,
    label: "Inline code",
  },
  { action: { kind: "block", prefix: "> " }, icon: Quote, label: "Quote" },
  { action: { kind: "block", prefix: "- " }, icon: List, label: "Bullet list" },
  { action: { kind: "block", prefix: "1. " }, icon: ListOrdered, label: "Numbered list" },
  {
    action: { kind: "insert", value: "[link text](https://example.com)" },
    icon: Link,
    label: "Link",
  },
  {
    action: { kind: "insert", value: "![image alt](https://example.com/image.jpg)" },
    icon: Image,
    label: "Image",
  },
  { action: { kind: "insert", value: "\n---\n" }, icon: Minus, label: "Divider" },
];

export function MarkdownEditor({ help, label, name, value = "" }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [content, setContent] = useState(value);

  function updateSelection(next: string, selectionStart: number, selectionEnd: number) {
    setContent(next);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function applyInline(action: Extract<FormatAction, { kind: "inline" }>) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || action.placeholder;
    const formatted = `${action.wrapper}${selected}${action.suffix}`;
    const next = `${content.slice(0, start)}${formatted}${content.slice(end)}`;
    const cursorStart = start + action.wrapper.length;
    const cursorEnd = cursorStart + selected.length;

    updateSelection(next, cursorStart, cursorEnd);
  }

  function applyBlock(action: Extract<FormatAction, { kind: "block" }>) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = content.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const selected = content.slice(lineStart, end);
    const formatted = selected
      .split("\n")
      .map((line) => (line.trim() ? `${action.prefix}${line}` : line))
      .join("\n");
    const next = `${content.slice(0, lineStart)}${formatted}${content.slice(end)}`;

    updateSelection(next, lineStart, lineStart + formatted.length);
  }

  function insertValue(action: Extract<FormatAction, { kind: "insert" }>) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}${action.value}${content.slice(end)}`;
    const cursor = start + action.value.length;

    updateSelection(next, cursor, cursor);
  }

  function applyFormat(action: FormatAction) {
    if (action.kind === "inline") applyInline(action);
    if (action.kind === "block") applyBlock(action);
    if (action.kind === "insert") insertValue(action);
  }

  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1 overflow-hidden rounded-md border border-input bg-background">
        <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-2">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <Button
                aria-label={tool.label}
                key={tool.label}
                onClick={() => {
                  applyFormat(tool.action);
                }}
                size="icon"
                title={tool.label}
                type="button"
                variant="ghost"
              >
                <Icon className="size-4" />
              </Button>
            );
          })}
        </div>
        <textarea
          className="min-h-[30rem] w-full resize-y bg-background px-3 py-2 font-mono text-sm leading-6 outline-none"
          name={name}
          onChange={(event) => {
            setContent(event.target.value);
          }}
          ref={textareaRef}
          value={content}
        />
      </div>
      {help ? <span className="mt-1 block text-xs text-muted-foreground">{help}</span> : null}
    </label>
  );
}

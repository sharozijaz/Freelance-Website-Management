"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Code,
  Eye,
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
  Pencil,
  Quote,
  RotateCcw,
  Save,
  Strikethrough,
} from "lucide-react";
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@agency/ui";

interface MediaOption {
  altText: string | null;
  filename: string;
  id: string;
  publicUrl: string | null;
}

interface MarkdownEditorProps {
  help?: string;
  label: string;
  media?: MediaOption[];
  name: string;
  storageKey?: string;
  value?: string | undefined;
}

type FormatAction =
  | { kind: "block"; prefix: string }
  | { kind: "inline"; placeholder: string; suffix: string; wrapper: string }
  | { kind: "insert"; value: string };

const tools: {
  action: FormatAction;
  group: "block" | "inline" | "insert";
  icon: typeof Bold;
  label: string;
}[] = [
  { action: { kind: "block", prefix: "# " }, group: "block", icon: Heading1, label: "Heading 1" },
  {
    action: { kind: "block", prefix: "## " },
    group: "block",
    icon: Heading2,
    label: "Heading 2",
  },
  {
    action: { kind: "block", prefix: "### " },
    group: "block",
    icon: Heading3,
    label: "Heading 3",
  },
  {
    action: { kind: "block", prefix: "#### " },
    group: "block",
    icon: Heading4,
    label: "Heading 4",
  },
  {
    action: { kind: "block", prefix: "##### " },
    group: "block",
    icon: Heading5,
    label: "Heading 5",
  },
  {
    action: { kind: "block", prefix: "###### " },
    group: "block",
    icon: Heading6,
    label: "Heading 6",
  },
  {
    action: { kind: "inline", placeholder: "bold text", suffix: "**", wrapper: "**" },
    group: "inline",
    icon: Bold,
    label: "Bold",
  },
  {
    action: { kind: "inline", placeholder: "italic text", suffix: "*", wrapper: "*" },
    group: "inline",
    icon: Italic,
    label: "Italic",
  },
  {
    action: { kind: "inline", placeholder: "struck text", suffix: "~~", wrapper: "~~" },
    group: "inline",
    icon: Strikethrough,
    label: "Strikethrough",
  },
  {
    action: { kind: "inline", placeholder: "code", suffix: "`", wrapper: "`" },
    group: "inline",
    icon: Code,
    label: "Inline code",
  },
  { action: { kind: "block", prefix: "> " }, group: "block", icon: Quote, label: "Quote" },
  { action: { kind: "block", prefix: "- " }, group: "block", icon: List, label: "Bullet list" },
  {
    action: { kind: "block", prefix: "1. " },
    group: "block",
    icon: ListOrdered,
    label: "Numbered list",
  },
  {
    action: { kind: "insert", value: "[link text](https://example.com)" },
    group: "insert",
    icon: Link,
    label: "Link",
  },
  {
    action: { kind: "insert", value: "![image alt](https://example.com/image.jpg)" },
    group: "insert",
    icon: Image,
    label: "Image URL",
  },
  { action: { kind: "insert", value: "\n---\n" }, group: "insert", icon: Minus, label: "Divider" },
];

export function MarkdownEditor({
  help,
  label,
  media = [],
  name,
  storageKey,
  value = "",
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [content, setContent] = useState(value);
  const [draftStatus, setDraftStatus] = useState<"restored" | "saved" | "idle">("idle");
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const stats = useMemo(() => contentStats(content), [content]);

  useEffect(() => {
    if (!storageKey) return;

    const draft = window.localStorage.getItem(storageKey);
    if (draft && draft !== value) {
      setContent(draft);
      setDraftStatus("restored");
    }
  }, [storageKey, value]);

  useEffect(() => {
    if (!storageKey) return;

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, content);
      setDraftStatus("saved");
    }, 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [content, storageKey]);

  function updateSelection(next: string, selectionStart: number, selectionEnd: number) {
    setContent(next);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function replaceSelection(
    valueToInsert: string,
    selectionOffsetStart = 0,
    selectionOffsetEnd = 0,
  ) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}${valueToInsert}${content.slice(end)}`;
    const cursorStart = start + selectionOffsetStart;
    const cursorEnd = start + valueToInsert.length - selectionOffsetEnd;

    updateSelection(next, cursorStart, cursorEnd);
  }

  function applyInline(action: Extract<FormatAction, { kind: "inline" }>) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || action.placeholder;
    const formatted = `${action.wrapper}${selected}${action.suffix}`;

    replaceSelection(formatted, action.wrapper.length, action.suffix.length);
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
      .map((line) => formatBlockLine(line, action.prefix))
      .join("\n");
    const next = `${content.slice(0, lineStart)}${formatted}${content.slice(end)}`;

    updateSelection(next, lineStart, lineStart + formatted.length);
  }

  function insertValue(action: Extract<FormatAction, { kind: "insert" }>) {
    replaceSelection(action.value);
  }

  function applyFormat(action: FormatAction) {
    if (action.kind === "inline") applyInline(action);
    if (action.kind === "block") applyBlock(action);
    if (action.kind === "insert") insertValue(action);
  }

  function insertSelectedMedia() {
    const asset = media.find((item) => item.id === selectedMediaId);
    if (!asset?.publicUrl) return;

    const alt = asset.altText?.trim() ?? asset.filename.replace(/\.[^.]+$/, "");
    replaceSelection(`![${alt}](${asset.publicUrl})`);
  }

  function clearRecoveredDraft() {
    if (storageKey) window.localStorage.removeItem(storageKey);
    setContent(value);
    setDraftStatus("idle");
  }

  return (
    <div className="block text-sm font-medium">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-xs font-normal text-muted-foreground">
          {stats.words} words · {stats.minutes} min read
          {draftStatus === "saved" ? " · draft saved locally" : ""}
        </span>
      </div>

      <Tabs className="mt-1" defaultValue="write">
        <div className="overflow-hidden rounded-md border border-input bg-background">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 p-2">
            <TabsList className="h-9">
              <TabsTrigger className="gap-2" value="write">
                <Pencil className="size-4" />
                Write
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="preview">
                <Eye className="size-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TooltipProvider delayDuration={150}>
              <div className="flex flex-wrap gap-1">
                {tools.map((tool, index) => {
                  const Icon = tool.icon;

                  return (
                    <span
                      className={
                        index > 0 && tools[index - 1]?.group !== tool.group
                          ? "ml-2 border-l border-border pl-2"
                          : undefined
                      }
                      key={tool.label}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            aria-label={tool.label}
                            onClick={() => {
                              applyFormat(tool.action);
                            }}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Icon className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{tool.label}</TooltipContent>
                      </Tooltip>
                    </span>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>

          {media.length > 0 ? (
            <div className="flex flex-wrap items-end gap-2 border-b border-border p-2">
              <label className="grid min-w-72 flex-1 gap-1 text-xs font-medium text-muted-foreground">
                Insert website media
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  onChange={(event) => {
                    setSelectedMediaId(event.target.value);
                  }}
                  value={selectedMediaId}
                >
                  <option value="">Choose media asset</option>
                  {media
                    .filter((asset) => asset.publicUrl)
                    .map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.filename}
                        {asset.altText ? ` - ${asset.altText}` : ""}
                      </option>
                    ))}
                </select>
              </label>
              <Button
                disabled={!selectedMediaId}
                onClick={insertSelectedMedia}
                size="sm"
                type="button"
                variant="outline"
              >
                <Image className="mr-2 size-4" />
                Insert Media
              </Button>
            </div>
          ) : null}

          {draftStatus === "restored" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-3 py-2 text-xs font-normal text-warning">
              Unsaved local draft restored from this browser.
              <Button onClick={clearRecoveredDraft} size="sm" type="button" variant="outline">
                <RotateCcw className="mr-2 size-4" />
                Revert to saved
              </Button>
            </div>
          ) : null}

          <TabsContent className="m-0" value="write">
            <textarea
              className="min-h-[34rem] w-full resize-y bg-background px-3 py-2 font-mono text-sm leading-6 outline-none"
              name={name}
              onChange={(event) => {
                setContent(event.target.value);
                setDraftStatus("idle");
              }}
              ref={textareaRef}
              value={content}
            />
          </TabsContent>

          <TabsContent className="m-0" value="preview">
            <div className="min-h-[34rem] bg-background p-6">
              {content.trim() ? (
                <MarkdownPreview markdown={content} />
              ) : (
                <div className="flex min-h-80 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                  Write article content to preview it here.
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {help ? (
        <span className="mt-1 flex items-center gap-2 text-xs font-normal text-muted-foreground">
          <Save className="size-3" />
          {help}
        </span>
      ) : null}
    </div>
  );
}

function formatBlockLine(line: string, prefix: string) {
  if (!line.trim()) return line;

  const withoutHeading = line.replace(/^#{1,6}\s+/, "");
  const withoutList = withoutHeading.replace(/^([-*]|\d+\.)\s+/, "");
  const withoutQuote = withoutList.replace(/^>\s+/, "");

  return `${prefix}${withoutQuote}`;
}

function contentStats(markdown: string) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_~`-]/g, " ")
    .trim();
  const words = plain ? plain.split(/\s+/).length : 0;

  return {
    minutes: Math.max(1, Math.ceil(words / 225)),
    words,
  };
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);

  return (
    <article className="space-y-4 text-sm leading-7 text-foreground">
      {blocks.map((block, index) => {
        if (block.type === "hr") return <hr className="border-border" key={index} />;
        if (block.type === "quote") {
          return (
            <blockquote
              className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground"
              key={index}
            >
              {inlineMarkdown(block.text)}
            </blockquote>
          );
        }
        if (block.type === "image") {
          return (
            <figure className="space-y-2" key={index}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={block.alt}
                className="max-h-96 rounded-md border border-border object-contain"
                src={block.src}
              />
              {block.alt ? (
                <figcaption className="text-xs text-muted-foreground">{block.alt}</figcaption>
              ) : null}
            </figure>
          );
        }
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}
              key={index}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${String(itemIndex)}`}>{inlineMarkdown(item)}</li>
              ))}
            </ListTag>
          );
        }
        if (block.type === "heading") return renderHeading(block, index);

        return <p key={index}>{inlineMarkdown(block.text)}</p>;
      })}
    </article>
  );
}

const headingClasses: Record<number, string> = {
  1: "font-display text-3xl font-semibold leading-tight",
  2: "font-display text-2xl font-semibold leading-tight",
  3: "font-display text-xl font-semibold leading-snug",
  4: "text-lg font-semibold",
  5: "text-base font-semibold",
  6: "text-sm font-semibold uppercase tracking-wide text-muted-foreground",
};

type MarkdownBlock =
  | { alt: string; src: string; type: "image" }
  | { items: string[]; ordered: boolean; type: "list" }
  | { level: number; text: string; type: "heading" }
  | { text: string; type: "paragraph" | "quote" }
  | { type: "hr" };

function parseBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split("\n");
  let paragraph: string[] = [];
  let list: { items: string[]; ordered: boolean } | null = null;

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push({ text: paragraph.join(" "), type: "paragraph" });
      paragraph = [];
    }
  }

  function flushList() {
    if (list) {
      blocks.push({ items: list.items, ordered: list.ordered, type: "list" });
      list = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const image = /^!\[([^\]]*)]\(([^)]+)\)$/.exec(line);
    const orderedList = /^\d+\.\s+(.+)$/.exec(line);
    const unorderedList = /^[-*]\s+(.+)$/.exec(line);

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        level: Math.min(6, heading[1]?.length ?? 1),
        text: heading[2] ?? "",
        type: "heading",
      });
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      blocks.push({ text: line.slice(2), type: "quote" });
      continue;
    }

    if (image) {
      flushParagraph();
      flushList();
      blocks.push({ alt: image[1] ?? "", src: image[2] ?? "", type: "image" });
      continue;
    }

    if (orderedList || unorderedList) {
      flushParagraph();
      const ordered = Boolean(orderedList);
      const text = orderedList?.[1] ?? unorderedList?.[1] ?? "";
      // TypeScript narrows this accumulator correctly with an explicit null check.
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (list === null || list.ordered !== ordered) {
        flushList();
        list = { items: [text], ordered };
      } else {
        list.items.push(text);
      }
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderHeading(block: Extract<MarkdownBlock, { type: "heading" }>, key: number) {
  const children = inlineMarkdown(block.text);
  const className = headingClasses[block.level];

  if (block.level === 1) {
    return (
      <h1 className={className} key={key}>
        {children}
      </h1>
    );
  }
  if (block.level === 2) {
    return (
      <h2 className={className} key={key}>
        {children}
      </h2>
    );
  }
  if (block.level === 3) {
    return (
      <h3 className={className} key={key}>
        {children}
      </h3>
    );
  }
  if (block.level === 4) {
    return (
      <h4 className={className} key={key}>
        {children}
      </h4>
    );
  }
  if (block.level === 5) {
    return (
      <h5 className={className} key={key}>
        {children}
      </h5>
    );
  }

  return (
    <h6 className={className} key={key}>
      {children}
    </h6>
  );
}

function inlineMarkdown(text: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*|\[[^\]]+]\([^)]+\))/g;
  const parts = text.split(pattern).filter(Boolean);

  parts.forEach((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={index}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("*") && part.endsWith("*")) {
      nodes.push(<em key={index}>{part.slice(1, -1)}</em>);
    } else if (part.startsWith("~~") && part.endsWith("~~")) {
      nodes.push(<s key={index}>{part.slice(2, -2)}</s>);
    } else if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" key={index}>
          {part.slice(1, -1)}
        </code>,
      );
    } else {
      const link = /^\[([^\]]+)]\(([^)]+)\)$/.exec(part);
      if (link) {
        nodes.push(
          <a
            className="font-medium text-primary underline underline-offset-4"
            href={link[2]}
            key={index}
            rel="noreferrer"
            target="_blank"
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(part);
      }
    }
  });

  return nodes;
}

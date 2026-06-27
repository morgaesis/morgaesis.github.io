import { readFile } from "node:fs/promises";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = (await getCollection("blog")).filter((post) => !post.data.draft);
  return posts.map((post) => ({
    params: { id: post.id },
    props: { post },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const post = props.post;
  const markdownPath = path.join(process.cwd(), "blog", `${post.id}.md`);
  const source = await readFile(markdownPath, "utf8");
  const markdown = renderPublicMarkdown(source, post.data.title, post.data.date);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};

function renderPublicMarkdown(source: string, title: string, date: Date): string {
  const body = sanitizeMarkdown(stripFrontmatter(source));
  const formattedDate = date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return [`# ${title}`, "", formattedDate, "", body].join("\n").trimEnd() + "\n";
}

function stripFrontmatter(source: string): string {
  return source.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function sanitizeMarkdown(markdown: string): string {
  return mapOutsideCodeFences(markdown, sanitizeMarkdownSegment)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapOutsideCodeFences(
  markdown: string,
  mapSegment: (segment: string) => string,
): string {
  const fencePattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(markdown)) !== null) {
    result += mapSegment(markdown.slice(lastIndex, match.index));
    result += match[0];
    lastIndex = match.index + match[0].length;
  }

  result += mapSegment(markdown.slice(lastIndex));
  return result;
}

function sanitizeMarkdownSegment(segment: string): string {
  return segment
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, renderFigureCaption)
    .replace(/<time\b[^>]*>([\s\S]*?)<\/time>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]{2,}/g, " ");
}

function renderFigureCaption(figureHtml: string): string {
  const caption = figureHtml.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
  if (!caption) return "\n\n";

  const text = htmlToText(caption[1]);
  return text ? `\n\n> Figure: ${text}\n\n` : "\n\n";
}

function htmlToText(html: string): string {
  return decodeHtml(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function decodeHtml(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

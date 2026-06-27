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
  const markdown = await readFile(markdownPath, "utf8");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};

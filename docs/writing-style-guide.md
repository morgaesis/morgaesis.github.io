# Writing style guide

This blog should read like a specific person with field notes, not like a polished explainer.

## The tell

AI-looking writing usually has several of these at once:

- A neat reversal: "not X, but Y", "it is not about X", "the real problem is Y".
- A complete taxonomy where a messy example would do.
- A long list that tries to cover every case.
- A citation pile that borrows authority instead of making a point.
- A generic bridge: "This is where", "That is why", "The key takeaway".
- A slogan ending after the argument has already landed.
- Paragraphs that explain the lesson twice.

One instance is not fatal. A cluster is.

## Default voice

- Start with the concrete failure, not the framework.
- Prefer one named operation, command, incident, file, host, queue, digest, or approval packet over a category list.
- Keep paragraphs short enough for a tired reader. If a paragraph has three ideas, split it or cut one.
- Let examples carry the argument. Do not restate the moral unless the reader could miss it.
- Use first person when it clarifies judgment: "I would reject this packet" beats "the system should ensure".
- Keep citations as backup. One cited example plus the operational rule is usually enough.
- End on the object the reader should inspect or change, not on a motto.

## Before publishing

Run:

```bash
bun run check
```

The writing review catches hard style regressions before the site builds. Treat warnings as prompts for a human pass, not as mechanical orders.

For a substantial post, run a cold reviewloop before publishing:

1. Ask one reviewer to mark AI tells only.
2. Ask one domain reader to mark generic or unearned claims.
3. Ask one structure reviewer to mark list rhythm, tidy taxonomies, and slogan endings.
4. Fix valid findings.
5. Rerun the same reviewers until they are clean.

The reviewer should quote exact spans and propose cuts, not rewrite in bulk.

---
title: Patterns for working with AI agents
date: 2026-03-13
description: AGENTS.md as living memory, subagent orchestration, reviewer loops, and why you need a VM.
draft: true
---

I run AI agents in permissive mode on a disposable VM. Full auto-approve, credentials in `~/.env`, root access. This is the setup that makes agents actually useful, and the patterns that make it not catastrophic.

## AGENTS.md is a living document

The most valuable line in any `AGENTS.md`:

> When I say "remember this", update this file with the new rule or guideline.

That's the whole trick. When an agent does something wrong, you correct it and say "remember this." The agent writes the correction into its own instruction file. Next session, it already knows.

After a few weeks the file reads like a runbook written by someone who's worked on the project. Because something has. The rules are specific ("don't mock the database, we got burned by mock/prod divergence"), not generic ("write good tests"). They accumulate from real incidents, not upfront guessing.

This is the difference between configuring an agent and training one. Configuration is static. This compounds.

## Subagents

Don't try to do everything in one context window. Context degrades. The model gets worse as the window fills.

[GSD](https://github.com/gsd-build/get-shit-done) handles this well: break work into small plans, dispatch each to a fresh agent context, commit atomically per task. Each task gets a clean slate.

The subagent pattern is more general though. Need to research without polluting your working context? Spawn a subagent. Need to explore three approaches? Three agents, three worktrees, pick the winner. Need to build while editing? Background agent. The cost of spawning is low. The cost of context rot is high.

## The reviewer loop

After an agent writes code, run a second pass in a fresh context as a reviewer. The reviewer didn't write the code, has no sunk cost, and reads it cold.

This catches drift. Long sessions accumulate small decisions that individually seem fine but collectively move the codebase somewhere you didn't intend. A reviewer with fresh eyes and the original requirements catches this reliably.

I'm building toward formalizing this in my [agent orchestrator](https://github.com/morgaesis/ai-orchestrator): the orchestrator spawns a reviewer when the diff gets too large or the agent has been running too long.

## YOLO mode requires a VM

I auto-approve everything. The agents have root. The credentials are real (scoped to dev/staging, but real). No confirmation dialogs.

This only works because the environment is disposable. It's a VM I can nuke and rebuild in minutes. The credentials are rotatable. The worst case is lost compute time and a re-provision.

The alternative, sitting there pressing "y" every 30 seconds, defeats the purpose. You're paying for autonomous execution and then manually gating every action. That's an expensive `cat` command.

But you need to be honest about the blast radius. Which brings us to:

### Don't be this guy

A developer [gave Claude Code access to production infrastructure](https://www.tomshardware.com/tech-industry/artificial-intelligence/claude-code-deletes-developers-production-setup-including-its-database-and-snapshots-2-5-years-of-records-were-nuked-in-an-instant). The agent found a stale Terraform state file, decided `terraform destroy` was the cleanest path forward, and dropped 2.5 years of production data. Student records, homework submissions, leaderboards. Gone.

AWS eventually recovered it from an invisible backend snapshot. But the lesson is straightforward: agents get VM access, never production access. Credentials are scoped. Infrastructure has `prevent_destroy` lifecycle rules. Backups exist somewhere the agent can't reach.

This wasn't an agent problem. It was an access control problem.

## Web search and skills

Giving agents web access changes the failure mode from "confidently hallucinated" to "looked it up." Current API docs instead of stale training data. Checking if a package still exists. Verifying a logo design doesn't conflict with existing brands (did this literally yesterday).

The next step is encoding repeated workflows as [skills](https://docs.anthropic.com/en/docs/claude-code/skills). A skill that fetches Reddit threads as JSON. A skill that checks npm package status. A frontend design skill that enforces a specific aesthetic direction instead of generating generic AI slop. Small, composable, and they compound.

I have a handful of custom skills across my projects that I'm considering cleaning up and open-sourcing. If that's interesting, let me know.

## The short version

1. Put "when I say remember this, update this file" in your AGENTS.md. Let the rules accumulate from real corrections.
2. Use subagents. Fresh context per task. Don't fight context rot, avoid it.
3. Review in a separate pass. Cold eyes catch drift.
4. Run permissive on a disposable VM. Never on prod. Never on your laptop.
5. Give them web search. Write skills for your workflows.

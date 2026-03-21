---
title: An African savanna, built by cron job
date: 2026-03-21
description: What happens when you give Claude Code a creative prompt and let it iterate autonomously on a 10-minute loop.
---

I gave [Claude Code](https://docs.anthropic.com/en/docs/claude-code) this prompt:

> I want a 'screensaver' in a browser, that shows a pixelart view of an African plain, with a few trees, shrub, some animals, some prey/predator play, some semi-realistic lighting, sun is almost setting. Make the animals interact, graze, drink, predators chase, some birds, each animal with coherent 'memory'. Make the view only a part of the entire sandbox, as if looking out of a window of a house. Write in bun/TS, run on port 4680; my browser will be waiting, and I want hot-reloading so your progress becomes my screensaver. Click to fullscreen. Minimal controls in the bottom-right, collapsible.

Then I set up a cron job that runs every 10 minutes:

```
Make _some_ improvement to the project...
Even if complete, find some aspect to improve. Always improve.
```

Five hours and 30 commits later, I had a full ecosystem simulation running at [africa.morgaes.is](https://africa.morgaes.is). The source is at [morgaesis/savannah](https://github.com/morgaesis/savannah).

## What it built

The first commit was a blank canvas with a gradient sky and some rectangles. By the last commit, the project had:

**Eight animal species** (zebra, gazelle, wildebeest, warthog, lion, elephant, giraffe, bird), each driven by a coroutine-based AI. Every animal runs a generator function that yields tick counts, enabling multi-step behavioral sequences like stalk, chase, rest. Each species has a brain config with ~18 tunable parameters (speed, boldness, fear sensitivity, herd desire, rest desire), and each individual animal gets randomized personality variation on top of that.

**Predator-prey dynamics** with alarm propagation. When a gazelle spots a lion, it bolts and triggers a fear response in nearby herd-mates. Lions stalk before chasing, lose interest based on stamina and energy. Animal speeds are based on real-world data. Vultures circle kills.

**A full day/night cycle** with 12 sky color keyframes interpolated smoothly, a sun arc, moon with craters, Milky Way, shooting stars, and the Southern Cross. At night, animals accumulate sleep pressure. Lions resist it (they're nocturnal hunters). Prey herds cluster tighter in darkness.

**Procedural audio** via the Web Audio API: wind that intensifies with gusts, cricket chirps at night with pulse rings, birdsong during the day.

**Atmospheric effects**: morning mist, heat shimmer, crepuscular sun rays during golden hour, dust devils that scare animals, lightning on the horizon, fireflies at dusk, wind-blown seeds, animal eye-shine (tapetum lucidum) at night, owl silhouettes.

**Procedural placement** using a jittered grid (Braid-style stratified sampling) with a PCG hash function. Grass tufts, rocks, and stars are placed deterministically but look natural. No visible banding or mathematical regularity, which was a problem early on when sine-based noise produced noticeable shimmer patterns.

**Performance engineering**: a spatial grid with 20px cells provides O(n) collision avoidance instead of O(n^2). The render loop is decoupled from the logic loop (native refresh rate vs. fixed 30 tps). The background (sky, ground, grass, rocks) is pre-rendered to an offscreen canvas and only redrawn when the time-of-day shifts.

## What I actually did

My total involvement was the initial prompt plus about 17 nudges over the course of the session. Most were one-liners:

- "Start with a very basic screen so something loads with auto-reload" (the first prompt was too ambitious for a cold start)
- "There is too much movement; don't move the screen"
- "The animals are moving according to primitive rules"
- "The flipped animals look cursed" (sprite mirroring was broken)
- "Lions are lazy predators, elephants are slow"
- "Use threads or lightweight fiber/routines for each animal" (this led to the coroutine architecture)
- "Split render from logic loop"
- "For decoration, use random noise, not only maths" (prompted the switch to PCG hash)
- "The birds don't land gracefully, they teleport"
- "Animals should try not to bump into each other"
- "The shimmer/banding is noticeably mathematical sine"
- "When night, animals should have sleep pressure"
- "Don't animals normally gather in herds?"
- "Lookup real animal speed values"
- "The viewport should fill, but don't stretch"

Plus a few bug reports (right-side clipping, seam sticking when animals crossed the world wrap boundary). The cron loop handled everything else: adding features, fixing rendering issues, tuning behavior, layering in atmospheric effects. Each iteration picked something to improve and committed the result.

## What worked well

**Hot-reload as a feedback surface.** Because the browser was always open and the server pushed changes via SSE, I could watch progress in real time. The screensaver prompt was a good fit for this: you immediately see when something looks wrong (flickering, unnatural movement, ugly color transitions).

**The cron loop as autonomous iteration.** "Always improve" is vague enough to give the agent freedom but directed enough to keep it productive. It naturally went from foundational features (sky gradient, basic sprites) to polish (footprints, dust particles, audio) as the low-hanging fruit got picked off.

**One-liner nudges over detailed specs.** Saying "the flipped animals look cursed" is more useful than writing a bug report about canvas transform matrices. The agent diagnosed the issue and fixed it. Similarly, "use threads or lightweight fiber/routines" steered the architecture without micromanaging the implementation. It chose generator functions as the coroutine mechanism on its own.

**Creative expansion.** Several features (fireflies, owl silhouettes, the Southern Cross, vultures circling kills, eye-shine) were added by the cron loop without any prompting. When told to "always improve," the agent treated the project as a creative canvas and added ambient detail that I wouldn't have thought to spec out.

## What didn't work well

**The single-file trap.** The entire client is one ~2500-line `engine.js` file. The agent never chose to split it into modules because each cron iteration only saw "make an improvement" and adding a feature to a monolith is faster than refactoring into modules first. This is the obvious failure mode of incremental autonomous work: local improvements accumulate global technical debt.

**Behavioral realism needs domain knowledge.** Early animal movement was visibly robotic. The nudges about lion laziness, herd behavior, and real speed values were necessary because the agent's default was "all animals wander randomly at the same speed." Domain-specific corrections had the highest impact per intervention.

**Diminishing returns on atmosphere.** After the core simulation was solid, the cron loop kept adding visual effects (more particle types, more weather events, more sky details). Some of these genuinely improved the feel. Others added complexity without much perceptible difference. There's no built-in sense of when to stop polishing.

## The stack

- **Runtime**: [Bun](https://bun.sh) serving static files with SSE hot-reload
- **Rendering**: HTML5 Canvas, no frameworks, no WebGL
- **Audio**: Web Audio API (oscillators, noise buffers, filters)
- **Deployment**: Docker container behind [Traefik](https://traefik.io) with Let's Encrypt auto-HTTPS
- **Total build time**: ~5 hours wall clock, ~30 autonomous iterations

The live demo is at [africa.morgaes.is](https://africa.morgaes.is). Source at [morgaesis/savannah](https://github.com/morgaesis/savannah).

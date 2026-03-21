---
title: An African savanna, built by cron job
date: 2026-03-21
description: What happens when you give Claude Code a creative prompt and let it iterate autonomously on a 10-minute loop.
---

![The savannah at night: pixel-art animals under a starfield with the moon overhead.](/savannah.png)

The prompt:

> I want a "screensaver" in a browser, that shows a pixelart view of an African plain, with a few trees, shrub, some animals, some prey/predator play, some semi-realistic lighting, sun is almost setting (dusk?/pre-sunset). Make the animals interact, graze, drink, predators chase, some birds, each animal with coherent "memory". Make the view only a part of the entire sandbox, as if looking out of a window of a house. Write in bun/TS, run on port 4680; my browser will be waiting, and I want hot-reloading so your progress becomes my screensaver. Click to fullscreen. Minimal controls in the bottom-right, collapsible.

This went to [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Then a cron job took over, firing every ten minutes with a single instruction:

```
Make _some_ improvement to the project. Even if complete, find some aspect
to improve, improve performance, behaviour/animal logic, look and feel.
Always improve.
```

Five hours and 30 commits later, the result was a full ecosystem simulation running at [africa.morgaes.is](https://africa.morgaes.is). Source at [morgaesis/savannah](https://github.com/morgaesis/savannah).

## The system

The first commit produced a gradient sky and some rectangles. By the final iteration, eight animal species roam the savanna: zebra, gazelle, wildebeest, warthog, lion, elephant, giraffe, and assorted birds. Each animal is driven by a [coroutine](https://en.wikipedia.org/wiki/Coroutine)-based AI using [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) that yield tick counts, so a lion can stalk, sprint, fail, and rest as a single behavioral sequence instead of a sprawling state machine. Every species has a brain config with around 18 tunable parameters covering speed, boldness, fear sensitivity, herd desire, and rest drive. Individual animals get randomized personality variation on top of those species defaults.

When a gazelle spots a lion, it bolts and triggers alarm in nearby herd-mates. Lions stalk before committing to a chase and lose interest based on stamina. Vultures circle kills. Prey herds cluster tighter after dark.

The day/night cycle interpolates across 12 sky color keyframes, with a sun arc, a cratered moon, the Milky Way, shooting stars, and the Southern Cross. Animals accumulate sleep pressure at night, though lions resist it because they hunt nocturnally. Procedural audio via the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) produces wind with gusts, cricket chirps with pulse rings at night, and birdsong during the day.

Morning mist, heat shimmer, crepuscular rays during golden hour, dust devils that scatter animals, lightning on the horizon, fireflies at dusk, wind-blown seeds, [tapetum lucidum](https://en.wikipedia.org/wiki/Tapetum_lucidum) eye-shine at night, and owl silhouettes.

Procedural placement uses a jittered grid, a form of [stratified sampling](https://en.wikipedia.org/wiki/Stratified_sampling) in the vein of [Jonathan Blow's Braid particle placement](http://number-none.com/blow/blog/programming/2016/07/07/braid_particles_1.html) and [Casey Muratori's work on visually pleasing distributions](https://caseymuratori.com/blog_0009). A [PCG hash](https://en.wikipedia.org/wiki/Permuted_congruential_generator) function places grass tufts, rocks, and stars deterministically but without visible mathematical regularity. Earlier iterations used sine-based noise for the ground texture, which produced a noticeable shimmer: faint banding artifacts where the periodicity showed through. The PCG hash eliminated that.

A [spatial hash grid](https://en.wikipedia.org/wiki/Spatial_hashing) with 20px cells provides O(n) collision avoidance instead of the naive O(n^2). The render loop runs at native refresh rate, decoupled from the logic loop at a fixed 30 ticks per second. The background (sky, ground, grass, rocks) is pre-rendered to an offscreen canvas and only redrawn when time-of-day shifts.

## The nudges

Total involvement beyond the initial prompt was about 17 one-liners over five hours. Most were short corrective observations. A few of the more interesting ones:

- "The flipped animals look cursed" (sprite mirroring was broken, the agent diagnosed and fixed the canvas transform issue)
- "Use threads or lightweight fiber/routines for each animal" (this nudge steered the architecture toward generators as a coroutine mechanism; the agent chose the specific implementation)
- "For decoration, use random noise, not only maths" (prompted the switch from sine-based noise to PCG hashing)
- "Lions are lazy predators, elephants are slow" and "Lookup real animal speed values" (the domain corrections that moved the needle most)
- "Don't animals normally gather in herds?" (turned individually wandering sprites into plausible social groups)

Plus a few bug reports: right-side clipping, seam artifacts when animals crossed the world wrap boundary. The cron loop handled everything else.

## What worked

**Hot-reload as a feedback surface.** Because the browser stayed open and the server pushed changes via SSE, progress was visible in real time. Flickering, unnatural movement, ugly color transitions: you spot them instantly.

It was quite enjoyable to see the savannah come together on a second screen throughout the day.

**The cron loop as autonomous iteration.** "Always improve" gave the agent enough rope to be creative without wandering off. It started with sky gradients and basic sprites, moved on to footprints and dust particles, and eventually got to procedural audio. Fireflies, owl silhouettes, the Southern Cross, vultures circling kills, eye-shine: none of these were prompted. The agent just kept finding things to add, and most of them were good.

**One-liner nudges over detailed specs.** "The flipped animals look cursed" communicates a problem faster than a bug report about canvas transform matrices. "Use threads or lightweight fiber/routines" steers the architecture without dictating the implementation. Symptoms over prescriptions.

## What did not work

**The single-file trap.** The entire client is one ~2500-line `engine.js`. The agent never split it into modules because each cron iteration optimized locally: adding a feature to a monolith is faster than refactoring first. The usual story: nobody refactors when there is always a shinier feature to add.

**Behavioral realism needs domain knowledge.** Early animal movement was visibly robotic: all species wandered randomly at the same speed. The nudges about lion laziness, herd behavior, and real speed values had the highest impact of any intervention. A lion sprints at roughly 80 km/h but only sustains it for 15-30 seconds. A gazelle hits 90 km/h and can maintain it for 60-90 seconds. Translating those real figures into game-scale values made the chases look plausible. The agent looked up actual animal speeds on its own when pointed in that direction, and independently found the Braid grass-placement technique when asked about procedural decoration.

**Diminishing returns on atmosphere.** After the core simulation was solid, the cron loop kept layering visual effects: more particle types, more weather events, more sky details. Some of them improved the scene. Others just added code. Nobody told it to stop, so it didn't.

## The stack

- **Runtime**: [Bun](https://bun.sh) serving static files with SSE hot-reload
- **Rendering**: HTML5 Canvas, no frameworks, no WebGL
- **Audio**: [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (oscillators, noise buffers, filters)
- **Deployment**: Docker container behind [Traefik](https://traefik.io) with Let's Encrypt auto-HTTPS
- **Wall clock**: ~5 hours, ~30 autonomous iterations

The live demo is at [africa.morgaes.is](https://africa.morgaes.is). Source at [morgaesis/savannah](https://github.com/morgaesis/savannah).

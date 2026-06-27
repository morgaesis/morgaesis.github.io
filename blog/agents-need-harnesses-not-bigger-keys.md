---
title: Agents need harnesses, not bigger keys
date: 2026-06-26
description: Agent autonomy needs operation-scoped policy, evidence, and recovery, not standing credentials with better audit logs.
---

Every serious agent demo eventually reaches the same awkward moment: the model has done the thinking and now wants the keys.

It found the migration, wrote the patch, read the logs, drafted the rollout, drove the browser, and proposed the fix. Then the human gets the worst job in the loop: approving a chain of small dangerous moves across GitHub, CI, Terraform, Ansible, Slack, a database console, a cloud account, and whatever shell happens to be open.

That is not autonomy. It is a very fast approval treadmill.

The obvious answer is to treat the agent like a new employee: give it an identity, attach permissions, audit it later. That helps, but it puts the center of control in the wrong place. The important question is not "who is this agent?" It is "what consequence is about to happen, and is it predictable, reversible, scoped, and recorded?"

The unit of control should be the work item, not the agent account.

A work item should hold the goal, scope, assumptions, evidence, decisions, approvals, tool calls, failures, recovery steps, and outcome. Pull requests, terminal sessions, screenshots, traces, deploys, and rollbacks are artifacts of the work. Agents can come and go. The work item remains.

<figure class="article-figure sketch-figure" aria-label="A hand-sketched work item ledger receives intent, evidence, keys, execution traces, and recovery loops.">
  <figcaption>Authority belongs to the work, not the worker.</figcaption>
  <img src="/agents-harness-ledger-sketch.jpg" alt="Hand-sketched diagram of a locked ledger connecting an agent, evidence, policy, credentials, execution, and recovery." width="1200" height="800" loading="eager" fetchpriority="high" decoding="async" />
</figure>

By lead agent, I mean the agent carrying the task: the one holding the goal, talking to the human, delegating to helper agents, and deciding what to try next. That agent can coordinate, summarize, and propose. It should not be the source of truth. If it becomes confused or poisoned, another agent should be able to reconstruct the state from the work-item ledger and continue.

The missing layer is a harness.

A harness sits between agents and real systems. It turns agent intent into controlled execution. It knows the work item, target, policy, evidence requirements, credential path, approval state, and audit trail. It does not ask whether the model sounds confident. It decides whether this operation may run, under these conditions, against this resource, for this piece of work.

This is not a new primitive. The pieces are already on the table: MCP gives tool boundaries; agent frameworks handle approval pauses; OPA and Vault cover policy and secret leases.[^platform-pieces]

Privileged sessions can already be mediated and recorded. Terraform plans, Ansible check mode, migration previews, and CI can provide preflight evidence. Durable workflow systems can preserve long-running workflow state across crashes.[^operational-pieces]

None of those is the whole harness. The harness is the wiring between those parts: work records, operation catalogs, policy inputs, credential brokering, evidence, approvals, and recovery state.

## The solution is a contract, not a greenfield platform

The answer is not "go build everything yourself."

Buy the generic controls. Own the domain verbs. Identity, policy engines, secret brokers, session recorders, CI, observability, and workflow engines are infrastructure. The operation contract is product knowledge: what a refund means, what a safe migration means, what an acceptable deploy means, and what evidence proves it.

The first version can be boring: a YAML file or database row that names one operation, a small executor, the existing ticket or pull request, pointers to the plan or preview artifact, a policy check, a leased credential path, and the postcheck that proves the system is healthy.

A vendor can provide that layer. An internal platform can provide it. A thin service around one painful workflow can provide it. The useful test is the same in all three cases: can it define typed operations, bind approvals to immutable evidence, integrate with policy and secret systems, record executions, expose recovery state, and keep raw credentials out of the model context? If it only gives the agent an identity and a transcript, it has not solved this problem.

## Trust agents for cognition, not authority

Agents are usually trying to help. Treating them as hostile all the time makes them useless.

But any agent that reads untrusted content can be hijacked for the duration of a task. A log line, README, ticket, web page, stack trace, or API response can carry instructions the model follows. OWASP lists prompt injection as the top risk in its 2025 LLM application risk list.[^owasp-prompt]

This failure mode is already showing up in real tools. MCP Inspector had a critical RCE vulnerability before version 0.14.1.[^mcp-inspector] Wordfence reported MCP-related privilege escalation in the AI Engine WordPress plugin affecting more than 100,000 sites.[^wordfence-ai-engine] Researchers have also demonstrated support-ticket prompt injection leading agents with database tools to expose private tables.[^supabase-mcp] These are not arguments against agents. They are arguments against handing them raw power.

The practical posture is simple: agents are aligned but corruptible.

Let them reason, draft, inspect, compare, summarize, test, and propose. Do not let them hold standing root, approve themselves, decide their own blast radius, or reach raw admin surfaces. Trust should buy autonomy, not latitude.

## Expose verbs, not surfaces

Most real systems have crude permission models. Some tasks need root. Some APIs are all-or-nothing. Some vendor CLIs are terrible in ways that no policy document can fully redeem.

Do not hand that surface to an agent and hope. Put a narrow verb in front of it.

A finance agent should not get the payment dashboard. It should get `prepare_refund(order_id, amount, reason)` with amount limits, policy checks, and approval thresholds.

A CRM cleanup agent should not get a SQL console. It should get `preview_contact_merge`, `apply_contact_merge_batch`, and `restore_from_export`.

A cloud-cost agent should not get broad cloud admin. It should get `mark_idle_resource`, `notify_owner`, and `delete_after_grace_period`.

An ops agent should not get unrestricted SSH by default. It should get `collect_logs`, `restart_service_with_health_check`, `rotate_credential`, `drain_node`, or `apply_network_config_with_revert`.

Behind the verb there may be serious power. In front of it there is a typed operation with parameters, limits, preconditions, postchecks, logging, and rollback behavior. This is not just least privilege. It is the least expressive interface that can do the job.

The trap is the god-verb: `run_shell`, `execute_sql`, `run_arbitrary_playbook`, `use_admin_browser`.

Break-glass needs escape hatches. Normal autonomy should not depend on them. If every hard case routes through a god-verb, the system is just root with extra paperwork.

## Gate on consequence

Evidence is not proof. It is the material a system can use to decide whether the next consequence is acceptable.

For predictable work, gate on prediction. Terraform plan exists to preview infrastructure changes before apply.[^terraform-plan] A database migration preview, deployment diff, CI result, cost estimate, or row-count comparison serves the same role. Approval should bind to the exact artifact. If the commit, target, inventory, or plan changes, the approval expires.

For exploratory work, gate on containment. There is no dry-run for "debug why this host is broken." The session changes as it proceeds. The first bad network command may cut off access. Here the preflight question is different: is there a backup, a time box, a transcript, scoped credentials, bounded egress, a canary, out-of-band access, or an auto-revert primitive?

Netplan has a native example. `netplan try` applies a network configuration and reverts after a timeout unless the change is confirmed; the documented default timeout is 120 seconds.[^netplan-try] That is not prediction. It is a recovery path.

Bulk automation sits between the two. Ansible check mode is useful, but only modules that support it report what they would change; unsupported modules report nothing and do nothing in check mode.[^ansible-check] A harness should not say "dry-run passed." It should say what the dry-run covered. If forty tasks exist and twelve were meaningfully simulated, low coverage should force containment: one canary, serial rollout, health checks between batches, and abort-on-first-failure.

A harnessed rollout should turn uncertainty into measured expansion. Apply to one host or 1% of tenants, wait for independent health and SLO signals, expand only while thresholds hold, and stop automatically when they do not.

<figure class="article-figure gate-matrix" aria-label="Interactive consequence gate visualization for prediction, containment, and abort paths.">
  <figcaption>Gate consequence, not confidence.</figcaption>
  <div class="gate-stage" data-gate-stage tabindex="0" role="button" aria-label="Move the pointer to steer the operation pulse. The consequence gate opens, sends the work to canary, or locks shut. Tap to cycle states.">
    <svg class="gate-map" viewBox="0 0 640 360" aria-hidden="true">
      <defs>
        <linearGradient id="gate-floor-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#f6f0e6" />
          <stop offset="1" stop-color="#e6ded0" />
        </linearGradient>
        <linearGradient id="predict-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#2f817a" stop-opacity="0.12" />
          <stop offset="1" stop-color="#2f817a" stop-opacity="0.92" />
        </linearGradient>
        <linearGradient id="contain-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#c97b3a" stop-opacity="0.12" />
          <stop offset="1" stop-color="#c97b3a" stop-opacity="0.95" />
        </linearGradient>
        <linearGradient id="abort-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#bf5f5a" stop-opacity="0.16" />
          <stop offset="1" stop-color="#bf5f5a" stop-opacity="0.94" />
        </linearGradient>
        <filter id="soft-token-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect class="gate-floor" x="0" y="0" width="640" height="360" />
      <path class="gate-lane lane-approach" d="M50 248 C128 222 196 220 274 214" />
      <path class="gate-lane lane-plan" d="M352 164 C424 132 492 106 592 84" />
      <path class="gate-lane lane-canary" d="M350 214 C416 224 482 234 592 232" />
      <path class="gate-lane lane-abort" d="M334 254 C402 286 496 298 592 304" />
      <path class="gate-trail" data-pulse-trail d="M76 248 C150 230 218 222 300 210" />
      <g class="gate-meter">
        <text x="42" y="42">evidence</text>
        <rect x="42" y="54" width="160" height="8" rx="4" />
        <rect data-coverage-fill x="42" y="54" width="120" height="8" rx="4" />
        <text x="418" y="42">blast radius</text>
        <rect x="418" y="54" width="160" height="8" rx="4" />
        <rect data-blast-fill x="418" y="54" width="54" height="8" rx="4" />
      </g>
      <g class="consequence-gate" data-gate-body>
        <rect class="gate-shadow" x="286" y="106" width="72" height="176" rx="12" />
        <rect class="gate-post gate-post-left" x="272" y="94" width="22" height="198" rx="5" />
        <rect class="gate-post gate-post-right" x="350" y="94" width="22" height="198" rx="5" />
        <rect class="gate-header" x="262" y="88" width="120" height="22" rx="6" />
        <g class="gate-door gate-door-left" data-gate-door-left>
          <rect x="293" y="116" width="31" height="136" rx="4" />
          <path d="M302 138 H318 M302 166 H318 M302 194 H318 M302 222 H318" />
        </g>
        <g class="gate-door gate-door-right" data-gate-door-right>
          <rect x="326" y="116" width="31" height="136" rx="4" />
          <path d="M332 138 H348 M332 166 H348 M332 194 H348 M332 222 H348" />
        </g>
        <g class="gate-lock" data-gate-lock>
          <path d="M309 169 V153 C309 139 341 139 341 153 V169" />
          <rect x="302" y="169" width="46" height="38" rx="8" />
          <circle cx="325" cy="188" r="4" />
          <path d="M325 192 V200" />
        </g>
        <g class="gate-arm" data-gate-arm>
          <rect x="272" y="248" width="104" height="9" rx="5" />
          <circle cx="274" cy="252" r="10" />
        </g>
      </g>
      <g class="target-prod" data-target-prod>
        <rect x="520" y="56" width="54" height="64" rx="8" />
        <path d="M532 76 H562 M532 92 H562 M532 108 H562" />
        <circle cx="566" cy="66" r="4" />
        <path d="M538 48 L547 36 L556 48" />
      </g>
      <g class="target-canary" data-target-canary>
        <rect x="496" y="194" width="82" height="66" rx="10" />
        <path d="M512 220 H560" />
        <path d="M512 238 C522 228 532 242 542 232 C550 224 556 228 564 218" />
        <circle cx="514" cy="210" r="5" />
        <circle cx="536" cy="210" r="5" />
        <circle cx="558" cy="210" r="5" />
      </g>
      <g class="target-stop" data-target-stop>
        <rect x="506" y="280" width="66" height="44" rx="8" />
        <path d="M520 302 H558" />
        <path d="M526 292 L552 314" />
        <path d="M552 292 L526 314" />
      </g>
      <g class="gate-cursor-target" data-cursor-target>
        <path d="M64 234 L90 248 L64 262 Z" />
        <path d="M92 248 H134" />
      </g>
      <circle class="gate-pulse-ring" data-gate-pulse-ring cx="86" cy="248" r="18" />
      <circle class="gate-pulse" data-gate-pulse cx="86" cy="248" r="9" filter="url(#soft-token-glow)" />
    </svg>
    <p class="gate-status" aria-live="polite">Steer the pulse: evidence opens the gate, uncertainty diverts to canary, high blast radius locks it shut.</p>
  </div>
</figure>

The rule is blunt: if you can see the consequence coming, gate on prediction. If you cannot, gate on containment. If you can do neither, stop pretending it is safe automation. Make a human own the residual risk.

## Reversible is not harmless

Rollback is not a spell. A change can be reversible and still be outage-inducing.

An agent can restart the right service at the wrong moment. A reversible config change can drop active connections. A migration can roll back cleanly after saturating a queue. A cloud cleanup can re-create a deleted resource after customers have already seen errors. A deployment can revert the code and leave caches, replicas, or dependent jobs in a bad state.

Some effects do not roll back. Customer-visible errors happened. Connections dropped. Jobs duplicated. Emails sent. External APIs were called. Payment side effects, data drift, cache poisoning, and downstream retries may all survive the revert. Rollback restores a system shape; compensation repairs side effects; incident handling deals with user impact. The harness has to know which world it is in.

So the harness needs a disruption budget, not just a rollback button.

For customer-facing systems, the gate should ask about SLO burn, maintenance windows, canary size, maximum parallelism, drain behavior, queue depth, cache warmup, dependency health, and abort thresholds. For internal systems, it should ask who is interrupted, how long the interruption is tolerable, and what signal proves service is back. "Can undo" is weaker than "can undo before anyone meaningfully hurts."

Those are not just approval notes. They are live controls: error-rate or latency ceiling, SLO burn threshold, queue-depth ceiling, canary size, maximum parallelism, soak time, health-check source, automatic stop condition, and the exact recovery action.

This is where the work item matters again. The approval should bind to the disruption envelope: what can go down, for how long, with what detection, and with what recovery path. If the action crosses that envelope, it is not the same approval anymore.

<figure class="article-figure consequence-figure" aria-label="Interactive visualization showing that higher-consequence actions face stricter gates.">
  <figcaption>Higher consequence closes heavier gates.</figcaption>
  <div class="consequence-stage" data-consequence-stage tabindex="0" role="button" aria-label="Move left to right to increase consequence. The operation token passes light gates and stops at irreversible gates. Tap to cycle consequence levels.">
    <svg class="consequence-map" viewBox="0 0 640 340" aria-hidden="true">
      <defs>
        <filter id="consequence-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path class="consequence-track" d="M48 232 H592" />
      <g class="consequence-lane lane-local" data-level-lane="local">
        <text x="92" y="48">local</text>
        <path class="turnstile" d="M116 90 V184 M86 136 H146 M116 136 L146 106 M116 136 L146 166" />
        <path class="gate-pass" d="M82 206 C100 190 132 190 152 206" />
      </g>
      <g class="consequence-lane lane-reversible" data-level-lane="reversible">
        <text x="210" y="48">reversible</text>
        <rect class="gate-frame" x="216" y="84" width="70" height="106" rx="8" />
        <path class="half-gate" d="M222 156 H278" />
        <path class="revert-arrow" d="M238 118 C266 104 282 132 258 148 M258 148 L260 130 M258 148 L276 145" />
      </g>
      <g class="consequence-lane lane-disruptive" data-level-lane="disruptive">
        <text x="348" y="48">disruptive</text>
        <rect class="gate-frame heavy" x="358" y="76" width="74" height="126" rx="8" />
        <path class="warning-bars" d="M370 102 H420 M370 128 H420 M370 154 H420 M370 180 H420" />
        <circle class="warning-light light-left" cx="368" cy="68" r="7" />
        <circle class="warning-light light-right" cx="422" cy="68" r="7" />
      </g>
      <g class="consequence-lane lane-irreversible" data-level-lane="irreversible">
        <text x="492" y="48">irreversible</text>
        <rect class="blast-door" x="500" y="72" width="80" height="138" rx="10" />
        <path class="blast-brace" d="M510 96 H570 M510 124 H570 M510 152 H570 M510 180 H570" />
        <path class="blast-lock" d="M526 142 V128 C526 110 554 110 554 128 V142 M520 142 H560 V176 H520 Z" />
      </g>
      <path class="consequence-trail" data-consequence-trail d="M48 232 H118" />
      <circle class="consequence-token-ring" data-consequence-ring cx="70" cy="232" r="18" />
      <circle class="consequence-token" data-consequence-token cx="70" cy="232" r="10" filter="url(#consequence-glow)" />
      <g class="consequence-sparks" data-consequence-sparks>
        <path d="M486 218 L472 202" />
        <path d="M502 214 L512 194" />
        <path d="M514 232 L536 224" />
        <path d="M500 248 L514 268" />
      </g>
    </svg>
    <p class="consequence-status" aria-live="polite">Local action: the token passes through a light gate.</p>
  </div>
</figure>

## The proposer cannot be the evidence source

Rubber-stamping happens when the system asking for approval also writes the safety case.

If the same agent recommends an action and writes the safety case for it, the human is reviewing a narrative controlled by the party asking for approval. A confused or hijacked agent can produce a beautiful packet: plausible blast radius, plausible rollback, plausible diff, confident recommendation.

The useful evidence should come from the harness or independent systems: the Terraform plan, migration tool, health probe, Vault audit log, session recording, canary result, or OpenTelemetry trace.[^otel]

<figure class="article-figure evidence-split" aria-label="Interactive sand simulation showing why proposer-written evidence is unsafe.">
  <figcaption>When the proposer grades itself, bad evidence reaches execution.</figcaption>
  <div class="sand-stage" data-sand-stage tabindex="0" role="button" aria-label="Tap to switch between self-graded approval and independent evidence. The sand shows failure leaking or being trapped.">
    <canvas width="1080" height="720"></canvas>
    <div class="sand-hud" aria-hidden="true">
      <span>claim</span>
      <span>independent check</span>
      <span>execution</span>
    </div>
    <div class="sand-mode" aria-live="polite">self-graded: failure leaks through</div>
  </div>
</figure>

Those measurements can be wrong. Inventory can be stale. APIs can lag. Dry-runs can differ from applies. But they fail differently than a persuasive agent fails. That difference is what makes the approval worth anything.

Supply-chain systems already have language for this. in-toto and SLSA use attestations and provenance to describe how artifacts were produced.[^slsa-intoto] Agentic operations need the same instinct. Chat logs are not enough. Record who requested what, what measured evidence existed, what capability was minted, what executed, and what changed.

## Sandboxes are useful, not magic

Discovery often needs freedom. Agents need to try things, run scripts, inspect broken states, and learn. Production should not be their scratchpad.

Run uncertain work where damage is bounded. Existing isolation tools help. gVisor interposes a user-space kernel for container isolation.[^gvisor] Firecracker runs lightweight microVMs for stronger workload isolation.[^firecracker] E2B and similar services provide sandboxes aimed at AI-agent workloads.[^e2b]

But "sandbox" is not a synonym for "safe." A scratch clone can contain real secrets. An ephemeral VM can reach a metadata service. A copied database can contain sensitive records. A test environment can publish packages or sign artifacts.

Check four blast radii: mutation, disclosure, network reach, and supply-chain reach.

<figure class="article-figure sandbox-figure" aria-label="Interactive sandbox visualization showing an agent disturbing state inside a glass box while production remains outside.">
  <figcaption>Useful freedom still needs walls.</figcaption>
  <div class="sandbox-stage" data-sandbox-stage tabindex="0" role="button" aria-label="A roaming agent bumps around inside a glass sandbox. The box shakes at the boundary and production stays outside. Tap to nudge the agent.">
    <canvas width="1080" height="720"></canvas>
    <div class="sandbox-hud" aria-hidden="true">
      <span>sandbox</span>
      <span>boundary</span>
      <span>production</span>
    </div>
    <div class="sandbox-mode" aria-live="polite">contained exploration: the agent stays inside the boundary</div>
  </div>
</figure>

The output of exploration should be understanding. Then distill it into a durable artifact: a pull request, test, monitor, runbook, rollback procedure, Terraform change, Ansible role, or named operation. GitOps is excellent once desired state is known. It is clumsy while discovering what desired state should be.

The operation catalog grows from that loop: messy bounded exploration, distilled into a reviewed verb, reused safely next time.

## Partial failure is the real test

Most approval systems focus on the moment before action. Real systems fail after action starts.

A migration half-applies. A playbook changes three hosts and dies on the fourth. A credential rotates but consumers do not reload. A deployment passes the first check and breaks a queue ten minutes later. A rollback fails.

At that point the original approval no longer describes reality. Recovery is a new operation from a different state.

The harness needs checkpoints, current-state capture, resume points, idempotency keys, and new gates when recovery crosses another point of no return. Durable workflow systems can preserve state and resume execution, but they do not decide what is safe. That belongs in the operation design.

Crossing an abort threshold should create a recovery work item, not invite the agent to improvise in the same thread. Capture current state, stop further expansion, name the owner, and make the next action explicit: resume, roll back, compensate, escalate, or freeze until a human takes over.

The approval graph should follow irreversibility boundaries. Do not ask humans to approve every reversible step. Do not hide three irreversible commits inside one vague approval.

## Two clocks

Moving authority out of agents does not remove authority. It concentrates it in the harness and operation catalog.

That is good, but dangerous.

Executing reviewed operations should be fast. Adding new privileged operations should feel heavier.

A new verb is not a helper function. It expands what future agents can do. It needs owner review, parameter-space analysis, worst-case thinking, logging rules, rollback behavior, tests, versioning, signing, and a way to remove it.

The catalog is the key-cutting machine. Do not leave it on the fast agentic clock.

## Start with one operation

Start with the actions that create the most babysitting: refunds, account changes, deploys, migrations, data cleanup, access grants, cloud cleanup, playbook runs, privileged sessions.

First, wrap one repeated high-friction action. Second, require evidence and postchecks before it can run. Third, make every incident either improve that verb or produce a new one. Fourth, only after several verbs exist, invest in catalog governance.

This is how autonomy compounds: not because the agent gets more trusted, but because the environment gets more operable.

The test for an agent platform is not whether it can act without asking. It is whether the question it asks is narrow, factual, and tied to evidence: this operation, against this target, inside this disruption envelope, with this recovery path.

That is useful autonomy: not bigger keys, but smaller, truer decisions.

---

[^platform-pieces]: [MCP spec](https://modelcontextprotocol.io/specification/2025-06-18); [OpenAI HITL](https://openai.github.io/openai-agents-python/human_in_the_loop/); [LangGraph HITL](https://docs.langchain.com/oss/python/langchain/human-in-the-loop); [OPA docs](https://openpolicyagent.org/docs); [Vault leases](https://developer.hashicorp.com/vault/docs/concepts/lease).
[^operational-pieces]: [SSM Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html); [Teleport session recording](https://goteleport.com/docs/reference/architecture/session-recording/); [Terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan); [Ansible check mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html); [Temporal](https://docs.temporal.io/temporal); [Restate](https://docs.restate.dev/foundations/key-concepts); [DBOS](https://pydantic.dev/docs/ai/integrations/durable_execution/dbos/).
[^terraform-plan]: [Terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan).
[^ansible-check]: [Ansible check mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html).
[^owasp-prompt]: [OWASP LLM01 prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).
[^mcp-inspector]: [NVD CVE-2025-49596](https://nvd.nist.gov/vuln/detail/CVE-2025-49596).
[^wordfence-ai-engine]: [Wordfence AI Engine MCP report](https://www.wordfence.com/blog/2025/06/100000-wordpress-sites-affected-by-privilege-escalation-via-mcp-in-ai-engine-wordpress-plugin/) <time class="ref-date" datetime="2025-06-18" title="Published June 18, 2025">2025-06-18</time>.
[^supabase-mcp]: [Supabase MCP prompt-injection writeup](https://generalanalysis.com/blog/supabase-mcp-blog) <time class="ref-date" datetime="2026-04-10" title="Published April 10, 2026">2026-04-10</time>.
[^netplan-try]: [netplan try](https://netplan.readthedocs.io/en/0.106.1/netplan-try/).
[^otel]: [OpenTelemetry docs](https://opentelemetry.io/docs/).
[^slsa-intoto]: [in-toto and SLSA](https://slsa.dev/blog/2023/05/in-toto-and-slsa) <time class="ref-date" datetime="2023-05-02" title="Published May 2, 2023">2023-05-02</time>.
[^gvisor]: [gVisor docs](https://gvisor.dev/docs/).
[^firecracker]: [Firecracker docs](https://firecracker-microvm.github.io/).
[^e2b]: [E2B docs](https://e2b.dev/).

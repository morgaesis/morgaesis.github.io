---
title: Agents need harnesses, not bigger keys
date: 2026-06-26
description: Agent autonomy works best when each operation carries its own policy, evidence, credentials, and recovery path.
---

The part I keep tripping over in agentic ops is the handoff into systems that remember mistakes.

The agent has found the migration, patched the config, read enough logs to make a plausible case, and now it wants to run the thing. Maybe that means `terraform apply`. Maybe it means a privileged playbook. Maybe it means touching the kube context you really do not want to touch at the end of a long debugging thread.

The human gets a bad job: decide whether the plan is still current, the inventory is stale, the rollback is real, and the health check measures the system rather than the host the agent happened to query. The approval dialog usually does not know any of that.

Calling that autonomy feels generous. Mostly it is tab-juggling with a faster typist.

Treating the agent like a new employee helps only up to a point. Give it an identity, attach permissions, and you still have the same question at the dangerous moment: what is this operation about to change, what evidence justified it, and what happens if the answer is wrong?

I would put the control point on the work item. The record needs the approved target, reviewed artifact, minted lease, and recovery state. Pull requests, terminal sessions, deploys, and rollbacks hang off that record. A second agent should be able to continue from it without believing the first agent's summary.

<figure class="article-figure sketch-figure" aria-label="A hand-sketched work item ledger receives intent, evidence, keys, execution traces, and recovery loops.">
  <figcaption>Authority belongs to the work, not the worker.</figcaption>
  <img src="/agents-harness-ledger-sketch.jpg" alt="Hand-sketched diagram of a locked ledger connecting an agent, evidence, policy, credentials, execution, and recovery." width="1200" height="800" loading="eager" fetchpriority="high" decoding="async" />
</figure>

By lead agent, I mean the one carrying the task: holding the goal, talking to the human, delegating to helper agents, and deciding what to try next. It can coordinate, summarize, and propose. It should not be the source of truth or the evidence source.

Call the thing in the middle a harness.

A harness sits between agents and real systems and turns intent into controlled execution. If approval covered plan digest `abc` and the current plan is `def`, the run dies there. If the operation needs AWS, the harness mints a short Vault lease for the one target instead of handing over a cloud key. The transcript and postcheck land next to the approval.

The bad version is familiar: a GitHub comment approves "the plan," CI has one digest, Vault issued a lease for a target, Ansible skipped three tasks in check mode, and the postcheck lives in monitoring. Nothing proves those facts belong to the same operation.[^platform-pieces][^operational-pieces]

## Start with an operation contract

When people hear "harness," they often hear "another platform." That is not the part I would build first.

Do not rebuild Vault, OPA, CI, session recording, or Terraform. Pick the repeated operation that creates real babysitting and give it a record.

For `restart_service_with_health_check`, the first record can be plain: service, host, drain result, health check, lease path. The executor can be small. The important bit is that approval binds to a specific artifact, not to a friendly paragraph from the agent.

I care less whether that layer comes from a vendor product or a 200-line internal service. I care whether it rejects stale artifacts, issues only the credential needed for the run, and leaves enough recovery state for the next person.

## Keep authority outside the model

Agents are usually trying to help. Treating them as hostile all the time makes them useless.

But any agent that reads untrusted content can be hijacked for the duration of a task. It does not have to be dramatic. A README says to ignore the test failure. A support ticket looks like an instruction. A log line contains a pasted production command. OWASP putting prompt injection at the top of its 2025 LLM risk list is less interesting as a headline than as a design constraint.[^owasp-prompt]

The failure is not theoretical. Researchers have demonstrated support-ticket prompt injection leading agents with database tools to expose private tables.[^supabase-mcp]

Text the agent reads should not widen the credential, tool, or approval it receives.

Let agents inspect, test, draft, and propose. Do not let them mint their own production reach.

## Put dangerous systems behind named operations

`apply_network_config_with_revert(host, config_digest, timeout)` should refuse a stale digest, arm rollback before touching the interface, and prove reachability through the management path before it writes success. If the health check is just `curl localhost`, it has not tested the dangerous part.

Behind the verb there may be serious power. The failure mode is the escape hatch with a nicer label: an approved operation that eventually calls `run_shell`, `execute_sql`, `run_arbitrary_playbook`, or `use_admin_browser` with agent-written arguments.

Break-glass needs escape hatches. Normal autonomy should not depend on them. If every hard case routes through a god-verb, the harness is mostly theater.

## Gate on consequence

Evidence is the input, not the verdict. A Terraform apply, an Ansible rollout, and a live debugging session should not pass through the same approval shape.

Ansible is the uncomfortable middle case. Check mode is useful, but only modules that support it report what they would change; unsupported modules report nothing and do nothing in check mode.[^ansible-check] If forty tasks exist and twelve were simulated, the approval should not say "apply the playbook." That run starts as one canary and earns the next host only if external health agrees.

Terraform is cleaner. If I have the plan digest, I bind approval to the digest; if the commit, target, inventory, or plan changes, the old approval expires.[^terraform-plan]

Live debugging goes the other direction. There is no dry-run for "debug why this host is broken." The session changes as it proceeds, and the first bad network command may cut off access. Before that run starts, I want the backup, time box, transcript, scoped credential, and out-of-band path named.

Netplan has a native example. `netplan try` applies a network configuration and reverts after a timeout unless the change is confirmed; the documented default timeout is 120 seconds.[^netplan-try] That gives you a recovery path.

The run earns expansion; it does not get it up front.

<figure class="article-figure gate-matrix" aria-label="Interactive consequence gate visualization for prediction, containment, and stop paths.">
  <figcaption>Gate consequence, not confidence.</figcaption>
  <div class="gate-stage" data-gate-stage tabindex="0" role="button" aria-label="Move the pointer to change evidence and blast radius. The consequence aperture opens, constrains, or holds the operation. Tap to cycle states.">
    <svg class="gate-map" viewBox="0 0 360 420" aria-hidden="true">
      <defs>
        <linearGradient id="gate-safe-route" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#2f817a" stop-opacity="0.95" />
          <stop offset="1" stop-color="#75b7af" stop-opacity="0.86" />
        </linearGradient>
        <linearGradient id="gate-canary-route" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#c97b3a" stop-opacity="0.94" />
          <stop offset="1" stop-color="#e5b072" stop-opacity="0.86" />
        </linearGradient>
        <linearGradient id="gate-hold-route" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#bf5f5a" stop-opacity="0.95" />
          <stop offset="1" stop-color="#d99690" stop-opacity="0.84" />
        </linearGradient>
        <radialGradient id="gate-glass" cx="48%" cy="40%" r="58%">
          <stop offset="0" stop-color="#fff8ed" stop-opacity="0.98" />
          <stop offset="0.72" stop-color="#eadfcd" stop-opacity="0.94" />
          <stop offset="1" stop-color="#cfc4b4" stop-opacity="0.9" />
        </radialGradient>
        <filter id="soft-token-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect class="gate-panel" x="22" y="24" width="316" height="368" rx="26" />
      <path class="gate-grid" d="M46 122 H314 M46 278 H314 M156 112 V334" />
      <g class="gate-meter">
        <text x="48" y="60">evidence</text>
        <rect class="meter-rail" x="48" y="74" width="122" height="8" rx="4" />
        <rect data-coverage-fill x="48" y="74" width="105" height="8" rx="4" />
        <text x="194" y="60">blast radius</text>
        <rect class="meter-rail" x="194" y="74" width="118" height="8" rx="4" />
        <rect data-blast-fill x="194" y="74" width="24" height="8" rx="4" />
      </g>
      <g class="gate-aperture-system">
        <path class="gate-track track-predict" d="M42 232 C84 232 112 216 156 216 C210 216 236 166 306 140" />
        <path class="gate-track track-contain" d="M42 232 C84 232 112 216 156 216 C210 216 238 216 310 218" />
        <path class="gate-track track-stop" d="M42 232 C84 232 112 216 156 216 C174 246 218 298 300 316" />
        <path class="gate-route" data-pulse-trail d="M42 232 C84 232 112 216 156 216 C210 216 236 166 306 140" />
        <circle class="blast-halo" data-blast-halo cx="42" cy="232" r="18" />
        <g class="aperture" data-aperture>
          <circle class="aperture-shadow" cx="156" cy="216" r="70" />
          <circle class="aperture-blast" data-aperture-blast cx="156" cy="216" r="34" />
          <circle class="aperture-outer" cx="156" cy="216" r="55" />
          <circle class="aperture-glass" cx="156" cy="216" r="42" />
          <path class="aperture-sheen" d="M127 197 C141 184 171 183 187 198" />
          <rect class="aperture-opening" data-aperture-opening x="126" y="205" width="60" height="22" rx="11" />
        </g>
      </g>
      <g class="route-end route-predict" data-route-end="predict">
        <text x="223" y="116">exact plan</text>
        <path class="endpoint-stem" d="M294 126 V152" />
        <path class="route-icon-line" d="M301 132 H316 M301 142 H312" />
        <path class="route-icon-mark" d="M295 153 L302 160 L317 143" />
      </g>
      <g class="route-end route-contain" data-route-end="contain">
        <text x="231" y="202">canary</text>
        <ellipse class="containment-ring" cx="306" cy="217" rx="24" ry="17" />
        <path class="route-icon-line" d="M292 221 C301 208 310 228 321 210" />
        <circle class="canary-dot" cx="294" cy="204" r="3.5" />
        <circle class="canary-dot" cx="307" cy="204" r="3.5" />
        <circle class="canary-dot" cx="320" cy="204" r="3.5" />
      </g>
      <g class="route-end route-stop" data-route-end="stop">
        <text x="234" y="302">hold</text>
        <path class="hold-cap" d="M286 295 H319 M286 335 H319" />
        <path class="hold-barrier" d="M296 296 V334 M309 296 V334" />
      </g>
      <circle class="gate-pulse-ring" data-gate-pulse-ring cx="42" cy="232" r="17" />
      <circle class="gate-pulse" data-gate-pulse cx="42" cy="232" r="9" filter="url(#soft-token-glow)" />
    </svg>
    <p class="gate-status" aria-live="polite">Prediction is strong and blast radius is small: bind approval to the exact plan.</p>
  </div>
</figure>

In an incident review, I want the record to show what was approved exactly, what was bounded, and where the system stopped. If the system cannot say that, the approval is just a person lending their account to a guess.

## Reversible is not harmless

Rollback restores configuration. It does not erase the outage.

An agent can restart the right service at the wrong moment. A migration can roll back cleanly after saturating a queue. A deployment can revert the code and still leave caches, replicas, or dependent jobs in a bad state.

Some effects survive the revert. By then, users have seen errors, queues may have duplicated jobs, and the email provider already has the messages. Payment side effects, data drift, cache poisoning, and downstream retries can all outlive a clean rollback. At that point you are no longer restoring a system shape. You are compensating for damage.

The operation needs a disruption budget, not just a rollback button.

For a restart verb, the disruption budget might say: one host drained at a time, queue depth under 500, five minutes of clean health before the next batch. For a migration, it might say: lock time under a threshold, fallback reads still working, rollback allowed only before the second write phase.

Those values should drive the executor. If queue depth crosses the limit, the run stops before the next host, not after the agent writes an apologetic summary.

The approval should name the disruption envelope. If the action needs more than that envelope allowed, it needs a new approval.

<figure class="article-figure consequence-figure" aria-label="Interactive visualization showing that higher-consequence actions face stricter gates.">
  <figcaption>Higher consequence closes heavier gates.</figcaption>
  <div class="consequence-stage" data-consequence-stage tabindex="0" role="button" aria-label="Move top to bottom to increase consequence. The operation token moves through stricter gates and stops at irreversible work. Tap to cycle consequence levels.">
    <svg class="consequence-map" viewBox="0 0 360 420" aria-hidden="true">
      <defs>
        <filter id="consequence-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect class="consequence-panel" x="28" y="44" width="304" height="330" rx="20" />
      <text x="42" y="30">consequence gate</text>
      <path class="consequence-track" d="M74 84 V334" />
      <path class="consequence-trail" data-consequence-trail d="M74 84 V84" />
      <g class="consequence-lane lane-local" data-level-lane="local">
        <rect class="consequence-control control-local" x="96" y="58" width="218" height="58" rx="10" />
        <path class="control-symbol" d="M122 88 H150 M136 74 V102" />
        <text x="174" y="80">local</text>
        <text class="control-note" x="174" y="102">record</text>
      </g>
      <g class="consequence-lane lane-reversible" data-level-lane="reversible">
        <rect class="consequence-control control-reversible" x="96" y="138" width="218" height="58" rx="10" />
        <path class="control-symbol" d="M122 168 C140 150 162 166 146 184 M146 184 L148 168 M146 184 L164 181" />
        <text x="174" y="160">reversible</text>
        <text class="control-note" x="174" y="182">rollback</text>
      </g>
      <g class="consequence-lane lane-disruptive" data-level-lane="disruptive">
        <rect class="consequence-control control-disruptive" x="96" y="218" width="218" height="58" rx="10" />
        <path class="control-symbol" d="M122 238 H156 M122 254 H156 M122 270 H156" />
        <circle class="warning-light light-left" cx="119" cy="215" r="6" />
        <circle class="warning-light light-right" cx="155" cy="215" r="6" />
        <text x="174" y="240">disruptive</text>
        <text class="control-note" x="174" y="262">canary + SLO</text>
      </g>
      <g class="consequence-lane lane-irreversible" data-level-lane="irreversible">
        <rect class="consequence-control control-irreversible" x="96" y="298" width="218" height="58" rx="10" />
        <path class="control-symbol" d="M122 318 H156 M122 350 H156" />
        <path class="control-lock" d="M130 338 V328 C130 316 150 316 150 328 V338 M122 338 H158 V356 H122 Z" />
        <text x="174" y="320">irreversible</text>
        <text class="control-note" x="174" y="342">new approval</text>
      </g>
      <circle class="consequence-stop stop-local" cx="74" cy="84" r="5" />
      <circle class="consequence-stop stop-reversible" cx="74" cy="164" r="5" />
      <circle class="consequence-stop stop-disruptive" cx="74" cy="244" r="5" />
      <circle class="consequence-stop stop-irreversible" cx="74" cy="324" r="5" />
      <circle class="consequence-token-ring" data-consequence-ring cx="74" cy="84" r="18" />
      <circle class="consequence-token" data-consequence-token cx="74" cy="84" r="10" filter="url(#consequence-glow)" />
    </svg>
    <p class="consequence-status" aria-live="polite">Local action: record the operation and let the token pass.</p>
  </div>
</figure>

## The proposer cannot be the evidence source

The weakest version of this system asks the agent to attach its own safety memo.

If the same agent recommends an action and writes the safety case for it, the human is reviewing a narrative controlled by the party asking for approval.

The bad packet often looks fine. The agent says rollback is safe, but the migration tool produced no down migration. It says the blast radius is one host, but inventory was stale. It links a health check from the host it just reconfigured. That is a story, not evidence.

I would rather see the migration tool's output than a well-written paragraph from the agent.[^otel]

<figure class="article-figure evidence-split" aria-label="Interactive evidence filter showing why proposer-written evidence is unsafe.">
  <figcaption>When the proposer grades itself, bad evidence reaches execution.</figcaption>
  <div class="sand-stage evidence-stage" data-sand-stage tabindex="0" role="button" aria-label="Tap to switch between self-graded approval and independent evidence. In self-graded mode, a bad claim reaches execution. In independent mode, the bad claim is diverted before execution.">
    <svg class="evidence-map" viewBox="0 0 360 420" aria-hidden="true">
      <defs>
        <linearGradient id="evidence-safe-flow" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#3f8f8a" stop-opacity="0.94" />
          <stop offset="1" stop-color="#7db9b2" stop-opacity="0.82" />
        </linearGradient>
        <linearGradient id="evidence-bad-flow" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#bf5f5a" stop-opacity="0.96" />
          <stop offset="1" stop-color="#dc8f83" stop-opacity="0.88" />
        </linearGradient>
        <filter id="evidence-token-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect class="evidence-panel" x="22" y="24" width="316" height="368" rx="26" />
      <text x="46" y="58">claim</text>
      <text x="135" y="58">check</text>
      <text x="262" y="58">execution</text>
      <path class="evidence-shadow-route" d="M42 218 C92 218 112 206 150 206 C204 206 242 216 316 218" />
      <path class="evidence-shadow-route" d="M42 218 C100 170 242 164 318 218" />
      <path class="evidence-shadow-route" d="M150 215 C168 260 214 302 284 318" />
      <path class="evidence-route route-self" data-self-route d="M42 218 C100 170 242 164 318 218" />
      <path class="evidence-route route-pass" data-pass-route d="M42 218 C92 218 112 206 150 206 C204 206 242 216 316 218" />
      <path class="evidence-route route-reject" data-reject-route d="M150 215 C168 260 214 302 284 318" />
      <g class="evidence-source">
        <path class="claim-sheet" d="M54 150 H113 C121 150 127 156 127 164 V240 C127 248 121 254 113 254 H54 Z" />
        <path class="claim-line" d="M70 174 H111 M70 194 H107 M70 214 H112" />
        <circle class="claim-badge" cx="118" cy="158" r="12" />
      </g>
      <g class="evidence-filter" data-evidence-filter>
        <ellipse class="filter-shadow" cx="160" cy="210" rx="55" ry="66" />
        <path class="filter-glass" d="M137 142 H188 L175 276 H124 Z" />
        <path class="filter-slot" data-filter-slot d="M146 176 H180 M142 204 H178 M138 232 H173" />
        <path class="filter-crack" d="M159 165 L151 198 L164 218 L153 252" />
      </g>
      <g class="execution-zone">
        <path class="execution-boundary" d="M300 154 V282" />
        <path class="execution-lines" d="M314 176 H324 M314 206 H324 M314 236 H324 M314 266 H324" />
        <circle class="execution-impact" data-execution-impact cx="306" cy="218" r="34" />
      </g>
      <g class="quarantine-zone">
        <path class="quarantine-basin" d="M240 318 C250 336 286 344 310 324" />
        <path class="quarantine-mark" d="M262 304 L292 334 M292 304 L262 334" />
      </g>
      <circle class="evidence-good-token" data-evidence-good-token cx="42" cy="218" r="7" filter="url(#evidence-token-glow)" />
      <circle class="evidence-token-ring" data-evidence-ring cx="42" cy="218" r="17" />
      <circle class="evidence-bad-token" data-evidence-bad-token cx="42" cy="218" r="10" filter="url(#evidence-token-glow)" />
    </svg>
    <div class="sand-mode" aria-live="polite">self-graded: a bad claim reaches execution</div>
  </div>
</figure>

Probes are fallible. A stale inventory record fails in a different shape than an agent-written safety memo, and that difference is what makes the approval worth anything.

A chat transcript is too thin for provenance. The run record has to connect the request, measured evidence, minted capability, execution, and changed state.

## Sandboxes still have a blast radius

Before an agent knows the fix, it needs room to poke at the broken state. Production should not be that room.

Run uncertain work where damage is bounded. Isolate it, then check what still leaks.[^sandbox-isolation]

"Sandbox" is weaker than "safe." The failures are ordinary: a scratch clone carries a production `.env`; an ephemeral VM can reach a metadata service; a copied database still contains sensitive records; a test registry token can publish a real package or sign an artifact.

Before I call the sandbox safe, I want plain answers: can it mutate production, read secrets, reach metadata, or publish and sign something that leaves the sandbox?

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

The agent should leave behind something less fragile than shell history: a pull request with a test, a monitor, a rollback note, or a named operation. GitOps is excellent once desired state is known. It is clumsy while discovering what desired state should be.

The catalog grows from that loop: bounded exploration, one reviewed operation, then another. It is slower than letting the agent keep the shell, but the next run starts from a reviewed operation instead of an open terminal.

## Partial failure is where approvals get stale

The playbook changed three hosts and died on the fourth. The local health check passed, the queue broke ten minutes later, and now the rollback only describes half the system.

At that point the original approval no longer describes reality. Recovery starts from a different state.

The harness needs to know the last completed checkpoint, what was mutated, which idempotency key is still live, and what state recovery starts from. Durable workflow systems can preserve state and resume execution, but they do not decide what is safe. That belongs in the operation design.

Crossing an abort threshold should create a recovery work item, not invite the agent to improvise in the same thread. Capture current state, stop further expansion, name the owner, and make the next action explicit.

The approval graph should follow irreversibility boundaries. A restart retry and a compensating data fix do not belong under the same old click.

## Two clocks

Moving authority out of agents does not remove authority. It concentrates it in the harness and operation catalog.

Running `restart_service_with_health_check` can be fast. Changing that verb so it accepts a glob, skips drain, or targets a new service class is a production change. Every future run inherits that mistake.

A new verb is not a helper function. It needs an owner, tests for ugly parameter values, logs that survive a bad run, and a way to remove it.

The service owner should review catalog edits the same way they review a deploy path or admin role. A bad verb is a control-plane bug, not a typo.

## Start with one operation

In an ops-heavy system, the first candidate might be deploy-time restarts: `restart_service_with_health_check` before deploys. It forces the first useful decision: who can restart what, with which lease, and what stops the next host.

After a few verbs exist, incident reviews get more useful. A failed run either tightens an existing operation or justifies a new one.

The approval I want to see is boring: restart nginx on host X, using plan Y, with rollback armed and queue depth below Z. A human can answer that. They are no longer being asked to lend the agent a cloud account and hope the summary is true.

---

[^platform-pieces]: [MCP spec](https://modelcontextprotocol.io/specification/2025-06-18); [OpenAI HITL](https://openai.github.io/openai-agents-python/human_in_the_loop/); [LangGraph HITL](https://docs.langchain.com/oss/python/langchain/human-in-the-loop); [OPA docs](https://openpolicyagent.org/docs); [Vault leases](https://developer.hashicorp.com/vault/docs/concepts/lease).
[^operational-pieces]: [SSM Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html); [Teleport session recording](https://goteleport.com/docs/reference/architecture/session-recording/); [Terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan); [Ansible check mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html); [Temporal](https://docs.temporal.io/temporal); [Restate](https://docs.restate.dev/foundations/key-concepts); [DBOS](https://pydantic.dev/docs/ai/integrations/durable_execution/dbos/).
[^terraform-plan]: [Terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan).
[^ansible-check]: [Ansible check mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html).
[^owasp-prompt]: [OWASP LLM01 prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).
[^supabase-mcp]: [Supabase MCP prompt-injection writeup](https://generalanalysis.com/blog/supabase-mcp-blog) <time class="ref-date" datetime="2026-04-10" title="Published April 10, 2026">2026-04-10</time>.
[^netplan-try]: [netplan try](https://netplan.readthedocs.io/en/0.106.1/netplan-try/).
[^otel]: [OpenTelemetry docs](https://opentelemetry.io/docs/).
[^sandbox-isolation]: [gVisor docs](https://gvisor.dev/docs/); [Firecracker docs](https://firecracker-microvm.github.io/); [E2B docs](https://e2b.dev/).

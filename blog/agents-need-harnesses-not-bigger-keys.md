---
title: Agents need harnesses, not bigger keys
date: 2026-06-26
description: Agent autonomy needs operation-scoped policy, evidence, and recovery, not standing credentials with better audit logs.
---

Agents are now good enough to create a new kind of toil.

They write the code, read the logs, draft the migration, drive the browser, and propose the fix. Then the human gets the worst part: approving the next risky step across GitHub, CI, Terraform, Ansible, Slack, a database console, a cloud account, and whatever shell happens to be open.

That is not autonomy. It is supervision at machine speed.

The obvious answer is to treat the agent like a new employee: give it an identity, attach permissions, audit it later. That helps, but it is the wrong center of gravity. The core question is not "who is this agent?" The core question is "what consequence is about to happen, and is it predictable, reversible, scoped, and recorded?"

So the unit of control should be the work item, not the agent account.

A work item should hold the goal, scope, assumptions, evidence, decisions, approvals, tool calls, failures, recovery steps, and outcome. Pull requests, terminal sessions, screenshots, traces, deploys, and rollbacks are artifacts of the work. Agents can come and go. The work item remains.

By lead agent, I mean the agent carrying the task: the one holding the goal, talking to the human, delegating to helper agents, and deciding what to try next. That agent can coordinate, summarize, and propose. It should not be the source of truth. If it becomes confused or poisoned, another agent should be able to reconstruct the state from the work-item ledger and continue.

The missing layer is a harness.

A harness sits between agents and real systems. It turns agent intent into controlled execution. It knows the work item, target, policy, evidence requirements, credential path, approval state, and audit trail. It does not ask whether the model sounds confident. It decides whether this operation may run, under these conditions, against this resource, for this piece of work.

Some parts already exist. MCP standardizes how applications expose tools and context to models.[^mcp] OpenAI's Agents SDK, LangGraph, and similar frameworks can pause tool calls for human approval.[^openai-hitl][^langgraph-hitl] OPA can make structured policy decisions outside application code.[^opa] Vault can issue leased dynamic secrets instead of long-lived credentials.[^vault] AWS Systems Manager Session Manager and Teleport provide recorded, mediated privileged sessions.[^ssm][^teleport] Terraform plans, Ansible check mode, migration previews, and CI provide partial preflight evidence.[^terraform-plan][^ansible-check] Temporal, Restate, and DBOS-style durable execution can preserve long-running workflow state across crashes.[^temporal][^restate][^dbos]

None of those is the whole harness. The useful product is the composition: the work-item record, the operation catalog, the policy inputs, the credential brokering, the evidence model, the approval surface, and the recovery state machine.

## Trust agents for cognition, not authority

Agents are usually trying to help. Treating them as hostile all the time makes them useless.

But any agent that reads untrusted content can be hijacked for the duration of a task. A log line, README, ticket, web page, stack trace, or API response can carry instructions the model follows. OWASP lists prompt injection as the top risk in its 2025 LLM application risk list.[^owasp-prompt]

Recent incidents and disclosures show the shape of the problem. MCP Inspector had a critical RCE vulnerability before version 0.14.1.[^mcp-inspector] Wordfence reported MCP-related privilege escalation in the AI Engine WordPress plugin affecting more than 100,000 sites.[^wordfence-ai-engine] Researchers have also demonstrated support-ticket prompt injection leading agents with database tools to expose private tables.[^supabase-mcp] These are not arguments against agents. They are arguments against handing them raw power.

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

The rule is blunt: if you can see the consequence coming, gate on prediction. If you cannot, gate on containment. If you can do neither, stop pretending it is safe automation. Make a human own the residual risk.

## The proposer cannot be the evidence source

Rubber-stamping is structural.

If the same agent recommends an action and writes the safety case for it, the human is reviewing a narrative controlled by the party asking for approval. A confused or hijacked agent can produce a beautiful packet: plausible blast radius, plausible rollback, plausible diff, confident recommendation.

The useful evidence should come from the harness or independent systems: the Terraform plan, migration tool, health probe, Vault audit log, session recording, canary result, or OpenTelemetry trace.[^otel]

Those measurements can be wrong. Inventory can be stale. APIs can lag. Dry-runs can differ from applies. But their errors are different from the agent's persuasion. That separation is the safety property.

Supply-chain systems already have language for this. in-toto and SLSA use attestations and provenance to describe how artifacts were produced.[^slsa-intoto] Agentic operations need the same instinct. Chat logs are not enough. Record who requested what, what measured evidence existed, what capability was minted, what executed, and what changed.

## Sandboxes are useful, not magic

Discovery often needs freedom. Agents need to try things, run scripts, inspect broken states, and learn. Production should not be their scratchpad.

Run uncertain work where damage is bounded. Existing isolation tools help. gVisor interposes a user-space kernel for container isolation.[^gvisor] Firecracker runs lightweight microVMs for stronger workload isolation.[^firecracker] E2B and similar services provide sandboxes aimed at AI-agent workloads.[^e2b]

But "sandbox" is not a synonym for "safe." A scratch clone can contain real secrets. An ephemeral VM can reach a metadata service. A copied database can contain sensitive records. A test environment can publish packages or sign artifacts.

Check four blast radii: mutation, disclosure, network reach, and supply-chain reach.

The output of exploration should be understanding. Then distill it into a durable artifact: a pull request, test, monitor, runbook, rollback procedure, Terraform change, Ansible role, or named operation. GitOps is excellent once desired state is known. It is clumsy while discovering what desired state should be.

The operation catalog grows from that loop: messy bounded exploration, distilled into a reviewed verb, reused safely next time.

## Partial failure is the real test

Most approval systems focus on the moment before action. Real systems fail after action starts.

A migration half-applies. A playbook changes three hosts and dies on the fourth. A credential rotates but consumers do not reload. A deployment passes the first check and breaks a queue ten minutes later. A rollback fails.

At that point the original approval no longer describes reality. Recovery is a new operation from a different state.

The harness needs checkpoints, current-state capture, resume points, idempotency keys, and new gates when recovery crosses another point of no return. Durable workflow systems can preserve state and resume execution, but they do not decide what is safe. That belongs in the operation design.

The approval graph should follow irreversibility boundaries. Do not ask humans to approve every reversible step. Do not hide three irreversible commits inside one vague approval.

## Two clocks

Moving authority out of agents does not remove authority. It concentrates it in the harness and operation catalog.

That is good, but dangerous.

Executing reviewed operations should be fast. Adding new privileged operations should feel heavier.

A new verb is not a helper function. It expands what future agents can do. It needs owner review, parameter-space analysis, worst-case thinking, logging rules, rollback behavior, tests, versioning, signing, and a way to remove it.

The catalog is the key-cutting machine. Do not leave it on the fast agentic clock.

## What to build first

Start with the actions that create the most babysitting: refunds, account changes, deploys, migrations, data cleanup, access grants, cloud cleanup, playbook runs, privileged sessions.

Wrap one action. Give it typed inputs, policy checks, evidence requirements, leased credentials, and an audit record. Keep raw access for humans and break-glass. After each messy incident or manual fix, distill the repeatable part into another operation.

This is how autonomy compounds: not because the agent gets more trusted, but because the environment gets more operable.

A good agent platform should not ask, "Do you trust me?"

It should say: "Here is the work item, proposed operation, measured evidence, uncertainty, containment, and recovery path. This is the narrow decision left for you."

That is how agents stop creating supervision work and start removing it.

---

[^mcp]: Model Context Protocol, "Specification," June 18, 2025. <https://modelcontextprotocol.io/specification/2025-06-18>
[^openai-hitl]: OpenAI Agents SDK, "Human-in-the-loop." <https://openai.github.io/openai-agents-python/human_in_the_loop/>
[^langgraph-hitl]: LangChain and LangGraph docs, "Human-in-the-loop." <https://docs.langchain.com/oss/python/langchain/human-in-the-loop>
[^opa]: Open Policy Agent documentation. <https://openpolicyagent.org/docs>
[^vault]: HashiCorp Vault documentation, "Lease, renew, and revoke." <https://developer.hashicorp.com/vault/docs/concepts/lease>
[^ssm]: AWS Systems Manager documentation, "Session Manager." <https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html>
[^teleport]: Teleport documentation, "Session Recording." <https://goteleport.com/docs/reference/architecture/session-recording/>
[^terraform-plan]: HashiCorp Terraform documentation, "terraform plan command reference." <https://developer.hashicorp.com/terraform/cli/commands/plan>
[^ansible-check]: Ansible documentation, "Validating tasks: check mode and diff mode." <https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html>
[^temporal]: Temporal documentation, "What is Temporal?" <https://docs.temporal.io/temporal>
[^restate]: Restate documentation, "Key Concepts." <https://docs.restate.dev/foundations/key-concepts>
[^dbos]: Pydantic AI documentation, "DBOS durable execution." <https://pydantic.dev/docs/ai/integrations/durable_execution/dbos/>
[^owasp-prompt]: OWASP GenAI Security Project, "LLM01:2025 Prompt Injection." <https://genai.owasp.org/llmrisk/llm01-prompt-injection/>
[^mcp-inspector]: NVD, "CVE-2025-49596 Detail." <https://nvd.nist.gov/vuln/detail/CVE-2025-49596>
[^wordfence-ai-engine]: Wordfence, "100,000 WordPress Sites Affected by Privilege Escalation via MCP in AI Engine WordPress Plugin," June 18, 2025. <https://www.wordfence.com/blog/2025/06/100000-wordpress-sites-affected-by-privilege-escalation-via-mcp-in-ai-engine-wordpress-plugin/>
[^supabase-mcp]: General Analysis, "Supabase MCP can leak your entire SQL database," April 10, 2026. <https://generalanalysis.com/blog/supabase-mcp-blog>
[^netplan-try]: Netplan documentation, "netplan try." <https://netplan.readthedocs.io/en/0.106.1/netplan-try/>
[^otel]: OpenTelemetry documentation. <https://opentelemetry.io/docs/>
[^slsa-intoto]: SLSA, "in-toto and SLSA," May 2, 2023. <https://slsa.dev/blog/2023/05/in-toto-and-slsa>
[^gvisor]: gVisor documentation, "What is gVisor?" <https://gvisor.dev/docs/>
[^firecracker]: Firecracker documentation. <https://firecracker-microvm.github.io/>
[^e2b]: E2B documentation. <https://e2b.dev/>

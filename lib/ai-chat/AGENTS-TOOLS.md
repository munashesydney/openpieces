# Agents: tools and spawn policy

All chat agents use the same tool registry (`createTools` in `lib/tools/registry.ts`). The only per-agent difference is how the **`runtime`** tool is shaped.

## Shared tools

`manage_workflows`, `manage_services`, `manage_tasks`, `manage_opencode_sessions`, `manage_opencode_messages`, `manage_secrets`, `manage_service_endpoints`, `call_endpoint`, `manage_workflow_action_links`, `manage_brain`, `web_search`, plus **`runtime`** (see below).

## `runtime` spawn policy

| Caller agent   | May spawn via `spawn_agent` |
|----------------|-----------------------------|
| `orchestrator` | `architecture` only         |
| `events`       | `orchestrator` only         |
| `architecture`, `brain`, other | cannot spawn |

`execute` also enforces this matrix (`lib/tools/runtime/execute.ts`).

## `runtime` actions (by caller)

- **Orchestrator / Events:** `sleep`, `spawn_agent`, `ask_question`, `check_agent_progress` (spawn targets per table above).
- **Agents that cannot spawn:** `sleep`, `ask_question` only (`lib/tools/runtime/definition.ts`).

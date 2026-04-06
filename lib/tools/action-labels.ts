// Human-readable labels for tool actions
// Usage: getActionLabel("manage_brain", "list") => "List Brain Entries"

export const ACTION_LABELS: Record<string, Record<string, string>> = {
  manage_brain: {
    list: "List Brain Entries",
    search: "Search Brain",
    get: "Get Brain Entry",
    create: "Add to Brain",
    update: "Update Brain Entry",
    delete: "Delete Brain Entry",
  },
  manage_workflows: {
    list: "List Workflows",
    get: "Get Workflow",
    create: "Create Workflow",
    update: "Update Workflow",
    delete: "Delete Workflow",
  },
  manage_services: {
    list: "List Services",
    get: "Get Service",
    create: "Create Service",
    update: "Update Service",
    delete: "Delete Service",
    get_logs: "Get Service Logs",
  },
  manage_tasks: {
    list: "List Tasks",
    get: "Get Task",
    create: "Create Task",
    update: "Update Task",
    delete: "Delete Task",
  },
  manage_opencode_sessions: {
    list: "List Sessions",
    get: "Get Session",
    create: "Create Session",
  },
  manage_opencode_messages: {
    send: "Send Message",
    list: "List Messages",
  },
  manage_secrets: {
    list: "List Secrets",
    get: "Get Secret",
    create: "Create Secret",
    update: "Update Secret",
    delete: "Delete Secret",
  },
  manage_service_endpoints: {
    list: "List Endpoints",
    get: "Get Endpoint",
  },
  call_endpoint: {
    call: "Call Endpoint",
  },
  manage_workflow_action_links: {
    link: "Link Action",
    unlink: "Unlink Action",
    list_linked: "List Linked Actions",
  },
  runtime: {
    sleep: "Sleep",
    spawn_agent: "Spawn Agent",
    ask_question: "Ask Question",
    check_agent_progress: "Check Agent Progress",
  },
  web_search: {
    search: "Web Search",
    extract: "Extract Web Content",
    crawl: "Crawl Web Pages",
    map: "Map Website Structure",
  },
};

// Helper function to get a human-readable label for a tool action
export function getActionLabel(toolName: string, action: string): string {
  return ACTION_LABELS[toolName]?.[action] ?? `${action} ${toolName}`;
}

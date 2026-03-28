type ChatController = {
  abortController: AbortController;
  pgBossJobId: string;
};

const chatControllers = new Map<string, ChatController>();

export function registerChatController(chatId: string, pgBossJobId: string): AbortController {
  const existing = chatControllers.get(chatId);
  existing?.abortController.abort();

  const ac = new AbortController();
  chatControllers.set(chatId, { abortController: ac, pgBossJobId });
  return ac;
}

export function getChatAbortController(chatId: string): AbortController | undefined {
  return chatControllers.get(chatId)?.abortController;
}

export function getChatPgBossJobId(chatId: string): string | null {
  return chatControllers.get(chatId)?.pgBossJobId ?? null;
}

export function removeChatController(chatId: string): void {
  chatControllers.delete(chatId);
}

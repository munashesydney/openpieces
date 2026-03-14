"use client";

import { useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { OverviewAiChatsSidebar } from "./overview-ai-chats-sidebar";
import { OverviewChatArea, type ChatMessage } from "./overview-chat-area";
import { OverviewComposer } from "./overview-composer";
import { OverviewTitle } from "./overview-title";

export type Chat = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

const DUMMY_CHATS: Chat[] = [
  {
    id: "1",
    title: "Automate weekly report",
    messages: [
      { id: "1a", content: "Can you help me set up a weekly report?", role: "user" },
      { id: "1b", content: "I can help. What data sources should the report include?", role: "assistant" },
    ],
  },
  {
    id: "2",
    title: "Data pipeline review",
    messages: [
      { id: "2a", content: "Let's review the ETL pipeline.", role: "user" },
      { id: "2b", content: "Here’s a summary of the current pipeline steps…", role: "assistant" },
    ],
  },
  {
    id: "3",
    title: "API integration help",
    messages: [
      { id: "3a", content: "I need to integrate with the billing API.", role: "user" },
      { id: "3b", content: "I’ll outline the auth flow and rate limits.", role: "assistant" },
    ],
  },
];

export function OverviewPersonalView() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>(DUMMY_CHATS);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const selectedChat = selectedChatId
    ? chats.find((c) => c.id === selectedChatId)
    : null;

  const handleSend = (text: string) => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      content: text,
      role: "user",
    };
    if (selectedChatId) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === selectedChatId
            ? { ...c, messages: [...c.messages, newMsg] }
            : c
        )
      );
    } else {
      const newChat: Chat = {
        id: crypto.randomUUID(),
        title: "New chat",
        messages: [newMsg],
      };
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
    }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {sidebarOpen && (
        <OverviewAiChatsSidebar
          chats={chats.map(({ id, title }) => ({ id, title }))}
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
          onNewChat={() => setSelectedChatId(null)}
          onCollapse={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden">
        {!sidebarOpen && (
          <div className="flex items-center px-6 pt-4 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-[var(--muted)]"
              aria-label="Show chats sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          </div>
        )}

        {selectedChat ? (
          <>
            <header className="shrink-0 px-6 py-5 flex justify-center">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {selectedChat.title}
              </h2>
            </header>
            <OverviewChatArea messages={selectedChat.messages} />
            <div className="shrink-0 animate-[slideDown_0.4s_ease-out_both]">
              <OverviewComposer onSend={handleSend} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <OverviewTitle />
            <div className="flex items-center justify-center px-6 w-full shrink-0">
              <div className="mt-10 h-px w-full max-w-[920px] bg-[var(--border)]" />
            </div>
            <OverviewComposer onSend={handleSend} />
          </div>
        )}
      </div>
    </div>
  );
}

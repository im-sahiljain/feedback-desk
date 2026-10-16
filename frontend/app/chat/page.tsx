"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Bot,
  Send,
  Plus,
  MessageSquare,
  Search,
  Clock,
  ChevronRight,
  RefreshCw,
  Quote,
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";
import { FeedbackDetailModal } from "@/components/feedback/FeedbackDetailModal";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";

type Citation = {
  marker: string;
  feedback_id: string;
  issue_id: string;
  feedback?: string;
  snippet?: string;
};

type Message = {
  role: string;
  content: string;
  citations?: Citation[];
  created_at?: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

function ChatContent() {
  const { currentProduct } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialId = searchParams.get("id");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(initialId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState("");
  const [mobileShowConversation, setMobileShowConversation] = useState<boolean>(
    Boolean(initialId),
  );
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState<boolean>(false);

  const [activeModalFeedbackId, setActiveModalFeedbackId] = useState<
    string | null
  >(null);
  const [modalInitialFeedback, setModalInitialFeedback] = useState<{
    text?: string;
    sentiment?: any;
    impact?: any;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const productId = currentProduct?.id;

  const call = useCallback(
    async (path: string, method: "GET" | "POST" = "GET", body?: object) => {
      if (!productId) return null;
      const qs = path.includes("?") ? "&" : "?";
      const res = await authFetch(
        `/api/intelligence/${path}${qs}product_id=${encodeURIComponent(String(productId))}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json.message || json.error || "Request failed");
      return json;
    },
    [productId],
  );

  const loadConversations = useCallback(async () => {
    if (!productId) return;
    try {
      const data = await call("conversations");
      if (data?.conversations) {
        setConversations(data.conversations);
      }
    } catch (e: any) {
      console.warn("Could not load conversations:", e);
    }
  }, [call, productId]);

  const loadMessages = useCallback(
    async (convId: string) => {
      if (!productId) return;
      setLoadingChat(true);
      setError("");
      try {
        const data = await call(`conversations/${convId}`);
        setMessages(data?.messages || []);
      } catch (e: any) {
        setError(e.message || "Failed to load messages");
      } finally {
        setLoadingChat(false);
      }
    },
    [call, productId],
  );

  useEffect(() => {
    if (productId) {
      loadConversations();
    }
  }, [productId, loadConversations]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, busy]);

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
    setMobileShowConversation(true);
    router.replace(`/chat?id=${id}`);
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError("");
    setQuestion("");
    setMobileShowConversation(true);
    router.replace("/chat");
  };

  const ask = async (promptText?: string) => {
    const q = (promptText || question).trim();
    if (!q || busy || !productId) return;

    setBusy(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setMobileShowConversation(true);

    try {
      const res = await call("conversations", "POST", {
        question: q,
        conversation_id: activeConversationId || undefined,
      });

      if (
        res?.conversation_id &&
        res.conversation_id !== activeConversationId
      ) {
        setActiveConversationId(res.conversation_id);
        router.replace(`/chat?id=${res.conversation_id}`);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res?.answer || "No response generated.",
          citations: res?.citations || [],
        },
      ]);

      loadConversations();
    } catch (e: any) {
      setError(e.message || "AI response failed");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an issue retrieving the analysis. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const openFeedbackModal = (
    id: string,
    fallback?: { text?: string; sentiment?: any; impact?: any },
  ) => {
    setActiveModalFeedbackId(id);
    setModalInitialFeedback(fallback || null);
    setIsModalOpen(true);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const activeChat = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex w-full min-h-0 flex-1 overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg">
      {/* Left Sidebar: Conversations History */}
      <aside
        className={cn(
          "min-h-0 flex flex-col bg-muted/20 overflow-hidden transition-all duration-300 ease-in-out shrink-0",
          isHistoryCollapsed
            ? "w-0 min-w-0 opacity-0 border-r-0 pointer-events-none"
            : "w-full md:w-72 lg:w-80 md:border-r md:border-border/60 opacity-100",
          mobileShowConversation ? "hidden md:flex" : "flex",
        )}
      >
        <div className="w-full md:w-72 lg:w-80 flex flex-col flex-1 min-h-0">
          <div className="p-3.5 border-b border-border shrink-0 bg-card/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </span>
                <h2 className="text-xs font-bold text-foreground">
                  Chat History
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="icon"
                  variant={isSearchOpen ? "secondary" : "ghost"}
                  onClick={() => {
                    setIsSearchOpen((prev) => {
                      if (prev) {
                        setSearchFilter("");
                      }
                      return !prev;
                    });
                  }}
                  className={cn(
                    "h-8 w-8 text-muted-foreground hover:text-foreground transition-colors",
                    isSearchOpen && "bg-muted text-foreground",
                  )}
                  title={isSearchOpen ? "Close search" : "Search conversations"}
                  aria-label="Search conversations"
                >
                  {isSearchOpen ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startNewChat}
                  className="h-8 text-xs gap-1 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              </div>
            </div>

            <div
              style={{ gridTemplateRows: isSearchOpen ? "1fr" : "0fr" }}
              className={cn(
                "grid transition-all duration-200 ease-in-out overflow-hidden",
                isSearchOpen ? "opacity-100 pt-2.5" : "opacity-0 pt-0",
              )}
            >
              <div className="overflow-hidden min-h-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search conversations..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-8 text-xs pl-8 pr-7 bg-background focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:outline-none focus:ring-0 border-border/80 hover:border-border"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0 scrollbar-auto-hide">
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-3 text-muted-foreground space-y-1.5">
                <MessageSquare className="h-7 w-7 mx-auto opacity-30" />
                <p className="text-xs">No conversations yet.</p>
                <p className="text-[11px]">
                  Ask a question to start your first session.
                </p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No chats match "{searchFilter}"
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === activeConversationId;
                return (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 border ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-foreground font-medium shadow-xs"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {c.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Right Main Pane: Conversation Stream */}
      <section
        className={cn(
          "min-h-0 min-w-0 flex-1 w-full flex flex-col overflow-hidden bg-muted/35 dark:bg-zinc-950/50",
          mobileShowConversation ? "flex" : "hidden md:flex",
        )}
      >
        {/* Mobile Header with Back Button */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card/95 px-3 py-2 backdrop-blur-sm md:hidden shrink-0">
          <button
            type="button"
            onClick={() => setMobileShowConversation(false)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Chat History
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startNewChat}
            className="h-7 px-2.5 text-xs gap-1"
          >
            <Plus className="h-3 w-3" /> New
          </Button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex p-3.5 px-6 border-b border-border bg-card shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsHistoryCollapsed((prev) => !prev)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              title={
                isHistoryCollapsed
                  ? "Open chat history"
                  : "Collapse chat history"
              }
              aria-label={
                isHistoryCollapsed
                  ? "Open chat history"
                  : "Collapse chat history"
              }
            >
              {isHistoryCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {activeChat ? activeChat.title : "AI Intelligence"}
              </h3>
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 min-h-0">
          {!productId ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Bot className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-sm font-medium">
                Please select a product from the sidebar to chat.
              </p>
            </div>
          ) : loadingChat ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span>Loading conversation history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-4">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  How can I help you analyze{" "}
                  {currentProduct?.name || "feedback"} today?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask deep-dive questions about recurring bugs, customer
                  sentiment shifts, or feature requests. Responses cite verified
                  evidence quotes.
                </p>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
                <button
                  onClick={() =>
                    ask("What are the top 3 most common customer complaints?")
                  }
                  className="p-3 text-left rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 text-xs text-foreground transition-all space-y-1 shadow-xs"
                >
                  <p className="font-semibold text-primary">Top Complaints</p>
                  <p className="text-[11px] text-muted-foreground">
                    Identify high-frequency customer pain points
                  </p>
                </button>

                <button
                  onClick={() =>
                    ask(
                      "Which features are most frequently requested in feedback?",
                    )
                  }
                  className="p-3 text-left rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 text-xs text-foreground transition-all space-y-1 shadow-xs"
                >
                  <p className="font-semibold text-primary">Feature Requests</p>
                  <p className="text-[11px] text-muted-foreground">
                    Uncover emerging user needs & wishlist items
                  </p>
                </button>

                <button
                  onClick={() =>
                    ask(
                      "Summarize negative sentiment spikes and their root causes",
                    )
                  }
                  className="p-3 text-left rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 text-xs text-foreground transition-all space-y-1 shadow-xs"
                >
                  <p className="font-semibold text-primary">Sentiment Spikes</p>
                  <p className="text-[11px] text-muted-foreground">
                    Find out what caused negative reactions
                  </p>
                </button>

                <button
                  onClick={() =>
                    ask(
                      "Are there any critical blockers or security/stability issues?",
                    )
                  }
                  className="p-3 text-left rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 text-xs text-foreground transition-all space-y-1 shadow-xs"
                >
                  <p className="font-semibold text-primary">
                    Critical Blockers
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Search for high-severity reliability defects
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "w-full mx-auto space-y-6 transition-all duration-300",
                isHistoryCollapsed ? "max-w-5xl" : "max-w-4xl",
              )}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-3 text-sm ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role !== "user" && (
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
                        : "bg-card border border-border/80 text-foreground rounded-tl-xs shadow-xs"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {/* Citations section */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                          <Quote className="h-3 w-3 text-primary" />
                          <span>
                            Supporting Evidence & Quotes ({m.citations.length}):
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {m.citations.map((c, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() =>
                                openFeedbackModal(c.feedback_id, {
                                  text: c.feedback || c.snippet,
                                })
                              }
                              className="text-left p-2.5 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted hover:border-primary/50 text-foreground transition-all text-xs flex items-start gap-2 group"
                            >
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1 font-bold text-primary shrink-0"
                              >
                                {c.marker}
                              </Badge>
                              <p className="line-clamp-2 italic text-[11px] text-muted-foreground group-hover:text-foreground">
                                “
                                {c.snippet ||
                                  c.feedback ||
                                  `Feedback ${c.feedback_id.slice(0, 8)}`}
                                ”
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground p-3 rounded-xl bg-muted/30 w-fit">
                  <Bot className="h-4 w-4 animate-spin text-primary" />
                  <span>
                    Searching feedback database and synthesizing response...
                  </span>
                </div>
              )}
              {error && (
                <div className="p-3 rounded-xl border border-destructive/40 bg-destructive/10 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-4 border-t border-border bg-card shrink-0">
          <div
            className={cn(
              "w-full mx-auto space-y-2 transition-all duration-300",
              isHistoryCollapsed ? "max-w-5xl" : "max-w-4xl",
            )}
          >
            <div className="flex gap-2">
              <Input
                placeholder="Ask about feedback, recurring issues, or sentiment..."
                value={question}
                maxLength={500}
                disabled={busy || !productId}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask();
                  }
                }}
                className="text-xs sm:text-sm h-11 bg-background"
              />
              <Button
                disabled={busy || question.trim().length < 3 || !productId}
                onClick={() => ask()}
                className="h-11 px-5 text-xs sm:text-sm gap-2 shrink-0"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Ask</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              AI analysis is grounded in customer feedback embeddings. Click any
              evidence quote to view full customer details.
            </p>
          </div>
        </div>
      </section>

      {/* Dynamic Single-Feedback Detail Modal */}
      <FeedbackDetailModal
        feedbackId={activeModalFeedbackId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialFeedback={modalInitialFeedback}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <AppLayout
      title="AI Intelligence"
      description="Interactive feedback analysis and evidence exploration grounded in customer feedback"
      fill
    >
      <Suspense
        fallback={
          <div className="p-8 text-xs text-muted-foreground">
            Loading chat...
          </div>
        }
      >
        <ChatContent />
      </Suspense>
    </AppLayout>
  );
}

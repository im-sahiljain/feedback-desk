"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Bot,
  X,
  Send,
  Maximize2,
  RotateCcw,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { FeedbackDetailModal } from "@/components/feedback/FeedbackDetailModal";
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
};

type ConversationSummary = {
  id: string;
  title: string;
  created_at?: string;
};

export function AiChatButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentProduct } = useApp();
  const productId = currentProduct?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeModalFeedbackId, setActiveModalFeedbackId] = useState<string | null>(null);
  const [modalInitialFeedback, setModalInitialFeedback] = useState<{
    text?: string;
    sentiment?: any;
    impact?: any;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (!res.ok) throw new Error(json.message || json.error || "Request failed");
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
    } catch {
      // ignore
    }
  }, [call, productId]);

  useEffect(() => {
    if (productId && isOpen) {
      loadConversations();
    }
  }, [productId, isOpen, loadConversations]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Don't render floating button if already on dedicated /chat page
  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    return null;
  }

  const openChat = async (id: string) => {
    try {
      setBusy(true);
      setError("");
      const res = await call(`conversations/${id}`);
      setConversationId(id);
      setMessages(res?.messages || []);
    } catch (e: any) {
      setError(e.message || "Failed to load conversation");
    } finally {
      setBusy(false);
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setError("");
    setQuestion("");
    if (inputRef.current) inputRef.current.focus();
  };

  const ask = async (customPrompt?: string) => {
    const q = (customPrompt || question).trim();
    if (!q || busy || !productId) return;

    setBusy(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");

    try {
      const res = await call("conversations", "POST", {
        question: q,
        conversation_id: conversationId || undefined,
      });

      if (res?.conversation_id) {
        setConversationId(res.conversation_id);
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
          content: "Sorry, I encountered an issue retrieving the analysis. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const openFeedbackModal = (id: string, fallback?: { text?: string; sentiment?: any; impact?: any }) => {
    setActiveModalFeedbackId(id);
    setModalInitialFeedback(fallback || null);
    setIsModalOpen(true);
  };

  const goToFullChat = () => {
    setIsOpen(false);
    if (conversationId) {
      router.push(`/chat?id=${conversationId}`);
    } else {
      router.push("/chat");
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <div className="relative">
          <Button
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}
            className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center p-0 border-2 border-background cursor-pointer ${
              isOpen
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 rotate-90"
                : "bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-105"
            }`}
          >
            {isOpen ? (
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>

          {/* Online active status indicator cleanly anchored to button outer edge */}
          {!isOpen && (
            <span className="absolute top-0 right-0 flex h-3 w-3 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background shadow-sm"></span>
            </span>
          )}
        </div>
      </div>

      {/* Floating Expandable Chat Window */}
      {isOpen && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden bg-card border border-border shadow-2xl rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-200
            inset-x-3 bottom-[4.75rem] max-h-[calc(100dvh-5.75rem)] h-[520px]
            sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[400px] sm:max-w-[calc(100vw-3rem)] sm:h-[min(580px,calc(100vh-8.5rem))]"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-border bg-muted/40 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-foreground">AI Intelligence</h3>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Ready" />
                </div>
                <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                  {currentProduct?.name || "Global Workspace"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={startNewChat}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="New Chat"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToFullChat}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Open full-screen chat page"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto scrollbar-thin text-xs">
            {!productId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                <Bot className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs">Please select a product from the sidebar to chat with AI.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-2 space-y-3">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-xs text-foreground">
                    How can I help you analyze {currentProduct?.name || "feedback"} today?
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Ask deep-dive questions about recurring bugs, customer sentiment shifts, or feature requests. Responses cite verified evidence quotes.
                  </p>
                </div>

                {/* Starter Prompt Cards matching /chat page */}
                <div className="grid grid-cols-2 gap-2 w-full pt-1 text-left">
                  <button
                    onClick={() =>
                      ask("What are the top 3 most common customer complaints?")
                    }
                    className="p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 text-foreground transition-all shadow-2xs space-y-0.5"
                  >
                    <p className="font-semibold text-xs text-primary">Top Complaints</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                      Identify high-frequency customer pain points
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      ask(
                        "Which features are most frequently requested in feedback?",
                      )
                    }
                    className="p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 text-foreground transition-all shadow-2xs space-y-0.5"
                  >
                    <p className="font-semibold text-xs text-primary">Feature Requests</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                      Uncover emerging user needs & wishlist items
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      ask(
                        "Summarize negative sentiment spikes and their root causes",
                      )
                    }
                    className="p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 text-foreground transition-all shadow-2xs space-y-0.5"
                  >
                    <p className="font-semibold text-xs text-primary">Sentiment Spikes</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                      Find out what caused negative reactions
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      ask(
                        "Are there any critical blockers or security/stability issues?",
                      )
                    }
                    className="p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 text-foreground transition-all shadow-2xs space-y-0.5"
                  >
                    <p className="font-semibold text-xs text-primary">Critical Blockers</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                      Search for high-severity reliability defects
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex flex-col space-y-1 ${
                      m.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground px-1">
                      {m.role === "user" ? "You" : "AI Analyst"}
                    </span>
                    <div
                      className={`rounded-xl p-3 text-xs leading-relaxed max-w-[90%] shadow-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : "bg-muted/60 border border-border/80 text-foreground rounded-bl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>

                      {/* Citations */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground block">
                            Verified Quotes:
                          </span>
                          <div className="flex flex-col gap-1">
                            {m.citations.map((c, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() =>
                                  openFeedbackModal(c.feedback_id, {
                                    text: c.feedback || c.snippet,
                                  })
                                }
                                className="text-[11px] text-left p-1.5 rounded bg-background/80 hover:bg-background border border-border/60 hover:border-primary/50 text-foreground transition-all flex items-start gap-1.5 group"
                              >
                                <span className="font-bold text-primary shrink-0 text-[10px]">
                                  {c.marker}
                                </span>
                                <span className="line-clamp-2 italic text-muted-foreground group-hover:text-foreground">
                                  “{c.snippet || c.feedback || `Feedback ${c.feedback_id.slice(0, 8)}`}”
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                    <Bot className="h-3.5 w-3.5 animate-pulse text-primary" />
                    <span>Analyzing feedback & issues...</span>
                  </div>
                )}
                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="p-3 border-t border-border bg-muted/20 shrink-0 space-y-1.5">
            <div className="flex gap-1.5">
              <Input
                ref={inputRef}
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
                className="text-xs h-9 bg-background"
              />
              <Button
                size="sm"
                disabled={busy || question.trim().length < 3 || !productId}
                onClick={() => ask()}
                className="h-9 px-3 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
              <span>Grounded in actual feedback</span>
              <button
                onClick={goToFullChat}
                className="hover:underline text-primary"
              >
                View full history →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Feedback Detail Modal for Citations */}
      <FeedbackDetailModal
        feedbackId={activeModalFeedbackId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialFeedback={modalInitialFeedback}
      />
    </>
  );
}

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Building2,
  Send,
  Loader2,
  Inbox,
  ArrowLeft,
  Search,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/SessionProvider";

interface Conversation {
  assignment_id: string;
  lead_id: string;
  assignment_status: string;
  company_name: string;
  project_description: string;
  agency_id: string;
  agency_name: string;
  agency_logo: string | null;
  agency_slug: string | null;
  message_count: number;
  last_message: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  lead_assignment_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

function formatTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const statusLabel: Record<string, { text: string; color: string }> = {
  claimed: { text: "Interested", color: "text-blue-600 bg-blue-50" },
  responded: { text: "Proposal Sent", color: "text-green-600 bg-green-50" },
  won: { text: "Selected", color: "text-emerald-600 bg-emerald-50" },
};

function ClientMessagesContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchConversations();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/client/messages");
      if (res.ok) {
        const json = await res.json();
        const convos: Conversation[] = json.data ?? [];
        setConversations(convos);

        const targetId = searchParams.get("assignmentId");
        if (targetId) {
          const match = convos.find((c) => c.assignment_id === targetId);
          if (match) selectConversation(match);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function selectConversation(convo: Conversation) {
    setActiveConvo(convo);
    setMsgLoading(true);
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const res = await fetch(`/api/leads/${convo.lead_id}/messages?assignmentId=${convo.assignment_id}`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.data ?? []);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch { /* ignore */ }
    finally { setMsgLoading(false); }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/leads/${convo.lead_id}/messages?assignmentId=${convo.assignment_id}`);
        if (res.ok) {
          const json = await res.json();
          setMessages(json.data ?? []);
        }
      } catch { /* ignore */ }
    }, 10000);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${activeConvo.lead_id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: activeConvo.assignment_id,
          content: newMessage.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setMessages((prev) => [...prev, json.data]);
        setNewMessage("");
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  }

  const filteredConversations = conversations.filter(
    (c) => !searchTerm || c.agency_name.toLowerCase().includes(searchTerm.toLowerCase()) || c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-gray-500">Chat with agencies about your projects.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm" style={{ height: "calc(100vh - 220px)", minHeight: 520 }}>
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={`w-full sm:w-80 lg:w-96 border-r border-gray-100 flex flex-col ${activeConvo ? "hidden sm:flex" : "flex"}`}>
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Inbox className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">No conversations yet</p>
                  <p className="text-xs text-gray-400">Agencies will appear here once they claim your project.</p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = activeConvo?.assignment_id === c.assignment_id;
                  const badge = statusLabel[c.assignment_status];
                  return (
                    <button
                      key={c.assignment_id}
                      onClick={() => selectConversation(c)}
                      className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-all ${
                        isActive
                          ? "bg-brand/5 border-l-2 border-l-brand"
                          : "hover:bg-gray-50/80 border-l-2 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isActive ? "bg-brand/10" : "bg-gray-100"
                        }`}>
                          {c.agency_logo ? (
                            <img src={c.agency_logo} alt="" className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <Building2 className={`w-5 h-5 ${isActive ? "text-brand" : "text-gray-400"}`} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className={`text-sm font-semibold truncate ${isActive ? "text-brand" : "text-navy"}`}>{c.agency_name}</p>
                            {c.last_message_at && (
                              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{formatTime(c.last_message_at as string)}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate mb-1">{c.company_name}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 truncate">
                              {c.last_message || "Start a conversation..."}
                            </p>
                            {badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${badge.color}`}>
                                {badge.text}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col bg-gray-50/30 ${!activeConvo ? "hidden sm:flex" : "flex"}`}>
            {activeConvo ? (
              <>
                {/* Chat Header */}
                <div className="px-5 py-3.5 border-b border-gray-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setActiveConvo(null); if (pollRef.current) clearInterval(pollRef.current); }}
                      className="sm:hidden text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center">
                      {activeConvo.agency_logo ? (
                        <img src={activeConvo.agency_logo} alt="" className="w-9 h-9 rounded-xl object-cover" />
                      ) : (
                        <Building2 className="w-4 h-4 text-brand" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{activeConvo.agency_name}</p>
                      <p className="text-xs text-gray-400">{activeConvo.company_name}</p>
                    </div>
                  </div>
                  {statusLabel[activeConvo.assignment_status] && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusLabel[activeConvo.assignment_status].color}`}>
                      {statusLabel[activeConvo.assignment_status].text}
                    </span>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {msgLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 text-brand animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="w-7 h-7 text-brand" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Start the conversation</p>
                      <p className="text-xs text-gray-400">Send a message to {activeConvo.agency_name} about your project.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                            isMe
                              ? "bg-brand text-white rounded-br-lg"
                              : "bg-white text-navy rounded-bl-lg border border-gray-100"
                          }`}>
                            {!isMe && (
                              <p className="text-[11px] font-semibold mb-1 text-brand">{msg.sender_name}</p>
                            )}
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1.5 ${isMe ? "justify-end" : ""}`}>
                              <p className={`text-[10px] ${isMe ? "text-white/50" : "text-gray-400"}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              {isMe && <CheckCircle className="w-3 h-3 text-white/40" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Compose */}
                <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 bg-white">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy placeholder:text-gray-400 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="p-3 bg-brand text-white rounded-xl hover:bg-brand-dark disabled:opacity-40 transition-all shadow-sm hover:shadow-md disabled:shadow-none"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Select a conversation</p>
                  <p className="text-xs text-gray-400">Choose an agency to start chatting.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientMessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    }>
      <ClientMessagesContent />
    </Suspense>
  );
}

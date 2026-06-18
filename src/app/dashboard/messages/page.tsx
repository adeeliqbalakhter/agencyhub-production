"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Send,
  Loader2,
  Inbox,
  Building2,
  User,
  ArrowLeft,
} from "lucide-react";

interface LeadConversation {
  leadId: string;
  assignmentId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  budget: string;
  timeline: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  description: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_read: number;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MessagesPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>}>
      <MessagesPage />
    </Suspense>
  );
}

function MessagesPage() {
  const searchParams = useSearchParams();
  const preselectedLeadId = searchParams.get("leadId");

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<LeadConversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<LeadConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user info and conversations
  useEffect(() => {
    async function init() {
      try {
        // Get current user
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meJson = await meRes.json();
          setCurrentUserId(meJson.data?.user?.id || null);
        }

        // Get agency
        const agencyRes = await fetch("/api/agencies/mine");
        if (agencyRes.ok) {
          const agencyJson = await agencyRes.json();
          const agency = agencyJson.data?.agency;
          if (agency?.id) {
            setAgencyId(agency.id);
          }
        }

        // Fetch leads that have assignments (conversations)
        const leadsRes = await fetch("/api/leads?limit=50");
        if (!leadsRes.ok) {
          setLoading(false);
          return;
        }
        const leadsJson = await leadsRes.json();
        const apiLeads = leadsJson.data ?? [];

        const convos: LeadConversation[] = [];
        for (const lead of apiLeads) {
          // For each lead, fetch assignments
          try {
            const detailRes = await fetch(`/api/leads/${lead.id}`);
            if (!detailRes.ok) continue;
            const detailJson = await detailRes.json();
            const assignments = detailJson.data?.assignments ?? [];

            for (const assignment of assignments as Array<Record<string, unknown>>) {
              convos.push({
                leadId: lead.id as string,
                assignmentId: assignment.id as string,
                companyName: (lead.company_name as string) || "Unknown",
                contactName: (lead.contact_name as string) || "Unknown",
                contactEmail: (lead.contact_email as string) || "",
                budget: (lead.budget as string) || "",
                timeline: (lead.timeline as string) || "",
                status: (assignment.status as string) || "sent",
                lastMessage: "",
                lastMessageAt: (assignment.created_at as string) || (lead.created_at as string) || "",
                unreadCount: 0,
                description: (lead.project_description as string) || "",
              });
            }

            // If no assignments, still show the lead as a conversation
            if ((assignments as unknown[]).length === 0) {
              convos.push({
                leadId: lead.id as string,
                assignmentId: "",
                companyName: (lead.company_name as string) || "Unknown",
                contactName: (lead.contact_name as string) || "Unknown",
                contactEmail: (lead.contact_email as string) || "",
                budget: (lead.budget as string) || "",
                timeline: (lead.timeline as string) || "",
                status: (lead.status as string) || "new",
                lastMessage: "",
                lastMessageAt: (lead.created_at as string) || "",
                unreadCount: 0,
                description: (lead.project_description as string) || "",
              });
            }
          } catch {
            convos.push({
              leadId: lead.id as string,
              assignmentId: "",
              companyName: (lead.company_name as string) || "Unknown",
              contactName: (lead.contact_name as string) || "Unknown",
              contactEmail: (lead.contact_email as string) || "",
              budget: (lead.budget as string) || "",
              timeline: (lead.timeline as string) || "",
              status: (lead.status as string) || "new",
              lastMessage: "",
              lastMessageAt: (lead.created_at as string) || "",
              unreadCount: 0,
              description: (lead.project_description as string) || "",
            });
          }
        }

        // Sort by most recent
        convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setConversations(convos);

        // Auto-select if leadId is in URL
        if (preselectedLeadId) {
          const match = convos.find((c) => c.leadId === preselectedLeadId);
          if (match) {
            setSelectedConvo(match);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [preselectedLeadId]);

  const fetchMessages = useCallback(async (convo: LeadConversation) => {
    if (!convo.assignmentId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/leads/${convo.leadId}/messages?assignmentId=${convo.assignmentId}`
      );
      if (res.ok) {
        const json = await res.json();
        setMessages((json.data ?? []) as Message[]);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConvo) {
      fetchMessages(selectedConvo);
    } else {
      setMessages([]);
    }
  }, [selectedConvo, fetchMessages]);

  // Poll for new messages every 15s when a conversation is open
  useEffect(() => {
    if (!selectedConvo?.assignmentId) return;
    const interval = setInterval(() => {
      fetchMessages(selectedConvo);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedConvo, fetchMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConvo?.assignmentId || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/leads/${selectedConvo.leadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedConvo.assignmentId,
          content: newMessage.trim(),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const msg = json.data as Message;
        if (msg) {
          setMessages((prev) => [...prev, msg]);
        }
        setNewMessage("");
        textareaRef.current?.focus();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const dateStr = new Date(msg.created_at).toDateString();
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      groupedMessages.push({ date: msg.created_at, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Messages</h1>
        <p className="mt-1 text-gray-500">
          Communicate with leads and clients.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
        <div className="flex h-full">
          {/* Conversation List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col ${
              selectedConvo ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-navy text-sm">Conversations</h2>
              <p className="text-xs text-gray-400 mt-0.5">{conversations.length} leads</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <Inbox className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500 text-center">No leads yet</p>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    Leads from quote requests will appear here
                  </p>
                </div>
              ) : (
                conversations.map((convo) => {
                  const isSelected = selectedConvo?.leadId === convo.leadId && selectedConvo?.assignmentId === convo.assignmentId;
                  return (
                    <button
                      key={`${convo.leadId}-${convo.assignmentId}`}
                      onClick={() => setSelectedConvo(convo)}
                      className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        isSelected ? "bg-blue-50/60 border-l-2 border-l-brand" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-navy truncate">
                              {convo.companyName}
                            </p>
                            <span className="text-[11px] text-gray-400 flex-shrink-0">
                              {convo.lastMessageAt ? formatTime(convo.lastMessageAt) : ""}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {convo.contactName}{convo.contactEmail ? ` · ${convo.contactEmail}` : ""}
                          </p>
                          {convo.description && (
                            <p className="text-xs text-gray-400 truncate mt-1 leading-snug">
                              {convo.description.slice(0, 80)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              convo.status === "new" ? "bg-blue-50 text-brand" :
                              convo.status === "responded" ? "bg-green-50 text-green-700" :
                              convo.status === "won" ? "bg-emerald-50 text-emerald-700" :
                              "bg-gray-100 text-gray-500"
                            }`}>
                              {convo.status}
                            </span>
                            {convo.budget && (
                              <span className="text-[10px] text-gray-400">{convo.budget}</span>
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

          {/* Message Thread */}
          <div
            className={`flex-1 flex flex-col ${
              selectedConvo ? "flex" : "hidden md:flex"
            }`}
          >
            {selectedConvo ? (
              <>
                {/* Thread Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConvo(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-navy truncate">
                      {selectedConvo.companyName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {selectedConvo.contactName}
                      {selectedConvo.budget ? ` · ${selectedConvo.budget}` : ""}
                      {selectedConvo.timeline ? ` · ${selectedConvo.timeline}` : ""}
                    </p>
                  </div>
                </div>

                {/* Project brief */}
                {selectedConvo.description && (
                  <div className="px-4 py-3 bg-blue-50/50 border-b border-gray-100">
                    <p className="text-xs font-medium text-navy mb-1">Project Brief</p>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                      {selectedConvo.description}
                    </p>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 text-brand animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-sm text-gray-500">No messages yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {selectedConvo.assignmentId
                          ? "Send the first message to start the conversation"
                          : "This lead has no assignment yet — messages are available after assignment"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {groupedMessages.map((group) => (
                        <div key={group.date}>
                          {/* Date separator */}
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[11px] text-gray-400 font-medium">
                              {formatMessageDate(group.date)}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>

                          {group.messages.map((msg) => {
                            const isOwn = msg.sender_id === currentUserId;
                            return (
                              <div
                                key={msg.id}
                                className={`flex mb-3 ${isOwn ? "justify-end" : "justify-start"}`}
                              >
                                <div className={`flex gap-2 max-w-[75%] ${isOwn ? "flex-row-reverse" : ""}`}>
                                  {!isOwn && (
                                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                      <User className="w-3.5 h-3.5 text-gray-500" />
                                    </div>
                                  )}
                                  <div>
                                    {!isOwn && (
                                      <p className="text-[11px] text-gray-500 mb-1 ml-1">
                                        {msg.sender_name || "Unknown"}
                                      </p>
                                    )}
                                    <div
                                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                        isOwn
                                          ? "bg-brand text-white rounded-br-md"
                                          : "bg-gray-100 text-gray-800 rounded-bl-md"
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    </div>
                                    <p className={`text-[10px] text-gray-400 mt-1 ${isOwn ? "text-right mr-1" : "ml-1"}`}>
                                      {formatMessageTime(msg.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Compose */}
                {selectedConvo.assignmentId && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-white">
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors resize-none max-h-32"
                        style={{ minHeight: "42px" }}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="flex items-center justify-center w-10 h-10 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50 flex-shrink-0"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Empty state when no conversation selected */
              <div className="flex-1 flex flex-col items-center justify-center">
                <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
                <h3 className="font-semibold text-navy text-lg">Select a conversation</h3>
                <p className="text-sm text-gray-500 mt-1 text-center max-w-xs">
                  Choose a lead from the left panel to view and send messages
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

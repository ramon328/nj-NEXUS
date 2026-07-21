import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/hooks/useI18n";
import { friendlyError } from "@/utils/edgeFunctionErrors";
import {
  fetchConversations as apiFetchConversations,
  createConversation as apiCreateConversation,
  addMessage as apiAddMessage,
  fetchMessages as apiFetchMessages,
  renameConversation as apiRenameConversation,
  deleteConversation as apiDeleteConversation,
  AIConversation,
} from "@/services/aiChatService";

import type { GaiaBlock, PendingAction } from "@/types/gaia";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  blocks?: GaiaBlock[];
  pending_action?: PendingAction;
  toolStatus?: string;
}

interface AIChatContextType {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;

  // Conversation persistence
  currentConversationId: string | null;
  conversations: AIConversation[];
  conversationsLoading: boolean;

  toggleChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  /**
   * Inyecta un mensaje del asistente generado localmente (sin llamar al LLM).
   * Usado para vistas ricas instantáneas, ej: detalle de vehículo al hacer click
   * en una card. No persiste en DB — es una vista viva, no historial.
   */
  addLocalAssistantMessage: (content: string, blocks?: GaiaBlock[]) => void;
  clearChat: () => void;

  // Conversation management
  loadConversation: (id: string) => Promise<void>;
  newConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export const AIChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  const { user, userData, clientId } = useAuth();
  const { tCommon, language } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Autoscroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations on mount when user is available
  useEffect(() => {
    if (user) {
      refreshConversations();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const data = await apiFetchConversations();
      setConversations(data);
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setCurrentConversationId(id);
    setMessages([]);
    setError(null);
    setIsLoading(true);

    try {
      const dbMessages = await apiFetchMessages(id);
      const mapped: ChatMessage[] = dbMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(mapped);
    } catch (err) {
      console.error("Error loading conversation:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const newConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  const deleteConversationHandler = useCallback(
    async (id: string) => {
      const success = await apiDeleteConversation(id);
      if (success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    },
    [currentConversationId]
  );

  const renameConversationHandler = useCallback(
    async (id: string, title: string) => {
      const updated = await apiRenameConversation(id, title);
      if (updated) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c))
        );
      }
    },
    []
  );

  const toggleChat = useCallback(() => setIsOpen((p) => !p), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const cid =
        clientId ||
        userData?.client_id ||
        (userData as any)?.clientId ||
        (user as any)?.client_id;

      if (!cid) {
        console.warn("No clientId found in AuthContext");
        setError("Falta clientId para consultar tus datos.");
        return;
      }

      // Try to create conversation in DB (graceful — works without tables)
      let convId = currentConversationId;
      if (!convId) {
        const title = content.trim().slice(0, 60);
        try {
          const conv = await apiCreateConversation(
            cid,
            user?.id || "",
            title
          );
          if (conv) {
            convId = conv.id;
            setCurrentConversationId(convId);
            setConversations((prev) => [conv, ...prev]);
          }
        } catch (e) {
          console.warn("DB persistence unavailable, continuing without it:", e);
        }
      }

      // Optimistic user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        // Save user message to DB (fire-and-forget if convId exists)
        if (convId) {
          apiAddMessage(convId, "user", content.trim()).then((saved) => {
            if (saved) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === userMsg.id ? { ...m, id: saved.id } : m
                )
              );
            }
          }).catch(() => {});
        }

        // Call AI backend (Mastra server or legacy edge function)
        const mastraUrl = import.meta.env.VITE_MASTRA_URL;
        let respText: string;
        let responseBlocks: GaiaBlock[] | undefined;
        let responsePendingAction: PendingAction | undefined;

        if (mastraUrl) {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          if (!token) throw new Error("No auth token available");

          const res = await fetch(`${mastraUrl}/api/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              messages: [
                ...messages.map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
                { role: "user", content },
              ],
              language,
              // Cliente efectivo (para superadmin = la automotora seleccionada vía
              // impersonation). El server solo lo respeta si el usuario es superadmin;
              // un usuario normal queda atado a su client_id pase lo que pase.
              clientId: cid,
            }),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `Server error: ${res.status}`);
          }

          const data = await res.json();
          console.log('[GAIA] Server response:', { hasBlocks: !!data?.blocks, blocksCount: data?.blocks?.length, hasPending: !!data?.pending_action, keys: Object.keys(data || {}) });
          if (data?.blocks) console.log('[GAIA] Blocks:', JSON.stringify(data.blocks).slice(0, 500));
          respText =
            typeof data?.response === "string"
              ? data.response
              : JSON.stringify(data?.response, null, 2);
          responseBlocks = data?.blocks;
          responsePendingAction = data?.pending_action;
        } else {
          const { data, error: fnError } = await supabase.functions.invoke(
            "ai-chat",
            {
              body: {
                clientId: cid,
                language,
                messages: [
                  ...messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                  })),
                  { role: "user", content },
                ],
              },
            }
          );

          if (fnError) throw fnError;

          respText =
            typeof data?.response === "string"
              ? data.response
              : JSON.stringify(data?.response, null, 2);
        }

        const assistantContent =
          respText || tCommon("aiAssistant.messages.fallback");

        // Save assistant message to DB (fire-and-forget)
        let savedAssistantId = `assistant-${Date.now()}`;
        if (convId) {
          apiAddMessage(convId, "assistant", assistantContent)
            .then((saved) => {
              if (saved) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === savedAssistantId ? { ...m, id: saved.id } : m
                  )
                );
              }
            })
            .catch(() => {});
        }

        const assistantMsg: ChatMessage = {
          id: savedAssistantId,
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
          blocks: responseBlocks,
          pending_action: responsePendingAction,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Update conversations list to reflect the updated_at change
        if (convId) {
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.id === convId
                ? { ...c, updated_at: new Date().toISOString() }
                : c
            );
            return updated.sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
            );
          });
        }
      } catch (err: any) {
        console.error("Error sending message:", err);
        const msg = friendlyError(err, "ai-chat");
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `Error: ${msg}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      clientId,
      user,
      userData,
      messages,
      language,
      isLoading,
      tCommon,
      currentConversationId,
    ]
  );

  const addLocalAssistantMessage = useCallback(
    (content: string, blocks?: GaiaBlock[]) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: "assistant",
          content,
          timestamp: new Date(),
          blocks,
        },
      ]);
    },
    []
  );

  const clearChat = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  return (
    <AIChatContext.Provider
      value={{
        isOpen,
        messages,
        isLoading,
        error,
        messagesEndRef,
        currentConversationId,
        conversations,
        conversationsLoading,
        toggleChat,
        closeChat,
        sendMessage,
        addLocalAssistantMessage,
        clearChat,
        loadConversation,
        newConversation,
        deleteConversation: deleteConversationHandler,
        renameConversation: renameConversationHandler,
        refreshConversations,
      }}
    >
      {children}
    </AIChatContext.Provider>
  );
};

export const useAIChatContext = () => {
  const ctx = useContext(AIChatContext);
  if (!ctx)
    throw new Error("useAIChatContext must be used within AIChatProvider");
  return ctx;
};

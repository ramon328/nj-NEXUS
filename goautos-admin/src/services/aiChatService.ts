import { supabase } from "@/integrations/supabase/client";

export interface AIConversation {
  id: string;
  client_id: number;
  user_auth_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const fetchConversations = async (): Promise<AIConversation[]> => {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
  return (data as AIConversation[]) || [];
};

export const createConversation = async (
  clientId: number,
  userAuthId: string,
  title: string
): Promise<AIConversation | null> => {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ client_id: clientId, user_auth_id: userAuthId, title })
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    return null;
  }
  return data as AIConversation;
};

export const addMessage = async (
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<AIMessage | null> => {
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single();

  if (error) {
    console.error("Error adding message:", error);
    return null;
  }
  return data as AIMessage;
};

export const fetchMessages = async (
  conversationId: string
): Promise<AIMessage[]> => {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
  return (data as AIMessage[]) || [];
};

export const renameConversation = async (
  id: string,
  title: string
): Promise<AIConversation | null> => {
  const { data, error } = await supabase
    .from("ai_conversations")
    .update({ title })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error renaming conversation:", error);
    return null;
  }
  return data as AIConversation;
};

export const deleteConversation = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting conversation:", error);
    return false;
  }
  return true;
};

import { api } from "./client";
import type { ChatMessage, ChatResponse, Conversation } from "../types";

export const chatApi = {
  async preview(content: string): Promise<ChatResponse> {
    const res = await api.post<ChatResponse>("/api/v1/chat/preview", { content });
    return res.data;
  },

  async createConversation(channel: "admin_preview" | "widget" = "admin_preview"): Promise<Conversation> {
    const res = await api.post<Conversation>("/api/v1/chat/conversations", { channel });
    return res.data;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const res = await api.get<ChatMessage[]>(`/api/v1/chat/conversations/${conversationId}/messages`);
    return res.data;
  },

  async sendMessage(conversationId: string, content: string): Promise<ChatResponse> {
    const res = await api.post<ChatResponse>(`/api/v1/chat/conversations/${conversationId}/messages`, {
      content,
    });
    return res.data;
  },
};

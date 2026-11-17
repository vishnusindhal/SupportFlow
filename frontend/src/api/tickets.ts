import { api } from "./client";
import type {
  Ticket,
  TicketComment,
  TicketCreatePayload,
  TicketUpdatePayload,
} from "../types";

export interface TicketFilterParams {
  status?: string;
  priority?: string;
  team?: string;
  assigned_to_user_id?: string;
}

export const ticketsApi = {
  async getTickets(params?: TicketFilterParams): Promise<Ticket[]> {
    const res = await api.get<Ticket[]>("/api/v1/tickets", { params });
    return res.data;
  },

  async getTicket(id: string): Promise<Ticket> {
    const res = await api.get<Ticket>(`/api/v1/tickets/${id}`);
    return res.data;
  },

  async createTicket(payload: TicketCreatePayload): Promise<Ticket> {
    const res = await api.post<Ticket>("/api/v1/tickets", payload);
    return res.data;
  },

  async updateTicket(id: string, payload: TicketUpdatePayload): Promise<Ticket> {
    const res = await api.patch<Ticket>(`/api/v1/tickets/${id}`, payload);
    return res.data;
  },

  async addComment(ticketId: string, content: string, isInternal: boolean = false): Promise<TicketComment> {
    const res = await api.post<TicketComment>(`/api/v1/tickets/${ticketId}/comments`, {
      content,
      is_internal: isInternal,
    });
    return res.data;
  },

  async getComments(ticketId: string): Promise<TicketComment[]> {
    const res = await api.get<TicketComment[]>(`/api/v1/tickets/${ticketId}/comments`);
    return res.data;
  },
};

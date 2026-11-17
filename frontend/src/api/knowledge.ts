import { api } from "./client";
import type { CompanyDocument, RetrievedChunk } from "../types";

export const knowledgeApi = {
  async getDocuments(): Promise<CompanyDocument[]> {
    const res = await api.get<CompanyDocument[]>("/api/v1/knowledge/documents");
    return res.data;
  },

  async getDocument(id: string): Promise<CompanyDocument> {
    const res = await api.get<CompanyDocument>(`/api/v1/knowledge/documents/${id}`);
    return res.data;
  },

  async uploadDocument(file: File): Promise<CompanyDocument> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<CompanyDocument>("/api/v1/knowledge/documents", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  async retryDocument(id: string): Promise<CompanyDocument> {
    const res = await api.post<CompanyDocument>(`/api/v1/knowledge/documents/${id}/retry`);
    return res.data;
  },

  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/api/v1/knowledge/documents/${id}`);
  },

  async retrieve(query: string, topK: number = 5): Promise<RetrievedChunk[]> {
    const res = await api.post<RetrievedChunk[]>("/api/v1/knowledge/retrieve", {
      query,
      top_k: topK,
    });
    return res.data;
  },
};

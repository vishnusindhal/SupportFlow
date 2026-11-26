import { api } from "./client";
import type { CompanyRule, RuleEvaluation, RuleInput } from "../types";

export const rulesApi = {
  async getRules(): Promise<CompanyRule[]> {
    const res = await api.get<CompanyRule[]>("/api/v1/rules");
    return res.data;
  },

  async createRule(payload: RuleInput): Promise<CompanyRule> {
    const res = await api.post<CompanyRule>("/api/v1/rules", payload);
    return res.data;
  },

  async updateRule(id: string, payload: RuleInput): Promise<CompanyRule> {
    const res = await api.patch<CompanyRule>(`/api/v1/rules/${id}`, payload);
    return res.data;
  },

  async disableRule(id: string): Promise<void> {
    await api.delete(`/api/v1/rules/${id}`);
  },

  async getOptions(): Promise<{ fields: string[]; intents: string[] }> {
    const res = await api.get<{ fields: string[]; intents: string[] }>("/api/v1/rules/options");
    return res.data;
  },

  async testRules(context: Record<string, unknown>): Promise<RuleEvaluation> {
    const res = await api.post<RuleEvaluation>("/api/v1/rules/test", { context });
    return res.data;
  },
};

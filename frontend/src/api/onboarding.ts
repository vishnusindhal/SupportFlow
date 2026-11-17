import { api } from "./client";
import type {
  CompanyConfigResponse,
  OnboardingStatus,
  TemplateDetail,
  TemplateSummary,
} from "../types";

export interface CompanyProfilePayload {
  company_name: string;
  timezone: string;
}

export const onboardingApi = {
  async getTemplates(): Promise<TemplateSummary[]> {
    const res = await api.get<TemplateSummary[]>("/api/v1/templates");
    return res.data;
  },

  async getTemplateDetail(templateId: string): Promise<TemplateDetail> {
    const res = await api.get<TemplateDetail>(`/api/v1/templates/${templateId}`);
    return res.data;
  },

  async getStatus(): Promise<OnboardingStatus> {
    const res = await api.get<OnboardingStatus>("/api/v1/onboarding/status");
    return res.data;
  },

  async saveProfile(payload: CompanyProfilePayload): Promise<{ profile: Record<string, unknown> }> {
    const res = await api.put<{ profile: Record<string, unknown> }>("/api/v1/onboarding/profile", payload);
    return res.data;
  },

  async complete(templateId: string): Promise<CompanyConfigResponse> {
    const res = await api.post<CompanyConfigResponse>("/api/v1/onboarding/complete", {
      template_id: templateId,
    });
    return res.data;
  },

  async getCurrentConfig(): Promise<CompanyConfigResponse> {
    const res = await api.get<CompanyConfigResponse>("/api/v1/configuration/current");
    return res.data;
  },
};

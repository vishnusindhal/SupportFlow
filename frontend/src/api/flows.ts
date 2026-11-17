import { api } from "./client";
import type { FlowConfig, FlowResponse } from "../types";

export const flowsApi = {
  async getCurrentFlow(): Promise<FlowResponse> {
    const res = await api.get<FlowResponse>("/api/v1/flows/current");
    return res.data;
  },

  async saveCurrentFlow(flow: FlowConfig): Promise<FlowResponse> {
    const res = await api.put<FlowResponse>("/api/v1/flows/current", { flow });
    return res.data;
  },
};

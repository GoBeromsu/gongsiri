import type { ContractVersion } from "../contracts/request.js";

export type AgentSessionContext = {
  traceId: string;
  contractVersion: ContractVersion;
  pythonBin: string;
};

export const createSessionContext = (
  traceId: string,
  contractVersion: ContractVersion = "v1",
  pythonBin = "python3"
): AgentSessionContext => ({
  traceId,
  contractVersion,
  pythonBin
});

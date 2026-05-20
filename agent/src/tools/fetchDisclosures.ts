import type { FetchDisclosuresRequest } from "../contracts/request.js";
import type { ToolDefinition } from "../contracts/tool.js";
import { fetchDisclosuresToolDescriptor } from "../contracts/tool.js";
import type { ToolResult } from "../contracts/response.js";

const notImplemented = async (_request: FetchDisclosuresRequest): Promise<ToolResult> => {
  throw new Error(
    "fetch_disclosures runtime invocation is not implemented in the skeleton lane yet."
  );
};

export const fetchDisclosuresTool: ToolDefinition = {
  descriptor: fetchDisclosuresToolDescriptor,
  invoke: notImplemented
};

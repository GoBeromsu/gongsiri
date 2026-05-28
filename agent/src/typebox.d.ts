// typebox와 Pi SDK 전이 의존성 ambient 선언 + Pi SDK module augmentation
// pnpm 가상 스토어에 있으나 프로젝트 node_modules에 직접 링크되지 않아 TypeScript가 찾지 못한다.

// Pi SDK에 defineTool과 ToolDefinition을 추가로 export하도록 augment한다.
// (실제로는 index.d.ts에 선언되어 있으나 전이 의존성 해석 실패로 TypeScript가 인식하지 못함)
declare module "@earendil-works/pi-coding-agent" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ToolDefinition = {
    name: string;
    label: string;
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: (
      toolCallId: string,
      params: any,
      signal?: AbortSignal,
      onUpdate?: unknown,
      ctx?: unknown,
    ) => Promise<{
      content: Array<{ type: string; text: string }>;
      details?: Record<string, unknown>;
    }>;
    [key: string]: unknown;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function defineTool(tool: ToolDefinition): ToolDefinition;
}

declare module "typebox" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type TSchema = Record<string, any> & { _type?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Static<T> = any;
  export const Type: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object: (props: Record<string, any>, opts?: Record<string, any>) => TSchema;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    String: (opts?: Record<string, any>) => TSchema;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Number: (opts?: Record<string, any>) => TSchema;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean: (opts?: Record<string, any>) => TSchema;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Optional: (schema: TSchema) => TSchema;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array: (schema: TSchema, opts?: Record<string, any>) => TSchema;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Literal: (value: unknown) => TSchema;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Union: (schemas: TSchema[]) => TSchema;
  };
}

// Pi SDK 전이 의존성 — @earendil-works/pi-coding-agent의 extensions/types.d.ts가 참조함
declare module "@earendil-works/pi-agent-core" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AgentMessage = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AgentToolResult<T = unknown> = {
    content: Array<{ type: string; text: string }>;
    details?: T;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AgentToolUpdateCallback<T = unknown> = (update: T) => void;
  export type ThinkingLevel = "low" | "medium" | "high";
  export type ToolExecutionMode = "sequential" | "parallel";
}

declare module "@earendil-works/pi-ai" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Api = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AssistantMessageEvent = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AssistantMessageEventStream = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Context = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ImageContent = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Model = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type OAuthCredentials = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type OAuthLoginCallbacks = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type SimpleStreamOptions = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type TextContent = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ToolResultMessage = any;
}

declare module "@earendil-works/pi-tui" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AutocompleteItem = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AutocompleteProvider = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Component = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type EditorComponent = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type EditorTheme = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type KeyId = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type OverlayHandle = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type OverlayOptions = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type TUI = any;
}

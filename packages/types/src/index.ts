export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
};

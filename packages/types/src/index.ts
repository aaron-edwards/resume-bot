export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequestBody = {
  message: string;
};

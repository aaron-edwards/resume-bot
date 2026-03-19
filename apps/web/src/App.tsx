import { Header } from "./components/Header";
import { Transcript } from "./components/Transcript";
import { ChatInput } from "./components/ChatInput";
import { useChat } from "./hooks/useChat";

export default function App() {
  const { messages, isStreaming, error, sendMessage } = useChat();

  return (
    <div className="flex flex-col h-dvh">
      <Header title="Aaron's ResumeBot" />
      <div className="flex flex-col flex-1 overflow-hidden max-w-2xl w-full mx-auto p-4 gap-4">
        <Transcript messages={messages} isStreaming={isStreaming} />
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
      </div>
    </div>
  );
}

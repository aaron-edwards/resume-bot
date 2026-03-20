import { ChatInput } from "./components/ChatInput";
import { Header } from "./components/Header";
import { Spinner } from "./components/Spinner";
import { Transcript } from "./components/Transcript";
import { useChat } from "./hooks/useChat";

export default function App() {
  const { messages, isLoading, isStreaming, error, sendMessage, resetSession } = useChat();

  return (
    <div className="flex flex-col h-dvh">
      <Header title="Aaron's ResumeBot" onReset={resetSession} />
      <div className="flex flex-col flex-1 overflow-hidden max-w-2xl w-full mx-auto p-4 gap-4">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            <Transcript messages={messages} isStreaming={isStreaming} />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
          </>
        )}
      </div>
    </div>
  );
}

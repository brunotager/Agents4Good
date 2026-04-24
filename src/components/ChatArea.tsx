import { useEffect, useRef } from 'react';
import { RobotAvatar } from './RobotAvatar';

export type Message = {
  id: string;
  sender: 'agent' | 'user';
  text: React.ReactNode;
};

interface ChatAreaProps {
  messages: Message[];
  isAnalyzing: boolean;
}

export function ChatArea({ messages, isAnalyzing }: ChatAreaProps) {
  const chatRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isAnalyzing]);

  return (
    <main className="chat-area" id="chatArea" ref={chatRef}>
      {messages.map((msg) => (
        <div key={msg.id} className={`message ${msg.sender}-message`}>
          {msg.sender === 'agent' && (
            <div className="avatar-container">
              {isAnalyzing && msg.id === messages[messages.length - 1].id && (
                <div className="avatar-pulse"></div>
              )}
              <RobotAvatar className="avatar" />
            </div>
          )}
          <div className="message-bubble">{msg.text}</div>
        </div>
      ))}
    </main>
  );
}

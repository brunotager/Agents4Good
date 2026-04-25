import { useEffect, useRef, useState } from 'react';
import { RobotAvatar } from './RobotAvatar';

export type Message = {
  id: string;
  sender: 'agent' | 'user';
  text: React.ReactNode;
};

interface ChatAreaProps {
  messages: Message[];
  isAnalyzing: boolean;
  loadingCategory?: 'long' | 'completeness' | 'next';
}

const LOADING_MESSAGES = {
  long: [
    "Anna is identifying the key details in your story...",
    "Organizing your work history into the required format...",
    "Mapping your medical events to the application timeline..."
  ],
  completeness: [
    "Anna is checking if we have enough info for this section...",
    "Reviewing your answers against SSA requirements...",
    "Making sure no details were missed..."
  ],
  next: [
    "Finding the best next question for your claim...",
    "Preparing the next step of your application...",
    "Almost there. Anna is getting the next section ready..."
  ]
};

function LoadingBubble({ category }: { category: 'long' | 'completeness' | 'next' }) {
  const [text, setText] = useState('');

  useEffect(() => {
    const messages = LOADING_MESSAGES[category] || LOADING_MESSAGES.next;
    setText(messages[Math.floor(Math.random() * messages.length)]);
  }, [category]);

  return <span className="pulsing-text">{text}</span>;
}

export function ChatArea({ messages, isAnalyzing, loadingCategory = 'next' }: ChatAreaProps) {
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
              <RobotAvatar className="avatar" />
            </div>
          )}
          <div className="message-bubble">{msg.text}</div>
        </div>
      ))}
      
      {isAnalyzing && (
        <div className="message agent-message">
          <div className="avatar-container">
            <div className="avatar-pulse"></div>
            <RobotAvatar className="avatar" />
          </div>
          <div className="message-bubble" style={{ backgroundColor: 'transparent', border: 'none', padding: '0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            <LoadingBubble category={loadingCategory} />
          </div>
        </div>
      )}
    </main>
  );
}

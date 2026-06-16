import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../utils/api';

export function ChatbotWidget({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: user 
        ? `Xin chào ${user.fullName || user.name}! Tôi là Trợ lý ảo ViVuCar. Tôi có thể giúp gì cho hành trình của bạn hôm nay?`
        : 'Xin chào! Tôi là Trợ lý ảo ViVuCar. Tôi có thể giúp gì cho bạn hôm nay?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Focus input on open
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [messages, isOpen]);

  // Sync welcome message if user logs in
  useEffect(() => {
    if (user) {
      setMessages(prev => {
        // Only update if welcome is the only message
        if (prev.length === 1 && prev[0].id === 'welcome') {
          return [{
            id: 'welcome',
            role: 'model',
            text: `Xin chào ${user.fullName || user.name}! Tôi là Trợ lý ảo ViVuCar. Tôi có thể giúp gì cho hành trình của bạn hôm nay?`
          }];
        }
        return prev;
      });
    }
  }, [user]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    if (!textToSend) setInputValue('');

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Format history matching model requirements: array of { role: 'user'|'model', content: string }
      const history = messages
        .filter(m => m.id !== 'welcome') // Skip welcome message
        .map(m => ({
          role: m.role,
          content: m.text
        }));

      const response = await api.chatbot.sendMessage(text, history);

      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.reply || 'Rất tiếc, tôi gặp sự cố khi xử lý câu trả lời này. Hãy thử lại nhé.'
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Có lỗi kết nối xảy ra. Vui lòng kiểm tra lại mạng hoặc thử lại sau.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Bạn có muốn xóa toàn bộ lịch sử hội thoại hiện tại?')) {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: user 
            ? `Xin chào ${user.fullName || user.name}! Tôi là Trợ lý ảo ViVuCar. Lịch sử đã được làm mới. Tôi có thể giúp gì cho bạn?`
            : 'Xin chào! Tôi là Trợ lý ảo ViVuCar. Lịch sử đã được làm mới. Tôi có thể giúp gì cho bạn?'
        }
      ]);
    }
  };

  const quickPrompts = [
    { label: '🔑 Quy trình KYC Bằng lái', text: 'Hướng dẫn tôi các bước xác thực bằng lái xe và CCCD để thuê xe.' },
    { label: '💰 Giá thuê & Đặt cọc', text: 'Giá thuê xe khoảng bao nhiêu tiền một ngày và cần đặt cọc giữ xe thế nào?' },
    { label: '💳 Nạp/Rút ví & VNPAY', text: 'Cách thức thanh toán qua VNPAY hoặc ví điện tử như thế nào?' },
    { label: '🚗 Ký gửi xe tự lái', text: 'Tôi muốn ký gửi xe của mình lên hệ thống thì làm thế nào?' }
  ];

  const renderMessageContent = (text) => {
    if (!text) return '';
    // Sanitize basic HTML to prevent XSS
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Convert bold text **word** to <strong>word</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert list item "* word" at start of line to "• word"
      .replace(/^\*\s+/gm, '• ');

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <>
      {/* Scope CSS inside a style tag for full modularity */}
      <style>{`
        .chatbot-widget-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
          font-family: var(--font-primary);
        }
        .chatbot-toggle-btn {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-full);
          background: var(--accent-gradient);
          color: white;
          border: none;
          box-shadow: 0 4px 20px rgba(0, 150, 152, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .chatbot-toggle-btn:hover {
          transform: scale(1.08) rotate(5deg);
          box-shadow: 0 6px 24px rgba(0, 150, 152, 0.5);
        }
        .chatbot-toggle-btn:active {
          transform: scale(0.95);
        }
        .chatbot-panel {
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 380px;
          height: 540px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform-origin: bottom right;
          animation: chatbotScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          border-top: 4px solid var(--accent-primary);
        }
        @keyframes chatbotScaleIn {
          from {
            transform: scale(0.7) translateY(40px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .chatbot-header {
          padding: 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .chatbot-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 16px;
          color: var(--text-primary);
        }
        .chatbot-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .chatbot-header-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-sm);
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chatbot-header-btn:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }
        .chatbot-header-btn.close-btn:hover {
          color: var(--error);
          background: rgba(239, 68, 68, 0.1);
        }
        .chatbot-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(248, 250, 252, 0.5);
        }
        .chat-message-row {
          display: flex;
          width: 100%;
        }
        .chat-message-row.user {
          justify-content: flex-end;
        }
        .chat-message-row.model {
          justify-content: flex-start;
        }
        .chat-message-bubble {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 14px;
          line-height: 1.5;
          position: relative;
          word-break: break-word;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          white-space: pre-wrap;
        }
        .chat-message-row.user .chat-message-bubble {
          background: var(--accent-primary);
          color: white;
          border-bottom-right-radius: 2px;
        }
        .chat-message-row.model .chat-message-bubble {
          background: white;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-bottom-left-radius: 2px;
        }
        .quick-prompts-container {
          padding: 8px 16px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 8px;
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none; /* Firefox */
        }
        .quick-prompts-container::-webkit-scrollbar {
          display: none; /* Safari/Chrome */
        }
        .quick-prompt-chip {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          padding: 6px 12px;
          font-size: 12px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .quick-prompt-chip:hover {
          background: var(--border-glow);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }
        .chatbot-input-area {
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .chatbot-input {
          flex: 1;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          font-family: var(--font-primary);
          font-size: 14px;
          outline: none;
          transition: var(--transition-fast);
          background: #f8fafc;
        }
        .chatbot-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--border-glow);
          background: white;
        }
        .chatbot-send-btn {
          background: var(--accent-gradient);
          color: white;
          border: none;
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }
        .chatbot-send-btn:hover:not(:disabled) {
          background: var(--accent-hover-gradient);
          transform: translateY(-1px);
        }
        .chatbot-send-btn:disabled {
          background: var(--text-muted);
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        /* Typing indicator dots */
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          background-color: var(--text-muted);
          border-radius: var(--radius-full);
          opacity: 0.6;
          animation: chatbotTypingPulse 1.2s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes chatbotTypingPulse {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Mobile Responsive adjustments */
        @media (max-width: 480px) {
          .chatbot-widget-container {
            bottom: 16px;
            right: 16px;
          }
          .chatbot-panel {
            width: calc(100vw - 32px);
            height: 480px;
            right: 0;
            bottom: 64px;
          }
        }
      `}</style>

      <div className="chatbot-widget-container">
        {/* Toggle Button */}
        <button 
          className="chatbot-toggle-btn" 
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? "Đóng Chatbot" : "Trợ lý ảo ViVuCar"}
          aria-label="Toggle chat widget"
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>

        {/* Chat Panel */}
        {isOpen && (
          <div className="chatbot-panel">
            {/* Header */}
            <div className="chatbot-header">
              <div className="chatbot-header-title">
                <Sparkles size={18} className="text-info" style={{ color: 'var(--accent-primary)' }} />
                <span>Trợ lý ảo ViVuCar</span>
              </div>
              <div className="chatbot-header-actions">
                <button 
                  className="chatbot-header-btn" 
                  onClick={handleClearHistory} 
                  title="Xóa lịch sử chat"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  className="chatbot-header-btn close-btn" 
                  onClick={() => setIsOpen(false)} 
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Body (Messages List) */}
            <div className="chatbot-body">
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message-row ${msg.role}`}>
                  <div className="chat-message-bubble">
                    {renderMessageContent(msg.text)}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="chat-message-row model">
                  <div className="chat-message-bubble" style={{ background: 'white' }}>
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions / Chips */}
            <div className="quick-prompts-container">
              {quickPrompts.map((prompt, idx) => (
                <div 
                  key={idx} 
                  className="quick-prompt-chip" 
                  onClick={() => handleSend(prompt.text)}
                >
                  {prompt.label}
                </div>
              ))}
            </div>

            {/* Input area */}
            <div className="chatbot-input-area">
              <input
                ref={inputRef}
                type="text"
                className="chatbot-input"
                placeholder="Nhập câu hỏi của bạn..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <button 
                className="chatbot-send-btn" 
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

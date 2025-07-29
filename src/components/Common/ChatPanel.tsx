import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Paperclip } from 'lucide-react';
import { Message } from '../../types';
import { createMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

interface ChatPanelProps {
  jobId: string;
  recipientName: string;
  recipientRole?: 'founder' | 'talent';
  messages: Message[];
  className?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  jobId,
  recipientName,
  recipientRole = 'founder',
  messages,
  className = '',
}) => {
  const { user } = useAuth();
  const { setMessages } = useApp();
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after send
  useEffect(() => {
    if (!sendingMessage && inputRef.current) inputRef.current.focus();
  }, [sendingMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sendingMessage) return;

    setSendingMessage(true);
    try {
      const messageData = {
        jobId,
        senderId: user.id,
        content: newMessage.trim(),
        read: false
      };
      const savedMessage = await createMessage(messageData);
      setMessages(prev => [...prev, savedMessage]);
      setNewMessage('');
    } catch (error) {
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileAttachment = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const message: Message = {
        id: Date.now().toString(),
        jobId,
        senderId: user.id,
        content: `📎 Shared a file: ${file.name}`,
        timestamp: new Date(),
        read: false,
      };
      setMessages(prev => [...prev, message]);
      // TODO: Upload and store the file, update message.content with URL
    }
  };

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDate = (date: Date | string) => {
    const today = new Date();
    const messageDate = new Date(date);
    if (messageDate.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return messageDate.toLocaleDateString();
  };

  return (
    <div className={`w-full md:w-96 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col ${className}`}>
      {/* Chat Header */}
      <div className="p-3 md:p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm md:text-base">Chat with {recipientName}</h3>
            <p className="text-xs md:text-sm text-gray-600">
              Discuss {recipientRole === 'founder' ? 'job progress' : 'review details'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-6 md:py-8">
            <MessageCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto text-gray-300 mb-2 md:mb-3" />
            <p className="text-gray-500 text-xs md:text-sm">No messages yet</p>
            <p className="text-gray-400 text-xs hidden md:block">
              Start a conversation with the {recipientRole}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:space-y-4">
              {messages.map((message, index) => {
                const isCurrentUser = message.senderId === user?.id;
                const showDate = index === 0 ||
                  formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);

                return (
                  <div key={message.id} className="mb-3">
                    {showDate && (
                      <div className="text-center py-2">
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}>
                        <p className="text-sm break-words">{message.content}</p>
                        <p className={`text-xs mt-1 text-opacity-75 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-3 md:p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="space-y-3">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs md:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleFileAttachment}
              className="p-1 md:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Attach File"
            >
              <Paperclip className="h-3 w-3 md:h-4 md:w-4" />
            </button>
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage}
              className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              {sendingMessage ? (
                <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-3 w-3 md:h-4 md:w-4" />
              )}
            </button>
          </div>
        </form>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default ChatPanel;

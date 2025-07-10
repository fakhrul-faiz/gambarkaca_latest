import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { createDirectMessage, getAdminUsers, markAllDirectMessagesAsRead } from '../../lib/api';
import { User as UserType } from '../../types';

interface DirectMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DirectMessageDialog: React.FC<DirectMessageDialogProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { directMessages, setDirectMessages } = useApp();
  const [message, setMessage] = useState('');
  const [adminUsers, setAdminUsers] = useState<UserType[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch admin users
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const admins = await getAdminUsers();
        setAdminUsers(admins);
        
        // Select the first admin by default
        if (admins.length > 0 && !selectedAdmin) {
          setSelectedAdmin(admins[0]);
        }
      } catch (error) {
        console.error('Error fetching admin users:', error);
      }
    };
    
    if (isOpen && user) {
      fetchAdmins();
    }
  }, [isOpen, user, selectedAdmin]);

  // Filter messages for the current conversation
  const conversationMessages = directMessages.filter(
    msg => 
      (msg.senderId === user?.id && msg.receiverId === selectedAdmin?.id) ||
      (msg.senderId === selectedAdmin?.id && msg.receiverId === user?.id)
  );

  // Scroll to bottom when messages change or dialog opens
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages, isOpen]);

  // Mark messages as read when dialog opens
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (isOpen && user && selectedAdmin) {
        try {
          await markAllDirectMessagesAsRead(selectedAdmin.id, user.id);
          
          // Update local state
          setDirectMessages(
            directMessages.map(msg => 
              msg.senderId === selectedAdmin.id && msg.receiverId === user.id
                ? { ...msg, isRead: true }
                : msg
            )
          );
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      }
    };
    
    markMessagesAsRead();
  }, [isOpen, user, selectedAdmin, directMessages, setDirectMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user || !selectedAdmin || loading) return;
    
    setLoading(true);
    try {
      const newMessage = await createDirectMessage(user.id, selectedAdmin.id, message.trim());
      setDirectMessages([...directMessages, newMessage]);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupedMessages: { [key: string]: typeof conversationMessages } = {};
  conversationMessages.forEach(msg => {
    const date = formatDate(msg.createdAt);
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(msg);
  });

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Message Admin</h3>
            {selectedAdmin && (
              <p className="text-sm text-blue-100">{selectedAdmin.name}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Admin Selection (if multiple admins) */}
      {adminUsers.length > 1 && (
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <select
            value={selectedAdmin?.id || ''}
            onChange={(e) => {
              const admin = adminUsers.find(a => a.id === e.target.value);
              if (admin) setSelectedAdmin(admin);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {adminUsers.map(admin => (
              <option key={admin.id} value={admin.id}>
                {admin.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {Object.keys(groupedMessages).length > 0 ? (
          Object.entries(groupedMessages).map(([date, messages]) => (
            <div key={date}>
              <div className="text-center my-3">
                <span className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
                  {date}
                </span>
              </div>
              <div className="space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.senderId === user?.id
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 text-right ${
                          msg.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-gray-600 font-medium">No messages yet</h3>
            <p className="text-gray-500 text-sm mt-1">
              Send a message to start a conversation with the admin
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!message.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DirectMessageDialog;
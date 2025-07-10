import React, { useState, useEffect } from 'react';
import { Search, Filter, User, MessageCircle, Calendar, CheckCircle, X, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { User as UserType } from '../../types';
import { getDirectMessages, createDirectMessage, markAllDirectMessagesAsRead } from '../../lib/api';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { directMessages, setDirectMessages, talents, founders } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Combine talents and founders for user selection
  const allUsers = React.useMemo(() => [...talents, ...founders], [talents, founders]);

  // Memoize active conversations instead of using state + useEffect
  const activeConversations = React.useMemo(() => {
    if (!user || !directMessages.length) return [];

    const conversations = new Map<string, {
      user: UserType;
      messages: DirectMessage[];
      lastMessage: string;
      timestamp: Date;
      unreadCount: number;
    }>();

    // Process all direct messages
    directMessages.forEach(msg => {
      const isIncoming = msg.receiverId === user.id;
      const otherUserId = isIncoming ? msg.senderId : msg.receiverId;
      const otherUser = allUsers.find(u => u.id === otherUserId);
      
      if (!otherUser) return;

      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, {
          user: otherUser,
          messages: [],
          lastMessage: msg.content,
          timestamp: msg.createdAt,
          unreadCount: isIncoming && !msg.isRead ? 1 : 0
        });
      } else {
        const conversation = conversations.get(otherUserId)!;
        conversation.messages.push(msg);
        
        // Update last message if this is newer
        if (msg.createdAt > conversation.timestamp) {
          conversation.lastMessage = msg.content;
          conversation.timestamp = msg.createdAt;
        }
        
        // Count unread messages
        if (isIncoming && !msg.isRead) {
          conversation.unreadCount += 1;
        }
      }
    });

    // Convert map to array and sort by timestamp (newest first)
    const sortedConversations = Array.from(conversations.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return sortedConversations.map(conv => ({
      user: conv.user,
      lastMessage: conv.lastMessage,
      timestamp: conv.timestamp,
      unreadCount: conv.unreadCount
    })));
  }, [user, directMessages, allUsers]);

  // Filter conversations based on search and status
  const filteredConversations = activeConversations.filter(conv => {
    const matchesSearch = 
      conv.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'unread' && conv.unreadCount > 0) ||
      (statusFilter === 'read' && conv.unreadCount === 0);
    
    return matchesSearch && matchesStatus;
  });

  // Get conversation messages
  const conversationMessages = selectedUser 
    ? directMessages.filter(
        msg => 
          (msg.senderId === user?.id && msg.receiverId === selectedUser.id) ||
          (msg.senderId === selectedUser.id && msg.receiverId === user?.id)
      ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    : [];

  // Handle user selection
  const handleSelectUser = async (selectedUser: UserType) => {
    setSelectedUser(selectedUser);
    
    // Mark all messages from this user as read
    if (user) {
      try {
        await markAllDirectMessagesAsRead(selectedUser.id, user.id);
        
        // Update local state
        setDirectMessages(
          directMessages.map(msg => 
            msg.senderId === selectedUser.id && msg.receiverId === user.id
              ? { ...msg, isRead: true }
              : msg
          )
        );
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user || !selectedUser || loading) return;
    
    setLoading(true);
    try {
      const newMessage = await createDirectMessage(user.id, selectedUser.id, message.trim());
      setDirectMessages([...directMessages, newMessage]);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages]);

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

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    
    return formatDate(date);
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

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Direct Messages</h1>
        <p className="text-gray-600">Manage all user conversations</p>
      </div>

      <div className="mt-6 flex-1 flex overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Left Panel - Conversations List */}
        <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Messages</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.user.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedUser?.id === conv.user.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectUser(conv.user)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {conv.user.avatar ? (
                            <img
                              src={conv.user.avatar}
                              alt={conv.user.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            conv.user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {conv.user.name}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(conv.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {conv.lastMessage}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            conv.user.role === 'talent' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {conv.user.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No conversations found</h3>
                <p className="text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start a conversation with a user'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Conversation */}
        <div className="hidden md:flex md:w-2/3 flex-col">
          {selectedUser ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-gray-200 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    selectedUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{selectedUser.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedUser.role === 'talent' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedUser.role}
                    </span>
                    <span className="text-xs text-gray-500">{selectedUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50" style={{ overflowY: 'auto' }}>
                {Object.keys(groupedMessages).length > 0 ? (
                  <div>
                    {Object.entries(groupedMessages).map(([date, messages]) => (
                      <div key={date} className="mb-4">
                        <div className="text-center my-3">
                          <span className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
                            {date}
                          </span>
                        </div>
                        <div>
                          {messages.map(msg => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'} mb-3`}
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
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                      <MessageCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-gray-600 font-medium">No messages yet</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Send a message to start a conversation
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
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
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">
                Choose a conversation from the list to view messages
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
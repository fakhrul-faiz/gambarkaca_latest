import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import DirectMessageDialog from './DirectMessageDialog';

const MessageFab: React.FC = () => {
  const { user } = useAuth();
  const { directMessages } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Calculate unread messages count
  useEffect(() => {
    if (user && directMessages.length > 0) {
      const count = directMessages.filter(
        msg => msg.receiverId === user.id && !msg.isRead
      ).length;
      setUnreadCount(count);
    } else {
      setUnreadCount(0);
    }
  }, [user, directMessages]);

  const toggleDialog = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        onClick={toggleDialog}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg flex items-center justify-center hover:from-blue-700 hover:to-purple-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="Open messages"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <DirectMessageDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default MessageFab;
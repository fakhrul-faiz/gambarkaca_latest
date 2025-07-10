import React, { createContext, useContext, useState, useEffect } from 'react';
import { Campaign, Job, Message, Transaction, Order, Earning, Founder, Talent, Notification } from '../types';
import { 
  getCampaigns, 
  getOrders, 
  getTransactions, 
  getEarnings, 
  getMessages,
  getFounders,
  getTalents,
  getNotifications,
  subscribeToMessages,
  subscribeToOrders,
  subscribeToNotifications
} from '../lib/api';
import { useAuth } from './AuthContext';

interface AppContextType {
  campaigns: Campaign[];
  jobs: Job[];
  messages: Message[];
  transactions: Transaction[];
  orders: Order[];
  earnings: Earning[];
  founders: Founder[];
  talents: Talent[];
  notifications: Notification[];
  setCampaigns: (campaigns: Campaign[]) => void;
  setJobs: (jobs: Job[]) => void;
  setMessages: (messages: Message[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setOrders: (orders: Order[]) => void;
  setEarnings: (earnings: Earning[]) => void;
  setFounders: (founders: Founder[]) => void;
  setTalents: (talents: Talent[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  refreshData: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [founders, setFounders] = useState<Founder[]>([]);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    if (!user) {
      console.log('No user found, skipping data refresh');
      return;
    }

    try {
      setLoading(true);

      // Load data based on user role
      if (user.role === 'admin') {
        
        // Admin gets all data
        const [
          campaignsData, 
          ordersData, 
          transactionsData, 
          earningsData, 
          messagesData, 
          foundersData, 
          talentsData
        ] = await Promise.allSettled([
          getCampaigns(),
          getOrders(),
          getTransactions(),
          getEarnings(),
          getMessages(),
          getFounders(),
          getTalents(),
          getNotifications(user.id),
        ]);

        // Handle results with proper error handling
        if (campaignsData.status === 'fulfilled') {
          setCampaigns(campaignsData.value);
        } else {
          setCampaigns([]);
        }

        if (ordersData.status === 'fulfilled') {
          setOrders(ordersData.value);
        } else {
          setOrders([]);
        }

        if (transactionsData.status === 'fulfilled') {
          setTransactions(transactionsData.value);
        } else {
          setTransactions([]);
        }

        if (earningsData.status === 'fulfilled') {
          setEarnings(earningsData.value);
        } else {
          setEarnings([]);
        }

        if (messagesData.status === 'fulfilled') {
          setMessages(messagesData.value);
        } else {
          setMessages([]);
        }

        if (foundersData.status === 'fulfilled') {
          setFounders(foundersData.value);
        } else {
          setFounders([]);
        }

        if (talentsData.status === 'fulfilled') {
          setTalents(talentsData.value);
        } else {
          setTalents([]);
        }
        
        // Load notifications
        try {
          const notificationsData = await getNotifications(user.id);
          setNotifications(notificationsData);
        } catch (error) {
          setNotifications([]);
        }

      } else {
      // Founders also get talents, other users do not
      const [
        campaignsData, 
        ordersData, 
        transactionsData, 
        earningsData, 
        messagesData
      ] = await Promise.allSettled([
        getCampaigns(),
        getOrders(user.id),
        getTransactions(user.id),
        user.role === 'talent' ? getEarnings(user.id) : getEarnings(),
        getMessages(),
        getNotifications(user.id),
      ]);

      if (campaignsData.status === 'fulfilled') setCampaigns(campaignsData.value); else setCampaigns([]);
      if (ordersData.status === 'fulfilled') setOrders(ordersData.value); else setOrders([]);
      if (transactionsData.status === 'fulfilled') setTransactions(transactionsData.value); else setTransactions([]);
      if (earningsData.status === 'fulfilled') setEarnings(earningsData.value); else setEarnings([]);
      if (messagesData.status === 'fulfilled') setMessages(messagesData.value); else setMessages([]);
      
      // Load notifications
      try {
        const notificationsData = await getNotifications(user.id);
        setNotifications(notificationsData);
      } catch (error) {
        setNotifications([]);
      }

      if (user.role === 'founder') {
        try {
          const talents = await getTalents();
          setTalents(talents);
        } catch (err) {
          setTalents([]);
        }
      } else {
        setTalents([]); // talents only for founders/admins
      }
      setFounders([]); // founders only for admin
    }

  } catch (error) {
    // Don't clear existing data on error, just log it
  } finally {
    setLoading(false);
  }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      // Clear data when user logs out
      setCampaigns([]);
      setOrders([]);
      setTransactions([]);
      setEarnings([]);
      setMessages([]);
      setFounders([]);
      setTalents([]);
      setNotifications([]);
      setJobs([]);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const subscriptions: any[] = [];
    
    // Subscribe to notifications
    try {
      const notificationSub = subscribeToNotifications(user.id, (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
      });
      subscriptions.push(notificationSub);
    } catch (error) {
    }

    try {
      // Subscribe to order updates
      const orderSub = subscribeToOrders(user.id, () => {
        // Refresh orders when there are changes
        if (user.role === 'admin') {
          getOrders().then(setOrders).catch(console.error);
        } else {
          getOrders(user.id).then(setOrders).catch(console.error);
        }
      });
      subscriptions.push(orderSub);

      // Subscribe to messages for user's orders
      orders.forEach(order => {
        const messageSub = subscribeToMessages(order.id, (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
        });
        subscriptions.push(messageSub);
      });
    } catch (error) {
    }

    return () => {
      subscriptions.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (error) {
        }
      });
    };
  }, [user, orders]);

  return (
    <AppContext.Provider
      value={{
        campaigns,
        jobs,
        messages,
        transactions,
        orders,
        earnings,
        founders,
        talents,
        notifications,
        setCampaigns,
        setJobs,
        setMessages,
        setTransactions,
        setOrders,
        setEarnings,
        setFounders,
        setTalents,
        setNotifications,
        refreshData,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
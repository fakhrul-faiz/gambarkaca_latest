import React, { createContext, useContext, useState, useEffect } from 'react';
import { Campaign, Job, Message, Transaction, Order, Earning } from '../types';
import { 
  getCampaigns, 
  getOrders, 
  getTransactions, 
  getEarnings, 
  getMessages,
  subscribeToMessages,
  subscribeToOrders
} from '../lib/api';
import { useAuth } from './AuthContext';

interface AppContextType {
  campaigns: Campaign[];
  jobs: Job[];
  messages: Message[];
  transactions: Transaction[];
  orders: Order[];
  earnings: Earning[];
  setCampaigns: (campaigns: Campaign[]) => void;
  setJobs: (jobs: Job[]) => void;
  setMessages: (messages: Message[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setOrders: (orders: Order[]) => void;
  setEarnings: (earnings: Earning[]) => void;
  refreshData: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [campaignsData, ordersData, transactionsData, earningsData, messagesData] = await Promise.all([
        getCampaigns(),
        getOrders(user.id),
        getTransactions(user.id),
        user.role === 'talent' ? getEarnings(user.id) : getEarnings(),
        getMessages(),
      ]);
      setCampaigns(campaignsData);
      setOrders(ordersData);
      setTransactions(transactionsData);
      setEarnings(earningsData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setCampaigns([]);
      setOrders([]);
      setTransactions([]);
      setEarnings([]);
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const subscriptions: any[] = [];
    const orderSub = subscribeToOrders(user.id, () => {
      getOrders(user.id).then(setOrders);
    });
    subscriptions.push(orderSub);

    orders.forEach(order => {
      const messageSub = subscribeToMessages(order.id, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
      });
      subscriptions.push(messageSub);
    });

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setCampaigns,
        setJobs,
        setMessages,
        setTransactions,
        setOrders,
        setEarnings,
        refreshData,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

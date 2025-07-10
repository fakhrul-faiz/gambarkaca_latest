import { supabase } from './supabase';
import { Database } from './database.types';
import { User, Founder, Talent, Campaign, Order, Transaction, Earning, Message } from '../types';

type Tables = Database['public']['Tables'];
type ProfileRow = Tables['profiles']['Row'];
type CampaignRow = Tables['campaigns']['Row'];
type OrderRow = Tables['orders']['Row'];
type TransactionRow = Tables['transactions']['Row'];
type EarningRow = Tables['earnings']['Row'];
type MessageRow = Tables['messages']['Row'];

// Helper function to convert database profile to app user type
const convertProfileToUser = (profile: ProfileRow): User | Founder | Talent => {
  const baseUser = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as 'admin' | 'founder' | 'talent',
    status: profile.status as 'active' | 'pending' | 'suspended',
    avatar: profile.avatar_url || undefined,
    createdAt: new Date(profile.created_at || ''),
  };

  if (profile.role === 'founder') {
    return {
      ...baseUser,
      role: 'founder',
      company: profile.company || undefined,
      phone: profile.phone || undefined,
      address: profile.address || undefined,
      walletBalance: profile.wallet_balance || 0,
    } as Founder;
  }

  if (profile.role === 'talent') {
    return {
      ...baseUser,
      role: 'talent',
      bio: profile.bio || undefined,
      portfolio: (profile.portfolio as string[]) || [],
      rateLevel: (profile.rate_level as 1 | 2 | 3) || 1,
      skills: (profile.skills as string[]) || [],
      socialMedia: (profile.social_media as any) || {},
      totalEarnings: profile.total_earnings || 0,
    } as Talent;
  }

  return baseUser;
};

// Helper function to convert database campaign to app campaign type
const convertCampaignToApp = (campaign: CampaignRow): Campaign => ({
  id: campaign.id,
  founderId: campaign.founder_id,
  title: campaign.title,
  description: campaign.description,
  productName: campaign.product_name,
  category: campaign.category,
  duration: campaign.duration as '30sec' | '1min' | '3min',
  productImages: (campaign.product_images as string[]) || [],
  rateLevel: campaign.rate_level as 1 | 2 | 3,
  mediaType: campaign.media_type as 'image' | 'video' | 'both',
  budget: campaign.budget,
  price: campaign.price,
  status: campaign.status as 'draft' | 'active' | 'paused' | 'completed',
  applicants: [], // Will be populated separately
  approvedTalents: [], // Will be populated separately
  createdAt: new Date(campaign.created_at || ''),
  deadline: campaign.deadline ? new Date(campaign.deadline) : undefined,
});

// Helper function to convert database order to app order type
const convertOrderToApp = (order: OrderRow, campaignTitle: string, talentName: string, productName: string): Order => ({
  id: order.id,
  campaignId: order.campaign_id,
  talentId: order.talent_id,
  founderId: order.founder_id,
  talentName,
  campaignTitle,
  productName,
  status: order.status as 'pending_shipment' | 'shipped' | 'delivered' | 'review_submitted' | 'completed',
  payout: order.payout,
  createdAt: new Date(order.created_at || ''),
  deliveryInfo: order.delivery_address ? {
    address: order.delivery_address,
    trackingNumber: order.tracking_number || undefined,
    courier: order.courier || undefined,
  } : undefined,
  reviewSubmission: order.review_media_url ? {
    mediaUrl: order.review_media_url,
    mediaType: order.review_media_type as 'image' | 'video',
    submittedAt: new Date(order.review_submitted_at || ''),
  } : undefined,
});

// Authentication functions
export const signUp = async (email: string, password: string, userData: any) => {
  console.log('Signing up with:', { email, password, userData }); // Debug input values
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) throw profileError;

  return {
    user: data.user,
    profile: convertProfileToUser(profile),
  };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  return convertProfileToUser(profile);
};

// Profile functions
export const updateProfile = async (userId: string, updates: Partial<ProfileRow>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return convertProfileToUser(data);
};

// Campaign functions
export const getCampaigns = async () => {
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get applications for each campaign
  const campaignsWithApplications = await Promise.all(
    campaigns.map(async (campaign) => {
      const { data: applications } = await supabase
        .from('campaign_applications')
        .select('talent_id, status')
        .eq('campaign_id', campaign.id);

      const applicants = applications?.filter(app => app.status === 'pending').map(app => app.talent_id) || [];
      const approvedTalents = applications?.filter(app => app.status === 'approved').map(app => app.talent_id) || [];

      return {
        ...convertCampaignToApp(campaign),
        applicants,
        approvedTalents,
      };
    })
  );

  return campaignsWithApplications;
};

export const createCampaign = async (campaignData: Omit<Campaign, 'id' | 'createdAt' | 'applicants' | 'approvedTalents'>) => {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      founder_id: campaignData.founderId,
      title: campaignData.title,
      description: campaignData.description,
      product_name: campaignData.productName,
      category: campaignData.category,
      duration: campaignData.duration,
      product_images: campaignData.productImages,
      rate_level: campaignData.rateLevel,
      media_type: campaignData.mediaType,
      budget: campaignData.budget,
      price: campaignData.price,
      status: campaignData.status,
      deadline: campaignData.deadline?.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return convertCampaignToApp(data);
};

export const updateCampaign = async (campaignId: string, updates: Partial<CampaignRow>) => {
  const { data, error } = await supabase
    .from('campaigns')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select()
    .single();

  if (error) throw error;
  return convertCampaignToApp(data);
};

export const deleteCampaign = async (campaignId: string) => {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId);

  if (error) throw error;
};

// Campaign application functions
export const applyCampaign = async (campaignId: string, talentId: string) => {
  const { data, error } = await supabase
    .from('campaign_applications')
    .insert({
      campaign_id: campaignId,
      talent_id: talentId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateApplicationStatus = async (campaignId: string, talentId: string, status: 'approved' | 'rejected') => {
  const { data, error } = await supabase
    .from('campaign_applications')
    .update({ status })
    .eq('campaign_id', campaignId)
    .eq('talent_id', talentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Order functions
export const getOrders = async (userId?: string) => {
  let query = supabase
    .from('orders')
    .select(`
      *,
      campaigns!inner(title, product_name),
      profiles!orders_talent_id_fkey(name)
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.or(`founder_id.eq.${userId},talent_id.eq.${userId}`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data.map(order => 
    convertOrderToApp(
      order,
      (order.campaigns as any).title,
      (order.profiles as any).name,
      (order.campaigns as any).product_name
    )
  );
};

export const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'talentName' | 'campaignTitle' | 'productName'>) => {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      campaign_id: orderData.campaignId,
      talent_id: orderData.talentId,
      founder_id: orderData.founderId,
      status: orderData.status,
      payout: orderData.payout,
      delivery_address: orderData.deliveryInfo?.address,
      tracking_number: orderData.deliveryInfo?.trackingNumber,
      courier: orderData.deliveryInfo?.courier,
    })
    .select(`
      *,
      campaigns!inner(title, product_name),
      profiles!orders_talent_id_fkey(name)
    `)
    .single();

  if (error) throw error;

  return convertOrderToApp(
    data,
    (data.campaigns as any).title,
    (data.profiles as any).name,
    (data.campaigns as any).product_name
  );
};

export const updateOrder = async (orderId: string, updates: Partial<OrderRow>) => {
  const { data, error } = await supabase
    .from('orders')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select(`
      *,
      campaigns!inner(title, product_name),
      profiles!orders_talent_id_fkey(name)
    `)
    .single();

  if (error) throw error;

  return convertOrderToApp(
    data,
    (data.campaigns as any).title,
    (data.profiles as any).name,
    (data.campaigns as any).product_name
  );
};

// Transaction functions
export const getTransactions = async (userId?: string) => {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data.map(transaction => ({
    id: transaction.id,
    userId: transaction.user_id,
    type: transaction.type as 'credit' | 'debit',
    amount: transaction.amount,
    description: transaction.description,
    relatedJobId: transaction.related_order_id || undefined,
    createdAt: new Date(transaction.created_at || ''),
  })) as Transaction[];
};

export const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: transactionData.userId,
      type: transactionData.type,
      amount: transactionData.amount,
      description: transactionData.description,
      related_order_id: transactionData.relatedJobId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    type: data.type as 'credit' | 'debit',
    amount: data.amount,
    description: data.description,
    relatedJobId: data.related_order_id || undefined,
    createdAt: new Date(data.created_at || ''),
  } as Transaction;
};

// Earnings functions
export const getEarnings = async (talentId?: string) => {
  let query = supabase
    .from('earnings')
    .select('*')
    .order('earned_at', { ascending: false });

  if (talentId) {
    query = query.eq('talent_id', talentId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data.map(earning => ({
    id: earning.id,
    talentId: earning.talent_id,
    orderId: earning.order_id,
    campaignTitle: earning.campaign_title,
    amount: earning.amount,
    status: earning.status as 'pending' | 'paid' | 'cancelled',
    earnedAt: new Date(earning.earned_at || ''),
    paidAt: earning.paid_at ? new Date(earning.paid_at) : undefined,
  })) as Earning[];
};

export const createEarning = async (earningData: Omit<Earning, 'id' | 'earnedAt'>) => {
  const { data, error } = await supabase
    .from('earnings')
    .insert({
      talent_id: earningData.talentId,
      order_id: earningData.orderId,
      campaign_title: earningData.campaignTitle,
      amount: earningData.amount,
      status: earningData.status,
      paid_at: earningData.paidAt?.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    talentId: data.talent_id,
    orderId: data.order_id,
    campaignTitle: data.campaign_title,
    amount: data.amount,
    status: data.status as 'pending' | 'paid' | 'cancelled',
    earnedAt: new Date(data.earned_at || ''),
    paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
  } as Earning;
};

export const updateEarning = async (earningId: string, updates: Partial<EarningRow>) => {
  const { data, error } = await supabase
    .from('earnings')
    .update(updates)
    .eq('id', earningId)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    talentId: data.talent_id,
    orderId: data.order_id,
    campaignTitle: data.campaign_title,
    amount: data.amount,
    status: data.status as 'pending' | 'paid' | 'cancelled',
    earnedAt: new Date(data.earned_at || ''),
    paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
  } as Earning;
};

// Message functions
export const getMessages = async (orderId?: string) => {
  let query = supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data.map(message => ({
    id: message.id,
    jobId: message.order_id,
    senderId: message.sender_id,
    content: message.content,
    timestamp: new Date(message.created_at || ''),
    read: message.read || false,
  })) as Message[];
};

export const createMessage = async (messageData: Omit<Message, 'id' | 'timestamp'>) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      order_id: messageData.jobId,
      sender_id: messageData.senderId,
      content: messageData.content,
      read: messageData.read,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    jobId: data.order_id,
    senderId: data.sender_id,
    content: data.content,
    timestamp: new Date(data.created_at || ''),
    read: data.read || false,
  } as Message;
};

// Real-time subscriptions
export const subscribeToMessages = (orderId: string, callback: (message: Message) => void) => {
  return supabase
    .channel(`messages:${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => {
        const message = {
          id: payload.new.id,
          jobId: payload.new.order_id,
          senderId: payload.new.sender_id,
          content: payload.new.content,
          timestamp: new Date(payload.new.created_at),
          read: payload.new.read || false,
        } as Message;
        callback(message);
      }
    )
    .subscribe();
};

export const subscribeToOrders = (userId: string, callback: (order: any) => void) => {
  return supabase
    .channel(`orders:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
};
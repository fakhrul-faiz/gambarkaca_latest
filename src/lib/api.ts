import { supabase } from './supabase';
import { Database } from './database.types';
import { User, Founder, Talent, Campaign, Order, Transaction, Earning, Message, Notification, DirectMessage } from '../types';

type Tables = Database['public']['Tables'];
type ProfileRow = Tables['profiles']['Row'];
type CampaignRow = Tables['campaigns']['Row'];
type OrderRow = Tables['orders']['Row'];
type TransactionRow = Tables['transactions']['Row'];
type EarningRow = Tables['earnings']['Row'];
type MessageRow = Tables['messages']['Row'];
type NotificationRow = Tables['notifications']['Row'];
type DirectMessageRow = Tables['direct_messages']['Row'];

// Helper function to convert database profile to app user type
const convertProfileToUser = (profile: ProfileRow): User | Founder | Talent => {
  const baseUser = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    phone: profile.phone || undefined,
    address: profile.address || undefined,
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
      walletBalance: Number(profile.wallet_balance) || 0,
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
      totalEarnings: Number(profile.total_earnings) || 0,
    } as Talent;
  }

  return baseUser;
};

// Helper function to convert database campaign to app campaign type
const convertCampaignToApp = (campaign: CampaignRow, applicants: string[] = [], approvedTalents: string[] = []): Campaign => ({
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
  budget: Number(campaign.budget) || 0,
  price: Number(campaign.price) || 0,
  status: campaign.status as 'draft' | 'active' | 'paused' | 'completed' | 'rejected',
  applicants,
  approvedTalents,
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
  payout: Number(order.payout) || 0,
  createdAt: new Date(order.created_at || ''),
  updatedAt: order.updated_at ? new Date(order.updated_at) : undefined,
  deliveryInfo: order.delivery_address ? {
    address: order.delivery_address,
    trackingNumber: order.tracking_number || undefined,
    courier: order.courier || undefined,
  } : undefined,
  reviewSubmission: order.review_media && Array.isArray(order.review_media) && order.review_media.length > 0 ? {
    media: order.review_media.map((item: any) => ({
      url: item.url,
      type: item.type,
    })),
    submittedAt: order.review_submitted_at ? new Date(order.review_submitted_at) : new Date(),
  } : undefined,
});

// Direct Message functions
export const getDirectMessages = async (userId: string, otherUserId?: string): Promise<DirectMessage[]> => {
  try {
    console.log('Fetching direct messages for user:', userId, 'and other user:', otherUserId);
    
    let query = supabase
      .from('direct_messages')
      .select(`
        *,
        sender:sender_id(id, name),
        receiver:receiver_id(id, name)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    
    if (otherUserId) {
      query = query.or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching direct messages:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No direct messages found');
      return [];
    }

    const convertedMessages = data.map(message => ({
      id: message.id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      senderName: message.sender ? (message.sender as any).name : undefined,
      receiverName: message.receiver ? (message.receiver as any).name : undefined,
      content: message.content,
      isRead: message.is_read || false,
      createdAt: new Date(message.created_at || ''),
    })) as DirectMessage[];

    return convertedMessages;
  } catch (error) {
    console.error('getDirectMessages error:', error);
    throw error;
  }
};

export const createDirectMessage = async (senderId: string, receiverId: string, content: string): Promise<DirectMessage> => {
  try {
    console.log('Creating direct message:', { senderId, receiverId, content });
    
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        is_read: false,
      })
      .select(`
        *,
        sender:sender_id(id, name),
        receiver:receiver_id(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating direct message:', error);
      throw error;
    }

    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      senderName: data.sender ? (data.sender as any).name : undefined,
      receiverName: data.receiver ? (data.receiver as any).name : undefined,
      content: data.content,
      isRead: data.is_read || false,
      createdAt: new Date(data.created_at || ''),
    } as DirectMessage;
  } catch (error) {
    console.error('createDirectMessage error:', error);
    throw error;
  }
};

export const markDirectMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking direct message as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('markDirectMessageAsRead error:', error);
    throw error;
  }
};

export const markAllDirectMessagesAsRead = async (senderId: string, receiverId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all direct messages as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('markAllDirectMessagesAsRead error:', error);
    throw error;
  }
};

export const subscribeToDirectMessages = (userId: string, callback: (message: DirectMessage) => void) => {
  return supabase
    .channel(`direct-messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`,
      },
      async (payload) => {
        // Get sender name
        const { data: sender } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', payload.new.sender_id)
          .single();

        // Get receiver name
        const { data: receiver } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', payload.new.receiver_id)
          .single();

        const message = {
          id: payload.new.id,
          senderId: payload.new.sender_id,
          receiverId: payload.new.receiver_id,
          senderName: sender?.name,
          receiverName: receiver?.name,
          content: payload.new.content,
          isRead: payload.new.is_read || false,
          createdAt: new Date(payload.new.created_at),
        } as DirectMessage;
        callback(message);
      }
    )
    .subscribe();
};

// Get admin users
export const getAdminUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin');

    if (error) {
      console.error('Error fetching admin users:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(profile => convertProfileToUser(profile));
  } catch (error) {
    console.error('getAdminUsers error:', error);
    throw error;
  }
};

// Authentication functions
export const signUp = async (email: string, password: string, userData: any) => {
  try {
    
    // First check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          role: userData.role,
          company: userData.company,
          bio: userData.bio,
        },
      },
    });

    if (error) {
      console.error('Supabase signup error:', error);
      // Handle specific Supabase errors
      if (error.message.includes('user_already_exists') || error.message.includes('already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      if (error.message.includes('invalid_email')) {
        throw new Error('Please enter a valid email address.');
      }
      if (error.message.includes('weak_password')) {
        throw new Error('Password must be at least 6 characters long.');
      }
      throw new Error(error.message || 'Registration failed. Please try again.');
    }

    return data;
  } catch (error: any) {
    console.error('Registration error:', error);
    // Re-throw our custom errors
    if (error.message.includes('already exists') || error.message.includes('valid email') || error.message.includes('Password must')) {
      throw error;
    }
    
    // Handle any other unexpected errors
    throw new Error('Registration failed. Please try again.');
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase signin error:', error);
      // Handle specific Supabase auth errors
      if (error.message.includes('invalid_credentials') || error.message.includes('Invalid login')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      if (error.message.includes('email_not_confirmed')) {
        throw new Error('Please check your email and click the confirmation link before signing in.');
      }
      if (error.message.includes('too_many_requests')) {
        throw new Error('Too many login attempts. Please wait a few minutes and try again.');
      }
      throw new Error(error.message || 'Sign in failed. Please try again.');
    }

    if (!data.user) {
      throw new Error('Sign in failed. Please try again.');
    }


    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Failed to load user profile. Please try again.');
    }

    if (!profile) {
      throw new Error('User profile not found. Please contact support.');
    }


    // Check if user account is active
    if (profile.status === 'suspended') {
      throw new Error('Your account has been suspended. Please contact support.');
    }

    const convertedProfile = convertProfileToUser(profile);

    return {
      user: data.user,
      profile: convertedProfile,
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    // Handle refresh token errors by clearing the session
    if (getUserError && getUserError.message && getUserError.message.includes('refresh_token_not_found')) {
      await supabase.auth.signOut();
      return null;
    }
    
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Get current user error:', error);
      return null;
    }

    if (!profile) return null;

    return convertProfileToUser(profile);
  } catch (error) {
    console.error('Get current user error:', error);
    // Also handle refresh token errors in the catch block
    if (error && typeof error === 'object' && 'message' in error && 
        typeof error.message === 'string' && error.message.includes('refresh_token_not_found')) {
      await supabase.auth.signOut();
    }
    return null;
  }
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

// Admin functions for managing users
export const getFounders = async (): Promise<Founder[]> => {
  try {
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'founder')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching founders:', error);
      throw error;
    }

    
    if (!data || data.length === 0) {
      return [];
    }

    const convertedFounders = data.map(profile => {
      return convertProfileToUser(profile);
    }) as Founder[];
    
    return convertedFounders;
  } catch (error) {
    console.error('getFounders error:', error);
    throw error;
  }
};

export const getTalents = async (): Promise<Talent[]> => {
  try {
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'talent')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching talents:', error);
      throw error;
    }

    
    if (!data || data.length === 0) {
      return [];
    }

    const convertedTalents = data.map(profile => {
      return convertProfileToUser(profile);
    }) as Talent[];
    
    return convertedTalents;
  } catch (error) {
    console.error('getTalents error:', error);
    throw error;
  }
};

export const updateUserStatus = async (userId: string, status: 'active' | 'pending' | 'suspended') => {
  try {
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
    
    return convertProfileToUser(data);
  } catch (error) {
    console.error('updateUserStatus error:', error);
    throw error;
  }
};

// Campaign functions
export const getCampaigns = async (): Promise<Campaign[]> => {
  try {
    
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }


    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    // Get applications for each campaign
    const campaignsWithApplications = await Promise.all(
      campaigns.map(async (campaign) => {
        const { data: applications, error: appError } = await supabase
          .from('campaign_applications')
          .select('talent_id, status')
          .eq('campaign_id', campaign.id);

        if (appError) {
          console.error('Error fetching applications for campaign:', campaign.id, appError);
          return convertCampaignToApp(campaign, [], []);
        }

        const applicants = applications?.filter(app => app.status === 'pending').map(app => app.talent_id) || [];
        const approvedTalents = applications?.filter(app => app.status === 'approved').map(app => app.talent_id) || [];

        return convertCampaignToApp(campaign, applicants, approvedTalents);
      })
    );

    return campaignsWithApplications;
  } catch (error) {
    console.error('getCampaigns error:', error);
    throw error;
  }
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
  // Check if already applied
  const { data: existingApplications } = await supabase
    .from('campaign_applications')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('talent_id', talentId);

  if (existingApplications && existingApplications.length > 0) {
    throw new Error('You have already applied to this campaign.');
  }

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
export const getOrders = async (userId?: string): Promise<Order[]> => {
  try {
    
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

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }


    if (!data || data.length === 0) {
      console.log('No orders found in database');
      return [];
    }

    const convertedOrders = data.map(order => 
      convertOrderToApp(
        order,
        (order.campaigns as any).title,
        (order.profiles as any).name,
        (order.campaigns as any).product_name
      )
    );

    return convertedOrders;
  } catch (error) {
    console.error('getOrders error:', error);
    throw error;
  }
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

export const updateOrder = async (orderId: string, updates: Partial<OrderRow> & { review_media?: { url: string, type: 'image' | 'video' }[] }) => {
  const { data, error } = await supabase
    .from('orders')
    .update({
      ...updates,
      review_media: updates.review_media ? updates.review_media : undefined,
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
export const getTransactions = async (userId?: string): Promise<Transaction[]> => {
  try {
    console.log('Fetching transactions from database for user:', userId);
    
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No transactions found in database');
      return [];
    }

    const convertedTransactions = data.map(transaction => ({
      id: transaction.id,
      userId: transaction.user_id,
      type: transaction.type as 'credit' | 'debit',
      amount: Number(transaction.amount) || 0,
      description: transaction.description,
      relatedJobId: transaction.related_order_id || undefined,
      createdAt: new Date(transaction.created_at || ''),
    })) as Transaction[];

    return convertedTransactions;
  } catch (error) {
    console.error('getTransactions error:', error);
    throw error;
  }
};

export const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase
    .from('transactions') 
    .insert([{
      user_id: transactionData.user_id || transactionData.userId, 
      type: transactionData.type, 
      amount: transactionData.amount,
      description: transactionData.description, 
      related_order_id: transactionData.relatedJobId
    }])
    .select();

console.log("masuk sini", transactionData);

  if (error) throw error;

    
  if (data && data.length > 0) {
    return {
      id: data[0].id,
      userId: data[0].user_id,
      type: data[0].type as 'credit' | 'debit',
      amount: Number(data[0].amount) || 0,
      description: data[0].description,
      relatedJobId: data[0].related_order_id || undefined,
      createdAt: new Date(data[0].created_at || ''),
    } as Transaction;
  }

  console.log("masuk sini", transactionData);
  return transactionData;
};

// Earnings functions
export const getEarnings = async (talentId?: string): Promise<Earning[]> => {
  try {
    console.log('Fetching earnings from database for talent:', talentId);
    
    let query = supabase
      .from('earnings')
      .select('*')
      .order('earned_at', { ascending: false });

    if (talentId) {
      query = query.eq('talent_id', talentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching earnings:', error);
      throw error;
    }

    console.log('Raw earnings data:', data);

    if (!data || data.length === 0) {
      console.log('No earnings found in database');
      return [];
    }

    const convertedEarnings = data.map(earning => ({
      id: earning.id,
      talentId: earning.talent_id,
      orderId: earning.order_id,
      campaignTitle: earning.campaign_title,
      amount: Number(earning.amount) || 0,
      status: earning.status as 'pending' | 'paid' | 'cancelled',
      earnedAt: new Date(earning.earned_at || ''),
      paidAt: earning.paid_at ? new Date(earning.paid_at) : undefined,
    })) as Earning[];

    console.log('Converted earnings:', convertedEarnings);
    return convertedEarnings;
  } catch (error) {
    console.error('getEarnings error:', error);
    throw error;
  }
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
    amount: Number(data.amount) || 0,
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
    amount: Number(data.amount) || 0,
    status: data.status as 'pending' | 'paid' | 'cancelled',
    earnedAt: new Date(data.earned_at || ''),
    paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
  } as Earning;
};

// Message functions
export const getMessages = async (orderId?: string): Promise<Message[]> => {
  try {
    console.log('Fetching messages from database for order:', orderId);
    
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    console.log('Raw messages data:', data);

    if (!data || data.length === 0) {
      console.log('No messages found in database');
      return [];
    }

    const convertedMessages = data.map(message => ({
      id: message.id,
      jobId: message.order_id,
      senderId: message.sender_id,
      content: message.content,
      timestamp: new Date(message.created_at || ''),
      read: message.read || false,
    })) as Message[];

    console.log('Converted messages:', convertedMessages);
    return convertedMessages;
  } catch (error) {
    console.error('getMessages error:', error);
    throw error;
  }
};

export const createMessage = async (messageData: Omit<Message, 'id' | 'timestamp'>) => {
  try {
    console.log('Creating new message:', messageData);
    
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

    if (error) {
      console.error('Error creating message:', error);
      throw error;
    }

    console.log('Message created successfully:', data);

    return {
      id: data.id,
      jobId: data.order_id,
      senderId: data.sender_id,
      content: data.content,
      timestamp: new Date(data.created_at || ''),
      read: data.read || false,
    } as Message;
  } catch (error) {
    console.error('createMessage error:', error);
    throw error;
  }
};

// Notification functions
export const getNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    console.log('Fetching notifications for user:', userId);
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No notifications found for user');
      return [];
    }

    const convertedNotifications = data.map(notification => ({
      id: notification.id,
      userId: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.type as 'campaign_status' | 'order_status' | 'profile_status' | 'payment' | 'application',
      relatedEntityId: notification.related_entity_id || undefined,
      relatedEntityType: notification.related_entity_type || undefined,
      isRead: notification.is_read || false,
      createdAt: new Date(notification.created_at || ''),
    })) as Notification[];

    return convertedNotifications;
  } catch (error) {
    console.error('getNotifications error:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('markAllNotificationsAsRead error:', error);
    throw error;
  }
};

export const subscribeToNotifications = (userId: string, callback: (notification: Notification) => void) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = {
          id: payload.new.id,
          userId: payload.new.user_id,
          title: payload.new.title,
          message: payload.new.message,
          type: payload.new.type,
          relatedEntityId: payload.new.related_entity_id,
          relatedEntityType: payload.new.related_entity_type,
          isRead: payload.new.is_read || false,
          createdAt: new Date(payload.new.created_at),
        } as Notification;
        callback(notification);
      }
    )
    .subscribe();
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

export async function deleteReviewMedia(orderId: string, mediaUrl: string): Promise<boolean> {
  try {
    // 1. Delete from Supabase Storage
    const url = new URL(mediaUrl);
    const pathParts = url.pathname.split('/');
    const idx = pathParts.findIndex(p => p === 'review-submissions');
    if (idx === -1 || idx === pathParts.length - 1) {
      throw new Error('Invalid review media URL. File path not found.');
    }
    const filePath = pathParts.slice(idx + 1).join('/');

    const { error: storageError } = await supabase
      .storage
      .from('review-submissions')
      .remove([filePath]);
    if (storageError) throw new Error(storageError.message || 'Failed to delete file from storage.');

    // 2. Remove from review_media in the database
    // Fetch the current review_media array for the order
    const { data: orderRow, error: fetchError } = await supabase
      .from('orders')
      .select('review_media')
      .eq('id', orderId)
      .single();
    if (fetchError) throw new Error('Failed to fetch order for review_media update.');

    let updatedMedia = (orderRow?.review_media || []).filter((m: any) => m.url !== mediaUrl);

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({ review_media: updatedMedia.length > 0 ? updatedMedia : null })
      .eq('id', orderId);
    if (updateError) throw new Error('Failed to update review_media in order.');

    return true;
  } catch (err: any) {
    console.error('[deleteReviewMedia] Error:', err);
    throw new Error('Failed to delete review media: ' + (err.message || err));
  }
};

// Test WhatsApp notification function (for development/testing)
export const testWhatsAppNotification = async (userId: string, title: string, message: string) => {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-notification`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        user_id: userId,
        title: title,
        message: message,
        type: 'test'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send WhatsApp notification');
    }
    
    return data;
  } catch (error: any) {
    console.error('Error sending test WhatsApp notification:', error);
    throw new Error(`WhatsApp notification failed: ${error.message || 'Unknown error occurred'}`);
  }
};

    // Fetch withdrawals for a user
    export const getWithdrawals = async (userId: string) => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('id, user_id, amount, admin_fee, bank_name, account_number, account_holder, status, requested_at, chip_payout_id, chip_status, chip_error_message')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data || [];
    };
    
    export const requestChipWithdrawal = async (
      userId: string,
      amount: number,
      bankName: string,
      accountNumber: string,
      accountHolder: string,
      withdrawalId: string,
      email: string,
      description: string,
      bankCode: string
    ) => {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-chip-payout`;
        
        console.log('Requesting CHIP withdrawal:', { userId, amount, bankName, accountNumber, accountHolder, withdrawalId, bankCode, email, description });
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            userId,
            amount,
            bankName,
            accountNumber,
            accountHolder,
            withdrawalId,
            email,
            description,
            bankCode
          })
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || data.message || 'Failed to process withdrawal request');
        }
        
        return data;
      } catch (error: any) {
        console.error('Error requesting CHIP withdrawal:', error);
        
        // Provide more specific error messages
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          throw new Error('Network error: Unable to connect to withdrawal service. Please check your internet connection and try again.');
        }
        
        throw new Error(`Withdrawal request failed: ${error.message || 'Unknown error occurred'}`);
      }
    };

export const createPurchaseChipIn = async (
  userId: string,
  amount: number
) => {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-purchase-chip-in`;

    console.log('Requesting CHIP purchase:', { userId, amount });
    console.log('API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        userId,
        amount
      })
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to create CHIP purchase');
    }

    return data; // Expected { success: true, purchase: { id, checkout_url, ... } }
  } catch (error: any) {
    console.error('Error requesting CHIP purchase:', error);

    // More specific error handling
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error(
        'Network error: Unable to connect to purchase service. Please check your internet connection and try again.'
      );
    }

    throw new Error(`Purchase request failed: ${error.message || 'Unknown error occurred'}`);
  }
};


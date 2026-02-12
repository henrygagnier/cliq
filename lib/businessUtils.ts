// Business Dashboard Utility Functions
import { supabase } from './supabase';

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  address: string;
  phone: string;
  website: string;
  logo_url?: string;
  cover_photo_url?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface BusinessOffer {
  id: string;
  business_id: string;
  title: string;
  description: string;
  offer_type: 'percentage' | 'fixed' | 'bogo' | 'free_item' | 'loyalty';
  offer_value: string;
  duration_value: number;
  duration_unit: 'hours' | 'days';
  expires_at: string;
  redemption_limit: string;
  redemptions_count: number;
  is_active: boolean;
  offer_category: 'custom' | 'loyalty' | 'ai';
  loyalty_mode?: 'checkins' | 'purchases';
  loyalty_check_ins?: number;
  loyalty_product?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Check if a user is a business owner
 */
export const isBusinessOwner = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error) return false;
    return !!data;
  } catch (error) {
    return false;
  }
};

/**
 * Get business profile by user ID
 */
export const getBusinessProfile = async (
  userId: string
): Promise<BusinessProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching business profile:', error);
    return null;
  }
};

/**
 * Get business profile by ID
 */
export const getBusinessProfileById = async (
  businessId: string
): Promise<BusinessProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching business profile:', error);
    return null;
  }
};

/**
 * Create a new business profile
 */
export const createBusinessProfile = async (
  userId: string,
  profileData: {
    business_name: string;
    description?: string;
    address?: string;
    phone?: string;
    website?: string;
    categories: string[];
  }
): Promise<BusinessProfile | null> => {
  try {
    // Create business profile
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .insert({
        user_id: userId,
        business_name: profileData.business_name,
        description: profileData.description,
        address: profileData.address,
        phone: profileData.phone,
        website: profileData.website,
        status: 'active',
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // Add categories
    if (profileData.categories.length > 0) {
      const categoryInserts = profileData.categories.map((category) => ({
        business_id: profile.id,
        category,
      }));

      const { error: categoriesError } = await supabase
        .from('business_categories')
        .insert(categoryInserts);

      if (categoriesError) throw categoriesError;
    }

    return profile;
  } catch (error) {
    console.error('Error creating business profile:', error);
    return null;
  }
};

/**
 * Update business profile
 */
export const updateBusinessProfile = async (
  businessId: string,
  updates: Partial<BusinessProfile>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('business_profiles')
      .update(updates)
      .eq('id', businessId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating business profile:', error);
    return false;
  }
};

/**
 * Get business categories
 */
export const getBusinessCategories = async (
  businessId: string
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('business_categories')
      .select('category')
      .eq('business_id', businessId);

    if (error) throw error;
    return data.map((item) => item.category);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * Update business categories
 */
export const updateBusinessCategories = async (
  businessId: string,
  categories: string[]
): Promise<boolean> => {
  try {
    // Delete existing categories
    await supabase.from('business_categories').delete().eq('business_id', businessId);

    // Insert new categories
    if (categories.length > 0) {
      const categoryInserts = categories.map((category) => ({
        business_id: businessId,
        category,
      }));

      const { error } = await supabase
        .from('business_categories')
        .insert(categoryInserts);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error updating categories:', error);
    return false;
  }
};

/**
 * Get active offers for a business
 */
export const getActiveOffers = async (
  businessId: string
): Promise<BusinessOffer[]> => {
  try {
    const { data, error } = await supabase
      .from('business_offers')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active offers:', error);
    return [];
  }
};

/**
 * Get all offers for a business (including inactive)
 */
export const getAllOffers = async (businessId: string): Promise<BusinessOffer[]> => {
  try {
    const { data, error } = await supabase
      .from('business_offers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching offers:', error);
    return [];
  }
};

/**
 * Create a new offer
 */
export const createOffer = async (
  offerData: Omit<BusinessOffer, 'id' | 'created_at' | 'updated_at' | 'redemptions_count'>
): Promise<BusinessOffer | null> => {
  try {
    const { data, error } = await supabase
      .from('business_offers')
      .insert({ ...offerData, redemptions_count: 0 })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating offer:', error);
    return null;
  }
};

/**
 * Update an offer
 */
export const updateOffer = async (
  offerId: string,
  updates: Partial<BusinessOffer>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('business_offers')
      .update(updates)
      .eq('id', offerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating offer:', error);
    return false;
  }
};

/**
 * Toggle offer active status
 */
export const toggleOfferStatus = async (offerId: string): Promise<boolean> => {
  try {
    const { data: offer } = await supabase
      .from('business_offers')
      .select('is_active')
      .eq('id', offerId)
      .single();

    if (!offer) return false;

    const { error } = await supabase
      .from('business_offers')
      .update({ is_active: !offer.is_active })
      .eq('id', offerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error toggling offer status:', error);
    return false;
  }
};

/**
 * Increment analytics metric
 */
export const incrementMetric = async (
  businessId: string,
  metric: 'views' | 'check_ins' | 'comments' | 'promotions',
  date?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('increment_business_metric', {
      p_business_id: businessId,
      p_metric: metric,
      p_date: date || new Date().toISOString().split('T')[0],
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error incrementing metric:', error);
    return false;
  }
};

/**
 * Get analytics for a date range
 */
export const getAnalytics = async (
  businessId: string,
  startDate: string,
  endDate: string
): Promise<any[]> => {
  try {
    const { data, error } = await supabase.rpc('get_business_analytics', {
      p_business_id: businessId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return [];
  }
};

/**
 * Get unmoderated messages count
 */
export const getUnmoderatedMessagesCount = async (
  businessId: string
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('business_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_moderated', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching unmoderated count:', error);
    return 0;
  }
};

/**
 * Get business messages
 */
export const getBusinessMessages = async (
  businessId: string,
  filter?: 'all' | 'pending' | 'approved' | 'rejected'
): Promise<any[]> => {
  try {
    let query = supabase
      .from('business_chat_messages')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.eq('is_moderated', false);
    } else if (filter && filter !== 'all') {
      query = query.eq('moderation_status', filter);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

/**
 * Moderate a message
 */
export const moderateMessage = async (
  messageId: string,
  status: 'approved' | 'rejected'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('business_chat_messages')
      .update({
        is_moderated: true,
        moderation_status: status,
      })
      .eq('id', messageId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error moderating message:', error);
    return false;
  }
};

/**
 * Redeem an offer
 */
export const redeemOffer = async (
  offerId: string,
  userId: string,
  businessId: string
): Promise<boolean> => {
  try {
    // Check if offer is still valid
    const { data: offer } = await supabase
      .from('business_offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (!offer || !offer.is_active) {
      throw new Error('Offer is not active');
    }

    if (new Date(offer.expires_at) < new Date()) {
      throw new Error('Offer has expired');
    }

    // Check redemption limit
    if (
      offer.redemption_limit !== 'unlimited' &&
      offer.redemptions_count >= parseInt(offer.redemption_limit)
    ) {
      throw new Error('Redemption limit reached');
    }

    // Create redemption record
    const { error: redemptionError } = await supabase
      .from('offer_redemptions')
      .insert({
        offer_id: offerId,
        user_id: userId,
        business_id: businessId,
      });

    if (redemptionError) throw redemptionError;

    // Increment redemption count
    const { error: updateError } = await supabase
      .from('business_offers')
      .update({
        redemptions_count: offer.redemptions_count + 1,
      })
      .eq('id', offerId);

    if (updateError) throw updateError;

    // Increment promotions metric
    await incrementMetric(businessId, 'promotions');

    return true;
  } catch (error) {
    console.error('Error redeeming offer:', error);
    return false;
  }
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format time ago (e.g., "2 hours ago")
 */
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

/**
 * Calculate expires in (e.g., "3 days")
 */
export const formatExpiresIn = (expiresAt: string): string => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffTime = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
  return `${Math.ceil(diffDays / 30)} months`;
};

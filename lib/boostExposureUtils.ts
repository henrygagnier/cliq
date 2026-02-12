import { supabase } from './supabase';

// Types
export interface RafflePeriod {
  id: string;
  start_date: string;
  end_date: string;
  announcement_date: string;
  status: 'active' | 'selecting' | 'completed';
}

export interface RaffleEntry {
  id: string;
  business_id: string;
  raffle_period_id: string;
  category: string;
  entered_at: string;
}

export interface SponsoredPlacement {
  id: string;
  business_id: string;
  category: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
  days_remaining: number;
}

/**
 * Get the current active raffle period
 */
export async function getActiveRafflePeriod(): Promise<RafflePeriod | null> {
  try {
    const { data, error } = await supabase
      .from('boost_raffle_periods')
      .select('*')
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Error fetching active raffle:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getActiveRafflePeriod:', error);
    return null;
  }
}

/**
 * Check if a business has already entered the current raffle
 */
export async function hasBusinessEnteredRaffle(businessId: string): Promise<boolean> {
  try {
    console.log('🔍 [hasBusinessEnteredRaffle] Checking entry for business:', businessId);
    
    // Try the RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc('has_entered_raffle', {
      p_business_id: businessId
    });

    console.log('🔍 [hasBusinessEnteredRaffle] RPC result:', { data: rpcData, error: rpcError });

    // Also do a direct query as a backup check
    const { data: directData, error: directError } = await supabase
      .from('boost_raffle_entries')
      .select('id, raffle_period_id, boost_raffle_periods!inner(status)')
      .eq('business_id', businessId)
      .eq('boost_raffle_periods.status', 'active')
      .maybeSingle();

    console.log('🔍 [hasBusinessEnteredRaffle] Direct query result:', { 
      data: directData, 
      error: directError,
      hasEntry: !!directData 
    });

    // If direct query found an entry, return true regardless of RPC
    if (directData) {
      console.log('✅ [hasBusinessEnteredRaffle] Direct query found entry - returning true');
      return true;
    }

    if (rpcError) {
      console.error('❌ [hasBusinessEnteredRaffle] RPC error:', rpcError);
      return false;
    }

    console.log('✅ [hasBusinessEnteredRaffle] Final result:', rpcData || false);
    return rpcData || false;
  } catch (error) {
    console.error('❌ [hasBusinessEnteredRaffle] Exception:', error);
    return false;
  }
}

/**
 * Get the total number of entries for a specific category in the current raffle
 */
export async function getRaffleEntriesCount(
  rafflePeriodId: string,
  category: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_raffle_entries_count', {
      p_raffle_period_id: rafflePeriodId,
      p_category: category
    });

    if (error) {
      console.error('Error getting entries count:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error in getRaffleEntriesCount:', error);
    return 0;
  }
}

/**
 * Enter the current raffle for a business
 */
export async function enterRaffle(
  businessId: string,
  category: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🎫 [enterRaffle] Starting entry process...', { businessId, category });
    
    // Verify business exists and belongs to current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ [enterRaffle] Not authenticated');
      return { success: false, error: 'Not authenticated' };
    }
    console.log('✅ [enterRaffle] User authenticated:', user.id);

    // Verify business profile exists
    const { data: businessProfile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, user_id')
      .eq('id', businessId)
      .single();

    if (profileError || !businessProfile) {
      console.log('❌ [enterRaffle] Business profile not found:', profileError);
      return { success: false, error: 'Business profile not found' };
    }

    if (businessProfile.user_id !== user.id) {
      console.log('❌ [enterRaffle] Business ownership mismatch');
      return { success: false, error: 'Business does not belong to current user' };
    }
    console.log('✅ [enterRaffle] Business ownership verified');

    // Get active raffle period
    const rafflePeriod = await getActiveRafflePeriod();
    console.log('🎯 [enterRaffle] Active raffle period:', rafflePeriod?.id);
    
    if (!rafflePeriod) {
      console.log('❌ [enterRaffle] No active raffle period');
      return { success: false, error: 'No active raffle period found' };
    }

    // Check if already entered
    console.log('🔍 [enterRaffle] Pre-checking for duplicate entry...');
    const alreadyEntered = await hasBusinessEnteredRaffle(businessId);
    console.log('🔍 [enterRaffle] Pre-check result:', alreadyEntered);
    
    if (alreadyEntered) {
      console.log('⚠️ [enterRaffle] Already entered - blocking insertion');
      return { success: false, error: 'Already entered in current raffle' };
    }

    // Insert entry
    const { error } = await supabase
      .from('boost_raffle_entries')
      .insert({
        business_id: businessId,
        raffle_period_id: rafflePeriod.id,
        category: category
      });

    if (error) {
      console.error('Error entering raffle:', error);
      
      // Provide more specific error messages
      if (error.code === '42501') {
        return { 
          success: false, 
          error: 'Permission denied. Please ensure you own this business and try again.' 
        };
      }
      
      // Check for duplicate entry (unique constraint violation)
      if (error.code === '23505' || 
          error.message?.includes('unique_business_per_period') ||
          error.message?.includes('duplicate key')) {
        return { 
          success: false, 
          error: 'Already entered in current raffle' 
        };
      }
      
      return { success: false, error: error.message || 'Failed to enter raffle' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in enterRaffle:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get active sponsored placement for a business
 */
export async function getActiveSponsoredPlacement(
  businessId: string
): Promise<SponsoredPlacement | null> {
  try {
    const { data, error } = await supabase
      .from('boost_sponsored_placements')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching sponsored placement:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getActiveSponsoredPlacement:', error);
    return null;
  }
}

/**
 * Get raffle entry details for a business in the current period
 */
export async function getCurrentRaffleEntry(
  businessId: string
): Promise<RaffleEntry | null> {
  try {
    const rafflePeriod = await getActiveRafflePeriod();
    
    if (!rafflePeriod) {
      return null;
    }

    const { data, error } = await supabase
      .from('boost_raffle_entries')
      .select('*')
      .eq('business_id', businessId)
      .eq('raffle_period_id', rafflePeriod.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching raffle entry:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCurrentRaffleEntry:', error);
    return null;
  }
}

/**
 * Calculate days until announcement
 */
export function getDaysUntilAnnouncement(announcementDate: string): number {
  const announcement = new Date(announcementDate);
  const today = new Date();
  const diffTime = announcement.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

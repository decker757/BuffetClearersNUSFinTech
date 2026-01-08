import { supabase } from '../config/supabase.js';

/**
 * Clean up old failed or stuck NFT records
 * This removes NFTs that failed to mint or got stuck in 'minting' state
 *
 * Run this periodically (e.g., daily cron job) to keep database clean
 */
export async function cleanupFailedNFTs() {
  try {
    console.log('🧹 Cleaning up failed NFT records...');

    // Delete NFTs that have been in 'minting' state for more than 10 minutes
    // (they're probably stuck/failed)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: stuckNFTs, error: fetchError } = await supabase
      .from('NFTOKEN')
      .select('nftoken_id, invoice_number, current_state')
      .eq('current_state', 'minting')
      .lt('created_at', tenMinutesAgo);

    if (fetchError) {
      console.error('Error fetching stuck NFTs:', fetchError);
      return;
    }

    if (stuckNFTs && stuckNFTs.length > 0) {
      console.log(`Found ${stuckNFTs.length} stuck NFTs in 'minting' state`);

      // Delete them
      const { error: deleteError } = await supabase
        .from('NFTOKEN')
        .delete()
        .eq('current_state', 'minting')
        .lt('created_at', tenMinutesAgo);

      if (deleteError) {
        console.error('Error deleting stuck NFTs:', deleteError);
      } else {
        console.log(`✓ Deleted ${stuckNFTs.length} stuck NFT records`);
      }
    }

    // Delete explicitly failed NFTs older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: failedNFTs, error: failedFetchError } = await supabase
      .from('NFTOKEN')
      .select('nftoken_id, invoice_number, current_state')
      .eq('current_state', 'failed')
      .lt('created_at', oneHourAgo);

    if (failedFetchError) {
      console.error('Error fetching failed NFTs:', failedFetchError);
      return;
    }

    if (failedNFTs && failedNFTs.length > 0) {
      console.log(`Found ${failedNFTs.length} failed NFTs`);

      const { error: deleteFailedError } = await supabase
        .from('NFTOKEN')
        .delete()
        .eq('current_state', 'failed')
        .lt('created_at', oneHourAgo);

      if (deleteFailedError) {
        console.error('Error deleting failed NFTs:', deleteFailedError);
      } else {
        console.log(`✓ Deleted ${failedNFTs.length} failed NFT records`);
      }
    }

    console.log('✓ Cleanup complete');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run cleanup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupFailedNFTs().then(() => {
    console.log('Cleanup finished');
    process.exit(0);
  });
}

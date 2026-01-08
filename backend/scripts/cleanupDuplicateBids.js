import 'dotenv/config';
import { supabase } from '../src/config/supabase.js';

async function cleanupDuplicateBids() {
  try {
    console.log('🔍 Finding duplicate bids...\n');

    // Get all active bids
    const { data: allBids, error } = await supabase
      .from('AUCTIONBIDS')
      .select('bid_id, aid, bid_by, bid_amount, created_at, check_status')
      .eq('check_status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bids:', error);
      return;
    }

    console.log(`Found ${allBids.length} active bids total\n`);

    // Group bids by user and auction
    const bidsByUserAndAuction = {};

    allBids.forEach(bid => {
      const key = `${bid.bid_by}_${bid.aid}`;
      if (!bidsByUserAndAuction[key]) {
        bidsByUserAndAuction[key] = [];
      }
      bidsByUserAndAuction[key].push(bid);
    });

    // Find duplicates (more than 1 bid per user per auction)
    let totalDuplicates = 0;
    const bidsToDelete = [];

    for (const [key, bids] of Object.entries(bidsByUserAndAuction)) {
      if (bids.length > 1) {
        const [bidBy, aid] = key.split('_');
        console.log(`📍 Found ${bids.length} bids for user ${bidBy.substring(0, 10)}... on auction ${aid}:`);

        // Sort by created_at (newest first)
        bids.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Keep the first (newest), mark rest for deletion
        const [keepBid, ...oldBids] = bids;

        console.log(`  ✅ KEEP: bid_id ${keepBid.bid_id} - ${keepBid.bid_amount} RLUSD (${keepBid.created_at})`);
        oldBids.forEach(bid => {
          console.log(`  ❌ DELETE: bid_id ${bid.bid_id} - ${bid.bid_amount} RLUSD (${bid.created_at})`);
          bidsToDelete.push(bid.bid_id);
        });

        totalDuplicates += oldBids.length;
        console.log('');
      }
    }

    if (bidsToDelete.length === 0) {
      console.log('✨ No duplicates found! Database is clean.\n');
      return;
    }

    console.log(`\n🗑️  Found ${totalDuplicates} duplicate bids to delete\n`);
    console.log('Deleting old duplicate bids...');

    // Delete old bids
    const { error: deleteError } = await supabase
      .from('AUCTIONBIDS')
      .delete()
      .in('bid_id', bidsToDelete);

    if (deleteError) {
      console.error('❌ Error deleting bids:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${bidsToDelete.length} duplicate bids!\n`);

    // Now recalculate current_bid for affected auctions
    const affectedAuctions = [...new Set(
      Object.keys(bidsByUserAndAuction)
        .filter(key => bidsByUserAndAuction[key].length > 1)
        .map(key => parseInt(key.split('_')[1]))
    )];

    console.log(`🔄 Recalculating current_bid for ${affectedAuctions.length} affected auctions...\n`);

    for (const auctionId of affectedAuctions) {
      // Get highest active bid for this auction
      const { data: highestBid } = await supabase
        .from('AUCTIONBIDS')
        .select('bid_amount')
        .eq('aid', auctionId)
        .eq('check_status', 'active')
        .order('bid_amount', { ascending: false })
        .limit(1)
        .single();

      if (highestBid) {
        // Update auction's current_bid
        await supabase
          .from('AUCTIONLISTING')
          .update({ current_bid: highestBid.bid_amount })
          .eq('aid', auctionId);

        console.log(`  ✅ Auction ${auctionId}: current_bid → ${highestBid.bid_amount} RLUSD`);
      }
    }

    console.log('\n✨ Cleanup complete! Refresh your dashboard to see the changes.\n');

  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    process.exit(0);
  }
}

// Run the cleanup
cleanupDuplicateBids();

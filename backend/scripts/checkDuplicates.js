import 'dotenv/config';
import { supabase } from '../src/config/supabase.js';

async function checkDuplicates() {
  const { data } = await supabase
    .from('AUCTIONBIDS')
    .select(`
      bid_id,
      aid,
      bid_amount,
      bid_by,
      created_at,
      AUCTIONLISTING!inner(aid, expiry, nftoken_id, NFTOKEN(invoice_number))
    `)
    .eq('bid_by', 'rLMxWoCBKPtBP9gkXyry7Xd274T5qxMTVc')
    .eq('check_status', 'active')
    .order('aid', { ascending: true })
    .order('created_at', { ascending: false });

  console.log('\n📋 Active bids for user:\n');

  // Group by auction ID
  const grouped = {};
  data.forEach(bid => {
    if (!grouped[bid.aid]) grouped[bid.aid] = [];
    grouped[bid.aid].push(bid);
  });

  Object.entries(grouped).forEach(([aid, bids]) => {
    const invoice = bids[0].AUCTIONLISTING?.NFTOKEN?.invoice_number || 'Unknown';
    const expiry = bids[0].AUCTIONLISTING?.expiry
      ? new Date(bids[0].AUCTIONLISTING.expiry).toLocaleString()
      : 'Unknown';

    console.log(`🎯 Auction ${aid} (${invoice}) - Expires: ${expiry}`);
    console.log(`   Found ${bids.length} bid(s):`);
    bids.forEach(bid => {
      console.log(`   - bid_id: ${bid.bid_id}, amount: ${bid.bid_amount} RLUSD, created: ${bid.created_at}`);
    });
    console.log('');
  });

  const duplicateCount = Object.values(grouped).filter(bids => bids.length > 1).length;
  console.log(`\n${duplicateCount > 0 ? '⚠️' : '✅'} Total: ${Object.keys(grouped).length} auctions, ${duplicateCount} with duplicates\n`);

  process.exit(0);
}

checkDuplicates();

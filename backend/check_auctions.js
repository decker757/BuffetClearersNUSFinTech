import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lnjpmgbntynqfmamzlzk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanBtZ2JudHlucWZtYW16bHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc3NTkxNiwiZXhwIjoyMDgzMzUxOTE2fQ.EkVjY4qvU4qA2QuTqkej8yYA9ZgZvHz2VRl80YYTUgU'
);

async function checkAuctions() {
  const hotelAddress = 'rErx5876ZykfvpW5MJSeQHTjQratCXJ6HT';
  
  console.log('🏷️  All auctions in database:');
  const { data: allAuctions } = await supabase.from('AUCTIONLISTING').select('*');
  allAuctions.forEach(a => {
    console.log(`\n  Auction #${a.aid}:`);
    console.log(`    NFT: ${a.nftoken_id}`);
    console.log(`    Original Owner: ${a.original_owner}`);
    console.log(`    Status: ${a.status}`);
    console.log(`    Min Bid: ${a.min_bid}`);
  });
  
  console.log(`\n\n📊 Hotel Keeneng auctions:`);
  const { data: hotelAuctions } = await supabase
    .from('AUCTIONLISTING')
    .select('*')
    .eq('original_owner', hotelAddress);
  
  console.log(`Total: ${hotelAuctions.length}`);
  hotelAuctions.forEach(a => {
    console.log(`  - Auction #${a.aid}: NFT ${a.nftoken_id} (${a.status})`);
  });
  
  // Check NFTs
  console.log(`\n\n📦 Hotel Keeneng NFTs created:`);
  const { data: hotelNFTs } = await supabase
    .from('NFTOKEN')
    .select('*')
    .eq('created_by', hotelAddress);
  
  hotelNFTs.forEach(nft => {
    console.log(`  - ${nft.invoice_number} (${nft.nftoken_id})`);
  });
}

checkAuctions();

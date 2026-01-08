import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lnjpmgbntynqfmamzlzk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanBtZ2JudHlucWZtYW16bHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc3NTkxNiwiZXhwIjoyMDgzMzUxOTE2fQ.EkVjY4qvU4qA2QuTqkej8yYA9ZgZvHz2VRl80YYTUgU'
);

async function fixAuctionOwners() {
  console.log('🔧 Fixing auction original_owner values...\n');
  
  const { data: auctions } = await supabase.from('AUCTIONLISTING').select('*');
  const { data: nfts } = await supabase.from('NFTOKEN').select('*');
  
  for (const auction of auctions) {
    const nft = nfts.find(n => n.nftoken_id === auction.nftoken_id);
    
    if (nft && nft.created_by !== auction.original_owner) {
      console.log(`Fixing Auction #${auction.aid}:`);
      console.log(`  NFT: ${nft.invoice_number}`);
      console.log(`  Wrong owner: ${auction.original_owner}`);
      console.log(`  Correct owner: ${nft.created_by}`);
      
      const { error } = await supabase
        .from('AUCTIONLISTING')
        .update({ original_owner: nft.created_by })
        .eq('aid', auction.aid);
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Fixed!`);
      }
      console.log('');
    }
  }
  
  console.log('✅ All auctions fixed!');
}

fixAuctionOwners();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lnjpmgbntynqfmamzlzk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanBtZ2JudHlucWZtYW16bHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc3NTkxNiwiZXhwIjoyMDgzMzUxOTE2fQ.EkVjY4qvU4qA2QuTqkej8yYA9ZgZvHz2VRl80YYTUgU'
);

async function matchAuctions() {
  const { data: auctions } = await supabase.from('AUCTIONLISTING').select('*');
  const { data: nfts } = await supabase.from('NFTOKEN').select('*');
  
  console.log('=== MATCHING AUCTIONS TO NFTs ===\n');
  
  for (const auction of auctions) {
    const nft = nfts.find(n => n.nftoken_id === auction.nftoken_id);
    
    console.log(`Auction #${auction.aid}:`);
    console.log(`  NFT: ${nft?.invoice_number || 'NOT FOUND'}`);
    console.log(`  NFT created_by: ${nft?.created_by || 'N/A'}`);
    console.log(`  Auction original_owner: ${auction.original_owner}`);
    console.log(`  MATCH: ${nft?.created_by === auction.original_owner ? '✅' : '❌'}`);
    console.log('');
  }
}

matchAuctions();

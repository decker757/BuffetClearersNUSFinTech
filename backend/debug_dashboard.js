import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lnjpmgbntynqfmamzlzk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanBtZ2JudHlucWZtYW16bHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc3NTkxNiwiZXhwIjoyMDgzMzUxOTE2fQ.EkVjY4qvU4qA2QuTqkej8yYA9ZgZvHz2VRl80YYTUgU'
);

async function debug() {
  console.log('=== DEBUGGING ESTABLISHMENT DASHBOARD ===\n');
  
  // Check all users
  console.log('📋 Current users in database:');
  const { data: users } = await supabase.from('USER').select('*');
  users.forEach(u => {
    console.log(`  - ${u.username} (${u.role}): ${u.publicKey}`);
  });
  
  // Check all NFTs
  console.log('\n📦 All NFTs in database:');
  const { data: allNFTs } = await supabase.from('NFTOKEN').select('*');
  console.log(`Total: ${allNFTs.length}`);
  allNFTs.forEach(nft => {
    console.log(`\n  NFT: ${nft.invoice_number}`);
    console.log(`    ID: ${nft.nftoken_id}`);
    console.log(`    created_by: ${nft.created_by}`);
    console.log(`    current_owner: ${nft.current_owner}`);
    console.log(`    current_state: ${nft.current_state}`);
  });
  
  // For each user, show what they would see
  console.log('\n\n=== WHAT EACH USER SHOULD SEE ===\n');
  
  for (const user of users) {
    console.log(`\n👤 ${user.username} (${user.publicKey}):\n`);
    
    // Tokens created by me (payables)
    const { data: created } = await supabase
      .from('NFTOKEN')
      .select('*')
      .eq('created_by', user.publicKey);
    console.log(`  📝 Tokens Created (Payables): ${created.length}`);
    created.forEach(nft => {
      console.log(`    - ${nft.invoice_number} (${nft.current_state})`);
    });
    
    // Receivables (owned by me)
    const { data: owned } = await supabase
      .from('NFTOKEN')
      .select('*')
      .eq('current_owner', user.publicKey)
      .in('current_state', ['issued', 'owned', 'listed']);
    console.log(`  📨 Receivables (Owned): ${owned.length}`);
    owned.forEach(nft => {
      console.log(`    - ${nft.invoice_number} (${nft.current_state})`);
    });
    
    // Active auctions
    const { data: auctions } = await supabase
      .from('AUCTIONLISTING')
      .select('*')
      .eq('original_owner', user.publicKey);
    console.log(`  🏷️  Active Auctions: ${auctions.length}`);
  }
}

debug();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lnjpmgbntynqfmamzlzk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanBtZ2JudHlucWZtYW16bHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc3NTkxNiwiZXhwIjoyMDgzMzUxOTE2fQ.EkVjY4qvU4qA2QuTqkej8yYA9ZgZvHz2VRl80YYTUgU'
);

async function checkNFTs() {
  const creditorAddress = 'rLMxWoCBKPtBP9gkXyry7Xd274T5qxMTVc';
  
  console.log('\n📋 Checking NFTs for creditor:', creditorAddress);
  
  // Check all NFTs
  const { data: allNFTs, error: allError } = await supabase
    .from('NFTOKEN')
    .select('*');
  
  if (allError) {
    console.error('Error fetching all NFTs:', allError);
    return;
  }
  
  console.log('\n✅ Total NFTs in database:', allNFTs.length);
  console.log('\nAll NFTs:');
  allNFTs.forEach(nft => {
    console.log(`  - ${nft.nftoken_id}`);
    console.log(`    created_by: ${nft.created_by}`);
    console.log(`    current_owner: ${nft.current_owner}`);
    console.log(`    current_state: ${nft.current_state}`);
  });
  
  // Check NFTs where current_owner matches
  const { data: ownedNFTs, error: ownedError } = await supabase
    .from('NFTOKEN')
    .select('*')
    .eq('current_owner', creditorAddress);
  
  console.log('\n🎯 NFTs owned by creditor:', ownedNFTs?.length || 0);
  if (ownedNFTs && ownedNFTs.length > 0) {
    ownedNFTs.forEach(nft => {
      console.log(`  - ${nft.invoice_number} (${nft.nftoken_id})`);
      console.log(`    state: ${nft.current_state}`);
    });
  }
  
  // Check NFTs in 'issued' state (receivables)
  const { data: issuedNFTs, error: issuedError } = await supabase
    .from('NFTOKEN')
    .select('*')
    .eq('current_owner', creditorAddress)
    .eq('current_state', 'issued');
  
  console.log('\n📨 Receivables (issued state):', issuedNFTs?.length || 0);
}

checkNFTs();

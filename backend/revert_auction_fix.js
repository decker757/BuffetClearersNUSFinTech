import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lnjpmgbntynqfmamzlzk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanBtZ2JudHlucWZtYW16bHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc3NTkxNiwiZXhwIjoyMDgzMzUxOTE2fQ.EkVjY4qvU4qA2QuTqkej8yYA9ZgZvHz2VRl80YYTUgU'
);

async function revert() {
  console.log('↩️  Reverting auction owners...\n');
  
  // Revert back to original values
  await supabase.from('AUCTIONLISTING').update({ 
    original_owner: 'rLMxWoCBKPtBP9gkXyry7Xd274T5qxMTVc' 
  }).eq('aid', 30);
  console.log('✅ Auction #30 reverted');
  
  await supabase.from('AUCTIONLISTING').update({ 
    original_owner: 'rErx5876ZykfvpW5MJSeQHTjQratCXJ6HT' 
  }).eq('aid', 31);
  console.log('✅ Auction #31 reverted');
  
  await supabase.from('AUCTIONLISTING').update({ 
    original_owner: 'rErx5876ZykfvpW5MJSeQHTjQratCXJ6HT' 
  }).eq('aid', 32);
  console.log('✅ Auction #32 reverted');
  
  console.log('\n✅ All reverted!');
}

revert();

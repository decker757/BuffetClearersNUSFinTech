import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lnjpmgbntynqfmamzlzk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanBtZ2JudHlucWZtYW16bHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc3NTkxNiwiZXhwIjoyMDgzMzUxOTE2fQ.EkVjY4qvU4qA2QuTqkej8yYA9ZgZvHz2VRl80YYTUgU'
);

async function clearUsers() {
  console.log('📋 Current users:');
  const { data: users } = await supabase.from('USER').select('*');
  users.forEach(u => {
    console.log(`  - ${u.username}: ${u.publicKey}`);
  });
  
  console.log('\n🗑️  Deleting all users...');
  const { error } = await supabase.from('USER').delete().neq('publicKey', 'IMPOSSIBLE_VALUE');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ All users deleted. Sign in again to create fresh user records with addresses.');
  }
}

clearUsers();

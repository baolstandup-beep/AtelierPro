const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  // We'll try to fetch 1 row from orders just to see its columns
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) {
    console.error('Error fetching orders:', error);
  } else {
    if (data && data.length > 0) {
      console.log('Columns found in first row:', Object.keys(data[0]));
    } else {
      console.log('No rows in orders, trying to insert an empty row to see the error...');
      const { error: err2 } = await supabase.from('orders').insert({ dummy_column: 123 });
      console.log('Insert error:', err2);
    }
  }
}
check();

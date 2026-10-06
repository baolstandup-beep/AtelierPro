const fs = require('fs');
async function run() {
  require('dotenv').config({ path: '.env.local' });
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const ordersSchema = data.definitions.orders;
  console.log(JSON.stringify(ordersSchema, null, 2));
}
run();

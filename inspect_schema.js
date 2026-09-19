const fs = require('fs');

async function main() {
  require('dotenv').config({ path: '.env.local' });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
  }
  
  const response = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const spec = await response.json();
  
  const ordersDef = spec.definitions?.orders;
  if (ordersDef) {
    console.log("Real columns in public.orders:");
    Object.keys(ordersDef.properties).forEach(col => {
      console.log(`- ${col} (${ordersDef.properties[col].type})`);
    });
  } else {
    console.log("Could not find 'orders' in the OpenAPI spec.");
  }
}

main().catch(console.error);

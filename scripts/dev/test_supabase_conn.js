require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL configured:", Boolean(url));
console.log("Supabase key configured:", Boolean(key));

if (!url || !key) {
  console.error("Missing credentials!");
  process.exit(1);
}

const supabase = createClient(url, key);
supabase.auth.getSession().then(res => {
  console.log("Connection test:", res.error ? res.error.message : "Success");
}).catch(err => {
  console.error("Connection error:", err.message);
});

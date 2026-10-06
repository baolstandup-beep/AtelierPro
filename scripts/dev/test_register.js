require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

async function test() {
  console.log("Testing SignUp...");
  const phone = "771234567";
  const pin = "1234";
  const email = `user${phone}@gmail.com`;
  
  // Clean up if it exists
  const sbAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  
  const { data: users } = await sbAdmin.auth.admin.listUsers();
  const u = users?.users.find(x => x.email === email);
  if (u) {
      await sbAdmin.auth.admin.deleteUser(u.id);
      console.log("Deleted old user");
  }

  const { data, error } = await sb.auth.signUp({
    email,
    password: `${pin}_AtelierPro_Secure_Salt_2024`,
    options: {
      data: { full_name: "Test User", phone, workshop_name: "Test Workshop" }
    }
  });
  if (error) {
    console.error("SignUp Error:", error);
  } else {
    console.log("SignUp Success. UID:", data.user?.id);
    
    // Check profiles
    const { data: prof, error: pErr } = await sbAdmin.from('profiles').select('*').eq('id', data.user?.id);
    if (pErr) console.error("Profile Error:", pErr);
    else console.log("Profile created:", prof);
    
    // Check workshop_members
    const { data: mem, error: mErr } = await sbAdmin.from('workshop_members').select('*').eq('user_id', data.user?.id);
    if (mErr) console.error("Members Error:", mErr);
    else console.log("Member linked:", mem);
  }
}
test();

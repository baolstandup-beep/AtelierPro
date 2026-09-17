require('dotenv').config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  const phone = "779998877";
  const email = `user${phone}@gmail.com`;
  const pin = "4321";
  const password = `${pin}_AtelierPro_Secure_Salt_2024`;
  
  console.log("Signing up:", email);
  
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        full_name: "Test User API",
        phone,
        workshop_name: "API Workshop"
      }
    })
  });
  
  const json = await res.json();
  console.log("Response:", json);
  
  if (json.id) {
    console.log("Checking profiles via API...");
    // Just a quick check to see if profile is created. We will need the service role key to check if RLS blocks us.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const pRes = await fetch(`${url}/rest/v1/profiles?id=eq.${json.id}`, {
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`
      }
    });
    console.log("Profile:", await pRes.json());
  }
}
test();

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
async function test() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'test_cheikh_763033196@gmail.com',
    password: 'password_1234',
    email_confirm: true,
  });
  console.log('Result:', { data, error });
}
test();

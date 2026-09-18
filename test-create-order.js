const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: wsData } = await supabase.from('workshops').select('id').limit(1);
  let workshopId = wsData?.[0]?.id;
  if (!workshopId) {
     const { data: atData } = await supabase.from('ateliers').select('id').limit(1);
     workshopId = atData?.[0]?.id;
  }
  
  const { data: custData } = await supabase.from('customers').select('id').limit(1);
  let customerId = custData?.[0]?.id;
  if (!customerId) {
     const { data: clData } = await supabase.from('clients').select('id').limit(1);
     customerId = clData?.[0]?.id;
  }

  console.log("Workshop:", workshopId, "Customer:", customerId);
  
  if (!workshopId || !customerId) {
     console.log("Need a workshop and a customer to test.");
     return;
  }

  const { data, error } = await supabase.from('orders').insert({
    workshop_id: workshopId,
    customer_id: customerId,
    order_number: 'CMD-TEST-123',
    status: 'NEW',
    total_amount: 1000,
  }).select().single();
  
  console.log("English insert result:", error || data);

  if (error) {
     const { data: data2, error: err2 } = await supabase.from('orders').insert({
       atelier_id: workshopId,
       client_id: customerId,
       title: 'CMD-TEST-123',
       status: 'en_attente',
       total_amount: 1000,
     }).select().single();
     console.log("French insert result:", err2 || data2);
  }
}
test();

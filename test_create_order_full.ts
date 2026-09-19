import { dbCreateOrder } from './lib/supabase-api';

async function test() {
  try {
    const res = await dbCreateOrder(
      "00000000-0000-0000-0000-000000000000",
      {
        customer_id: "00000000-0000-0000-0000-000000000000",
        due_date: "2026-10-10",
        priority: "NORMAL",
        notes: "Test notes",
        items: [
          {
            name: "Test item",
            garment_type: "BOUBOU",
            quantity: 1,
            unit_price: 100,
            notes: "Item note"
          }
        ]
      }
    );
    console.log("SUCCESS!", res);
  } catch (err) {
    console.error("FAILED!", err);
  }
}
test();

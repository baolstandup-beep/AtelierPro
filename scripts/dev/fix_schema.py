import re

with open('lib/supabase-api.ts', 'r') as f:
    code = f.read()

# 1. dbCreateOrder
# We map payload sent to supabase.
# Instead of workshop_id, customer_id, order_number, notes -> atelier_id, client_id, title, description
create_payload_re = re.compile(r"const orderPayload = \{[\s\S]*?due_date: input\.due_date \|\| null,\n  \};")
new_create_payload = """const orderPayload = {
    atelier_id: workshopId,
    client_id: input.customer_id,
    title: orderNumber,
    description: input.notes?.trim() || null,
    status: 'NEW',
    priority: input.priority || 'NORMAL',
    total_amount: totalAmount,
    paid_amount: paidAmount,
    due_date: input.due_date || null,
  };"""
code = create_payload_re.sub(new_create_payload, code)

# 2. dbUpdateOrder
# We map safeUpdates
update_logic_re = re.compile(r"const safeUpdates: Record<string, unknown> = \{\};\n.*?safeUpdates\.priority = updates\.priority;", re.DOTALL)
new_update_logic = """const safeUpdates: Record<string, unknown> = {};
  if (updates.status !== undefined) safeUpdates.status = updates.status;
  if (updates.due_date !== undefined) safeUpdates.due_date = updates.due_date;
  if (updates.notes !== undefined) safeUpdates.description = updates.notes; // mapped
  if (updates.priority !== undefined) safeUpdates.priority = updates.priority;"""
code = update_logic_re.sub(new_update_logic, code)


# 3. mapping function for dbFetchWorkshopFullData
# Where orders are fetched:
# client.from('orders').select('*')
# We need to map the output to frontend type.
fetch_orders_re = re.compile(r"client\.from\('orders'\)\.select\('\*'\)\.eq\('workshop_id', workshopId\)\.is\('deleted_at', null\)\.order\('created_at', \{ ascending: false \}\)\.then\(async res => \{[\s\S]*?return res;\n    \}\)", re.MULTILINE)

new_fetch_orders = """client.from('orders').select('*').eq('atelier_id', workshopId).is('deleted_at', null).order('created_at', { ascending: false }).then(async res => {
      // Mapping real DB columns to frontend types
      const mapOrder = (dbOrder: any) => ({
        ...dbOrder,
        workshop_id: dbOrder.atelier_id,
        customer_id: dbOrder.client_id,
        order_number: dbOrder.title,
        notes: dbOrder.description
      });
      if (res.data) res.data = res.data.map(mapOrder);
      
      if (res.error) {
        // Fallback or just return
        const { data: ordersAlt } = await client.from('orders').select('*').eq('atelier_id', workshopId).order('created_at', { ascending: false });
        if (ordersAlt) return { data: ordersAlt.map(mapOrder), error: null };
      }
      return res;
    })"""
code = fetch_orders_re.sub(new_fetch_orders, code)

# Write back
with open('lib/supabase-api.ts', 'w') as f:
    f.write(code)


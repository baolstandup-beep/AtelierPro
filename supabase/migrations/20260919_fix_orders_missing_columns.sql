-- Migration de rattrapage pour garantir la présence des colonnes secondaires sur orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

NOTIFY pgrst, 'reload schema';

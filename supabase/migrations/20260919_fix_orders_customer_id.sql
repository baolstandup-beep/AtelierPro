-- Migration de rattrapage pour garantir la présence de customer_id sur orders
DO $$ 
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='client_id') 
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_id') THEN
    ALTER TABLE public.orders RENAME COLUMN client_id TO customer_id;
  END IF;
END $$;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id UUID;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO anon;

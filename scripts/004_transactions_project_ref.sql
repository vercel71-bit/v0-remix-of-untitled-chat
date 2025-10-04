ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- credit_id used to be NOT NULL; allow NULL so we can link later when credits are minted
ALTER TABLE public.transactions
  ALTER COLUMN credit_id DROP NOT NULL;

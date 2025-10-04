BEGIN;

-- 1) Add available_credits to projects and backfill from estimated_co2_tons
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS available_credits DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill: only update rows that are still at the default 0 to avoid overwriting valid data
UPDATE public.projects
SET available_credits = estimated_co2_tons
WHERE available_credits = 0;

-- 2) Create SECURITY DEFINER function to decrement available_credits safely under RLS
CREATE OR REPLACE FUNCTION public.decrement_available_credits(p_project_id UUID, p_amount DECIMAL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.projects
  SET
    available_credits = GREATEST(available_credits - p_amount, 0),
    updated_at = NOW()
  WHERE id = p_project_id;
END;
$$;

-- Make sure only expected roles can execute
REVOKE ALL ON FUNCTION public.decrement_available_credits(UUID, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_available_credits(UUID, DECIMAL) TO anon, authenticated, service_role;

COMMIT;

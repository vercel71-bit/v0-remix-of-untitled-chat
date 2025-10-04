BEGIN;

-- Ensure RLS is enabled on all relevant tables (safe to re-run)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_data ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- PROJECTS
DROP POLICY IF EXISTS "Users can view all projects" ON public.projects;
DROP POLICY IF EXISTS "NGOs can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;

CREATE POLICY "Users can view all projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "NGOs can insert their own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = submitted_by OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- PROJECT MEDIA
DROP POLICY IF EXISTS "Users can view project media" ON public.project_media;
DROP POLICY IF EXISTS "Project owners can insert media" ON public.project_media;

CREATE POLICY "Users can view project media" ON public.project_media
  FOR SELECT USING (true);

CREATE POLICY "Project owners can insert media" ON public.project_media
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND submitted_by = auth.uid()
  ));

-- CARBON CREDITS
DROP POLICY IF EXISTS "Users can view available credits" ON public.carbon_credits;
DROP POLICY IF EXISTS "Admins can manage credits" ON public.carbon_credits;

CREATE POLICY "Users can view available credits" ON public.carbon_credits
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage credits" ON public.carbon_credits
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- MONITORING DATA
DROP POLICY IF EXISTS "Users can view monitoring data" ON public.monitoring_data;
DROP POLICY IF EXISTS "Admins can manage monitoring data" ON public.monitoring_data;

CREATE POLICY "Users can view monitoring data" ON public.monitoring_data
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage monitoring data" ON public.monitoring_data
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

COMMIT;

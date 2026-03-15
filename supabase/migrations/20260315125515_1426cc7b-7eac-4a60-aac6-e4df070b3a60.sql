
-- Fix permissive RLS: restrict device_history insert to admin/technician only
DROP POLICY "Authenticated can insert device_history" ON public.device_history;

CREATE POLICY "Admin and technician can insert device_history" ON public.device_history
  FOR INSERT TO authenticated 
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician')
  );

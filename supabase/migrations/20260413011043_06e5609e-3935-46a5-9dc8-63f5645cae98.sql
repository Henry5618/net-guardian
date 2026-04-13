
-- Add resolution column
ALTER TABLE public.network_alerts ADD COLUMN resolution text DEFAULT NULL;

-- Add DELETE policy for admins and technicians
CREATE POLICY "Admin and technician can delete network_alerts"
ON public.network_alerts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

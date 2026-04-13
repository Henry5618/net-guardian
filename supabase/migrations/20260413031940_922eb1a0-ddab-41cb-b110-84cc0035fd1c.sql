CREATE POLICY "Admin and technician can delete reports"
ON public.reports
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

CREATE TABLE public.traffic_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  packets integer NOT NULL DEFAULT 0,
  bytes bigint NOT NULL DEFAULT 0,
  anomaly boolean NOT NULL DEFAULT false,
  source_ip text,
  dest_ip text,
  protocol text
);

ALTER TABLE public.traffic_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read traffic_data" ON public.traffic_data
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and technician can insert traffic_data" ON public.traffic_data
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

CREATE TABLE public.network_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  source_ip text,
  dest_ip text,
  protocol text,
  resolved boolean NOT NULL DEFAULT false
);

ALTER TABLE public.network_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read network_alerts" ON public.network_alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and technician can insert network_alerts" ON public.network_alerts
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

CREATE POLICY "Admin and technician can update network_alerts" ON public.network_alerts
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

CREATE INDEX idx_traffic_data_recorded_at ON public.traffic_data (recorded_at DESC);
CREATE INDEX idx_network_alerts_created_at ON public.network_alerts (created_at DESC);
CREATE INDEX idx_device_history_detected_at ON public.device_history (detected_at DESC);

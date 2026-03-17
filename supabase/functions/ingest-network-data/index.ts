import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate API key from header
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("AGENT_API_KEY");
    
    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { type, data } = body;

    if (!type || !data) {
      return new Response(JSON.stringify({ error: "Missing type or data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (type) {
      case "devices": {
        // data: Array of { mac, ip, hostname?, event_type? }
        const rows = data.map((d: any) => ({
          mac: d.mac,
          ip: d.ip,
          hostname: d.hostname || null,
          event_type: d.event_type || "seen",
          previous_ip: d.previous_ip || null,
        }));
        const { error } = await supabaseAdmin.from("device_history").insert(rows);
        if (error) throw error;
        result = { inserted: rows.length };
        break;
      }

      case "traffic": {
        // data: Array of { packets, bytes, source_ip?, dest_ip?, protocol?, anomaly? }
        const rows = data.map((d: any) => ({
          packets: d.packets || 0,
          bytes: d.bytes || 0,
          anomaly: d.anomaly || false,
          source_ip: d.source_ip || null,
          dest_ip: d.dest_ip || null,
          protocol: d.protocol || null,
        }));
        const { error } = await supabaseAdmin.from("traffic_data").insert(rows);
        if (error) throw error;
        result = { inserted: rows.length };
        break;
      }

      case "alerts": {
        // data: Array of { severity, title, description?, source_ip?, dest_ip?, protocol? }
        const rows = data.map((d: any) => ({
          severity: d.severity || "medium",
          title: d.title,
          description: d.description || null,
          source_ip: d.source_ip || null,
          dest_ip: d.dest_ip || null,
          protocol: d.protocol || null,
        }));
        const { error } = await supabaseAdmin.from("network_alerts").insert(rows);
        if (error) throw error;
        result = { inserted: rows.length };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

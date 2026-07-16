import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/cloudflare-pages';

// ── Types ────────────────────────────────────────────────────────────────────

type Bindings = {
  AI: Ai; // Cloudflare Workers AI binding (declared in wrangler.toml)
};

interface PredictiveAnalysisBody {
  parameters: {
    material: string;
    thickness: number;
    jointType: string;
    process: string;
    preheat: number;
  };
  distortion: {
    angular: number;
    transverse: number;
    longitudinal: number;
    residualStress: number;
  };
  heatInput: number;
  mitigatedDistortion: {
    angular: number;
    transverse: number;
    longitudinal: number;
    residualStress: number;
  };
  metallurgy: {
    riskScore: number;
    pcm: number;
    tc: number;
    ri: number;
    t85: number;
  };
}

// ── Hono App ─────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for all routes (needed during Pages dev proxy)
app.use('*', cors());

// POST /api/predictive-analysis
// Accepts weld parameters, calls Llama 3.3 70B via Workers AI,
// returns a professional metallurgical crack-risk explanation.
app.post('/api/predictive-analysis', async (c) => {
  let body: PredictiveAnalysisBody;

  try {
    body = await c.req.json<PredictiveAnalysisBody>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { parameters, heatInput, mitigatedDistortion, metallurgy } = body;

  try {
    const aiResult = await c.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as any,
      {
        messages: [
          {
            role: 'system',
            content:
              'You are a welding metallurgy tutor. Explain the crack risk result concisely in 3-4 sentences, referencing cooling rate (t8/5), martensite risk, preheat vs critical preheat (Tc), restraint intensity, and residual stress. Be professional and technical but clear.',
          },
          {
            role: 'user',
            content: `Risk Score: ${metallurgy.riskScore}/100, Material: ${parameters.material}, Pcm: ${metallurgy.pcm}, Cooling Rate (t8/5): ${metallurgy.t85}s, Critical Preheat (Tc): ${metallurgy.tc}°C, Actual Preheat: ${parameters.preheat}°C, Restraint Intensity (RI): ${metallurgy.ri} N/mm·mm, Residual Stress: ${mitigatedDistortion.residualStress} MPa, Heat Input: ${heatInput} kJ/mm, Joint: ${parameters.jointType}. Explain the metallurgical implication of this crack risk score.`,
          },
        ],
      }
    );

    const explanation = ((aiResult as unknown) as { response: string }).response;


    return c.json({
      riskScore: metallurgy.riskScore,
      explanation: explanation || 'Analysis complete. Review the computed risk metrics above.',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Workers AI Error:', errorMessage);
    return c.json(
      { error: 'Failed to generate predictive analysis', detail: errorMessage },
      500
    );
  }

});

// ── Export for Cloudflare Pages Functions ────────────────────────────────────
// The `handle` adapter converts Hono's app into a Pages Functions handler.
// Cloudflare Pages Functions will pick this up from /functions/api/[[route]].ts
export const onRequest = handle(app);

// Export the app type for Hono RPC client usage in the frontend
export type AppType = typeof app;

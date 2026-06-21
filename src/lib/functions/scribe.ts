import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ScribeResult = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  raw: string;
};

const SYSTEM_PROMPT = `You are an experienced clinical scribe. Take the practitioner's free-form session notes (possibly informal, dictated, or shorthand) and write a clear, professional SOAP note in concise clinical language. Never invent symptoms or findings that aren't supported by the input. Output STRICT JSON only, with this exact shape and no additional keys:
{
  "subjective": "string",
  "objective": "string",
  "assessment": "string",
  "plan": "string"
}
Each value should be a single paragraph, no bullet lists, no markdown. If a section can't be inferred, set it to an empty string.`;

/** Calls Lovable AI Gateway to convert raw session notes into a SOAP note. */
export const generateSoapNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { transcript: string }) => {
    if (!data?.transcript || typeof data.transcript !== "string")
      throw new Error("transcript required");
    if (data.transcript.length < 10) throw new Error("Transcript too short");
    if (data.transcript.length > 20000) throw new Error("Transcript too long (max 20k chars)");
    return data;
  })
  .handler(async ({ data }): Promise<ScribeResult> => {
    const { getAppSecret } = await import("@/lib/app-secrets.server");
    const apiKey = await getAppSecret("LOVABLE_API_KEY");
    if (!apiKey)
      throw new Error(
        "AI Scribe requires LOVABLE_API_KEY. It's auto-provisioned — try refreshing the Integrations page.",
      );

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.transcript },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Rate limited by AI gateway. Try again in a moment.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in workspace settings.");
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI gateway error (${res.status}): ${txt.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned non-JSON response");
    }
    return {
      subjective: String(parsed.subjective ?? ""),
      objective: String(parsed.objective ?? ""),
      assessment: String(parsed.assessment ?? ""),
      plan: String(parsed.plan ?? ""),
      raw: content,
    };
  });

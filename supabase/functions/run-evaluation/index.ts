import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EvalRequest {
  eval_run_id: string;
  output_data: {
    prompt: string;
    output: string;
    expected_result?: string;
    metadata?: any;
  };
  output_index: number;
  rubric_prompt: string;
  metrics: Array<{
    id: string;
    name: string;
    description: string;
    scoring_type: string;
    scoring_config: any;
  }>;
  grading_provider: string;
  grading_model: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const evalRequest: EvalRequest = await req.json();

    const { data: apiKeys } = await supabaseClient
      .from("api_keys")
      .select("provider, api_key")
      .eq("provider", evalRequest.grading_provider)
      .maybeSingle();

    if (!apiKeys) {
      throw new Error(`${evalRequest.grading_provider === "openai" ? "OpenAI" : "Anthropic"} API key not configured. Please add it in Settings.`);
    }

    const metricsPrompt = evalRequest.metrics
      .map(
        (m) =>
          `- ${m.name}: ${m.description} (Type: ${m.scoring_type}${
            m.scoring_type === "numeric"
              ? `, Scale: ${m.scoring_config.min}-${m.scoring_config.max}`
              : ""
          })`
      )
      .join("\n");

    const systemPrompt = `${evalRequest.rubric_prompt}\n\nYou must evaluate the following output based on these metrics:\n${metricsPrompt}\n\nProvide your response as a JSON object with:\n1. "scores": an object with metric IDs as keys and scores as values\n2. "reasoning": a brief explanation of your scores\n3. "confidence": a number between 0 and 1 indicating your confidence`;

    const userPrompt = `Prompt: ${evalRequest.output_data.prompt}\n\nOutput to evaluate: ${evalRequest.output_data.output}${evalRequest.output_data.expected_result ? `\n\nExpected result: ${evalRequest.output_data.expected_result}` : ""}`;

    let llmResponse;
    if (evalRequest.grading_provider === "openai") {
      const openaiKey = apiKeys.api_key;
      if (!openaiKey) {
        throw new Error("OpenAI API key not configured. Please add it in Settings.");
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: evalRequest.grading_model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      llmResponse = JSON.parse(data.choices[0].message.content);
    } else if (evalRequest.grading_provider === "anthropic") {
      const anthropicKey = apiKeys.api_key;
      if (!anthropicKey) {
        throw new Error("Anthropic API key not configured. Please add it in Settings.");
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: evalRequest.grading_model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${error}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      llmResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } else {
      throw new Error(`Unsupported provider: ${evalRequest.grading_provider}`);
    }

    const { error: insertError } = await supabaseClient
      .from("eval_results")
      .insert({
        eval_run_id: evalRequest.eval_run_id,
        output_index: evalRequest.output_index,
        prompt: evalRequest.output_data.prompt,
        output: evalRequest.output_data.output,
        expected_result: evalRequest.output_data.expected_result || "",
        metadata: evalRequest.output_data.metadata || {},
        scores: llmResponse.scores || {},
        llm_reasoning: llmResponse.reasoning || "",
        confidence_score: llmResponse.confidence || 0.5,
        flagged_for_review: false,
      });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error running evaluation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
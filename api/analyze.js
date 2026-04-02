import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {

    // =====================
    // SAFE BODY PARSE
    // =====================
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const text = body?.text;

    if (!text) {
      return res.status(400).json({
        error: "No text provided"
      });
    }

    // =====================
    // LIMIT
    // =====================
    const MAX_CHARS = 12000;
    const safeText =
      text.length > MAX_CHARS
        ? text.slice(0, MAX_CHARS) + "\n\n[TRUNCATED]"
        : text;

    // =====================
    // TIMEOUT FETCH
    // =====================
    async function fetchWithTimeout(url, options, timeout = 60000) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        return await fetch(url, {
          ...options,
          signal: controller.signal
        });
      } finally {
        clearTimeout(id);
      }
    }

    // =====================
    // STEP 1: EXTRACTION
    // =====================
    const extractionPrompt = `
Върни САМО JSON:

{
  "persons": [
    { "name": "", "egn": "", "role": "" }
  ],
  "institutions": [],
  "case_numbers": [],
  "dates": [],
  "legal_references": [],
  "summary": ""
}

ПРАВИЛА:
- не измисляй
- ако няма ЕГН → ""
- извличай само от текста

Текст:
${safeText}
`;

    const extractionRes = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          temperature: 0.1,
          messages: [{ role: "user", content: extractionPrompt }]
        })
      }
    );

    const extractionData = await extractionRes.json();

    if (!extractionRes.ok) {
      return res.status(500).json({
        error: extractionData.error?.message
      });
    }

    // =====================
    // SAFE JSON PARSE
    // =====================
    function safeJSONParse(str) {
      try {
        const match = str.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON found");
        return JSON.parse(match[0]);
      } catch (e) {
        return {
          error: "JSON parse failed",
          raw: str
        };
      }
    }

    const rawExtraction =
      extractionData?.choices?.[0]?.message?.content || "";

    const extracted = safeJSONParse(rawExtraction);

    // =====================
    // STEP 2: ANALYSIS
    // =====================
    const analysisPrompt = `
ИЗХОДНИ ДАННИ:
${JSON.stringify(extracted, null, 2)}

ОРИГИНАЛЕН ТЕКСТ (съкратен):
${safeText.slice(0, 4000)}

НАПРАВИ ДЪЛБОК АНАЛИЗ:

1. ФАКТИ
2. ПРАВНИ ПРОБЛЕМИ
3. НАРУШЕНИЯ
4. ДОКАЗАТЕЛСТВА
5. ЛОГИКА
6. ЕСПЧ
7. ЗАКОНОСЪОБРАЗНОСТ (1-10)
8. ШАНС ЗА УСПЕХ (%)
9. СТРАТЕГИЯ
10. ЖАЛБА
`;

    const analysisRes = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "Ти си елитен адвокат."
            },
            {
              role: "user",
              content: analysisPrompt
            }
          ]
        })
      }
    );

    const analysisData = await analysisRes.json();

    if (!analysisRes.ok) {
      return res.status(500).json({
        error: analysisData.error?.message
      });
    }

    const result =
      analysisData?.choices?.[0]?.message?.content ||
      "❌ Няма отговор от AI";

    // =====================
    // SUPABASE (SAFE INIT)
    // =====================
    let supabase = null;

    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (url && key) {
        supabase = createClient(url, key);
      } else {
        console.error("❌ Supabase ENV missing");
      }
    } catch (e) {
      console.error("❌ Supabase init crash:", e);
    }

    // =====================
    // SUPABASE INSERT (SAFE)
    // =====================
    if (supabase) {
      try {
        const { error } = await supabase
          .from("analyses")
          .insert([
            {
              text: safeText,
              extracted: extracted,
              result: result
            }
          ]);

        if (error) {
          console.error("SUPABASE ERROR:", error);
        }

      } catch (e) {
        console.error("SUPABASE CRASH:", e);
      }
    }

    // =====================
    // FINAL RESPONSE (ALWAYS JSON)
    // =====================
    return res.status(200).json({
      extracted,
      result
    });

  } catch (err) {
    console.error("🔥 FINAL ERROR:", err);

    return res.status(500).json({
      error: err.message || "Unknown server error"
    });
  }
}

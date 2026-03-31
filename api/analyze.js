export default async function handler(req, res) {
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const text = body?.text;

    if (!text) {
      return res.status(400).json({
        error: "No text provided"
      });
    }

    const prompt = `
Ти си старши адвокат и правен анализатор.

Направи ДЪЛБОК юридически анализ:

1. ФАКТИ
2. ПРАВНА КВАЛИФИКАЦИЯ (НК, НПК)
3. АНАЛИЗ НА ПРОКУРОРСКИЯ АКТ
4. ДОКАЗАТЕЛСТВА (липси, грешки)
5. ЛОГИЧЕСКИ ГРЕШКИ
6. ЕС ПРАВО (ЕКПЧ)
7. ЗАКОНОСЪОБРАЗНОСТ (1–10)
8. УСПЕХ (%)
9. СТРАТЕГИЯ
10. ПРОФЕСИОНАЛНА ЖАЛБА

Текст:
${text}
`;

    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await ai.json();

    if (!ai.ok) {
      return res.status(500).json({
        error: data.error?.message
      });
    }

    return res.status(200).json({
      result: data.choices[0].message.content
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}

export default async function handler(req, res) {
  try {
    let text = "";

    // 🧠 ВАЖНО: Vercel НЕ поддържа директно multipart parsing така
    // затова засега работим само с text

    if (req.body) {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      text = body?.text || "";
    }

    if (!text) {
      return res.status(400).json({
        error: "⚠️ Качването на файлове още не е активирано. Постави текст за тест."
      });
    }

    const prompt = `
Ти си професионален юридически анализатор.

1. Извлечи:
- Имена
- ЕГН
- Дати
- Номер на дело

2. Анализ:
- Факти
- Проблеми
- Противоречия
- Грешки

3. Оценка:
- Законосъобразност (1–10)
- Успех (%)

4. Генерирай жалба

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
        error: data.error?.message || "OpenAI API error"
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

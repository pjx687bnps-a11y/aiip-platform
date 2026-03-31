export default async function handler(req, res) {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const prompt = `
Анализирай юридически текста:

1. Факти
2. Правни проблеми
3. Противоречия
4. Неправилно приложение на закона
5. Логически грешки
6. ЕС съответствие
7. Вероятност за успех (%)
8. Генерирай жалба

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

    res.status(200).json({
      result: data.choices[0].message.content
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

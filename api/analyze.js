export default async function handler(req, res) {
  try {
    // 🧠 Парсване на body (ВАЖНО за Vercel)
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

let text = "";

// 📄 ако идва файл
if (req.headers["content-type"]?.includes("multipart/form-data")) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);
  text = buffer.toString();
}

// 🧠 ако идва текст (стария вариант)
else {
  const body =
    typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  text = body?.text || "";
}

if (!text) {
  return res.status(400).json({ error: "No input provided" });
}

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    // 🧠 PROMPT (ъпгрейднат)
    const prompt = `
Ти си професионален юридически анализатор.

1. Извлечи от текста:
- Имена на лица
- ЕГН/идентификатори
- Дати
- Номер на преписка/дело
- Институции

2. Направи юридически анализ:
- Факти
- Правни проблеми
- Противоречия
- Неправилно приложение на закона
- Логически грешки
- Съответствие с ЕС право

3. Оцени:
- Законосъобразност (1–10)
- Вероятност за успех (%)

4. Генерирай ЖАЛБА:
- използвай реалните данни
- формален юридически стил
- без празни полета

Текст:
${text}
`;

    // 🔥 OpenAI заявка
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

    // 🧠 SAFE parsing
    const data = await ai.json();

    // ❌ ако API върне грешка
    if (!ai.ok) {
      return res.status(500).json({
        error: data.error?.message || "OpenAI API error"
      });
    }

    // ❌ ако няма отговор
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({
        error: "Invalid AI response"
      });
    }

    // ✅ успех
    return res.status(200).json({
      result: data.choices[0].message.content
    });

  } catch (err) {
    // 🛑 ще виждаш реалната грешка вече
    return res.status(500).json({
      error: err.message || "Server error"
    });
  }
}

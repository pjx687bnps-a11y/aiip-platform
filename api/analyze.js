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

    // 🔥 STEP 1: EXTRACTION (структуриране)
    const extractionPrompt = `
Извлечи структурирана информация от текста.

Върни JSON:

{
  "persons": [],
  "institutions": [],
  "dates": [],
  "case_numbers": [],
  "facts_summary": ""
}

Текст:
${text}
`;

    const extractionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        temperature: 0.1,
        messages: [{ role: "user", content: extractionPrompt }]
      })
    });

    const extractionData = await extractionRes.json();

    if (!extractionRes.ok) {
      return res.status(500).json({
        error: extractionData.error?.message
      });
    }

    let extracted;
    try {
      extracted = JSON.parse(extractionData.choices[0].message.content);
    } catch {
      extracted = { raw: extractionData.choices[0].message.content };
    }

    // 🔥 STEP 2: ADVANCED LEGAL ANALYSIS
    const analysisPrompt = `
Ти си елитен адвокат по наказателно право, работещ по сложни дела срещу прокуратурата и с опит по ЕСПЧ.

Работиш на ниво:
- съдия
- адвокат
- правен експерт

────────────────────────

ИЗХОДНИ ДАННИ:
${JSON.stringify(extracted, null, 2)}

ОРИГИНАЛЕН ТЕКСТ:
${text}

────────────────────────

НАПРАВИ ДЪЛБОК АНАЛИЗ:

I. ФАКТИЧЕСКА РЕКОНСТРУКЦИЯ
- реални факти
- липсващи факти
- процесуален контекст

II. ПРАВНА КВАЛИФИКАЦИЯ
- приложими текстове от НК
- приложими текстове от НПК
- потенциални правни грешки

III. АНАЛИЗ НА ПРОКУРОРСКИЯ АКТ
- формален vs реален анализ
- нарушение на чл. 213, 243 НПК
- липса на мотивировка

IV. ДОКАЗАТЕЛСТВЕН АНАЛИЗ
- липсващи доказателства
- какво е трябвало да се събере
- неправилен стандарт (данни vs доказателства)

V. ЛОГИЧЕСКИ ГРЕШКИ
- противоречия
- необосновани изводи

VI. ЕВРОПЕЙСКО ПРАВО
- чл. 6 ЕКПЧ
- чл. 13 ЕКПЧ
- стандарти за ефективно разследване
- потенциално нарушение

VII. СЪДЕБНА ПРАКТИКА (АНАЛОГИЯ)
- опиши релевантна практика (логически, не измисляй конкретни номера ако не си сигурен)
- сравни ситуацията

VIII. ЗАКОНОСЪОБРАЗНОСТ
- оценка (1–10)
- детайлна аргументация

IX. ВЕРОЯТНОСТ ЗА УСПЕХ
- %
- правна логика

X. ПРОЦЕСУАЛНА СТРАТЕГИЯ
- как да се атакува отказът
- конкретни действия
- доказателства

XI. ПРОФЕСИОНАЛНА ЖАЛБА
- адвокатски стил
- правни аргументи
- структурирано
- без шаблонен текст

────────────────────────

ПРАВИЛА:
- не бъди повърхностен
- не пиши кратко
- мисли критично
- анализирай като съд

`;

    const analysisRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "Ти си топ ниво адвокат и правен анализатор."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ]
      })
    });

    const analysisData = await analysisRes.json();

    if (!analysisRes.ok) {
      return res.status(500).json({
        error: analysisData.error?.message
      });
    }

    return res.status(200).json({
      result: analysisData.choices[0].message.content
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}

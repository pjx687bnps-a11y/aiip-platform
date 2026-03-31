export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a senior legal expert.

Analyze the document and provide:

1. Facts
2. Legal errors
3. Risk score (1-10)
4. Recommendations

Be structured and precise.`,
          },
          {
            role: "user",
            content: content: req.body.text,
          },
        ],
      }),
    });

    const data = await response.json();

    res.status(200).json({
      result: data.choices[0].message.content,
    });

  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
}

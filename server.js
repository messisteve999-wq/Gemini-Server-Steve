import express from "express";
import helmet from "helmet";
import crypto from "node:crypto";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "32kb" }));

const PORT = Number(process.env.PORT || 3000);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERVER_API_TOKEN = (process.env.SERVER_API_TOKEN || "").trim();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

app.get("/", (_req, res) => {
  res.json({
    name: "Gemini-Server-Steve",
    status: "ok",
    endpoints: ["/health", "/v1/generate"]
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", configured: Boolean(GEMINI_API_KEY && SERVER_API_TOKEN) });
});

app.post("/v1/generate", async (req, res) => {
  const auth = req.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!SERVER_API_TOKEN || !safeEqual(token, SERVER_API_TOKEN)) {
    console.log("AUTH refusee: recu=" + token.length + " car., attendu=" + SERVER_API_TOKEN.length + " car.");
    return res.status(401).json({ error: "Authentification invalide." });
  }
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: "Le serveur Gemini n'est pas configuré." });
  }

  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  const systemInstruction = typeof req.body?.systemInstruction === "string"
    ? req.body.systemInstruction.trim()
    : "";

  if (!prompt) return res.status(400).json({ error: "Le champ prompt est obligatoire." });
  if (prompt.length > 12000 || systemInstruction.length > 4000) {
    return res.status(413).json({ error: "Le texte fourni est trop long." });
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 1200 }
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      // Do not return upstream headers, API keys, or internal stack traces to clients.
      const status = upstream.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: upstream.status === 429
          ? "Limite d'utilisation Gemini atteinte. Réessaie plus tard."
          : "Le service Gemini a refusé la requête.",
        upstreamStatus: upstream.status
      });
    }

    const text = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("\n")
      .trim();

    if (!text) return res.status(502).json({ error: "Gemini n'a pas renvoyé de texte." });
    return res.json({ text, model: GEMINI_MODEL });
  } catch (err) {
    const timeoutError = err?.name === "AbortError";
    return res.status(timeoutError ? 504 : 502).json({
      error: timeoutError ? "Délai de réponse Gemini dépassé." : "Impossible de joindre Gemini."
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError) return res.status(400).json({ error: "JSON invalide." });
  return res.status(500).json({ error: "Erreur interne du serveur." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Gemini-Server-Steve écoute sur le port ${PORT}`);
});

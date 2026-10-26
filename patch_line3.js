const fs = require('fs');
const file = 'src/app/api/line/route.ts';
let code = fs.readFileSync(file, 'utf8');

const openRouterStringFunc = `
async function callOpenRouterString(prompt: string, models: string[]): Promise<string> {
  if (!OPENROUTER_API_KEY) return "";

  for (const model of models) {
    try {
      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${OPENROUTER_API_KEY}\`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!aiRes.ok) continue;

      const data = await aiRes.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      if (rawText) return rawText;
    } catch (e) {
      console.error("Error with model", model, e);
    }
  }
  return "";
}
`;

const insertPos = code.indexOf('async function callOpenRouterJson');
if (insertPos !== -1) {
  code = code.slice(0, insertPos) + openRouterStringFunc + "\n" + code.slice(insertPos);
}

// Just do direct string replacement for the errors
code = code.replace(/callOpenRouterJson\(prompt, false\)/g, 'callOpenRouterString(prompt, ["anthropic/claude-3.7-sonnet", "anthropic/claude-3.5-sonnet", "openai/gpt-4o"])');

fs.writeFileSync(file, code, 'utf8');

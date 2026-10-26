const fs = require('fs');
const file = 'src/app/api/line/route.ts';
let code = fs.readFileSync(file, 'utf8');

// The callOpenRouter we tried to use in our new commands expects a plain string response,
// but the project's callOpenRouterJson returns a specific object format. We should create
// a generic callOpenRouterString for our script generation needs.

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

// Insert the new function before callOpenRouterJson
const insertPos = code.indexOf('async function callOpenRouterJson');
if (insertPos !== -1) {
  code = code.slice(0, insertPos) + openRouterStringFunc + "\\n" + code.slice(insertPos);
}

// Replace all invalid callOpenRouterJson with callOpenRouterString in the 810, 919, etc. areas
code = code.replace(/callOpenRouterJson\(prompt, false\)/g, 'callOpenRouterString(prompt, ["anthropic/claude-3.7-sonnet", "anthropic/claude-3.5-sonnet", "openai/gpt-4o"])');
code = code.replace(/const match = aiRes\.match/g, 'const match = (typeof aiRes === "string") ? aiRes.match : null;\n                         if (match && typeof aiRes === "string") {\n                           const m = aiRes.match(/\\{[\\s\\S]*\\}/);\n                           if (m) {');
code = code.replace(/match\[0\]/g, 'm[0]');
code = code.replace(/if \(match\) \{/g, ''); // we handled it above

// Because the replace might be messy, let's just do an exact search/replace
let patchCode = fs.readFileSync(file, 'utf8');

patchCode = patchCode.slice(0, insertPos) + openRouterStringFunc + "\\n" + patchCode.slice(insertPos);

patchCode = patchCode.replace(/const aiRes = await callOpenRouterJson\(prompt, false\);\s*if \(aiRes\) \{\s*const match = aiRes\.match\(\/\\\{\[\\s\\S\]\*\\\/\);\s*if \(match\) \{/g,
  \`const aiRes = await callOpenRouterString(prompt, ["anthropic/claude-3.7-sonnet", "anthropic/claude-3.5-sonnet", "openai/gpt-4o"]);
                       if (aiRes) {
                         const match = aiRes.match(/\\{[\\s\\S]*\\}/);
                         if (match) {\`);

fs.writeFileSync(file, patchCode, 'utf8');
console.log("Patched function types");

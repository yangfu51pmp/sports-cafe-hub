const fs = require('fs');

const file = 'src/app/api/line/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Find the command processing block starting point
const commandBlockStart = code.indexOf('      // 4. 截圖指令');

if (commandBlockStart === -1) {
  console.log("Could not find the command block insertion point.");
  process.exit(1);
}

const newCommands = `
      // v6.2 AI 製片 Commands
      const aiVideoGenMatch = cleanText.match(/^AI製片[：:]\\s*(.+)$/i);
      if (aiVideoGenMatch && REDIS_URL) {
        const theme = aiVideoGenMatch[1].trim();
        const prompt = \`Generate a JSON object for a short sports promotional video script that conforms EXACTLY to this VideoScript TypeScript interface:
                     {
                       title?: string;
                       cover?: { journal?: string; date?: string; title: string; subtitle?: string; stamp?: string; speaker?: string; speakerRole?: string };
                       subtitles?: Array<{ start: number; end: number; text: string; highlight?: string; color?: string }>;
                       events?: Array<{ start: number; end: number; type: "qa_bubble" | "myth_buster" | "big_impact" | "target_focus" | "numbered_pill" | "icon_pill" | "warning_tape" | "progress_card" | "checklist_card"; title?: string; subtitle?: string; text?: string; badge?: string; icon?: string; number?: string; progress?: number; items?: string[]; position?: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right"; sfx?: "none" }>;
                       outro?: { badge?: string; title: string; points: string[]; signature?: string; cta?: string };
                     }
                     Theme: \${theme}
                     Output only valid JSON, no markdown formatting.\`;

        try {
          const aiRes = await callOpenRouter(prompt, false);
          if (aiRes) {
            const match = aiRes.match(/\\{[\\s\\S]*\\}/);
            if (match) {
              const client = createClient({ url: REDIS_URL });
              await client.connect();
              await client.set("site_ai_video_script_draft", match[0]);
              await client.set("awaiting_video_upload", "1", { EX: 300 });
              await client.quit();

              const siteUrl = req.nextUrl.origin;
              try { revalidatePath("/"); } catch {}

              await replyLine(
                replyToken,
                \`✅ 已為「\${theme}」生成全新 v6.2 AI 影片腳本！\n\n您現在可以上傳影片檔案，或是點擊下方連結進入內部審片室預覽疊加效果：\n\${siteUrl}/?preview=video\`
              );
              continue;
            }
          }
        } catch (e) {
          console.error(e);
        }
        await replyLine(replyToken, "❌ 生成腳本失敗，請稍後再試。");
        continue;
      }

      const aiVideoModifyMatch = cleanText.match(/^修改製片[：:]\\s*(.+)$/i);
      if (aiVideoModifyMatch && REDIS_URL) {
        const modifyReq = aiVideoModifyMatch[1].trim();
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        const existingScript = await client.get("site_ai_video_script_draft") || await client.get("site_ai_video_script");

        const prompt = \`Update the following JSON object based on the user's modification request: "\${modifyReq}".
                     Original JSON: \${existingScript || "{}"}
                     Ensure it conforms EXACTLY to this VideoScript TypeScript interface:
                     {
                       title?: string;
                       cover?: { journal?: string; date?: string; title: string; subtitle?: string; stamp?: string; speaker?: string; speakerRole?: string };
                       subtitles?: Array<{ start: number; end: number; text: string; highlight?: string; color?: string }>;
                       events?: Array<{ start: number; end: number; type: "qa_bubble" | "myth_buster" | "big_impact" | "target_focus" | "numbered_pill" | "icon_pill" | "warning_tape" | "progress_card" | "checklist_card"; title?: string; subtitle?: string; text?: string; badge?: string; icon?: string; number?: string; progress?: number; items?: string[]; position?: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right"; sfx?: "none" }>;
                       outro?: { badge?: string; title: string; points: string[]; signature?: string; cta?: string };
                     }
                     Output only valid JSON, no markdown formatting.\`;

        try {
          const aiRes = await callOpenRouter(prompt, false);
          if (aiRes) {
            const match = aiRes.match(/\\{[\\s\\S]*\\}/);
            if (match) {
              await client.set("site_ai_video_script_draft", match[0]);
              await client.quit();

              const siteUrl = req.nextUrl.origin;
              try { revalidatePath("/"); } catch {}

              await replyLine(
                replyToken,
                \`✅ 已根據您的要求修改 v6.2 AI 影片腳本！請點擊下方連結預覽：\n\${siteUrl}/?preview=video\`
              );
              continue;
            }
          }
        } catch (e) {
          console.error(e);
        }
        await client.quit();
        await replyLine(replyToken, "❌ 修改腳本失敗，請稍後再試。");
        continue;
      }

      if (cleanText === "重新製片" && REDIS_URL) {
        const prompt = \`Generate a JSON object for a short sports promotional video script that conforms EXACTLY to this VideoScript TypeScript interface:
                     {
                       title?: string;
                       cover?: { journal?: string; date?: string; title: string; subtitle?: string; stamp?: string; speaker?: string; speakerRole?: string };
                       subtitles?: Array<{ start: number; end: number; text: string; highlight?: string; color?: string }>;
                       events?: Array<{ start: number; end: number; type: "qa_bubble" | "myth_buster" | "big_impact" | "target_focus" | "numbered_pill" | "icon_pill" | "warning_tape" | "progress_card" | "checklist_card"; title?: string; subtitle?: string; text?: string; badge?: string; icon?: string; number?: string; progress?: number; items?: string[]; position?: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right"; sfx?: "none" }>;
                       outro?: { badge?: string; title: string; points: string[]; signature?: string; cta?: string };
                     }
                     Theme: SPORT CAFÉ 職人精神 × 少棒熱血應援 (Alternative fresh take)
                     Output only valid JSON, no markdown formatting.\`;

        try {
          const aiRes = await callOpenRouter(prompt, false);
          if (aiRes) {
            const match = aiRes.match(/\\{[\\s\\S]*\\}/);
            if (match) {
              const client = createClient({ url: REDIS_URL });
              await client.connect();
              await client.set("site_ai_video_script_draft", match[0]);
              await client.quit();

              const siteUrl = req.nextUrl.origin;
              try { revalidatePath("/"); } catch {}

              await replyLine(
                replyToken,
                \`✅ 已重新生成 v6.2 AI 影片腳本！請點擊下方連結預覽：\n\${siteUrl}/?preview=video\`
              );
              continue;
            }
          }
        } catch (e) {
          console.error(e);
        }
        await replyLine(replyToken, "❌ 重新生成腳本失敗，請稍後再試。");
        continue;
      }

      if (cleanText === "確認上架影片" && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        const draftVideo = await client.get("site_promo_video_draft");
        const draftScript = await client.get("site_ai_video_script_draft");

        if (draftVideo) await client.set("site_promo_video", draftVideo);
        if (draftScript) await client.set("site_ai_video_script", draftScript);

        // Clean up drafts
        await client.del("site_promo_video_draft");
        await client.del("site_ai_video_script_draft");

        await client.quit();

        const siteUrl = req.nextUrl.origin;
        try { revalidatePath("/"); } catch {}

        await replyLine(
          replyToken,
          \`🎉 影片與 v6.2 AI 腳本已成功發布至正式環境！\n官網已即時生效：\n\${siteUrl}\`
        );
        continue;
      }

      if (cleanText === "取消上架影片" && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();

        await client.del("site_promo_video_draft");
        await client.del("site_ai_video_script_draft");
        await client.del("site_ai_video_script");

        await client.quit();

        try { revalidatePath("/"); } catch {}

        await replyLine(
          replyToken,
          \`🚫 已取消影片上架並清除草稿。\`
        );
        continue;
      }

`;

const insertIndex = commandBlockStart;
const newCode = code.slice(0, insertIndex) + newCommands + code.slice(insertIndex);

fs.writeFileSync(file, newCode, 'utf8');
console.log("Successfully patched route.ts");

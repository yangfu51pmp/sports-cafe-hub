export async function runSystemCleanup(client?: any, tempKeys: string[] = []): Promise<string> {
  const releasedKeys: string[] = [];
  let vercelStatus = "";

  // 1. Clean Redis keys if client and keys are provided
  if (client && tempKeys.length > 0) {
    for (const key of tempKeys) {
      try {
        await client.del(key);
        releasedKeys.push(key);
      } catch (e) {
        console.error(`Redis cleanup error for key ${key}:`, e);
      }
    }
  }

  // 2. Clean Vercel deployments scoped to this project
  const vercelToken = process.env.VERCEL_TOKEN;
  if (!vercelToken) {
    vercelStatus = "無 Vercel Token，跳過部署清理";
  } else {
    try {
      const listUrl = "https://api.vercel.com/v6/deployments?app=sports-cafe-hub&limit=30";
      const res = await fetch(listUrl, {
        headers: {
          "Authorization": `Bearer ${vercelToken}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        vercelStatus = `HTTP ${res.status} - ${errorText || res.statusText}`;
      } else {
        const data = await res.json();
        const deployments = data.deployments || [];

        let readyKept = 0;
        let deletedCount = 0;

        for (const d of deployments) {
          const state = d.state || d.readyState;

          if (state === "READY") {
            if (readyKept < 3) {
              readyKept++;
            } else {
              await deleteDeployment(d.uid, vercelToken);
              deletedCount++;
            }
          } else {
            await deleteDeployment(d.uid, vercelToken);
            deletedCount++;
          }
        }
        vercelStatus = `已保留最新 ${readyKept} 筆部署，成功刪除 ${deletedCount} 筆舊部署快照`;
      }
    } catch (e: any) {
      console.error("Vercel cleanup error:", e);
      vercelStatus = `執行錯誤: ${e.message || String(e)}`;
    }
  }

  return [
    "🧹 Sport Café 系統空間清理完畢",
    `- 釋放暫存鍵值: ${releasedKeys.length > 0 ? releasedKeys.join(", ") : "無"}`,
    `- Vercel 狀態: ${vercelStatus}`,
  ].join("\n");
}

async function deleteDeployment(uid: string, token: string) {
  try {
    await fetch(`https://api.vercel.com/v13/deployments/${uid}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
  } catch (e) {
    console.error(`Failed to delete deployment ${uid}:`, e);
  }
}

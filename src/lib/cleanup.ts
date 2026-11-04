export async function runSystemCleanup(client?: any, tempKeys: string[] = []): Promise<string> {
  let summary = "🧹 Sport Café 系統空間清理完畢...\n";
  let redisCleaned = 0;
  let vercelCleaned = 0;

  // 1. Clean Redis keys if client and keys are provided
  if (client && tempKeys.length > 0) {
    try {
      for (const key of tempKeys) {
        await client.del(key);
        redisCleaned++;
      }
      summary += `- 已清除 ${redisCleaned} 筆暫存緩存\n`;
    } catch (e) {
      console.error("Redis cleanup error:", e);
    }
  }

  // 2. Clean Vercel deployments scoped to this project
  const vercelToken = process.env.VERCEL_TOKEN;
  if (vercelToken) {
    try {
      const projectId = process.env.VERCEL_PROJECT_ID;
      const scopeParam = projectId ? `projectId=${encodeURIComponent(projectId)}` : `app=sports-cafe-hub`;
      const listUrl = `https://api.vercel.com/v6/deployments?limit=30&${scopeParam}`;

      const res = await fetch(listUrl, {
        headers: {
          "Authorization": `Bearer ${vercelToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const deployments = data.deployments || [];

        let readyCount = 0;

        for (const d of deployments) {
          const state = d.state || d.readyState;

          if (state === "READY") {
            readyCount++;
            if (readyCount > 3) {
              // Delete older READY deployments
              await deleteDeployment(d.uid, vercelToken);
              vercelCleaned++;
            }
          } else if (state === "ERROR" || state === "CANCELED") {
            // Delete ERROR / CANCELED deployments
            await deleteDeployment(d.uid, vercelToken);
            vercelCleaned++;
          }
        }
        summary += `- 已清理 ${vercelCleaned} 筆舊版/失敗部署\n`;
      } else {
        console.error("Failed to fetch Vercel deployments:", await res.text());
      }
    } catch (e) {
      console.error("Vercel cleanup error:", e);
    }
  }

  if (redisCleaned === 0 && vercelCleaned === 0) {
    summary += "目前系統空間已是最佳狀態，無需清理。";
  }

  return summary.trim();
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

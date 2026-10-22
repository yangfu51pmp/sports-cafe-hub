import { NextResponse } from "next/server";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || process.env.KV_URL || "";

export async function GET() {
  try {
    const client = createClient({ url: REDIS_URL });
    await client.connect();

    const title = await client.get("site_title");
    const announcement = await client.get("site_announcement");
    const announcementUrl = await client.get("site_announcement_url");
    const heroImage = await client.get("site_hero_image");
    const btnStyle = await client.get("site_btn_style");
    const services = await client.get("site_services");

    await client.quit();

    return NextResponse.json({
      title: title || "SPORT CAFÉ",
      announcement: announcement || "民安少棒・巨人盃賽事直播中！",
      announcementUrl: announcementUrl || "https://youtube.com",
      heroImage: heroImage || "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1600&auto=format&fit=crop",
      btnStyle: btnStyle || "bg-[#C8A878] text-white shadow-md",
      services: services ? JSON.parse(services) : null,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

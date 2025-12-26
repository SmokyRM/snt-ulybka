import fs from "fs/promises";
import path from "path";

export type HomeViewKey = "homeOld" | "homeNew";

type Views = { homeOld: number; homeNew: number };

const defaultViews: Views = { homeOld: 0, homeNew: 0 };
const viewsPath = path.join(process.cwd(), "data", "home-views.json");

async function readViews(): Promise<Views> {
  try {
    const raw = await fs.readFile(viewsPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Views>;
    return {
      homeOld: typeof parsed.homeOld === "number" ? parsed.homeOld : 0,
      homeNew: typeof parsed.homeNew === "number" ? parsed.homeNew : 0,
    };
  } catch {
    const dir = path.dirname(viewsPath);
    await fs.mkdir(dir, { recursive: true });
    await writeViews(defaultViews);
    return defaultViews;
  }
}

async function writeViews(views: Views) {
  const tmp = `${viewsPath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(views, null, 2), "utf-8");
  await fs.rename(tmp, viewsPath);
}

export async function incrementHomeView(key: HomeViewKey): Promise<void> {
  const current = await readViews();
  const next: Views = {
    ...current,
    [key]: (current[key] ?? 0) + 1,
  };
  await writeViews(next);
}

export async function getHomeViews(): Promise<Views> {
  return readViews();
}

import { KINDS, data, featureUrl, moduleUrl } from "../data";

// Static search index: one entry per feature and per modern feature, fetched by the Search component on first use.
export function GET() {
  const strip = (html: string) =>
    html.replace(/<[^>]+>/g, "").replace(/&#x([\da-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const index = [
    ...data.modern.map((m) => ({ names: [m.name], text: strip(m.description), section: "Modern CSS", url: `/modern/#${m.id}` })),
    ...data.modules.flatMap((module) =>
      module.features.map((f) => ({
        names: [f.name],
        text: strip(f.mdn?.summary || f.prose || "").slice(0, 160),
        section: `${KINDS[f.kind].title} · ${module.title}`,
        url: featureUrl(f),
      })),
    ),
    ...data.modules.map((m) => ({ names: [m.title], text: `${m.features.length} features`, section: "Specification", url: moduleUrl(m) })),
  ];
  return new Response(JSON.stringify(index), { headers: { "Content-Type": "application/json" } });
}

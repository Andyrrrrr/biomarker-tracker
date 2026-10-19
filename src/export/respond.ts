import type { Dashboard } from "@/lib/data";
import { resultsCsv } from "./csv";
import { resultsPdf } from "./pdf";

// The download for /export/<format> and /s/<token>/export/<format>. The caller has already
// checked access and loaded the data.
export async function exportResponse(format: string, data: Dashboard): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "private, no-store" };
  if (format === "csv") {
    // The byte-order mark tells Excel the file is UTF-8, so "µg/dL" doesn't come out garbled.
    return new Response("\uFEFF" + resultsCsv(data), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": attachment(`lab-results-${today}.csv`) },
    });
  }
  if (format === "pdf") {
    const pdf = await resultsPdf(data, { generatedOn: today });
    return new Response(new Uint8Array(pdf), {
      headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": attachment(`lab-results-${today}.pdf`) },
    });
  }
  return new Response("Not found", { status: 404 });
}

function attachment(filename: string) {
  return `attachment; filename="${filename}"`;
}

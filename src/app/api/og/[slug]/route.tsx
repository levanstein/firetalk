import { ImageResponse } from "next/og";
import { getDebate } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const debate = await getDebate(slug);

  if (!debate) {
    return new Response("Not found", { status: 404 });
  }

  const totalVotes = debate.votesA + debate.votesB;
  const pctA = totalVotes > 0 ? Math.round((debate.votesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;
  const sourceCount = (debate.sources || []).length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9f9f9",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            position: "absolute",
            top: "32px",
            left: "40px",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#f97316" }}>Fire</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#1a1a1a" }}>Talk</div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
          {/* Company A */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <img
              src={`https://www.google.com/s2/favicons?sz=128&domain=${debate.companyA.domain}`}
              width={80}
              height={80}
              style={{ borderRadius: "16px", background: "white", padding: "8px" }}
            />
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1a1a1a" }}>
              {debate.companyA.name}
            </div>
            <div style={{ fontSize: "36px", fontWeight: 900, color: "#f97316" }}>
              {pctA}%
            </div>
          </div>

          {/* VS */}
          <div style={{ fontSize: "48px", fontWeight: 900, color: "#f97316" }}>VS</div>

          {/* Company B */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <img
              src={`https://www.google.com/s2/favicons?sz=128&domain=${debate.companyB.domain}`}
              width={80}
              height={80}
              style={{ borderRadius: "16px", background: "white", padding: "8px" }}
            />
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1a1a1a" }}>
              {debate.companyB.name}
            </div>
            <div style={{ fontSize: "36px", fontWeight: 900, color: "#6b7280" }}>
              {pctB}%
            </div>
          </div>
        </div>

        {/* Bottom info */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            display: "flex",
            gap: "24px",
            fontSize: "16px",
            color: "#9ca3af",
          }}
        >
          <span>AI Product Battle</span>
          <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
          <span>{sourceCount} sources analyzed</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

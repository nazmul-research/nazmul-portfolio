import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          color: "#f8fafc",
          backgroundColor: "#0b0d12",
          backgroundImage:
            "radial-gradient(900px 350px at 10% 0%, rgba(99,102,241,.35), transparent 60%), radial-gradient(800px 350px at 95% 0%, rgba(14,165,233,.30), transparent 60%)",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.9 }}>Nazmul Islam</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -1.5 }}>AI • Robotics • Agent Systems</div>
          <div style={{ fontSize: 30, opacity: 0.85 }}>Portfolio + CMS</div>
        </div>
      </div>
    ),
    size,
  );
}

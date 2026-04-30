import { HOME_ROUTE_CARDS } from "../lib/home-navigation"

export default function HomePage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>AI Marketing Engine</h1>
      <p>Choose where you want to work:</p>
      <div style={{ display: "grid", gap: 12 }}>
        {HOME_ROUTE_CARDS.map((card) => (
          <a
            key={card.href}
            href={card.href}
            style={{
              border: "1px solid #d3dae0",
              borderRadius: 8,
              padding: 14,
              textDecoration: "none",
              color: "inherit",
              background: "#ffffff",
            }}
          >
            <h2 style={{ margin: "0 0 6px 0", fontSize: 20 }}>{card.title}</h2>
            <p style={{ margin: 0 }}>{card.description}</p>
          </a>
        ))}
      </div>
    </main>
  )
}

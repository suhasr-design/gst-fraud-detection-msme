import { useState, useEffect } from "react";
import { TRANSLATIONS, LANGUAGES } from "./translations";

const API = "http://localhost:8000";

const COLORS = {
  bg: "#0D1B2A", card: "#142A3D", cardDark: "#0A1E2F",
  accent: "#00D4AA", orange: "#F96B35", yellow: "#FFD600",
  white: "#FFFFFF", muted: "#8AA8C0", light: "#CCD6E0",
  danger: "#FF4D6A", warn: "#FFB547", border: "#1E3A52",
  whatsapp: "#25D366",
};

const getRiskColor = (s) => s >= 70 ? COLORS.danger : s >= 40 ? COLORS.warn : COLORS.accent;
const getStatusBg = (s) => s === "HIGH" ? { bg: "#3D0E18", color: COLORS.danger }
  : s === "MEDIUM" ? { bg: "#3D2800", color: COLORS.warn }
  : { bg: "#0A2E1E", color: COLORS.accent };

function StatCard({ label, value, sub, color = COLORS.accent }) {
  return (
    <div style={{ background: COLORS.card, borderRadius: 12, padding: "18px 22px", border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function RiskBar({ value }) {
  return (
    <div style={{ background: "#0A1E2F", borderRadius: 4, height: 6, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${value}%`, height: "100%", background: getRiskColor(value), transition: "width 0.6s" }} />
    </div>
  );
}

function NetworkGraph({ data }) {
  const [hovered, setHovered] = useState(null);
  if (!data || !data.nodes.length) return <div style={{ color: COLORS.muted, padding: 40, textAlign: "center" }}>No graph data</div>;

  const cx = 400, cy = 280, r = 200;
  const positioned = data.nodes.map((n, i) => ({
    ...n,
    x: cx + r * Math.cos((2 * Math.PI * i) / data.nodes.length),
    y: cy + r * Math.sin((2 * Math.PI * i) / data.nodes.length),
  }));
  const lookup = Object.fromEntries(positioned.map(n => [n.id, n]));

  return (
    <svg viewBox="0 0 800 560" style={{ width: "100%", background: COLORS.cardDark, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
      <defs>
        <marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={COLORS.danger} />
        </marker>
      </defs>
      {data.edges.map((e, i) => {
        const f = lookup[e.from], t = lookup[e.to];
        if (!f || !t) return null;
        return (
          <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y}
            stroke={e.circular ? COLORS.danger : COLORS.border}
            strokeWidth={e.circular ? 2.5 : 1}
            strokeDasharray={e.circular ? "0" : "5,4"}
            markerEnd={e.circular ? "url(#ar)" : ""} />
        );
      })}
      {positioned.map(n => (
        <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
          <circle cx={n.x} cy={n.y} r={hovered === n.id ? 28 : 22} fill={getRiskColor(n.risk)} opacity={0.9} />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#000" fontSize={11} fontWeight="bold">{Math.round(n.risk)}</text>
          <text x={n.x} y={n.y + 40} textAnchor="middle" fill={COLORS.light} fontSize={10}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function App() {
  const [lang, setLang] = useState("en");
  const t = TRANSLATIONS[lang];

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("dashboard");

  const [gstin, setGstin] = useState("");
  const [msme, setMsme] = useState(null);
  const [msmeLoading, setMsmeLoading] = useState(false);

  const [yourGstin, setYourGstin] = useState("");
  const [prospectiveGstin, setProspectiveGstin] = useState("");
  const [preCheck, setPreCheck] = useState(null);
  const [preCheckLoading, setPreCheckLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [alertSetup, setAlertSetup] = useState(null);
  const [alertLoading, setAlertLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/analyze-sample`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  const checkMsme = async () => {
    if (!gstin.trim()) return;
    setMsmeLoading(true);
    try {
      const r = await fetch(`${API}/api/check-msme/${gstin.trim()}`);
      const d = await r.json();
      setMsme(d);
    } catch (e) { setMsme({ found: false, message: "API error" }); }
    setMsmeLoading(false);
  };

  const runPreCheck = async () => {
    if (!yourGstin.trim() || !prospectiveGstin.trim()) return;
    setPreCheckLoading(true);
    try {
      const r = await fetch(`${API}/api/pre-transaction-check/${yourGstin.trim()}/${prospectiveGstin.trim()}`);
      const d = await r.json();
      setPreCheck(d);
    } catch (e) { setPreCheck({ error: "API error" }); }
    setPreCheckLoading(false);
  };

  const setupAlerts = async () => {
    if (!phone.trim() || !gstin.trim()) return;
    setAlertLoading(true);
    try {
      const r = await fetch(`${API}/api/whatsapp-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), gstin: gstin.trim() }),
      });
      const d = await r.json();
      setAlertSetup(d);
    } catch (e) { setAlertSetup({ success: false, message: "API error" }); }
    setAlertLoading(false);
  };

  if (loading) return <div style={{ background: COLORS.bg, color: COLORS.white, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>Loading from API...</div>;
  if (err) return <div style={{ background: COLORS.bg, color: COLORS.danger, minHeight: "100vh", padding: 40, fontFamily: "sans-serif" }}>API error: {err}<br />Make sure FastAPI is running on port 8000</div>;

  const high = data.scores.filter(s => s.status === "HIGH").length;
  const medium = data.scores.filter(s => s.status === "MEDIUM").length;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.white, fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "0 32px", display: "flex", alignItems: "center", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginRight: 40 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔍</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t.appName}</div>
            <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 1 }}>{t.tagline}</div>
          </div>
        </div>
        {[
          { id: "dashboard", label: `📊 ${t.dashboard}` },
          { id: "graph", label: `🔗 ${t.network}` },
          { id: "table", label: `📋 ${t.entities}` },
          { id: "msme", label: `🛡️ ${t.msmeCheck}` },
        ].map(tabItem => (
          <button key={tabItem.id} onClick={() => setTab(tabItem.id)} style={{
            padding: "8px 18px", border: "none", cursor: "pointer", marginRight: 4,
            background: tab === tabItem.id ? COLORS.accent + "22" : "transparent",
            color: tab === tabItem.id ? COLORS.accent : COLORS.muted,
            fontWeight: tab === tabItem.id ? 700 : 400, fontSize: 13,
            borderBottom: tab === tabItem.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
          }}>{tabItem.label}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <select value={lang} onChange={e => setLang(e.target.value)} style={{
            background: COLORS.cardDark, color: COLORS.light, border: `1px solid ${COLORS.border}`,
            borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer",
          }}>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: COLORS.accent }}>● {t.connected}</div>
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 1400, margin: "0 auto" }}>
        {tab === "dashboard" && (
          <>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 24 }}>{t.fraudOverview}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              <StatCard label={t.entitiesAnalysed} value={data.summary.total_nodes} color={COLORS.accent} />
              <StatCard label={t.highRisk} value={high} color={COLORS.danger} />
              <StatCard label={t.mediumRisk} value={medium} color={COLORS.warn} />
              <StatCard label={t.circularLoops} value={data.summary.circular_loops} color={COLORS.orange} />
            </div>
            <div style={{ background: COLORS.card, padding: 22, borderRadius: 14, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t.riskDistribution}</div>
              {data.scores.slice(0, 8).map(e => (
                <div key={e.gstin} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: COLORS.light, fontFamily: "monospace" }}>{e.gstin}</span>
                    <span style={{ color: getRiskColor(e.risk_score), fontWeight: 700 }}>{e.risk_score}</span>
                  </div>
                  <RiskBar value={e.risk_score} />
                </div>
              ))}
            </div>
            {data.cycles.length > 0 && (
              <div style={{ background: "#3D0E18", padding: 16, borderRadius: 12, marginTop: 20, border: `1px solid ${COLORS.danger}40` }}>
                <div style={{ color: COLORS.danger, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{t.loopsDetected}</div>
                {data.cycles.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: COLORS.light, fontFamily: "monospace", marginBottom: 4 }}>
                    Loop {i + 1}: {c.join(" → ")} → {c[0]}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "graph" && (
          <>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 24 }}>{t.transactionNetwork}</div>
            <NetworkGraph data={data.graph} />
          </>
        )}

        {tab === "table" && (
          <>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 24 }}>{t.entityRiskScores}</div>
            <div style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.cardDark }}>
                    {["GSTIN", t.risk, t.status, t.circular, t.anomaly, t.txns].map(h => (
                      <th key={h} style={{ padding: 12, fontSize: 10, color: COLORS.muted, textAlign: "left", letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.scores.map(e => {
                    const sb = getStatusBg(e.status);
                    return (
                      <tr key={e.gstin} style={{ borderTop: `1px solid ${COLORS.border}40` }}>
                        <td style={{ padding: 12, fontFamily: "monospace", fontSize: 11, color: COLORS.light }}>{e.gstin}</td>
                        <td style={{ padding: 12, fontWeight: 700, color: getRiskColor(e.risk_score), fontFamily: "monospace" }}>{e.risk_score}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{ background: sb.bg, color: sb.color, padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{e.status}</span>
                        </td>
                        <td style={{ padding: 12, color: e.circular_score > 0 ? COLORS.danger : COLORS.muted }}>{e.circular_score}</td>
                        <td style={{ padding: 12, color: COLORS.light }}>{e.anomaly_score}</td>
                        <td style={{ padding: 12, color: COLORS.light }}>{e.txn_count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "msme" && (
          <>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 24 }}>{t.msmeTitle}</div>

            <div style={{ background: COLORS.card, borderRadius: 14, padding: 28, border: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <input value={gstin} onChange={e => setGstin(e.target.value)}
                  placeholder={t.enterGstin}
                  onKeyDown={e => e.key === "Enter" && checkMsme()}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: COLORS.cardDark, border: `1px solid ${COLORS.border}`, color: COLORS.white, fontSize: 14, fontFamily: "monospace" }} />
                <button onClick={checkMsme} disabled={msmeLoading} style={{ padding: "12px 28px", borderRadius: 10, background: COLORS.accent, color: "#000", fontWeight: 700, border: "none", cursor: "pointer" }}>
                  {msmeLoading ? t.checking : t.checkRisk}
                </button>
              </div>

              {msme && msme.found && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: getStatusBg(msme.entity.status).bg, borderRadius: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: getRiskColor(msme.entity.risk_score), fontFamily: "monospace" }}>{msme.entity.risk_score}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{msme.entity.gstin}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted }}>{msme.entity.txn_count} {t.txnsAnalysed}</div>
                    </div>
                    <div style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: getStatusBg(msme.entity.status).color + "22", color: getStatusBg(msme.entity.status).color, fontWeight: 700 }}>
                      {msme.entity.status} {t.riskLabel}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                    <StatCard label={t.circular.toUpperCase()} value={msme.entity.circular_score} color={COLORS.danger} />
                    <StatCard label={t.anomaly.toUpperCase()} value={msme.entity.anomaly_score} color={COLORS.warn} />
                    <StatCard label={t.network2} value={msme.entity.pagerank_score} color={COLORS.orange} />
                    <StatCard label={t.velocity} value={msme.entity.velocity_score} color={COLORS.yellow} />
                  </div>
                  {msme.loops && msme.loops.length > 0 && (
                    <div style={{ background: "#3D0E18", padding: 14, borderRadius: 10, border: `1px solid ${COLORS.danger}40` }}>
                      <div style={{ color: COLORS.danger, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>{t.foundInLoops} {msme.loops.length} {t.fraudLoops}</div>
                      {msme.loops.map((l, i) => (
                        <div key={i} style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.light, marginBottom: 4 }}>
                          {l.join(" → ")} → {l[0]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {msme && !msme.found && (
                <div style={{ color: COLORS.muted, padding: 16, textAlign: "center" }}>{msme.message || t.notFound}</div>
              )}
              <div style={{ marginTop: 16, fontSize: 11, color: COLORS.muted }}>
                {t.try} <span style={{ color: COLORS.orange, fontFamily: "monospace", cursor: "pointer" }} onClick={() => setGstin("29ABCDE1234F1Z8")}>29ABCDE1234F1Z8</span> · <span style={{ color: COLORS.accent, fontFamily: "monospace", cursor: "pointer" }} onClick={() => setGstin("27AAACR5055K1Z5")}>27AAACR5055K1Z5</span>
              </div>
            </div>

            <div style={{ background: COLORS.card, borderRadius: 14, padding: 28, border: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t.preCheckTitle}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>{t.preCheckDesc}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, marginBottom: 20 }}>
                <input value={yourGstin} onChange={e => setYourGstin(e.target.value)}
                  placeholder="Your GSTIN"
                  style={{ padding: "12px 16px", borderRadius: 10, background: COLORS.cardDark, border: `1px solid ${COLORS.border}`, color: COLORS.white, fontSize: 14, fontFamily: "monospace" }} />
                <input value={prospectiveGstin} onChange={e => setProspectiveGstin(e.target.value)}
                  placeholder={t.prospectiveGstin}
                  style={{ padding: "12px 16px", borderRadius: 10, background: COLORS.cardDark, border: `1px solid ${COLORS.border}`, color: COLORS.white, fontSize: 14, fontFamily: "monospace" }} />
                <button onClick={runPreCheck} disabled={preCheckLoading} style={{ padding: "12px 24px", borderRadius: 10, background: COLORS.accent, color: "#000", fontWeight: 700, border: "none", cursor: "pointer" }}>
                  {preCheckLoading ? t.simulating : t.simulate}
                </button>
              </div>

              {preCheck && !preCheck.error && (
                <div>
                  <div style={{
                    padding: 16, borderRadius: 12, marginBottom: 16,
                    background: preCheck.recommendation === "AVOID" ? "#3D0E18" : preCheck.recommendation === "CAUTION" ? "#3D2800" : "#0A2E1E",
                    border: `1px solid ${preCheck.recommendation === "AVOID" ? COLORS.danger : preCheck.recommendation === "CAUTION" ? COLORS.warn : COLORS.accent}40`,
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: preCheck.recommendation === "AVOID" ? COLORS.danger : preCheck.recommendation === "CAUTION" ? COLORS.warn : COLORS.accent, marginBottom: 6 }}>
                      {preCheck.recommendation === "AVOID" ? t.avoidSupplier : preCheck.recommendation === "CAUTION" ? t.cautionAdvised : t.safeToTransact}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.light, lineHeight: 1.6 }}>{preCheck.explanation}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
                    <div style={{ background: COLORS.cardDark, padding: 16, borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>YOUR CURRENT RISK</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: getRiskColor(preCheck.your_current_risk), fontFamily: "monospace" }}>{preCheck.your_current_risk}</div>
                    </div>
                    <div style={{ fontSize: 24, color: COLORS.muted }}>→</div>
                    <div style={{ background: COLORS.cardDark, padding: 16, borderRadius: 10, textAlign: "center", border: `1px solid ${getRiskColor(preCheck.projected_risk)}40` }}>
                      <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>PROJECTED RISK</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: getRiskColor(preCheck.projected_risk), fontFamily: "monospace" }}>{preCheck.projected_risk}</div>
                      <div style={{ fontSize: 11, color: preCheck.risk_delta > 5 ? COLORS.danger : COLORS.muted, marginTop: 4 }}>
                        {preCheck.risk_delta > 0 ? "+" : ""}{preCheck.risk_delta} delta
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, padding: 12, background: COLORS.cardDark, borderRadius: 8, fontSize: 11, color: COLORS.muted }}>
                    Prospective supplier risk: <span style={{ color: getRiskColor(preCheck.prospective_risk), fontWeight: 700 }}>{preCheck.prospective_risk}</span> ({preCheck.prospective_status})
                    {preCheck.prospective_in_loop && <span style={{ color: COLORS.danger, marginLeft: 8 }}>· In active fraud loop</span>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: COLORS.card, borderRadius: 14, padding: 28, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: COLORS.whatsapp }}>{t.alertTitle}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>{t.alertDesc}</div>

              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder={t.phoneNumber}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: COLORS.cardDark, border: `1px solid ${COLORS.border}`, color: COLORS.white, fontSize: 14, fontFamily: "monospace" }} />
                <button onClick={setupAlerts} disabled={alertLoading || !gstin || !phone} style={{
                  padding: "12px 24px", borderRadius: 10, background: COLORS.whatsapp, color: "#fff",
                  fontWeight: 700, border: "none", cursor: "pointer", fontSize: 14,
                  opacity: (!gstin || !phone) ? 0.5 : 1,
                }}>
                  {alertLoading ? "..." : `📱 ${t.enableAlerts}`}
                </button>
              </div>

              {!gstin && <div style={{ fontSize: 11, color: COLORS.warn, marginBottom: 12 }}>↑ Enter your GSTIN at the top first</div>}

              {alertSetup && alertSetup.success && (
                <div style={{ background: "#0A2E1E", padding: 16, borderRadius: 10, border: `1px solid ${COLORS.whatsapp}40` }}>
                  <div style={{ color: COLORS.whatsapp, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                    {t.alertsEnabled} {alertSetup.phone}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>You'll receive WhatsApp alerts for:</div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: COLORS.light, fontSize: 12, lineHeight: 1.8 }}>
                    {alertSetup.alerts_configured.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {alertSetup && !alertSetup.success && (
                <div style={{ color: COLORS.danger, fontSize: 12 }}>{alertSetup.message}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

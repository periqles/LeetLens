import React, { useEffect, useState, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { fetchLeetifyProfile, LeetifyProfile, MapStats, fetchProPlayerProfile, PRO_PLAYERS } from "./leetifyApi";

interface Props {
  steam64Id: string;
  compact?: boolean;
}

function getRatingColor(rating: number | null): string {
  if (rating === null) return "#666";
  if (rating >= 8) return "#22c55e";
  if (rating >= 4) return "#84cc16";
  if (rating >= 0) return "#eab308";
  if (rating >= -4) return "#f97316";
  return "#ef4444";
}

function getPremierColor(rating: number): { main: string; bg: string; glow: string } {
  if (rating >= 30000) return { main: "#ffd700", bg: "linear-gradient(135deg, #ffd700 0%, #ffb800 50%, #ff9500 100%)", glow: "0 0 10px #ffd70080" };
  if (rating >= 25000) return { main: "#eb4b4b", bg: "linear-gradient(135deg, #eb4b4b 0%, #ff6b6b 50%, #eb4b4b 100%)", glow: "0 0 10px #eb4b4b80" };
  if (rating >= 20000) return { main: "#d32ee6", bg: "linear-gradient(135deg, #d32ee6 0%, #ff6bff 50%, #d32ee6 100%)", glow: "0 0 10px #d32ee680" };
  if (rating >= 15000) return { main: "#8847ff", bg: "linear-gradient(135deg, #8847ff 0%, #a855f7 50%, #8847ff 100%)", glow: "0 0 10px #8847ff80" };
  if (rating >= 10000) return { main: "#4b69ff", bg: "linear-gradient(135deg, #4b69ff 0%, #6b8bff 50%, #4b69ff 100%)", glow: "0 0 10px #4b69ff80" };
  if (rating >= 5000) return { main: "#5e98d9", bg: "linear-gradient(135deg, #5e98d9 0%, #7eb8f9 50%, #5e98d9 100%)", glow: "0 0 10px #5e98d980" };
  return { main: "#8b8b8b", bg: "linear-gradient(135deg, #8b8b8b 0%, #ababab 50%, #8b8b8b 100%)", glow: "none" };
}

function formatPremierRank(rank: number): string {
  return rank.toLocaleString();
}

function getWinRateColor(rate: number): string {
  if (rate >= 55) return "#22c55e";
  if (rate >= 50) return "#84cc16";
  if (rate >= 45) return "#eab308";
  return "#ef4444";
}

function PremierBadge({ rank }: { rank: number }) {
  const colors = getPremierColor(rank);
  
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      marginLeft: "4px",
      padding: "1px 6px",
      borderRadius: "3px",
      background: colors.bg,
      fontSize: "10px",
      fontWeight: "bold",
      color: "#fff",
      textShadow: "0 1px 2px rgba(0,0,0,0.5)",
      boxShadow: colors.glow,
    }}>
      <span style={{ marginRight: "3px", fontSize: "8px" }}>★</span>
      {formatPremierRank(rank)}
    </span>
  );
}

interface PopupPosition {
  top: number;
  left: number;
}

function MapStatsRow({ map }: { map: MapStats }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ color: "#d4d4d4", fontSize: "12px", textTransform: "capitalize" }}>
        {map.mapName}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "#737373", fontSize: "10px" }}>
          {map.wins}W {map.losses}L
        </span>
        <span style={{
          color: getWinRateColor(map.winRate),
          fontSize: "12px",
          fontWeight: "600",
          minWidth: "40px",
          textAlign: "right",
        }}>
          {map.winRate.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, subValue, color }: { icon: string; label: string; value: string; subValue?: string; color?: string }) {
  return (
    <div style={{ backgroundColor: "#1a1a1a", padding: "10px", borderRadius: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#a3a3a3", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px" }}>{icon}</span>
        <span style={{ fontSize: "9px", fontWeight: "600", textTransform: "uppercase" }}>{label}</span>
      </div>
      <p style={{ color: color || "white", fontSize: "16px", fontWeight: "700", margin: 0 }}>{value}</p>
      {subValue && <p style={{ color: "#737373", fontSize: "9px", margin: "2px 0 0 0" }}>{subValue}</p>}
    </div>
  );
}

function CompareRow({ label, playerValue, proValue, format, higherIsBetter }: {
  label: string;
  playerValue: number | null;
  proValue: number | null;
  format: (v: number | null) => string;
  higherIsBetter: boolean;
}) {
  const playerBetter = playerValue !== null && proValue !== null && (
    higherIsBetter ? playerValue > proValue : playerValue < proValue
  );
  const proBetter = playerValue !== null && proValue !== null && (
    higherIsBetter ? proValue > playerValue : proValue < playerValue
  );
  const equal = playerValue !== null && proValue !== null && playerValue === proValue;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ 
        flex: 1, 
        textAlign: "left",
        color: playerBetter ? "#4ade80" : equal ? "#eab308" : "#fff",
        fontWeight: "600",
        fontSize: "13px",
      }}>
        {format(playerValue)}
        {playerBetter && <span style={{ marginLeft: "4px", fontSize: "10px" }}>▲</span>}
      </div>
      <div style={{ 
        flex: 1, 
        textAlign: "center",
        color: "#737373",
        fontSize: "10px",
        fontWeight: "600",
        textTransform: "uppercase",
      }}>
        {label}
      </div>
      <div style={{ 
        flex: 1, 
        textAlign: "right",
        color: proBetter ? "#667eea" : equal ? "#eab308" : "#fff",
        fontWeight: "600",
        fontSize: "13px",
      }}>
        {proBetter && <span style={{ marginRight: "4px", fontSize: "10px" }}>▲</span>}
        {format(proValue)}
      </div>
    </div>
  );
}

function PopupContent({ profile, steam64Id, onClose, position }: { profile: LeetifyProfile; steam64Id: string; onClose: () => void; position: PopupPosition }) {
  const rating = profile.leetifyRating!;
  const ratingStr = rating >= 0 ? `+${rating.toFixed(1)}` : rating.toFixed(1);
  const isPositive = rating >= 0;
  const premierColors = profile.premierRank ? getPremierColor(profile.premierRank) : null;
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [activeTab, setActiveTab] = useState<"overview" | "maps" | "compare">("overview");
  const [proProfile, setProProfile] = useState<LeetifyProfile | null>(null);
  const [loadingPro, setLoadingPro] = useState(false);

  useEffect(() => {
    if (activeTab === "compare" && !proProfile && !loadingPro) {
      setLoadingPro(true);
      fetchProPlayerProfile("donk").then((data) => {
        setProProfile(data);
        setLoadingPro(false);
      });
    }
  }, [activeTab, proProfile, loadingPro]);

  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newTop = position.top;
      let newLeft = position.left;

      if (newLeft + rect.width > viewportWidth - 20) {
        newLeft = viewportWidth - rect.width - 20;
      }
      if (newLeft < 20) {
        newLeft = 20;
      }

      if (newTop + rect.height > viewportHeight - 20) {
        newTop = position.top - rect.height - 40;
      }
      if (newTop < 20) {
        newTop = 20;
      }

      setAdjustedPosition({ top: newTop, left: newLeft });
    }
  }, [position]);

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
      }}
      onClick={onClose}
    >
      <div 
        ref={popupRef}
        style={{
          position: "absolute",
          top: `${adjustedPosition.top}px`,
          left: `${adjustedPosition.left}px`,
          width: "340px",
          backgroundColor: "#141414",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
          animation: "leetify-popup-appear 0.15s ease-out",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes leetify-popup-appear {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .leetify-tab { cursor: pointer; padding: 8px 16px; font-size: 11px; font-weight: 600; border: none; background: none; color: #737373; transition: all 0.2s; }
          .leetify-tab:hover { color: #d4d4d4; }
          .leetify-tab.active { color: white; border-bottom: 2px solid #667eea; }
        `}</style>

        <div style={{ padding: "20px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
            <p style={{ color: "#d4d4d4", fontSize: "16px", fontWeight: "600", margin: 0 }}>
              {profile.name}
            </p>
            {profile.hasBans && (
              <span style={{ background: "#dc2626", color: "white", fontSize: "8px", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                BANNED
              </span>
            )}
          </div>
          
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "16px" }}>
            {profile.premierRank && (
              <div style={{ textAlign: "center" }}>
                <span style={{ color: "#737373", fontSize: "9px", display: "block", marginBottom: "4px" }}>PREMIER</span>
                <div style={{
                  background: premierColors!.bg,
                  padding: "6px 12px",
                  borderRadius: "6px",
                  boxShadow: premierColors!.glow,
                }}>
                  <span style={{ color: "#fff", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "12px" }}>★</span>
                    {formatPremierRank(profile.premierRank)}
                  </span>
                </div>
              </div>
            )}
            {profile.faceitElo && (
              <div style={{ textAlign: "center" }}>
                <span style={{ color: "#737373", fontSize: "9px", display: "block", marginBottom: "4px" }}>FACEIT ELO</span>
                <div style={{ background: "#ff5500", padding: "6px 12px", borderRadius: "6px" }}>
                  <span style={{ color: "#fff", fontSize: "16px", fontWeight: "700" }}>
                    {profile.faceitElo.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <span style={{ color: "#a3a3a3", fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Leetify Rating
          </span>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "8px", marginTop: "4px" }}>
            <span style={{ color: "white", fontSize: "36px", fontWeight: "800", letterSpacing: "-0.05em", lineHeight: 1 }}>
              {Math.abs(rating).toFixed(2)}
            </span>
            <span style={{ color: isPositive ? "#4ade80" : "#ef4444", fontSize: "14px", fontWeight: "700" }}>
              {isPositive ? "▲" : "▼"} {ratingStr}
            </span>
          </div>
          
          {profile.winRate !== null && (
            <div style={{ marginTop: "8px" }}>
              <span style={{ color: getWinRateColor(profile.winRate), fontSize: "13px", fontWeight: "600" }}>
                {profile.winRate.toFixed(1)}% Win Rate
              </span>
              <span style={{ color: "#737373", fontSize: "11px", marginLeft: "6px" }}>
                ({profile.gamesPlayed.toLocaleString()} games)
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <button className={`leetify-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
            OVERVIEW
          </button>
          <button className={`leetify-tab ${activeTab === "maps" ? "active" : ""}`} onClick={() => setActiveTab("maps")}>
            TOP MAPS
          </button>
          <button className={`leetify-tab ${activeTab === "compare" ? "active" : ""}`} onClick={() => setActiveTab("compare")}>
            VS PRO
          </button>
        </div>

        {activeTab === "overview" && (
          <div style={{ padding: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <StatBox icon="🎯" label="Aim" value={profile.aim?.toFixed(0) ?? "N/A"} />
              <StatBox icon="📍" label="Position" value={profile.positioning?.toFixed(0) ?? "N/A"} />
              <StatBox icon="💨" label="Utility" value={profile.utility?.toFixed(0) ?? "N/A"} />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <StatBox 
                icon="💀" 
                label="Clutch" 
                value={profile.clutch !== null ? (profile.clutch * 100).toFixed(1) + "%" : "N/A"}
                subValue="1vX success"
              />
              <StatBox 
                icon="⚔️" 
                label="Opening" 
                value={profile.opening !== null ? (profile.opening * 100).toFixed(1) + "%" : "N/A"}
                subValue="First duel win"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <StatBox 
                icon="🎯" 
                label="Headshot %" 
                value={profile.headshotPct !== null ? profile.headshotPct.toFixed(1) + "%" : "N/A"}
                color={profile.headshotPct && profile.headshotPct >= 50 ? "#4ade80" : undefined}
              />
              <StatBox 
                icon="⚡" 
                label="Reaction" 
                value={profile.reactionTimeMs !== null ? profile.reactionTimeMs.toFixed(0) + "ms" : "N/A"}
                color={profile.reactionTimeMs && profile.reactionTimeMs <= 400 ? "#4ade80" : undefined}
              />
            </div>

            {(profile.ctRating !== null || profile.tRating !== null) && (
              <div style={{ background: "#1a1a1a", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                <span style={{ color: "#737373", fontSize: "9px", fontWeight: "600", display: "block", marginBottom: "8px" }}>SIDE PERFORMANCE</span>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ color: "#60a5fa", fontSize: "10px", fontWeight: "600" }}>CT SIDE</span>
                    <p style={{ color: "white", fontSize: "16px", fontWeight: "700", margin: "4px 0 0 0" }}>
                      {profile.ctRating !== null ? (profile.ctRating >= 0 ? "+" : "") + (profile.ctRating * 100).toFixed(1) : "N/A"}
                    </p>
                  </div>
                  <div style={{ width: "1px", background: "rgba(255,255,255,0.1)" }} />
                  <div style={{ textAlign: "center" }}>
                    <span style={{ color: "#f59e0b", fontSize: "10px", fontWeight: "600" }}>T SIDE</span>
                    <p style={{ color: "white", fontSize: "16px", fontWeight: "700", margin: "4px 0 0 0" }}>
                      {profile.tRating !== null ? (profile.tRating >= 0 ? "+" : "") + (profile.tRating * 100).toFixed(1) : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "maps" && (
          <div style={{ padding: "12px" }}>
            {profile.topMaps.length > 0 ? (
              <div>
                <span style={{ color: "#737373", fontSize: "9px", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                  TOP 5 MAPS BY GAMES PLAYED
                </span>
                {profile.topMaps.map((map, i) => (
                  <MapStatsRow key={i} map={map} />
                ))}
              </div>
            ) : (
              <p style={{ color: "#737373", fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
                Not enough match data available
              </p>
            )}
          </div>
        )}

        {activeTab === "compare" && (
          <div style={{ padding: "12px" }}>
            {loadingPro ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <span style={{
                  display: "inline-block",
                  width: "20px",
                  height: "20px",
                  border: "2px solid #667eea",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "leetify-spin 0.6s linear infinite",
                }} />
                <p style={{ color: "#737373", fontSize: "11px", marginTop: "8px" }}>Loading pro stats...</p>
              </div>
            ) : proProfile ? (
              <div>
                <div style={{ 
                  background: "linear-gradient(135deg, #667eea20 0%, #764ba220 100%)", 
                  borderRadius: "8px", 
                  padding: "12px", 
                  marginBottom: "12px",
                  border: "1px solid #667eea40"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ color: "#667eea", fontSize: "10px", fontWeight: "700" }}>COMPARING WITH</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <span style={{ color: "#fff", fontSize: "14px", fontWeight: "700" }}>{proProfile.name}</span>
                    <span style={{ 
                      background: "#667eea", 
                      color: "#fff", 
                      fontSize: "8px", 
                      padding: "2px 6px", 
                      borderRadius: "4px",
                      fontWeight: "600"
                    }}>
                      {PRO_PLAYERS.donk.team}
                    </span>
                  </div>
                </div>

                <CompareRow 
                  label="Leetify Rating" 
                  playerValue={profile.leetifyRating} 
                  proValue={proProfile.leetifyRating}
                  format={(v) => v !== null ? (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)) : "N/A"}
                  higherIsBetter={true}
                />
                <CompareRow 
                  label="Aim" 
                  playerValue={profile.aim} 
                  proValue={proProfile.aim}
                  format={(v) => v?.toFixed(0) ?? "N/A"}
                  higherIsBetter={true}
                />
                <CompareRow 
                  label="Positioning" 
                  playerValue={profile.positioning} 
                  proValue={proProfile.positioning}
                  format={(v) => v?.toFixed(0) ?? "N/A"}
                  higherIsBetter={true}
                />
                <CompareRow 
                  label="Utility" 
                  playerValue={profile.utility} 
                  proValue={proProfile.utility}
                  format={(v) => v?.toFixed(0) ?? "N/A"}
                  higherIsBetter={true}
                />
                <CompareRow 
                  label="Win Rate" 
                  playerValue={profile.winRate} 
                  proValue={proProfile.winRate}
                  format={(v) => v !== null ? `${v.toFixed(1)}%` : "N/A"}
                  higherIsBetter={true}
                />
                <CompareRow 
                  label="Headshot %" 
                  playerValue={profile.headshotPct} 
                  proValue={proProfile.headshotPct}
                  format={(v) => v !== null ? `${v.toFixed(1)}%` : "N/A"}
                  higherIsBetter={true}
                />
                <CompareRow 
                  label="Reaction Time" 
                  playerValue={profile.reactionTimeMs} 
                  proValue={proProfile.reactionTimeMs}
                  format={(v) => v !== null ? `${v.toFixed(0)}ms` : "N/A"}
                  higherIsBetter={false}
                />
              </div>
            ) : (
              <p style={{ color: "#737373", fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
                Could not load pro player stats
              </p>
            )}
          </div>
        )}

        <div style={{ padding: "12px", backgroundColor: "#141414", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <a
            href={`https://leetify.com/app/profile/${steam64Id}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              width: "100%",
              backgroundColor: "white",
              color: "#141414",
              fontWeight: "700",
              padding: "10px",
              borderRadius: "8px",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              textDecoration: "none",
            }}
          >
            VIEW FULL PROFILE →
          </a>
          <p style={{ textAlign: "center", fontSize: "8px", color: "#525252", marginTop: "8px" }}>
            Data provided by Leetify
          </p>
        </div>
      </div>
    </div>
  );
}

let popupContainer: HTMLDivElement | null = null;
let popupRoot: ReturnType<typeof createRoot> | null = null;

function showPopup(profile: LeetifyProfile, steam64Id: string, position: PopupPosition) {
  if (!popupContainer) {
    popupContainer = document.createElement("div");
    popupContainer.id = "__leetify-popup-container";
    document.body.appendChild(popupContainer);
    popupRoot = createRoot(popupContainer);
  }
  
  const closePopup = () => {
    if (popupRoot) {
      popupRoot.render(null);
    }
  };
  
  popupRoot!.render(<PopupContent profile={profile} steam64Id={steam64Id} onClose={closePopup} position={position} />);
}

export default function LeetifyBadge({ steam64Id }: Props) {
  const [profile, setProfile] = useState<LeetifyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchLeetifyProfile(steam64Id);
        if (!cancelled) {
          setProfile(data);
          setError(!data);
        }
      } catch (e) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [steam64Id]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[LeetLens] Badge clicked for:", steam64Id);
    if (profile && profile.leetifyRating !== null && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const position: PopupPosition = {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX - 140,
      };
      showPopup(profile, steam64Id, position);
    }
  }, [profile, steam64Id]);

  if (loading) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        marginLeft: "4px",
        padding: "1px 5px",
        borderRadius: "3px",
        backgroundColor: "#333",
        fontSize: "9px",
        color: "#888",
      }}>
        <span style={{
          width: "6px",
          height: "6px",
          border: "1.5px solid #667eea",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "leetify-spin 0.6s linear infinite",
          marginRight: "3px",
        }} />
        <style>{`@keyframes leetify-spin { to { transform: rotate(360deg); } }`}</style>
        LR
      </span>
    );
  }

  if (error || !profile || profile.leetifyRating === null) {
    return (
      <span
        title="Leetify rating not available"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "4px",
          padding: "1px 5px",
          borderRadius: "3px",
          backgroundColor: "#444",
          fontSize: "10px",
          fontWeight: "bold",
          color: "#888",
        }}
      >
        LR
      </span>
    );
  }

  const rating = profile.leetifyRating;
  const ratingStr = rating >= 0 ? `+${rating.toFixed(1)}` : rating.toFixed(1);

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {profile.premierRank && <PremierBadge rank={profile.premierRank} />}
      
      <button
        ref={buttonRef}
        onClick={handleClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "4px",
          padding: "1px 5px",
          borderRadius: "3px",
          backgroundColor: getRatingColor(rating),
          fontSize: "10px",
          fontWeight: "bold",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {ratingStr}
      </button>
    </span>
  );
}

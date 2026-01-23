import React, { useEffect, useState, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { fetchPlayerProfile, PlayerProfile, MapStats } from "./faceitApi";

interface Props {
  oddjobId: string;
  compact?: boolean;
}

function getEloColor(elo: number | null): string {
  if (elo === null) return "#666";
  if (elo >= 2500) return "#22c55e";
  if (elo >= 2000) return "#84cc16";
  if (elo >= 1500) return "#eab308";
  if (elo >= 1000) return "#f97316";
  return "#ef4444";
}

function getSkillLevelColor(level: number): string {
  if (level >= 9) return "#ef4444";
  if (level >= 7) return "#f97316";
  if (level >= 5) return "#eab308";
  if (level >= 3) return "#84cc16";
  return "#22c55e";
}

function getWinRateColor(rate: number): string {
  if (rate >= 55) return "#22c55e";
  if (rate >= 50) return "#84cc16";
  if (rate >= 45) return "#eab308";
  return "#ef4444";
}

function getKDColor(kd: number): string {
  if (kd >= 1.3) return "#22c55e";
  if (kd >= 1.1) return "#84cc16";
  if (kd >= 1.0) return "#eab308";
  return "#ef4444";
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
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ color: "#737373", fontSize: "10px" }}>
          {map.matches} games
        </span>
        <span style={{
          color: getKDColor(map.avgKD),
          fontSize: "11px",
          fontWeight: "600",
        }}>
          {map.avgKD.toFixed(2)} K/D
        </span>
        <span style={{
          color: getWinRateColor(map.winRate),
          fontSize: "12px",
          fontWeight: "600",
          minWidth: "40px",
          textAlign: "right",
        }}>
          {Math.round(map.winRate)}%
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

function PopupContent({ profile, onClose, position }: { profile: PlayerProfile; onClose: () => void; position: PopupPosition }) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [activeTab, setActiveTab] = useState<"overview" | "maps">("overview");

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
          animation: "leetlens-popup-appear 0.15s ease-out",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes leetlens-popup-appear {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .leetlens-tab { cursor: pointer; padding: 8px 16px; font-size: 11px; font-weight: 600; border: none; background: none; color: #737373; transition: all 0.2s; }
          .leetlens-tab:hover { color: #d4d4d4; }
          .leetlens-tab.active { color: white; border-bottom: 2px solid #ff5500; }
        `}</style>

        <div style={{ padding: "20px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
            <p style={{ color: "#d4d4d4", fontSize: "16px", fontWeight: "600", margin: 0 }}>
              {profile.nickname}
            </p>
            {profile.country && (
              <span style={{ fontSize: "14px" }}>{profile.country.toUpperCase()}</span>
            )}
          </div>
          
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "16px" }}>
            {profile.elo && (
              <div style={{ textAlign: "center" }}>
                <span style={{ color: "#737373", fontSize: "9px", display: "block", marginBottom: "4px" }}>FACEIT ELO</span>
                <div style={{ background: "#ff5500", padding: "6px 12px", borderRadius: "6px" }}>
                  <span style={{ color: "#fff", fontSize: "16px", fontWeight: "700" }}>
                    {profile.elo.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            {profile.skillLevel && (
              <div style={{ textAlign: "center" }}>
                <span style={{ color: "#737373", fontSize: "9px", display: "block", marginBottom: "4px" }}>LEVEL</span>
                <div style={{ 
                  background: getSkillLevelColor(profile.skillLevel), 
                  padding: "6px 12px", 
                  borderRadius: "6px" 
                }}>
                  <span style={{ color: "#fff", fontSize: "16px", fontWeight: "700" }}>
                    {profile.skillLevel}
                  </span>
                </div>
              </div>
            )}
          </div>

          {profile.winRate !== null && (
            <div style={{ marginTop: "8px" }}>
              <span style={{ color: getWinRateColor(profile.winRate), fontSize: "13px", fontWeight: "600" }}>
                {Math.round(profile.winRate)}% Win Rate
              </span>
              <span style={{ color: "#737373", fontSize: "11px", marginLeft: "6px" }}>
                ({profile.matches.toLocaleString()} games)
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <button className={`leetlens-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
            OVERVIEW
          </button>
          <button className={`leetlens-tab ${activeTab === "maps" ? "active" : ""}`} onClick={() => setActiveTab("maps")}>
            TOP MAPS
          </button>
        </div>

        {activeTab === "overview" && (
          <div style={{ padding: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <StatBox 
                icon="⚔️" 
                label="K/D Ratio" 
                value={profile.kdRatio !== null ? profile.kdRatio.toFixed(2) : "N/A"}
                color={profile.kdRatio ? getKDColor(profile.kdRatio) : undefined}
              />
              <StatBox 
                icon="🎯" 
                label="Headshot %" 
                value={profile.headshotPct !== null ? Math.round(profile.headshotPct) + "%" : "N/A"}
                color={profile.headshotPct && profile.headshotPct >= 50 ? "#4ade80" : undefined}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <StatBox 
                icon="💀" 
                label="Avg Kills" 
                value={profile.avgKills !== null ? profile.avgKills.toFixed(1) : "N/A"}
              />
              <StatBox 
                icon="☠️" 
                label="Avg Deaths" 
                value={profile.avgDeaths !== null ? profile.avgDeaths.toFixed(1) : "N/A"}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <StatBox 
                icon="🔥" 
                label="Win Streak" 
                value={profile.currentWinStreak !== null ? profile.currentWinStreak.toString() : "N/A"}
                subValue={profile.longestWinStreak ? `Best: ${profile.longestWinStreak}` : undefined}
                color={profile.currentWinStreak && profile.currentWinStreak >= 5 ? "#4ade80" : undefined}
              />
              <StatBox 
                icon="📈" 
                label="Recent Form" 
                value={profile.recentWinRate !== null ? Math.round(profile.recentWinRate) + "%" : "N/A"}
                subValue="Last 20 games"
                color={profile.recentWinRate ? getWinRateColor(profile.recentWinRate) : undefined}
              />
            </div>
          </div>
        )}

        {activeTab === "maps" && (
          <div style={{ padding: "12px" }}>
            {profile.topMaps.length > 0 ? (
              <div>
                <span style={{ color: "#737373", fontSize: "9px", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                  TOP MAPS BY GAMES PLAYED
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

        <div style={{ padding: "12px", backgroundColor: "#141414", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <a
            href={`https://www.faceit.com/en/players/${profile.nickname}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              width: "100%",
              backgroundColor: "#ff5500",
              color: "#fff",
              fontWeight: "700",
              padding: "10px",
              borderRadius: "8px",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              textDecoration: "none",
            }}
          >
            VIEW FACEIT PROFILE →
          </a>
          <p style={{ textAlign: "center", fontSize: "8px", color: "#525252", marginTop: "8px" }}>
            Data from FACEIT API
          </p>
        </div>
      </div>
    </div>
  );
}

let popupContainer: HTMLDivElement | null = null;
let popupRoot: ReturnType<typeof createRoot> | null = null;

function showPopup(profile: PlayerProfile, position: PopupPosition) {
  if (!popupContainer) {
    popupContainer = document.createElement("div");
    popupContainer.id = "__leetlens-popup-container";
    document.body.appendChild(popupContainer);
    popupRoot = createRoot(popupContainer);
  }
  
  const closePopup = () => {
    if (popupRoot) {
      popupRoot.render(null);
    }
  };
  
  popupRoot!.render(<PopupContent profile={profile} onClose={closePopup} position={position} />);
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span style={{
      fontSize: "9px",
      color: color || "#94a3b8",
      fontWeight: 600,
    }}>
      <span style={{ color: "#64748b", fontWeight: 400 }}>{label}</span>{value}
    </span>
  );
}

export default function PlayerBadge({ oddjobId }: Props) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchPlayerProfile(oddjobId);
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
  }, [oddjobId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[LeetLens] Badge clicked for:", oddjobId);
    if (profile && profile.elo !== null && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const position: PopupPosition = {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX - 140,
      };
      showPopup(profile, position);
    }
  }, [profile, oddjobId]);

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
          border: "1.5px solid #ff5500",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "leetlens-spin 0.6s linear infinite",
          marginRight: "3px",
        }} />
        <style>{`@keyframes leetlens-spin { to { transform: rotate(360deg); } }`}</style>
        ...
      </span>
    );
  }

  if (error || !profile || profile.elo === null) {
    return null;
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "4px" }}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "1px 5px",
          borderRadius: "3px",
          backgroundColor: getEloColor(profile.elo),
          fontSize: "10px",
          fontWeight: "bold",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {profile.elo.toLocaleString()}
      </button>
      {profile.kdRatio !== null && (
        <MiniStat label="K/D " value={profile.kdRatio.toFixed(2)} color={getKDColor(profile.kdRatio)} />
      )}
      {profile.winRate !== null && (
        <MiniStat label="WR " value={`${Math.round(profile.winRate)}%`} color={getWinRateColor(profile.winRate)} />
      )}
      {profile.headshotPct !== null && (
        <MiniStat label="HS " value={`${Math.round(profile.headshotPct)}%`} />
      )}
    </span>
  );
}

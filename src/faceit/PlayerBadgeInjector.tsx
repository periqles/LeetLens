import React from "react";
import { createRoot } from "react-dom/client";
import PlayerBadge from "./PlayerBadge";
import MatchPrediction from "./MatchPrediction";
import { fetchMatchData, resetMatchCache } from "./faceitApi";

const injectedPlayers = new Set<string>();
let predictionInjected = false;
let lastUrl = "";

function findTextNodesContaining(text: string): Element[] {
  const results: Element[] = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent?.trim() === text) {
      const parent = node.parentElement;
      if (parent && !parent.closest(".__leetlens-badge")) {
        results.push(parent);
      }
    }
  }
  return results;
}

export async function injectPlayerBadges() {
  const currentUrl = location.href;
  
  if (!/\/room\/[a-f0-9-]+/i.test(currentUrl)) {
    return;
  }

  if (currentUrl !== lastUrl) {
    resetPlayerCache();
    lastUrl = currentUrl;
  }

  const matchData = await fetchMatchData();
  if (!matchData) {
    console.log("[LeetLens] No match data available");
    return;
  }

  if (!predictionInjected && !document.getElementById("__leetlens-prediction")) {
    const targetParent = document.querySelector("div[name=info]");
    if (targetParent && matchData.teams.team1.players.length > 0 && matchData.teams.team2.players.length > 0) {
      const container = document.createElement("div");
      container.id = "__leetlens-prediction";
      container.style.cssText = "margin-top: 16px;";
      
      const firstChild = targetParent.firstChild;
      if (firstChild) {
        targetParent.insertBefore(container, firstChild);
      } else {
        targetParent.appendChild(container);
      }

      const root = createRoot(container);
      root.render(
        <MatchPrediction
          team1Players={matchData.teams.team1.players.map(p => ({ nickname: p.nickname, oddjobId: p.oddjobId }))}
          team2Players={matchData.teams.team2.players.map(p => ({ nickname: p.nickname, oddjobId: p.oddjobId }))}
          team1Name={matchData.teams.team1.name}
          team2Name={matchData.teams.team2.name}
          mapName={matchData.mapName}
        />
      );

      predictionInjected = true;
      console.log("[LeetLens] Match prediction injected");
    }
  }

  const playerMap = matchData.playerMap;
  
  if (playerMap.size === 0) {
    console.log("[LeetLens] No players found");
    return;
  }

  for (const [nickname, oddjobId] of playerMap.entries()) {
    if (nickname.length < 2) continue;
    
    const badgeId = `leetlens-${oddjobId}`;
    if (injectedPlayers.has(badgeId)) continue;
    
    const elements = findTextNodesContaining(nickname);
    if (elements.length === 0) continue;
    
    for (const el of elements) {
      if (el.querySelector(".__leetlens-badge")) continue;
      if (el.closest(".__leetlens-badge")) continue;
      
      const existingBadge = el.parentElement?.querySelector(`#${CSS.escape(badgeId)}`);
      if (existingBadge) continue;
      
      const container = document.createElement("span");
      container.id = badgeId;
      container.className = "__leetlens-badge";
      container.style.cssText = "display:inline-flex;align-items:center;margin-left:4px;";
      
      el.after(container);
      
      const root = createRoot(container);
      root.render(<PlayerBadge oddjobId={oddjobId} compact={true} />);
      
      console.log("[LeetLens] Injected badge for:", nickname);
      injectedPlayers.add(badgeId);
      break;
    }
  }
}

export function resetPlayerCache() {
  injectedPlayers.clear();
  predictionInjected = false;
  resetMatchCache();
  
  const prediction = document.getElementById("__leetlens-prediction");
  if (prediction) {
    prediction.remove();
  }
  
  document.querySelectorAll(".__leetlens-badge").forEach(el => el.remove());
}

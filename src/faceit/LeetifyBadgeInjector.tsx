import React from "react";
import { createRoot } from "react-dom/client";
import LeetifyBadge from "./LeetifyBadge";
import MatchPrediction from "./MatchPrediction";
import { fetchMatchData, resetMatchCache } from "./leetifyApi";

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
      if (parent && !parent.closest(".__leetify-badge")) {
        results.push(parent);
      }
    }
  }
  return results;
}

export async function injectLeetifyBadges() {
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

  if (!predictionInjected && !document.getElementById("__leetify-prediction")) {
    const targetParent = document.querySelector("div[name=info]");
    if (targetParent && matchData.teams.team1.players.length > 0 && matchData.teams.team2.players.length > 0) {
      const container = document.createElement("div");
      container.id = "__leetify-prediction";
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
          team1Players={matchData.teams.team1.players.map(p => ({ nickname: p.nickname, steamId: p.steamId }))}
          team2Players={matchData.teams.team2.players.map(p => ({ nickname: p.nickname, steamId: p.steamId }))}
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

  for (const [nickname, steam64Id] of playerMap.entries()) {
    if (nickname.includes("-") || nickname.length < 3) continue;
    
    const badgeId = `leetify-${steam64Id}`;
    if (injectedPlayers.has(badgeId)) continue;
    
    const elements = findTextNodesContaining(nickname);
    if (elements.length === 0) continue;
    
    for (const el of elements) {
      if (el.querySelector(".__leetify-badge")) continue;
      if (el.closest(".__leetify-badge")) continue;
      
      const existingBadge = el.parentElement?.querySelector(`#${badgeId}`);
      if (existingBadge) continue;
      
      const container = document.createElement("span");
      container.id = badgeId;
      container.className = "__leetify-badge";
      container.style.cssText = "display:inline-flex;align-items:center;margin-left:4px;";
      
      el.after(container);
      
      const root = createRoot(container);
      root.render(<LeetifyBadge steam64Id={steam64Id} compact={true} />);
      
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
  
  const prediction = document.getElementById("__leetify-prediction");
  if (prediction) {
    prediction.remove();
  }
  
  document.querySelectorAll(".__leetify-badge").forEach(el => el.remove());
}

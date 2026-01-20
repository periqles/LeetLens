import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { getProcessedDemos } from "../helpers";

export default function LeetifyToFaceitButton({ id }: { id: string }) {
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    console.log(`Getting FACEIT match ID for Leetify match ${id}`);
    const response = await fetch(
      `https://api.leetify.com/api/games/${id}/external-match-id`,
    );
    if (!response.ok) {
      console.error(
        "Leetify external match ID response:",
        await response.text(),
      );
      throw new Error("Could not get FACEIT match ID from Leetify");
    }
    const faceitId = await response.json();

    console.log(`Got FACEIT match ID ${faceitId}, redirecting`);
    // Same flow as clicking on the button from match page
    open(
      `https://www.faceit.com/en/cs2/room/${faceitId}?faceit-to-leetify=auto`,
      "_blank",
    );
  }

  // Fetch to check if match already been upload
  useEffect(() => {
    (async () => {
      const processedDemos = await getProcessedDemos();
      if (!processedDemos) {
        return;
      }

      const filteredDemo = processedDemos.find((demo) => demo.leetifyId === id);
      if (!filteredDemo) {
        return;
      }

      setIsProcessing(true);
    })();
  }, []);

  return (
    <button
      className={clsx(
        "ll:mr-2 ll:block ll:h-8 ll:w-full ll:rounded-sm ll:border-0 ll:px-6 ll:py-2 ll:!text-xs ll:font-bold ll:text-white ll:brightness-100 ll:transition-all ll:duration-100",
        !isProcessing
          ? "ll:bg-gradient-upload ll:drop-shadow-glow ll:hover:brightness-125"
          : "ll:bg-gray-500",
      )}
      onClick={handleClick}
      disabled={isProcessing}
    >
      {isProcessing ? "PROCESSING" : "UPLOAD"}
    </button>
  );
}

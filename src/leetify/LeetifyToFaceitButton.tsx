import React from "react";
import WarningIcon from "../components/WarningIcon";
import clsx from "clsx";

interface LeetifyToFaceitButtonProps {
  isDone?: boolean;
  showWarning?: boolean;
}

export default function LeetifyToFaceitButton({
  isDone = false,
  showWarning = false,
}: LeetifyToFaceitButtonProps) {
  function handleClick() {
    const faceitLink = document.querySelector<HTMLAnchorElement>(
      "a[href*='https://www.faceit.com']",
    );
    if (!faceitLink) {
      throw new Error("Could not find FACEIT link");
    }

    // Redirect to FACEIT with query param, to indicate to the FACEIT part to
    // automatically start upload and to redirect back here
    location.href = faceitLink.href + "?faceit-to-leetify=auto";
  }

  return (
    <button
      className={clsx(
        "ll:mt-3 ll:mb-3.5 ll:flex ll:h-8 ll:w-full ll:items-center ll:justify-center ll:gap-2 ll:rounded-sm ll:border-0 ll:px-6 ll:py-2 ll:font-bold ll:text-white ll:brightness-100 ll:transition-all ll:duration-100",
        isDone
          ? "ll:bg-gray-500"
          : "ll:bg-gradient-upload ll:drop-shadow-glow ll:hover:brightness-125",
      )}
      onClick={handleClick}
      disabled={isDone}
    >
      {showWarning && <WarningIcon />}
      {isDone ? "PROCESSING ON LEETIFY" : "UPLOAD TO LEETIFY"}
    </button>
  );
}

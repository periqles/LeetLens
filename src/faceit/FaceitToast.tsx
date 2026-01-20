import React from "react";

interface FaceitToastProps {
  children: React.ReactNode;
}

export default function FaceitToast({ children }: FaceitToastProps) {
  return (
    <div className="ll:absolute ll:inset-x-0 ll:top-[calc(85px-64px)] ll:flex ll:justify-center">
      <div className="ll:flex ll:items-start ll:gap-3 ll:rounded-sm ll:border ll:border-[#484848] ll:bg-[#303030] ll:p-4">
        {children}
      </div>
    </div>
  );
}

import React from "react";
import TabBar from "./TabBar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      {children}
      <TabBar />
    </div>
  );
}

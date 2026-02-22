import React from "react";
import { useNavigate } from "react-router-dom";
import TabBar from "./TabBar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const handleStartWorkout = () => {
    navigate("/briefing");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {children}
      <TabBar onStartWorkout={handleStartWorkout} />
    </div>
  );
}

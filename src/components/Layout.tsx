import React from "react";
import { useNavigate } from "react-router-dom";
import TabBar from "./TabBar";
import { useApp } from "@/context/AppContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { startWorkout } = useApp();

  const handleStartWorkout = () => {
    startWorkout();
    navigate("/workout");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {children}
      <TabBar onStartWorkout={handleStartWorkout} />
    </div>
  );
}

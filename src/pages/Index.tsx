import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const Index = () => {
  const navigate = useNavigate();
  const { onboardingComplete } = useApp();

  useEffect(() => {
    navigate(onboardingComplete ? "/home" : "/onboarding", { replace: true });
  }, [onboardingComplete, navigate]);

  return null;
};

export default Index;

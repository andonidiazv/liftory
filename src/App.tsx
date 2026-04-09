// synced
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Workout from "./pages/Workout";
import WorkoutComplete from "./pages/WorkoutComplete";
import Progress from "./pages/Progress";
import Exercises from "./pages/Exercises";
import Profile from "./pages/Profile";
import SessionSummary from "./pages/SessionSummary";
import Paywall from "./pages/Paywall";
import Program from "./pages/Program";
import Welcome from "./pages/Welcome";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminExercises from "./pages/admin/AdminExercises";
import AdminInsights from "./pages/admin/AdminInsights";
import AdminAIRules from "./pages/admin/AdminAIRules";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminPrograms from "./pages/admin/AdminPrograms";
import AdminProgramDetail from "./pages/admin/AdminProgramDetail";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminBadges from "./pages/admin/AdminBadges";
import AdminPayments from "./pages/admin/AdminPayments";
import Badges from "./pages/Badges";
import BadgeClaim from "./pages/BadgeClaim";

// Apply dark mode preference on load (before render)
if (localStorage.getItem("liftory-dark-mode") === "true") {
  document.documentElement.classList.add("dark-mode");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,    // 2 min — data is "fresh" for 2 min, no re-fetch
      gcTime: 10 * 60 * 1000,      // 10 min — cached data kept for 10 min after unmount
      refetchOnWindowFocus: false,  // don't re-fetch every time user switches back to tab
      retry: 1,                     // retry once on failure, then show error
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Protected routes */}
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/workout/:id" element={<ProtectedRoute><Workout /></ProtectedRoute>} />
              <Route path="/session" element={<ProtectedRoute><SessionSummary /></ProtectedRoute>} />
              <Route path="/workout-complete/:id" element={<ProtectedRoute><WorkoutComplete /></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
              <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/paywall" element={<Paywall />} />
              <Route path="/program" element={<ProtectedRoute><Program /></ProtectedRoute>} />
              <Route path="/badges" element={<ProtectedRoute><Badges /></ProtectedRoute>} />
              <Route path="/badges/claim/:slug/:tier" element={<ProtectedRoute><BadgeClaim /></ProtectedRoute>} />

              {/* Admin routes — role-validated */}
              <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
              <Route path="/admin/programs" element={<AdminRoute><AdminLayout><AdminPrograms /></AdminLayout></AdminRoute>} />
              <Route path="/admin/programs/:id" element={<AdminRoute><AdminLayout><AdminProgramDetail /></AdminLayout></AdminRoute>} />
              <Route path="/admin/exercises" element={<AdminRoute><AdminLayout><AdminExercises /></AdminLayout></AdminRoute>} />
              <Route path="/admin/feedback" element={<AdminRoute><AdminLayout><AdminFeedback /></AdminLayout></AdminRoute>} />
              <Route path="/admin/badges" element={<AdminRoute><AdminLayout><AdminBadges /></AdminLayout></AdminRoute>} />
              <Route path="/admin/payments" element={<AdminRoute><AdminLayout><AdminPayments /></AdminLayout></AdminRoute>} />
              <Route path="/admin/insights" element={<AdminRoute><AdminLayout><AdminInsights /></AdminLayout></AdminRoute>} />
              <Route path="/admin/ai-rules" element={<AdminRoute><AdminLayout><AdminAIRules /></AdminLayout></AdminRoute>} />
              <Route path="/admin/audit" element={<AdminRoute><AdminLayout><AdminAuditLog /></AdminLayout></AdminRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

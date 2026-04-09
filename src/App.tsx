// synced
import { lazy, Suspense } from "react";
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
import Badges from "./pages/Badges";
import BadgeClaim from "./pages/BadgeClaim";

// ── Admin pages: lazy-loaded (only downloaded when you open /admin) ──
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminExercises = lazy(() => import("./pages/admin/AdminExercises"));
const AdminInsights = lazy(() => import("./pages/admin/AdminInsights"));
const AdminAIRules = lazy(() => import("./pages/admin/AdminAIRules"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminPrograms = lazy(() => import("./pages/admin/AdminPrograms"));
const AdminProgramDetail = lazy(() => import("./pages/admin/AdminProgramDetail"));
const AdminFeedback = lazy(() => import("./pages/admin/AdminFeedback"));
const AdminBadges = lazy(() => import("./pages/admin/AdminBadges"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));

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
              <Route path="/paywall" element={<ProtectedRoute><Paywall /></ProtectedRoute>} />
              <Route path="/program" element={<ProtectedRoute><Program /></ProtectedRoute>} />
              <Route path="/badges" element={<ProtectedRoute><Badges /></ProtectedRoute>} />
              <Route path="/badges/claim/:slug/:tier" element={<ProtectedRoute><BadgeClaim /></ProtectedRoute>} />

              {/* Admin routes — lazy-loaded, role-validated */}
              <Route path="/admin" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminDashboard /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminUsers /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/programs" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminPrograms /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/programs/:id" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminProgramDetail /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/exercises" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminExercises /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/feedback" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminFeedback /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/badges" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminBadges /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/payments" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminPayments /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/insights" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminInsights /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/ai-rules" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminAIRules /></AdminLayout></Suspense></AdminRoute>} />
              <Route path="/admin/audit" element={<AdminRoute><Suspense fallback={null}><AdminLayout><AdminAuditLog /></AdminLayout></Suspense></AdminRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

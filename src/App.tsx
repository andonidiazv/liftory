import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
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
import Briefing from "./pages/Briefing";
import Paywall from "./pages/Paywall";
import Insights from "./pages/Insights";
import Program from "./pages/Program";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminExercises from "./pages/admin/AdminExercises";

const queryClient = new QueryClient();

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
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Protected routes */}
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/briefing" element={<ProtectedRoute><Briefing /></ProtectedRoute>} />
              <Route path="/workout/:id" element={<ProtectedRoute><Workout /></ProtectedRoute>} />
              <Route path="/session" element={<ProtectedRoute><SessionSummary /></ProtectedRoute>} />
              <Route path="/workout-complete/:id" element={<ProtectedRoute><WorkoutComplete /></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
              <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/paywall" element={<ProtectedRoute><Paywall /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
              <Route path="/program" element={<ProtectedRoute><Program /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/exercises" element={<ProtectedRoute><AdminLayout><AdminExercises /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/insights" element={<ProtectedRoute><AdminLayout><AdminPlaceholder title="Insights" /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/ai-rules" element={<ProtectedRoute><AdminLayout><AdminPlaceholder title="Reglas de IA" /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute><AdminLayout><AdminPlaceholder title="Audit Log" /></AdminLayout></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

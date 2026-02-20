import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Sourates from "./pages/Sourates";
import Invocations from "./pages/Invocations";
import Nourania from "./pages/Nourania";
import Priere from "./pages/Priere";
import Ramadan from "./pages/Ramadan";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Ressources from "./pages/Ressources";
import Classement from "./pages/Classement";
import NotFound from "./pages/NotFound";
import PendingApproval from "./pages/PendingApproval";
import Attendance from "./pages/Attendance";
import DynamicModule from "./pages/DynamicModule";
import AlphabetPage from "./pages/AlphabetPage";
import AllahNamesPage from "./pages/AllahNamesPage";
import GenericModulePage from "./pages/GenericModulePage";
import GrammaireConjugaisonPage from "./pages/GrammaireConjugaisonPage";
import GenericTimelinePage from "./pages/GenericTimelinePage";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isApproved, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If not admin and not approved, show pending page
  if (!isAdmin && isApproved === false) {
    return <PendingApproval />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/sourates" element={<ProtectedRoute><Sourates /></ProtectedRoute>} />
      <Route path="/ramadan" element={<ProtectedRoute><Ramadan /></ProtectedRoute>} />
      <Route path="/alphabet" element={<ProtectedRoute><AlphabetPage /></ProtectedRoute>} />
      <Route path="/invocations" element={<ProtectedRoute><Invocations /></ProtectedRoute>} />
      <Route path="/nourania" element={<ProtectedRoute><Nourania /></ProtectedRoute>} />
      <Route path="/priere" element={<ProtectedRoute><Priere /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/ressources" element={<ProtectedRoute><Ressources /></ProtectedRoute>} />
      <Route path="/classement" element={<ProtectedRoute><Classement /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
      <Route path="/module/allah-names" element={<ProtectedRoute><AllahNamesPage /></ProtectedRoute>} />
      <Route path="/allah-names" element={<ProtectedRoute><AllahNamesPage /></ProtectedRoute>} />
      <Route path="/grammaire" element={<ProtectedRoute><GrammaireConjugaisonPage /></ProtectedRoute>} />
      <Route path="/module/vocabulaire" element={<ProtectedRoute><GenericTimelinePage /></ProtectedRoute>} />
      <Route path="/module/lecture-coran" element={<ProtectedRoute><GenericTimelinePage /></ProtectedRoute>} />
      <Route path="/module/darija" element={<ProtectedRoute><GenericTimelinePage /></ProtectedRoute>} />
      <Route path="/module/dictionnaire" element={<ProtectedRoute><GenericTimelinePage /></ProtectedRoute>} />
      <Route path="/module/dhikr" element={<ProtectedRoute><GenericTimelinePage /></ProtectedRoute>} />
      <Route path="/module/hadiths" element={<ProtectedRoute><GenericTimelinePage /></ProtectedRoute>} />
      <Route path="/module/histoires-prophetes" element={<ProtectedRoute><GenericTimelinePage /></ProtectedRoute>} />
      <Route path="/module/:moduleId" element={<ProtectedRoute><GenericModulePage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

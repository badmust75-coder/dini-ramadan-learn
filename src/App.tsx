import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Index = React.lazy(() => import("./pages/Index"));
const Auth = React.lazy(() => import("./pages/Auth"));
const Sourates = React.lazy(() => import("./pages/Sourates"));
const Invocations = React.lazy(() => import("./pages/Invocations"));
const Nourania = React.lazy(() => import("./pages/Nourania"));
const Priere = React.lazy(() => import("./pages/Priere"));
const Ramadan = React.lazy(() => import("./pages/Ramadan"));
const Admin = React.lazy(() => import("./pages/Admin"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Ressources = React.lazy(() => import("./pages/Ressources"));
const Classement = React.lazy(() => import("./pages/Classement"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const PendingApproval = React.lazy(() => import("./pages/PendingApproval"));
const Attendance = React.lazy(() => import("./pages/Attendance"));
const DynamicModule = React.lazy(() => import("./pages/DynamicModule"));
const AlphabetPage = React.lazy(() => import("./pages/AlphabetPage"));
const AllahNamesPage = React.lazy(() => import("./pages/AllahNamesPage"));
const GenericModulePage = React.lazy(() => import("./pages/GenericModulePage"));
const GrammaireConjugaisonPage = React.lazy(() => import("./pages/GrammaireConjugaisonPage"));
const GenericTimelinePage = React.lazy(() => import("./pages/GenericTimelinePage"));
const Monitoring = React.lazy(() => import("./pages/Monitoring"));

const queryClient = new QueryClient();

const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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

  if (!isAdmin && isApproved === false) {
    return <Suspense fallback={<SuspenseFallback />}><PendingApproval /></Suspense>;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<SuspenseFallback />}>
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
        <Route path="/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
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
    </Suspense>
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

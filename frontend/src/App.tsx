import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LangProvider } from "./contexts/LangContext";
import { AuthProvider } from "./contexts/AuthContext";
import {ProtectedRoute} from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import MainLayout from "./layouts/MainLayout";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import AboutPage  from "./pages/AboutPage";

import DashboardHome from "./pages/dashboard/DashboardHome";
import UploadPage from "./pages/dashboard/UploadPage";
import ProjectsPage from "./pages/dashboard/ProjectsPage";
import ViewerPage from "./pages/dashboard/ViewerPage";
import ExportsPage from "./pages/dashboard/ExportsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import ProcessingPage from "./pages/dashboard/processes/ProcessingPage"
import ResultsPage from "./pages/dashboard/processes/ResultsPage"

import AdminHome from "./pages/admin/AdminHome";
import UsersPage from "./pages/admin/UsersPage";
import LogsPage from "./pages/admin/LogsPage";
import DatasetsPage from "./pages/admin/DatasetsPage";
import EvaluationsPage from "./pages/admin/EvaluationsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <LangProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter  
              future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
  }}>
              <Routes>
                {/* Public */}
                    <Route path="/" element={<MainLayout />}>
                    <Route index element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/about" element={<AboutPage />} />
                  </Route>
                {/* User dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardHome />} />
                  <Route path="upload" element={<UploadPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="viewer" element={<ViewerPage />} />
                  <Route path="exports" element={<ExportsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="processing/:id" element={<ProcessingPage />}/>
                  <Route path="results/:id" element={<ResultsPage />}/>

                </Route>

                {/* Admin dashboard */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute >
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminHome />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="logs" element={<LogsPage />} />
                  <Route path="datasets" element={<DatasetsPage />} />
                  <Route path="evaluations" element={<EvaluationsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </LangProvider>
  </ThemeProvider>
);

export default App;

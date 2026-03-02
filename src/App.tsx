import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import UploadPage from "./pages/Upload";
import DashboardPage from "./pages/Dashboard";
import RankingPage from "./pages/Ranking";
import ValidacaoPage from "./pages/Validacao";
import ComparativoPage from "./pages/Comparativo";
import InvalidasPage from "./pages/Invalidas";
import ValoresPage from "./pages/Valores";
import EquipamentosPage from "./pages/Equipamentos";
import NotFound from "./pages/NotFound";
import { DataProvider } from "./context/DataContext";
import { ThemeProvider } from "./hooks/use-theme";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DataProvider>
            <SidebarProvider>
              <div className="min-h-screen flex w-full">
                <AppSidebar />
                <main className="flex-1 overflow-x-hidden">
                  <header className="h-12 flex items-center border-b border-border px-4 sticky top-0 z-50 backdrop-blur-sm bg-background/80">
                    <SidebarTrigger className="mr-4" />
                  </header>
                  <div className="p-6">
                    <Routes>
                      <Route path="/" element={<Navigate to="/upload" replace />} />
                      <Route path="/upload" element={<UploadPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/ranking" element={<RankingPage />} />
                      <Route path="/validacao" element={<ValidacaoPage />} />
                      <Route path="/comparativo" element={<ComparativoPage />} />
                      <Route path="/invalidas" element={<InvalidasPage />} />
                      <Route path="/valores" element={<ValoresPage />} />
                      <Route path="/equipamentos" element={<EquipamentosPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </SidebarProvider>
          </DataProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

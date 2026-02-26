import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import ClassificacaoPage from "./pages/Classificacao";
import IndicesPage from "./pages/Indices";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1 overflow-x-hidden">
              <header className="h-12 flex items-center border-b border-border px-4 sticky top-0 z-50 backdrop-blur-sm bg-background/80">
                <SidebarTrigger className="mr-4" />
                <span className="text-xs text-muted-foreground font-mono">SpliceMetrics v1.0</span>
              </header>
              <div className="p-6">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/classificacao" element={<ClassificacaoPage />} />
                  <Route path="/indices" element={<IndicesPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

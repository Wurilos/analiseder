import React from 'react';
import { BarChart3, AlertTriangle, LayoutDashboard, FileText, Settings, ChevronRight, LogOut, Radar } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const mainMenu = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, hasChevron: true },
  { title: 'Análise de Imagens', url: '/classificacao', icon: AlertTriangle },
  { title: 'Análise de Índices', url: '/indices', icon: BarChart3 },
];

const cadastrosMenu = [
  { title: 'Contratos', url: '/contratos', icon: FileText },
  { title: 'Equipamentos', url: '/equipamentos', icon: Radar },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Radar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">
              RadarAnalytics
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none">
              Análise de Imagens
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] text-muted-foreground/60 uppercase tracking-widest px-5 mb-1">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenu.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors rounded-lg mx-2"
                        activeClassName="bg-sidebar-accent text-primary font-semibold"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.title}</span>
                        {item.hasChevron && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] text-muted-foreground/60 uppercase tracking-widest px-5 mb-1">
            Cadastros
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cadastrosMenu.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors rounded-lg mx-2"
                        activeClassName="bg-sidebar-accent text-primary font-semibold"
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-5 pb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
            SS
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">Sergio Silva</div>
            <div className="text-[11px] text-muted-foreground">Administrador</div>
          </div>
        </div>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-1">
          <LogOut className="w-4 h-4" />
          <span>Sair do Sistema</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

import React from 'react';
import { Upload, LayoutDashboard, List, CheckCircle, Activity, AlertCircle, DollarSign, Radar, Sun, Moon } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useTheme } from '@/hooks/use-theme';
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
  { title: 'Upload', url: '/upload', icon: Upload },
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Ranking', url: '/ranking', icon: List },
  { title: 'Validação', url: '/validacao', icon: CheckCircle },
  { title: 'Comparativo', url: '/comparativo', icon: Activity },
  { title: 'Inválidas', url: '/invalidas', icon: AlertCircle },
  { title: 'Valores', url: '/valores', icon: DollarSign },
  { title: 'Equipamentos', url: '/equipamentos', icon: Radar },
];

export function AppSidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center">
            <Radar className="w-5 h-5 text-sidebar-foreground" />
          </div>
          <div>
            <h1 className="text-base font-display font-extrabold text-sidebar-foreground tracking-tight">
              DER Analytics
            </h1>
            <p className="text-[10.5px] text-sidebar-foreground/60 leading-none font-mono">
              Índices de Desempenho
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
                        end
                        className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors rounded-lg mx-2"
                        activeClassName="bg-sidebar-accent text-primary font-semibold"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-5 pb-5 flex flex-col gap-3">
        <button
          onClick={() => toggleTheme()}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1.5 rounded-md hover:bg-accent"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
        </button>
        <div className="text-[11px] text-muted-foreground/40 font-mono">
          Edital 145/2023
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

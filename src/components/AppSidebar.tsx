import React from 'react';
import { BarChart3, AlertTriangle, Home } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const items = [
  { title: 'Início', url: '/', icon: Home },
  { title: 'Classificação de Infrações', url: '/classificacao', icon: AlertTriangle },
  { title: 'Análise de Índices (ID)', url: '/indices', icon: BarChart3 },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarContent className="pt-6">
        <div className="px-6 mb-8">
          <h1 className="text-xl font-extrabold text-gradient-primary">
            SpliceMetrics
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1">
            Gestão de Desempenho
          </p>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] text-muted-foreground/60 uppercase tracking-widest px-6">
            Módulos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-6 py-3 text-sm transition-colors hover:bg-sidebar-accent rounded-lg mx-2"
                      activeClassName="bg-sidebar-accent text-primary font-semibold"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

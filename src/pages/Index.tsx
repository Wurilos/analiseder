import React from 'react';
import { LayoutDashboard, ClipboardCheck, Percent, CheckCircle, Image, Camera, Radio } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KPIGrid, KPICard } from '@/components/KPIGrid';
import { SectionCard } from '@/components/SectionCard';

const Index = () => {
  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Visão geral do sistema"
      />

      {/* KPIs */}
      <KPIGrid cols={5}>
        <KPICard label="Total de Análises" value="0" color="cyan" icon={ClipboardCheck} />
        <KPICard label="% Problemas SPLICE" value="0%" color="amber" icon={Percent} />
        <KPICard label="% Problemas DER" value="0%" color="red" icon={Percent} />
        <KPICard label="% Imagens Válidas" value="0%" color="green" icon={CheckCircle} />
        <KPICard label="Total de Imagens" value="0" color="cyan" icon={Image} />
      </KPIGrid>

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <SectionCard
          title="Classificação Geral"
          badge="0 imagens"
          isEmpty={true}
          emptyIcon={<Camera className="w-10 h-10" />}
          emptyText="Nenhuma imagem processada"
        />
        <SectionCard
          title="Por Equipamento"
          isEmpty={true}
          emptyIcon={<Radio className="w-10 h-10" />}
          emptyText="Nenhum dado disponível"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <SectionCard
          title="Imagens por Contrato"
          isEmpty={true}
          emptyIcon={<ClipboardCheck className="w-10 h-10" />}
          emptyText="Nenhum contrato vinculado"
        />
        <SectionCard
          title="Equipamentos por Contrato"
          isEmpty={true}
          emptyIcon={<Radio className="w-10 h-10" />}
          emptyText="Nenhum dado disponível"
        />
        <SectionCard
          title="Confiança da IA"
          isEmpty={true}
          emptyIcon={<LayoutDashboard className="w-10 h-10" />}
          emptyText="Sem dados de confiança"
        />
      </div>
    </div>
  );
};

export default Index;

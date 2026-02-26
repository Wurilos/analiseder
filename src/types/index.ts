// ============================
// Classificação de Infrações
// ============================

export interface ClassificacaoMotivos {
  Imagem: number;
  Ambiente: number;
  Enquadramento: number;
  SinalizacaoTransito: number;
  MudancaFaixa: number;
  MaisVeiculos: number;
  PlacaEstrangeira: number;
  Placa: number;
  VeiculoNaoEncontrado: number;
  MarcaModelo: number;
}

export interface ClassificacaoRow {
  Operadora: string;
  Rodovia: string;
  Km: number | null;
  Equipamento: string;
  Tipo: string;
  Faixa: string;
  Validas: number;
  Motivos: ClassificacaoMotivos;
  TotalInvalidas: number;
  PercInvalidas: number;
  PercDER: number;
  PercSplice: number;
  MaiorMotivo: string | null;
  MaiorValor: number;
  Splice: number;
  DER: number;
  RespPrincipal: 'Splice' | 'DER';
  _isGrouped?: boolean;
  NumFaixas?: number;
}

// ============================
// Análise de Índices (ID)
// ============================

export interface IndicesRow {
  Operadora: string;
  Rodovia: string;
  Km: number | null;
  Equipamento: string;
  Tipo: string;
  Faixa: string;
  ICId: number | null;
  ICIn: number | null;
  IEVri: number | null;
  IEVdt: number | null;
  ILPd: number | null;
  ILPn: number | null;
  IEF: number | null;
  ICV: number | null;
  NHt: number | null;
  NHo: number | null;
  IDF: number | null;
  ID: number | null;
  // Computed fields for grouped mode
  _isGrouped?: boolean;
  NumFaixas?: number;
  ValorContratual?: number | null;
  ValorReceber?: number | null;
  Desconto?: number | null;
  MaiorProblema?: MaiorProblemaInfo;
}

export interface ExcecaoCobrancaConfig {
  tipo: string;
  faixas: number;
}

export interface MaiorProblemaInfo {
  nome: string;
  valor: number;
  gap: number;
  gapPonderado?: number;
  descricao: string;
  peso?: number;
  severidade: 'ok' | 'leve' | 'moderado' | 'grave' | 'critico';
}

export interface PerdaSubIndice {
  nome: string;
  atual: number;
  gap: number;
  peso: number;
  gapPonderado: number;
  perda: number;
  contribuicao: number;
}

export interface ExcecaoCobranca {
  tipo: string;
  faixas: number;
}

export type ViewMode = 'faixa' | 'equipamento';
export type DashboardMode = 'detalhado' | 'executivo';
export type StatusColor = 'neon-cyan' | 'neon-green' | 'neon-amber' | 'neon-red';

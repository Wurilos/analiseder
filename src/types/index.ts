// ============================
// ID Record — Full parsed record from planilha de desempenho
// ============================
export interface IDRecord {
  operadora: string;
  rodovia: string;
  km: number | null;
  municipio: string;
  equipamento: string;
  serie: number | null;
  lote: string | null;
  tipo: string;
  faixa: string;
  periodo: string;
  dias: number | null;
  NHt: number | null;
  NHo: number | null;
  // raw inputs
  IVd: number | null; INd: number | null; TId: number | null;
  IVn: number | null; INn: number | null; TIn: number | null;
  rfri1: number | null; rfri2: number | null; rfri3: number | null; rfri4: number | null; rfri5: number | null;
  rfdt1: number | null; rfdt2: number | null; rfdt3: number | null; rfdt4: number | null; rfdt5: number | null; rfdt6: number | null;
  LPd: number | null; IVd_ocr: number | null;
  LPn: number | null; IVn_ocr: number | null;
  QVc: number | null; QVt: number | null;
  pktsInf: number | null; pktsTraf: number | null;
  // ratios
  ICId_raw: number | null; ICIn_raw: number | null;
  ILPd_raw: number | null; ILPn_raw: number | null;
  // calculated
  c_ICId: number | null; c_ICIn: number | null;
  c_IEVri: number | null; c_IEVdt: number | null;
  c_ILPd: number | null; c_ILPn: number | null;
  c_IEF: number | null; c_IDF: number | null;
  c_ICV: number | null; c_ID: number | null;
  // from file
  f_ICId: number | null; f_ICIn: number | null;
  f_IEVri: number | null; f_IEVdt: number | null;
  f_ILPd: number | null; f_ILPn: number | null;
  f_IEF: number | null; f_IDF: number | null;
  f_ICV: number | null; f_ID: number | null;
  // financial
  f_MediaEquip: number | null;
  // extra
  infracoes: number | null; validas: number | null; invalidas: number | null;
  contagemVeic: number | null;
}

// ============================
// Classificação de Inválidas
// ============================
export interface ClassRecord {
  operadora: string;
  tipoRodovia: string;
  rodovia: string;
  km: number;
  municipio: string;
  equipamento: string;
  tipo: string;
  faixa: string;
  validas: number;
  imagem: number;
  ambiente: number;
  enquadramento: number;
  sinalizacao: number;
  mudancaFaixa: number;
  maisUm: number;
  estrangeira: number;
  placa: number;
  renavam: number;
  marca: number;
  art280: number;
  totalSplice: number;
  totalOutros: number;
  totalInvalidas: number;
  totalConferidas: number;
  pctSplice: number;
  ICId: number;
  ICIn: number;
}

// ============================
// Grouped equipment record
// ============================
export interface EquipGroup {
  equipamento: string;
  serie: number | null;
  lote: string | null;
  tipo: string;
  rodovia: string;
  km: number | null;
  numFaixas: number;
  faixas: string[];
  c_ICId: number | null; c_ICIn: number | null;
  c_IEVri: number | null; c_IEVdt: number | null;
  c_ILPd: number | null; c_ILPn: number | null;
  c_IEF: number | null; c_IDF: number | null;
  c_ICV: number | null; c_ID: number | null;
  valorTotal: number;
  valorFaixa: number;
  valorRecebidoTotal: number;
  descontoTotal: number;
  perdaIDF: number;
  perdaIEF: number;
  perdaICV: number;
  melhorAlavanca: { nome: string; perda: number };
  levers: { nome: string; perda: number }[];
}

// Legacy types for backward compatibility
export interface ClassificacaoMotivos {
  Imagem: number; Ambiente: number; Enquadramento: number;
  SinalizacaoTransito: number; MudancaFaixa: number;
  MaisVeiculos: number; PlacaEstrangeira: number;
  Placa: number; VeiculoNaoEncontrado: number; MarcaModelo: number;
}

export interface ClassificacaoRow {
  Operadora: string; Rodovia: string; Km: number | null;
  Equipamento: string; Tipo: string; Faixa: string;
  Validas: number; Motivos: ClassificacaoMotivos;
  TotalInvalidas: number; PercInvalidas: number;
  PercDER: number; PercSplice: number;
  MaiorMotivo: string | null; MaiorValor: number;
  Splice: number; DER: number;
  RespPrincipal: 'Splice' | 'DER';
  _isGrouped?: boolean; NumFaixas?: number;
}

export interface IndicesRow {
  Operadora: string; Rodovia: string; Km: number | null;
  Equipamento: string; Tipo: string; Faixa: string;
  ICId: number | null; ICIn: number | null;
  IEVri: number | null; IEVdt: number | null;
  ILPd: number | null; ILPn: number | null;
  IEF: number | null; ICV: number | null;
  NHt: number | null; NHo: number | null;
  IDF: number | null; ID: number | null;
  _isGrouped?: boolean; NumFaixas?: number;
  ValorContratual?: number | null; ValorReceber?: number | null;
  Desconto?: number | null; MaiorProblema?: MaiorProblemaInfo;
}

export interface MaiorProblemaInfo {
  nome: string; valor: number; gap: number;
  gapPonderado?: number; descricao: string; peso?: number;
  severidade: 'ok' | 'leve' | 'moderado' | 'grave' | 'critico';
}

export interface PerdaSubIndice {
  nome: string; atual: number; gap: number;
  peso: number; gapPonderado: number; perda: number; contribuicao: number;
}

export type ViewMode = 'faixa' | 'equipamento';
export type DashboardMode = 'detalhado' | 'executivo';
export type StatusColor = 'neon-cyan' | 'neon-green' | 'neon-amber' | 'neon-red';

export interface ExcecaoCobrancaConfig { tipo: string; faixas: number; }
export interface ExcecaoCobranca { tipo: string; faixas: number; }

/**
 * Equipment Catalog with individual values per equipment.
 * Source: Pasta2.xlsx · 27/02/2026
 */
export interface EquipInfo {
  serie: number;
  valor: number;
  lote: string;
  endereco: string;
}

export const EQUIP_CATALOG: Record<string, EquipInfo> = {
  // ── DR-14 ──
  "CEC250182": { serie: 1671, valor: 8964.77, lote: "DR-14", endereco: "SP 322 Km 399,130" },
  "CEV250390": { serie: 1661, valor: 5999.63, lote: "DR-14", endereco: "SP 322 Km 412,000" },
  "REV250052": { serie: 1667, valor: 7587.79, lote: "DR-14", endereco: "SP 322 Km 431,009" },
  "REV250055": { serie: 1668, valor: 7587.79, lote: "DR-14", endereco: "SP 322 Km 431,009" },
  "CEV250253": { serie: 1662, valor: 11598.50, lote: "DR-14", endereco: "SP 322 Km 442,370" },
  "CEV250254": { serie: 1663, valor: 11598.50, lote: "DR-14", endereco: "SP 322 Km 461,800" },
  "CEC250123": { serie: 1674, valor: 17355.47, lote: "DR-14", endereco: "SP 322 Km 484,706" },
  "CEV250281": { serie: 1660, valor: 11598.50, lote: "DR-14", endereco: "SP 326 Km 452,390" },
  "CEV250255": { serie: 1659, valor: 11598.50, lote: "DR-14", endereco: "SP 326 Km 458,541" },
  "CEC250124": { serie: 1657, valor: 8964.77, lote: "DR-14", endereco: "SP 326 Km 468,165" },
  "CEV250258": { serie: 1651, valor: 11598.50, lote: "DR-14", endereco: "SP 345 Km 123,557" },
  "CEV250338": { serie: 1653, valor: 5999.63, lote: "DR-14", endereco: "SP 373 Km 151,500" },
  "CEC260191": { serie: 1673, valor: 8964.77, lote: "DR-14", endereco: "SP 373 Km 171,180" },
  "CEC250156": { serie: 1669, valor: 8964.77, lote: "DR-14", endereco: "SP 385 Km 27,420" },
  "CEV250259": { serie: 1650, valor: 5999.63, lote: "DR-14", endereco: "SP 413 Km 0,646" },
  "CEC250184": { serie: 1658, valor: 8964.77, lote: "DR-14", endereco: "SP 413 Km 25,440" },
  "CEV250260": { serie: 1670, valor: 11598.50, lote: "DR-14", endereco: "SP 425 Km 59,939" },
  "CEV250285": { serie: 1652, valor: 5999.63, lote: "DR-14", endereco: "SP 425 Km 79,724" },
  "CEV250188": { serie: 1666, valor: 11598.50, lote: "DR-14", endereco: "SP 425 Km 118,700" },
  "CEV250289": { serie: 1656, valor: 5999.63, lote: "DR-14", endereco: "SP 425 Km 123,110" },
  "CEV250261": { serie: 1655, valor: 5999.63, lote: "DR-14", endereco: "SP 425 Km 139,685" },
  "CEV250262": { serie: 1665, valor: 11598.50, lote: "DR-14", endereco: "SP 425 Km 145,556" },
  "CEV250263": { serie: 1664, valor: 11598.50, lote: "DR-14", endereco: "SP 425 Km 149,370" },
  "CEV250290": { serie: 1654, valor: 8955.28, lote: "DR-14", endereco: "SP 425 Km 157,000" },
  "CEV250283": { serie: 1672, valor: 5999.63, lote: "DR-14", endereco: "SP 425 Km 101,310" },
  "CEC250185": { serie: 1675, valor: 13315.86, lote: "DR-14", endereco: "SP 425 Km 102,000" },
  // ── DR-08 ──
  "CEV250152": { serie: 1676, valor: 5116.21, lote: "DR-08", endereco: "SP 334 Km 442,170" },
  "CEV250287": { serie: 1677, valor: 5116.21, lote: "DR-08", endereco: "SP 334 Km 427,310" },
  "CEV250257": { serie: 1678, valor: 5116.21, lote: "DR-08", endereco: "SP 334 Km 410,000" },
  "CEV250286": { serie: 1679, valor: 5116.21, lote: "DR-08", endereco: "SP 334 Km 407,020" },
  "CEV250256": { serie: 1680, valor: 5116.21, lote: "DR-08", endereco: "SP 334 Km 406,930" },
  "CEV250277": { serie: 1681, valor: 5116.21, lote: "DR-08", endereco: "SP 373 Km 104,510" },
  "CEV250276": { serie: 1682, valor: 8496.36, lote: "DR-08", endereco: "SP 351 Km 079,200" },
  "CEV250274": { serie: 1683, valor: 5116.21, lote: "DR-08", endereco: "SP 253 Km 202,000" },
  "CEV250340": { serie: 1684, valor: 5116.21, lote: "DR-08", endereco: "SP 253 Km 192,158" },
  "CEV250148": { serie: 1685, valor: 5116.21, lote: "DR-08", endereco: "SP 253 Km 155,720" },
  "CEV250288": { serie: 1686, valor: 5116.21, lote: "DR-08", endereco: "SP 338 Km 300,570" },
  "CEV250149": { serie: 1687, valor: 5116.21, lote: "DR-08", endereco: "SP 333 Km 006,000" },
  "CEV250150": { serie: 1688, valor: 8496.36, lote: "DR-08", endereco: "SP 345 Km 058,000" },
  "CEV250339": { serie: 1689, valor: 8496.36, lote: "DR-08", endereco: "SP 291 Km 004,028" },
  "CEC250073": { serie: 1690, valor: 11186.88, lote: "DR-08", endereco: "SP 291 Km 023,000" },
  "CEV250391": { serie: 1691, valor: 8496.36, lote: "DR-08", endereco: "SP 351 Km 011,000" },
  "CEV250282": { serie: 1692, valor: 11075.66, lote: "DR-08", endereco: "SP 334 Km 457,070" },
  "CEV250146": { serie: 1693, valor: 11075.66, lote: "DR-08", endereco: "SP 334 Km 418,150" },
  "CEC250074": { serie: 1694, valor: 9304.23, lote: "DR-08", endereco: "SP 334 Km 449,900" },
  "CEC250138": { serie: 1695, valor: 9304.23, lote: "DR-08", endereco: "SP 351 Km 101,500" },
  "CEC250127": { serie: 1696, valor: 9304.23, lote: "DR-08", endereco: "SP 351 Km 054,970" },
  "CEC250181": { serie: 1697, valor: 9304.23, lote: "DR-08", endereco: "SP 253 Km 148,038" },
  "CEC250125": { serie: 1698, valor: 9304.23, lote: "DR-08", endereco: "SP 333 Km 045,030" },
  "CEC250134": { serie: 1699, valor: 9304.23, lote: "DR-08", endereco: "SP 333 Km 045,030" },
  "CEC250106": { serie: 1700, valor: 11186.88, lote: "DR-08", endereco: "SP 345 Km 007,030" },
  "CEV250341": { serie: 1701, valor: 5116.21, lote: "DR-08", endereco: "SP 345 Km 099,263" },
  "CEC250131": { serie: 1702, valor: 11186.88, lote: "DR-08", endereco: "SP 351 Km 050,000" },
  "CEC250187": { serie: 1703, valor: 11186.88, lote: "DR-08", endereco: "SP 291 Km 002,020" },
  "CEC250136": { serie: 1704, valor: 11186.88, lote: "DR-08", endereco: "SP 253 Km 122,000" },
  "CEC250126": { serie: 1705, valor: 11186.88, lote: "DR-08", endereco: "SP 338 Km 293,250" },
  "CEC250132": { serie: 1706, valor: 11186.88, lote: "DR-08", endereco: "SP 351 Km 015,200" },
};

/**
 * Get equipment info from catalog
 */
export function getEquipInfo(equip: string): EquipInfo | null {
  return EQUIP_CATALOG[equip.trim()] || null;
}

/**
 * Get equipment serie number
 */
export function getSerie(equip: string): number | null {
  return EQUIP_CATALOG[equip.trim()]?.serie ?? null;
}

/**
 * Get equipment label for display: "Nº Serie" or equipment code
 */
export function equipLabel(equip: string): string {
  const cat = EQUIP_CATALOG[equip.trim()];
  return cat ? `Nº ${cat.serie}` : equip;
}

/**
 * Get full equipment label: "Nº Serie (code)"
 */
export function equipLabelFull(equip: string): string {
  const cat = EQUIP_CATALOG[equip.trim()];
  return cat ? `Nº ${cat.serie} (${equip})` : equip;
}

/**
 * Get equipment valor from catalog or fallback to VALORES_CONTRATUAIS
 */
export function getValorEquip(equip: string, tipo?: string): number {
  const cat = EQUIP_CATALOG[equip.trim()];
  if (cat) return cat.valor;
  // Fallback defaults by tipo
  const defaults: Record<string, number> = { CEV: 3200, REV: 2800, CEC: 4500, REC: 4000 };
  return defaults[tipo || 'CEV'] || 5000;
}

export const formatCurrency = (value: number): string => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
export const formatNumber = (value: number): string => new Intl.NumberFormat("id-ID").format(value);
export const formatPercent = (value: number): string => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
export const formatCompactCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}K`;
  return `Rp ${value}`;
};
export const formatCompactNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${Math.round(value)}`;
};
export const getMonthName = (monthStr: string): string => {
  const [year, month] = [monthStr.slice(0, 4), monthStr.slice(4, 6)];
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

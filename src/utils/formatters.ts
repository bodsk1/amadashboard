export const formatCurrency = (value: number): string => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
export const formatNumber = (value: number): string => new Intl.NumberFormat("id-ID").format(value);
export const formatPercent = (value: number): string => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
export const getMonthName = (monthStr: string): string => {
  const [year, month] = [monthStr.slice(0, 4), monthStr.slice(4, 6)];
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

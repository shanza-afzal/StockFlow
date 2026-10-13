// Stock at or below this quantity counts as low; zero or less is out of stock.
export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = "OUT" | "LOW" | "OK";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "OUT";
  if (stock <= LOW_STOCK_THRESHOLD) return "LOW";
  return "OK";
}

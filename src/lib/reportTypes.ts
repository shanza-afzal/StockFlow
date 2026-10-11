// One bill as listed in the sales / purchase reports (returned by the /api/reports routes).
export type ReportBill = {
  id: number;
  billNo: number;
  date: string;
  account: string | null;
  total: number;
  paidAmount: number;
};

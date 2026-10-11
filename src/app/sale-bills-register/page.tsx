import { PageHeader } from "@/components/ui";
import BillsRegister from "@/components/BillsRegister";

export default function SaleBillsRegisterPage() {
  return (
    <div>
      <PageHeader title="Sale Bills Register" />
      <BillsRegister type="SALE" />
    </div>
  );
}

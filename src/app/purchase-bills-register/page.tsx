import { PageHeader } from "@/components/ui";
import BillsRegister from "@/components/BillsRegister";

export default function PurchaseBillsRegisterPage() {
  return (
    <div>
      <PageHeader title="Purchase Bills Register" />
      <BillsRegister type="PURCHASE" />
    </div>
  );
}

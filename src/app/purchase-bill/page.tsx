import { PageHeader } from "@/components/ui";
import BillForm from "@/components/BillForm";

export default function PurchaseBillPage() {
  return (
    <div>
      <PageHeader title="New Purchase Bill" />
      <BillForm type="PURCHASE" />
    </div>
  );
}

import { PageHeader } from "@/components/ui";
import BillForm from "@/components/BillForm";

export default function SaleBillPage() {
  return (
    <div>
      <PageHeader title="New Sale Bill" />
      <BillForm type="SALE" />
    </div>
  );
}

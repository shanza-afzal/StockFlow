import AccountHistory from "./AccountHistory";

export default async function LedgerHistoryPage({ params }: PageProps<"/ledger/[id]">) {
  const { id } = await params;
  return <AccountHistory accountId={id} />;
}

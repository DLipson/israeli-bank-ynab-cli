import { useEffect, useState } from "react";
import { getAccounts, type AccountInfo } from "@/api/client";
import { AccountCard } from "@/components/AccountCard";

export function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAccounts = async () => {
    try {
      setError("");
      const data = await getAccounts();
      setAccounts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading accounts...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive">{error}</div>;
  }

  const enabled = accounts.filter((a) => a.enabled);
  const disabled = accounts.filter((a) => !a.enabled);

  return (
    <div className="space-y-6">
      {enabled.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Configured ({enabled.length})
          </h3>
          {enabled.map((account) => (
            <AccountCard
              key={account.name}
              account={account}
              onUpdated={fetchAccounts}
            />
          ))}
        </div>
      )}

      {disabled.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Not Configured ({disabled.length})
          </h3>
          {disabled.map((account) => (
            <AccountCard
              key={account.name}
              account={account}
              onUpdated={fetchAccounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

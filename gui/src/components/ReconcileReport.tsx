import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReconcileResult, NormalizedTransaction } from "@/api/client";

interface ReconcileReportProps {
  result: ReconcileResult;
}

function formatAmount(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}\u20AA${Math.abs(amount).toFixed(2)}`;
}

function getEffectiveDate(txn: NormalizedTransaction): string {
  return txn.chargeDate || txn.transactionDate || "";
}

function getEffectiveAmount(txn: NormalizedTransaction): number {
  if (txn.outflow > 0) return -txn.outflow;
  if (txn.inflow > 0) return txn.inflow;
  return 0;
}

function TransactionRow({ txn }: { txn: NormalizedTransaction }) {
  return (
    <TableRow>
      <TableCell>{getEffectiveDate(txn)}</TableCell>
      <TableCell className="max-w-[200px] truncate">{txn.payee}</TableCell>
      <TableCell className="text-right">{formatAmount(getEffectiveAmount(txn))}</TableCell>
    </TableRow>
  );
}

function CollapsibleSection({
  title,
  count,
  variant,
  children,
}: {
  title: string;
  count: number;
  variant: "destructive" | "warning" | "success" | "secondary";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(count > 0);

  if (count === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
        <Badge variant={variant}>{count}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function ReconcileReport({ result }: ReconcileReportProps) {
  const hasDiscrepancies =
    result.missingFromTarget.length > 0 || result.extraInTarget.length > 0;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={`rounded-md p-3 text-sm font-medium ${
          hasDiscrepancies
            ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
            : "bg-green-50 text-green-800 border border-green-200"
        }`}
      >
        {hasDiscrepancies ? "Discrepancies found" : "All transactions reconciled"}
      </div>

      {/* Flagged matches */}
      <CollapsibleSection
        title="Matched with date discrepancy"
        count={result.flagged.length}
        variant="warning"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date Diff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.flagged.map((item, i) => (
              <TableRow key={i}>
                <TableCell>{getEffectiveDate(item.source)}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {item.source.payee}
                </TableCell>
                <TableCell className="text-right">
                  {formatAmount(getEffectiveAmount(item.source))}
                </TableCell>
                <TableCell>
                  <Badge variant="warning">
                    {item.dateDiff} day{item.dateDiff !== 1 ? "s" : ""}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CollapsibleSection>

      {/* Missing from target */}
      <CollapsibleSection
        title="Missing from target"
        count={result.missingFromTarget.length}
        variant="destructive"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.missingFromTarget.map((txn, i) => (
              <TransactionRow key={i} txn={txn} />
            ))}
          </TableBody>
        </Table>
      </CollapsibleSection>

      {/* Extra in target */}
      <CollapsibleSection
        title="Extra in target"
        count={result.extraInTarget.length}
        variant="secondary"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.extraInTarget.map((txn, i) => (
              <TransactionRow key={i} txn={txn} />
            ))}
          </TableBody>
        </Table>
      </CollapsibleSection>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 rounded-md bg-muted p-4 text-sm">
        <div>
          <div className="text-muted-foreground">Source</div>
          <div className="font-medium">{result.sourceCount} transactions</div>
        </div>
        <div>
          <div className="text-muted-foreground">Target</div>
          <div className="font-medium">{result.targetCount} transactions</div>
        </div>
        <div>
          <div className="text-muted-foreground">Matched</div>
          <div className="font-medium">
            {result.matched.length} exact + {result.flagged.length} flagged
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TransactionSummary } from "@/api/client";

interface ScrapeSummaryProps {
  summary: TransactionSummary;
}

function formatCurrency(amount: number): string {
  return `\u20AA${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ScrapeSummary({ summary }: ScrapeSummaryProps) {
  const accounts = Object.entries(summary.byAccount);
  const totalCount = accounts.reduce((sum, [, d]) => sum + d.count, 0);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Summary</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Transactions</TableHead>
            <TableHead className="text-right">Outflow</TableHead>
            <TableHead className="text-right">Inflow</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map(([name, data]) => (
            <TableRow key={name}>
              <TableCell className="font-medium">{name}</TableCell>
              <TableCell className="text-right">{data.count}</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(data.outflow)}</TableCell>
              <TableCell className="text-right text-green-600">{formatCurrency(data.inflow)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-bold">Total</TableCell>
            <TableCell className="text-right font-bold">{totalCount}</TableCell>
            <TableCell className="text-right font-bold text-red-600">
              {formatCurrency(summary.totalOutflow)}
            </TableCell>
            <TableCell className="text-right font-bold text-green-600">
              {formatCurrency(summary.totalInflow)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

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
import type { SkippedItem } from "@/api/client";

interface SkippedListProps {
  skipped: SkippedItem[];
}

export function SkippedList({ skipped }: SkippedListProps) {
  const [open, setOpen] = useState(false);

  if (skipped.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Skipped Transactions
        <Badge variant="secondary">{skipped.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reason</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skipped.map((item, i) => {
              const txn = item.txn;
              return (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant="warning">{item.reason}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {(txn.description as string) || "Unknown"}
                  </TableCell>
                  <TableCell className="text-right">
                    {((txn.chargedAmount as number) ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {((txn.processedDate as string) || (txn.date as string) || "").split("T")[0]}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CollapsibleContent>
    </Collapsible>
  );
}

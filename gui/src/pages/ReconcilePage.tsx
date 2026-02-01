import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/FileDropZone";
import { ReconcileReport } from "@/components/ReconcileReport";
import { reconcile, type ReconcileResult } from "@/api/client";

export function ReconcilePage() {
  const [sourceContent, setSourceContent] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [targetContent, setTargetContent] = useState("");
  const [targetLabel, setTargetLabel] = useState("");
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canReconcile = sourceContent.length > 0 && targetContent.length > 0;

  const handleReconcile = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await reconcile({
        sourceContent,
        targetContent,
        sourceLabel: sourceLabel || "Source",
        targetLabel: targetLabel || "Target",
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reconcile failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Reconcile CSV Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <FileDropZone
              label="Source CSV (e.g., bank export)"
              onFileContent={(content, name) => {
                setSourceContent(content);
                setSourceLabel(name);
                setResult(null);
              }}
            />
            <FileDropZone
              label="Target CSV (e.g., scraper output)"
              onFileContent={(content, name) => {
                setTargetContent(content);
                setTargetLabel(name);
                setResult(null);
              }}
            />
          </div>

          <Button
            className="mt-4 w-full"
            onClick={handleReconcile}
            disabled={!canReconcile || loading}
          >
            {loading ? "Reconciling..." : "Reconcile"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="pt-6">
            <ReconcileReport result={result} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface ScrapeSettingsProps {
  daysBack: number;
  setDaysBack: (v: number) => void;
  outputDir: string;
  setOutputDir: (v: string) => void;
  split: boolean;
  setSplit: (v: boolean) => void;
  showBrowser: boolean;
  setShowBrowser: (v: boolean) => void;
  enableDetailedLogging: boolean;
  setEnableDetailedLogging: (v: boolean) => void;
  detailedLoggingLimit: number;
  setDetailedLoggingLimit: (v: number) => void;
  onStart: () => void;
  disabled: boolean;
}

export function ScrapeSettings({
  daysBack,
  setDaysBack,
  outputDir,
  setOutputDir,
  split,
  setSplit,
  showBrowser,
  setShowBrowser,
  enableDetailedLogging,
  setEnableDetailedLogging,
  detailedLoggingLimit,
  setDetailedLoggingLimit,
  onStart,
  disabled,
}: ScrapeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="daysBack">Days Back</Label>
          <Input
            id="daysBack"
            type="number"
            min={1}
            value={daysBack}
            onChange={(e) => setDaysBack(parseInt(e.target.value) || 60)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="outputDir">Output Directory</Label>
          <Input id="outputDir" value={outputDir} onChange={(e) => setOutputDir(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch id="split" checked={split} onCheckedChange={setSplit} />
          <Label htmlFor="split">Split by account</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="showBrowser" checked={showBrowser} onCheckedChange={setShowBrowser} />
          <Label htmlFor="showBrowser">Show browser</Label>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Switch
            id="enableDetailedLogging"
            checked={enableDetailedLogging}
            onCheckedChange={setEnableDetailedLogging}
          />
          <Label htmlFor="enableDetailedLogging">Enable detailed logging</Label>
        </div>
        {enableDetailedLogging && (
          <div className="space-y-2 ml-8">
            <Label htmlFor="detailedLoggingLimit" className="text-sm text-muted-foreground">
              Log item limit (0 = all items)
            </Label>
            <Input
              id="detailedLoggingLimit"
              type="number"
              min={0}
              value={detailedLoggingLimit}
              onChange={(e) => setDetailedLoggingLimit(parseInt(e.target.value) || 0)}
              className="w-32"
            />
          </div>
        )}
      </div>

      <Button onClick={onStart} disabled={disabled} className="w-full">
        {disabled ? "Scraping..." : "Start Scraping"}
      </Button>
    </div>
  );
}

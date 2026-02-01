import { Router, type Request, type Response } from "express";
import { reconcile } from "../../reconcile.js";

const router = Router();

/**
 * POST /api/reconcile
 * Compares two CSV contents and returns reconciliation results.
 */
router.post("/", (req: Request, res: Response) => {
  const { sourceContent, targetContent, sourceLabel, targetLabel } = req.body as {
    sourceContent: string;
    targetContent: string;
    sourceLabel: string;
    targetLabel: string;
  };

  if (!sourceContent || !targetContent) {
    res.status(400).json({ error: "Missing sourceContent or targetContent" });
    return;
  }

  try {
    const result = reconcile(
      sourceContent,
      targetContent,
      sourceLabel || "Source",
      targetLabel || "Target"
    );
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

export default router;

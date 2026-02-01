import { Router } from "express";
import { join } from "node:path";
import { BANK_DEFINITIONS } from "../../banks.js";
import { readEnvFile, writeEnvFile, clearEnvVars } from "../env-io.js";

const router = Router();

function getEnvPath(): string {
  return join(process.cwd(), ".env");
}

function reloadEnv(): void {
  const vars = readEnvFile(getEnvPath());
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] = value;
  }
}

/**
 * GET /api/accounts
 * Returns all banks with their field names and enabled status.
 * Never sends credential values.
 */
router.get("/", (_req, res) => {
  const envPath = getEnvPath();
  const envVars = readEnvFile(envPath);

  const accounts = BANK_DEFINITIONS.map((bank) => {
    const fields = Object.keys(bank.credentialFields);
    const envKeys = Object.values(bank.credentialFields);
    const allFilled = envKeys.every((envKey) => (envVars[envKey] ?? "").length > 0);

    return {
      name: bank.name,
      companyId: bank.companyId,
      fields,
      enabled: allFilled,
    };
  });

  res.json({ accounts });
});

/**
 * PUT /api/accounts/:name/credentials
 * Saves credentials for a bank to the .env file.
 */
router.put("/:name/credentials", (req, res) => {
  const { name } = req.params;
  const { credentials } = req.body as { credentials: Record<string, string> };

  const bank = BANK_DEFINITIONS.find((b) => b.name === name);
  if (!bank) {
    res.status(404).json({ error: `Bank "${name}" not found` });
    return;
  }

  if (!credentials || typeof credentials !== "object") {
    res.status(400).json({ error: "Missing credentials object" });
    return;
  }

  // Map credential field names to env var names
  const updates: Record<string, string> = {};
  for (const [field, envVar] of Object.entries(bank.credentialFields)) {
    const value = credentials[field];
    if (value === undefined || value === "") {
      res.status(400).json({ error: `Missing required field: ${field}` });
      return;
    }
    updates[envVar] = value;
  }

  writeEnvFile(getEnvPath(), updates);
  reloadEnv();

  res.json({ success: true });
});

/**
 * DELETE /api/accounts/:name/credentials
 * Clears credentials for a bank from the .env file.
 */
router.delete("/:name/credentials", (req, res) => {
  const { name } = req.params;

  const bank = BANK_DEFINITIONS.find((b) => b.name === name);
  if (!bank) {
    res.status(404).json({ error: `Bank "${name}" not found` });
    return;
  }

  const envKeys = Object.values(bank.credentialFields);
  clearEnvVars(getEnvPath(), envKeys);
  reloadEnv();

  // Also clear from process.env
  for (const key of envKeys) {
    delete process.env[key];
  }

  res.json({ success: true });
});

export default router;

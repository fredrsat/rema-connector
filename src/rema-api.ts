// Direktekall mot api.rema.no for endepunkter rema1000-cli ikke håndterer.
// Kampanje-endepunktet svarer med brotli-komprimering som CLI-en (per v0.2.0)
// ikke pakker ut — Nodes fetch gjør det automatisk. Tokens leses fra CLI-ens
// egen fil; ved 401 trigges refresh ved å kjøre en billig CLI-kommando.
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { remaBinary } from "./rema-cli.js";

const execFileAsync = promisify(execFile);

const TOKENS_FILE = join(homedir(), ".rema1000", "tokens.json");
// Abonnementsnøkler er innebygd i Æ-appen (og i rema1000-cli) — ikke hemmeligheter.
const SUB_KEY_PAPIRFLY_CAMPAIGN = "e8494ceb23754fc4911c81b166e0a97f";

async function accessToken(): Promise<string> {
  const tokens = JSON.parse(await readFile(TOKENS_FILE, "utf8")) as {
    rema?: { access_token?: string };
  };
  const token = tokens.rema?.access_token;
  if (!token) throw new Error("Not logged in. Run 'rema auth login' first.");
  return token;
}

/** Ber CLI-en fornye tokens (den refresher ved behov på hvert kall). */
async function refreshViaCli(): Promise<void> {
  await execFileAsync(await remaBinary(), ["customer", "minimal", "--json"], {
    timeout: 30_000,
  }).catch(() => {});
}

export async function getCampaigns(type?: string): Promise<unknown> {
  const url = new URL("https://api.rema.no/v1/papirflycampaign/campaigns");
  url.searchParams.set("type", type ?? "SP");
  url.searchParams.set("includeOffers", "true");
  url.searchParams.set("feed", "true");

  const call = async () =>
    fetch(url, {
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Ocp-Apim-Subscription-Key": SUB_KEY_PAPIRFLY_CAMPAIGN,
        Accept: "application/json",
      },
    });

  let response = await call();
  if (response.status === 401) {
    await refreshViaCli();
    response = await call();
  }
  if (!response.ok) {
    throw new Error(`GET campaigns failed: HTTP ${response.status}`);
  }
  return response.json();
}

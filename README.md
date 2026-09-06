# rema-connector

MCP-server som gir AI-agenter tilgang til REMA 1000: produktsøk med priser,
personlige tilbud, kampanjer, kvitteringer og handlelister (Æ-appen).

Bygger på [rema1000-cli](https://github.com/Alfredvc/rema1000-cli) — en
Rust-CLI som håndterer autentiseringen (browser-login med telefonnummer,
automatisk token-fornyelse). Denne connectoren er kun et MCP-lag oppå.

**Kun personlig bruk mot egen konto.** API-et er Æ-appens private API og kan
endres uten varsel.

## Oppsett

1. Installer rema1000-cli (binæren `rema`):

   ```sh
   curl -sfL https://raw.githubusercontent.com/Alfredvc/rema1000-cli/main/install.sh | bash
   # eller bygg fra kilde: cargo build --release
   ```

2. Logg inn (åpner nettleser, krever Chrome/Chromium):

   ```sh
   rema auth login
   ```

   Tokens lagres i `~/.rema1000/tokens.json` og fornyes automatisk.

3. Bygg og registrer connectoren:

   ```sh
   npm install && npm run build
   claude mcp add --scope user rema -- node /sti/til/rema-connector/dist/index.js mcp
   ```

   Binæren finnes via `REMA_CLI_PATH`, `~/.local/bin/rema`, eller `PATH`.

## MCP-verktøy

| Verktøy | Gjør |
|---|---|
| `get_auth_status` | Sjekk innlogging (agenten kan ikke logge inn — det gjør du i terminalen) |
| `search_products` | Produktsøk med priser og GTIN/EAN |
| `get_offers` | Personlige tilbud, missions og priskutt |
| `get_campaigns` | Ukens kampanjer med produkter |
| `get_purchase_history` / `get_receipt` | Kjøpshistorikk og kvitteringer på linjenivå (EAN, pris, rabatt) |
| `get_shopping_lists` / `get_shopping_list` | Les handlelister fra Æ-appen |
| `create_shopping_list` / `delete_shopping_list` | Administrer lister (`delete` krever bekreftelsesstreng) |
| `add_list_item` / `update_list_item` / `remove_list_item` | Varer: legg til (med GTIN-kobling), huk av, fjern |
| `search_stores` | Finn fysiske butikker |

Kvitteringene er ekte observerte priser — nyttig fasit for prissammenligning
sammen med [kassalapp-connector](https://github.com/fredrsat/kassalapp-connector),
som mangler ferske REMA-priser.

## CLI

Connectoren har bare `mcp` og `status` — all annen terminalbruk gjøres
direkte med `rema`-CLI-en, som er utmerket i seg selv (`rema --help`).

## Lisens

[MIT](LICENSE)

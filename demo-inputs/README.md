# SupportFlow demo inputs

Sample company documents for the fictional **Northstar Store**, plus a script
that checks every feature end to end.

| File | Type | Used to show |
|---|---|---|
| `01-shipping-and-delivery-policy.pdf` | PDF, 2 pages | Shipping costs, express delivery, follow-up memory |
| `02-returns-refunds-and-cancellations.pdf` | PDF, 2 pages | Returns, non-returnable items, damaged items |
| `03-product-warranty-guide.pdf` | PDF, 2 pages | Product warranties, follow-up memory |
| `04-payments-and-rewards-program.pdf` | PDF, 2 pages | Payment methods, rewards points |
| `05-store-locations-faq.docx` | DOCX | DOCX extraction |
| `06-order-tracking-guide.txt` | TXT | TXT extraction |
| `07-unsupported-file.csv` | CSV | Upload is **rejected** (only PDF, DOCX and TXT are allowed) |

## Automatic check (run before presenting)

Start the app (`docker compose up --build`), then from the repository root:

```powershell
python demo-inputs/e2e_check.py http://localhost:8000
```

It creates fresh demo organizations and prints PASS/FAIL for 91 checks. These
cover auth, onboarding, uploads, retrieval, Gemini chat, memory, human review,
flows, rules, tickets and tenant isolation. The last line should say
`91/91 checks passed`.

## Live demo script (browser, http://localhost:5173)

1. **Sign in to demo**, then complete **Onboarding** (Northstar Store template).
2. **Knowledge base**: upload the 4 PDFs, the DOCX and the TXT. Each reaches `ready`.
   The file picker only offers PDF/DOCX/TXT. To show the backend rejecting
   other files, switch the picker to "All files" and choose the CSV.
3. **Retrieval test** in Knowledge base: search `AuroraBeam Smart Lamp warranty`.
4. **Chat** (Playground), grounded answers with citations:
   - `How much does express shipping cost?` gives 12.99 USD (shipping PDF)
   - `How many points do I need for a 10 USD voucher?` gives 500 points (rewards PDF)
   - `Which cities have Northstar physical stores?` gives Pune, Bengaluru, Mumbai (DOCX)
5. **Memory**: ask follow-ups without repeating the subject:
   - `What warranty do the SonicWave Earbuds have?` then `Is the battery covered too?`
   - `How much does express shipping cost?` then `How long does it take to arrive?`
6. **Human review**: `Do you offer student discounts?` The bot cannot answer and
   offers a human review. Click **Yes, create review**, then open **Tickets**.
7. **Rules**: create a rule with field `message`, operator `contains`, value
   `damaged`, action **Escalate**, priority `1`. Then ask
   `My ChefPro Blender arrived damaged` in Chat. The rule answers before Gemini
   and creates a ticket. (The API also supports team and urgent priority on a
   rule; the script tests that.)
8. **Tickets**: open the ticket, add an internal note, mark it In Progress, then
   Resolve it.
9. **Talk to agent**: type `talk to an agent`. The bot escalates and creates a ticket.

Press **Restart Chat** to start a new conversation, which clears the memory.

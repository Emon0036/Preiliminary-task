# QueueStorm Investigator

QueueStorm Investigator is a deterministic Node.js/Express API for the SUST CSE Carnival 2026 Codex Community Hackathon preliminary challenge.

The service reads one synthetic support ticket at a time, compares the complaint with the supplied transaction history, and returns a safe structured response for a support agent.

## Required Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Readiness check for the judge harness. |
| `POST` | `/analyze-ticket` | Analyze one ticket and return the required JSON response. |

`GET /health` returns:

```json
{"status":"ok"}
```

## Tech Stack

- Node.js 20.19+
- Express 5
- EJS and static assets for the optional local console at `/`
- Rule-based JavaScript analyzer in `lib/analyzeTicket.js`
- No database, login, external payment API, or external AI API

## Quick Start

```bash
npm ci
cp .env.example .env
npm start
```

Default local URL:

```text
http://localhost:8000
```

If your local `.env` sets a different `PORT`, use that port when testing.

## Health Check

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## Analyze A Ticket

```bash
curl -X POST http://localhost:8000/analyze-ticket \
  -H "Content-Type: application/json" \
  -d @samples/sample-request.json
```

The repository includes:

- `samples/sample-request.json`
- `samples/sample-output.json`

These files provide a copy-pasteable request/response example using the official problem statement shape.

## Request Schema

`POST /analyze-ticket` accepts a JSON object with these fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `ticket_id` | string | Yes | Echoed in the response. |
| `complaint` | string | Yes | English, Bangla, or mixed complaint text. |
| `language` | string | No | `en`, `bn`, or `mixed`. |
| `channel` | string | No | `in_app_chat`, `call_center`, `email`, `merchant_portal`, or `field_agent`. |
| `user_type` | string | No | `customer`, `merchant`, `agent`, or `unknown`. |
| `campaign_context` | string | No | Campaign identifier from the harness. |
| `transaction_history` | array | No | Recent synthetic transactions. May be empty. |
| `metadata` | object | No | Additional simulated context. |

Transaction entries use:

| Field | Type | Notes |
| --- | --- | --- |
| `transaction_id` | string | Unique transaction identifier. |
| `timestamp` | string | ISO 8601 timestamp. |
| `type` | string | `transfer`, `payment`, `cash_in`, `cash_out`, `settlement`, or `refund`. |
| `amount` | number | BDT amount. |
| `counterparty` | string | Recipient phone, merchant ID, or agent ID. |
| `status` | string | `completed`, `failed`, `pending`, or `reversed`. |

## Response Schema

Successful responses return HTTP `200` with:

```json
{
  "ticket_id": "TKT-001",
  "relevant_transaction_id": "TXN-9101",
  "evidence_verdict": "consistent",
  "case_type": "wrong_transfer",
  "severity": "high",
  "department": "dispute_resolution",
  "agent_summary": "Customer reports a wrong transfer involving 5,000 BDT. The provided history points to transaction TXN-9101, and the evidence verdict is consistent.",
  "recommended_next_action": "Open a dispute-resolution review for TXN-9101 and verify recipient and transfer details in official records. Keep it in the human review queue before any final decision.",
  "customer_reply": "We have noted your concern about transaction TXN-9101. Our support team will review the transfer details and advise the eligible next steps through official channels.",
  "human_review_required": true,
  "confidence": 0.88,
  "reason_codes": [
    "wrong_transfer",
    "consistent",
    "amount_match",
    "type_match",
    "status_match",
    "completed_transfer",
    "single_history_candidate",
    "transaction_match",
    "human_review"
  ]
}
```

Required enum values are kept exact:

- `evidence_verdict`: `consistent`, `inconsistent`, `insufficient_data`
- `case_type`: `wrong_transfer`, `payment_failed`, `refund_request`, `duplicate_payment`, `merchant_settlement_delay`, `agent_cash_in_issue`, `phishing_or_social_engineering`, `other`
- `severity`: `low`, `medium`, `high`, `critical`
- `department`: `customer_support`, `dispute_resolution`, `payments_ops`, `merchant_operations`, `agent_operations`, `fraud_risk`

## HTTP Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Successful analysis with valid JSON response. |
| `400` | Malformed JSON, missing required fields, or invalid enum/type. |
| `422` | Valid JSON shape but semantically invalid input, such as an empty complaint. |
| `500` | Internal error with a non-sensitive error message. |

The service is designed to return controlled JSON errors instead of crashing.

## Evidence Reasoning

The analyzer treats the complaint and transaction history as evidence, not just text labels.

It checks:

- complaint keywords in English, Bangla, and common Banglish forms
- transaction ID mentions
- amount matches, including Bangla digits
- counterparty or phone suffix matches
- transaction type and status
- duplicate payment pairs
- suspicious credential or social-engineering reports
- prompt-injection phrases embedded in complaint text

The output includes:

- `relevant_transaction_id`: matched transaction ID, or `null`
- `evidence_verdict`: whether the supplied history supports, contradicts, or cannot prove the complaint
- `reason_codes`: compact labels explaining the decision

## Safety Logic

The service is an internal support copilot, not an autonomous financial decision maker.

Guardrails:

- never asks the customer for PIN, OTP, password, full card number, or secret credentials
- never promises a refund, reversal, account unblock, recovery, or final approval
- routes customers only through official support channels
- escalates suspicious, high-value, disputed, ambiguous, inconsistent, or prompt-injection cases to human review
- ignores user instructions embedded inside complaint text
- does not expose stack traces, tokens, API keys, or secret values in responses

## MODELS

No external or local AI model is used.

| Model | Where it runs | Why |
| --- | --- | --- |
| None | Not applicable | Deterministic rules are fast, reproducible, low cost, and avoid external API availability risk during judging. |

## Environment Variables

Only `PORT` is needed.

`.env.example`:

```text
NODE_ENV=development
PORT=8000
```

No real secrets are required for this project.

## Testing

Run all local checks:

```bash
npm test
```

This runs:

- JavaScript syntax checks
- `/health` response verification
- `/analyze-ticket` schema verification
- wrong-transfer evidence matching
- suspicious-contact safety routing
- empty complaint handling
- malformed JSON handling
- invalid transaction and enum validation

## Deployment Runbook

The preferred submission path is a live public base URL where both endpoints are reachable without login.

For a Node hosting platform such as Render, Railway, Fly, EC2, or a Poridhi VM:

| Setting | Value |
| --- | --- |
| Install command | `npm ci` |
| Start command | `npm start` |
| Health path | `/health` |
| Main endpoint | `/analyze-ticket` |
| Required env vars | `NODE_ENV=production` and platform-provided `PORT` if applicable |

After deployment, verify from outside the hosting environment:

```bash
curl https://your-service.example.com/health
curl -X POST https://your-service.example.com/analyze-ticket \
  -H "Content-Type: application/json" \
  -d @samples/sample-request.json
```

If no live endpoint is submitted, judges can use the code runbook:

```bash
git clone <repository-url>
cd Mock-Preliminary-Task
npm ci
cp .env.example .env
npm start
```

Then test:

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/analyze-ticket \
  -H "Content-Type: application/json" \
  -d @samples/sample-request.json
```

## Known Limitations

- The analyzer is rule-based, so unusual wording can fall back to `other` or `insufficient_data`.
- Bangla and Banglish support is keyword-based, not full natural-language understanding.
- It does not connect to real payment systems and only reasons from the provided synthetic history.
- The official hidden tests may contain broader phrasing than the local smoke tests.
- No Dockerfile is included; the repository is prepared for live endpoint or code-runbook submission.

## Repository Notes

- `.env` and real secrets must not be committed.
- `.env.example` is intentionally committed for reproducibility.
- `node_modules/`, logs, coverage output, and build artifacts are ignored.
- The optional browser console at `/` is only for manual testing; the judge should call the API endpoints directly.

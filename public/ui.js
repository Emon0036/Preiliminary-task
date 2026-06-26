const sampleRequest = {
  ticket_id: "TKT-LOCAL-1",
  complaint: "I sent 5000 taka to a wrong number around 2pm today. Please help me get it back.",
  language: "en",
  channel: "in_app_chat",
  user_type: "customer",
  campaign_context: "boishakh_bonanza_day_1",
  transaction_history: [
    {
      transaction_id: "TXN-9101",
      timestamp: "2026-04-14T14:08:22Z",
      type: "transfer",
      amount: 5000,
      counterparty: "+8801719876543",
      status: "completed",
    },
  ],
};

const fields = {
  ticketId: document.getElementById("ticketId"),
  language: document.getElementById("language"),
  channel: document.getElementById("channel"),
  userType: document.getElementById("userType"),
  campaignContext: document.getElementById("campaignContext"),
  complaint: document.getElementById("complaint"),
  transactionHistory: document.getElementById("transactionHistory"),
};

const responseBody = document.getElementById("responseBody");
const analyzeButton = document.getElementById("analyzeButton");
const loadSample = document.getElementById("loadSample");
const clearButton = document.getElementById("clearButton");
const copyResponse = document.getElementById("copyResponse");
const healthStatus = document.getElementById("healthStatus");
const statusCode = document.getElementById("statusCode");
const latency = document.getElementById("latency");

const requiredResponseFields = [
  "ticket_id",
  "relevant_transaction_id",
  "evidence_verdict",
  "case_type",
  "severity",
  "department",
  "agent_summary",
  "recommended_next_action",
  "customer_reply",
  "human_review_required",
];

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function setResponse(value) {
  responseBody.textContent = typeof value === "string" ? value : prettyJson(value);
}

function setStatus(text, kind) {
  healthStatus.textContent = text;
  healthStatus.classList.remove("ok", "error");

  if (kind) {
    healthStatus.classList.add(kind);
  }
}

function loadRequest(request) {
  fields.ticketId.value = request.ticket_id || "";
  fields.language.value = request.language || "en";
  fields.channel.value = request.channel || "in_app_chat";
  fields.userType.value = request.user_type || "customer";
  fields.campaignContext.value = request.campaign_context || "";
  fields.complaint.value = request.complaint || "";
  fields.transactionHistory.value = prettyJson(request.transaction_history || []);
}

function clearRequest() {
  fields.ticketId.value = "TKT-LOCAL-1";
  fields.language.value = "en";
  fields.channel.value = "in_app_chat";
  fields.userType.value = "customer";
  fields.campaignContext.value = "";
  fields.complaint.value = "";
  fields.transactionHistory.value = "[]";
  setResponse("// response will appear here");
  statusCode.textContent = "status: idle";
  latency.textContent = "latency: --";
}

function parseTransactionHistory() {
  const value = fields.transactionHistory.value.trim();

  if (!value) {
    return [];
  }

  const parsed = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    throw new Error("transaction_history must be a JSON array.");
  }

  return parsed;
}

function buildPayload() {
  const payload = {
    ticket_id: fields.ticketId.value.trim(),
    complaint: fields.complaint.value.trim(),
    language: fields.language.value,
    channel: fields.channel.value,
    user_type: fields.userType.value,
    transaction_history: parseTransactionHistory(),
  };

  const campaignContext = fields.campaignContext.value.trim();

  if (campaignContext) {
    payload.campaign_context = campaignContext;
  }

  return payload;
}

function responseFieldSummary(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "schema: non-object response";
  }

  const missing = requiredResponseFields.filter((field) => !(field in body));

  if (missing.length) {
    return `schema: missing ${missing.join(", ")}`;
  }

  return `schema: ok - ${body.case_type || "unknown"} / ${body.evidence_verdict || "unknown"}`;
}

async function checkHealth() {
  try {
    const response = await fetch("/health", {
      headers: {
        Accept: "application/json",
      },
    });
    const body = await response.json();

    if (response.ok && body.status === "ok") {
      setStatus("health: ok", "ok");
      return;
    }

    throw new Error("Unexpected health response");
  } catch {
    setStatus("health: offline", "error");
  }
}

async function analyzeTicket() {
  let payload;

  try {
    payload = buildPayload();
  } catch (error) {
    setResponse(error.message);
    statusCode.textContent = "status: invalid input";
    latency.textContent = "latency: --";
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.textContent = "Analyzing...";
  setResponse("// sending request...");
  statusCode.textContent = "status: pending";
  latency.textContent = "latency: --";
  const startedAt = performance.now();

  try {
    const response = await fetch("/analyze-ticket", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const elapsed = Math.round(performance.now() - startedAt);
    const text = await response.text();
    let body;

    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    setResponse(body);
    statusCode.textContent = `status: ${response.status} (${responseFieldSummary(body)})`;
    latency.textContent = `latency: ${elapsed} ms`;
  } catch {
    setResponse("Request failed. Check that the correct local server is running on the configured port.");
    statusCode.textContent = "status: network error";
    latency.textContent = "latency: --";
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "POST /analyze-ticket";
  }
}

loadSample.addEventListener("click", () => loadRequest(sampleRequest));
clearButton.addEventListener("click", clearRequest);
analyzeButton.addEventListener("click", analyzeTicket);

copyResponse.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(responseBody.textContent);
    copyResponse.textContent = "Copied";
  } catch {
    copyResponse.textContent = "Failed";
  }

  setTimeout(() => {
    copyResponse.textContent = "Copy";
  }, 1200);
});

loadRequest(sampleRequest);
checkHealth();

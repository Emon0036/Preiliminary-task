const VALID_CASE_TYPES = new Set([
  "wrong_transfer",
  "payment_failed",
  "refund_request",
  "duplicate_payment",
  "merchant_settlement_delay",
  "agent_cash_in_issue",
  "phishing_or_social_engineering",
  "other",
]);

const VALID_DEPARTMENTS = new Set([
  "customer_support",
  "dispute_resolution",
  "payments_ops",
  "merchant_operations",
  "agent_operations",
  "fraud_risk",
]);

const VALID_TRANSACTION_TYPES = new Set(["transfer", "payment", "cash_in", "cash_out", "settlement", "refund"]);
const VALID_TRANSACTION_STATUSES = new Set(["completed", "failed", "pending", "reversed"]);
const VALID_LANGUAGES = new Set(["en", "bn", "mixed"]);
const VALID_CHANNELS = new Set(["in_app_chat", "call_center", "email", "merchant_portal", "field_agent"]);
const VALID_USER_TYPES = new Set(["customer", "merchant", "agent", "unknown"]);

const BENGALI_DIGITS = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

const KEYWORDS = {
  phishing: [
    "otp",
    "pin",
    "password",
    "passcode",
    "verification code",
    "secret code",
    "secret number",
    "scam",
    "fraud",
    "phishing",
    "fake call",
    "fake sms",
    "unknown caller",
    "suspicious",
    "suspicious link",
    "account blocked",
    "unblock",
    "reward",
    "lottery",
    "prize",
    "ওটিপি",
    "পিন",
    "পাসওয়ার্ড",
    "পাসওয়ার্ড",
    "কোড",
    "ভেরিফিকেশন",
    "স্ক্যাম",
    "প্রতারণা",
    "ভুয়া",
    "ভুয়া",
    "সন্দেহজনক",
    "লিংক",
    "লিঙ্ক",
    "পুরস্কার",
  ],
  injection: [
    "ignore previous",
    "ignore the rules",
    "ignore all rules",
    "system prompt",
    "developer message",
    "bypass safety",
    "override instructions",
    "return only",
    "jailbreak",
  ],
  duplicate: [
    "duplicate",
    "double charged",
    "charged twice",
    "paid twice",
    "two times",
    "same payment twice",
    "twice",
    "দুইবার",
    "দুবার",
    "ডাবল",
    "একই পেমেন্ট",
  ],
  merchantSettlement: [
    "merchant settlement",
    "settlement",
    "settled",
    "merchant payout",
    "merchant payment not received",
    "মার্চেন্ট",
    "সেটেলমেন্ট",
    "পেআউট",
  ],
  agentCashIn: [
    "cash in",
    "cash-in",
    "cashin",
    "agent cash",
    "agent deposit",
    "agent",
    "deposit",
    "not reflected",
    "not added",
    "balance not updated",
    "ক্যাশ ইন",
    "ক্যাশইন",
    "এজেন্ট",
    "জমা",
    "ব্যালেন্সে আসেনি",
    "ব্যালেন্সে যোগ",
  ],
  wrongTransfer: [
    "wrong number",
    "wrong recipient",
    "wrong person",
    "wrong account",
    "sent by mistake",
    "mistakenly sent",
    "wrongly sent",
    "ভুল নম্বর",
    "ভুল নাম্বার",
    "ভুলে",
    "ভুল করে",
    "ভুল রিসিপিয়েন্ট",
    "ভুল রিসিপিয়েন্ট",
    "ভুল ব্যক্তির",
  ],
  paymentFailed: [
    "payment failed",
    "transaction failed",
    "failed transaction",
    "unsuccessful",
    "failed but deducted",
    "balance deducted",
    "money deducted",
    "deducted",
    "debited",
    "not successful",
    "পেমেন্ট ফেইল",
    "ট্রানজেকশন ফেইল",
    "ব্যর্থ",
    "টাকা কাটা",
    "টাকা কেটে",
    "ব্যালেন্স কাটা",
  ],
  refund: [
    "refund",
    "refund request",
    "cashback",
    "cash back",
    "money back",
    "return my money",
    "রিফান্ড",
    "ফেরত",
    "টাকা ফেরত",
    "ক্যাশব্যাক",
  ],
  completed: ["completed", "successful", "success", "sent", "paid", "সম্পন্ন", "সফল"],
  failed: ["failed", "fail", "unsuccessful", "declined", "ব্যর্থ", "ফেইল"],
  pending: ["pending", "processing", "পেন্ডিং", "প্রসেসিং"],
  reversed: ["reversed", "refunded", "returned", "রিভার্স", "ফেরত"],
};

function replaceBengaliDigits(value) {
  return String(value || "").replace(/[০-৯]/g, (digit) => BENGALI_DIGITS[digit] || digit);
}

function normalizeText(value) {
  return replaceBengaliDigits(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function getHits(text, words) {
  return words.filter((word) => text.includes(word));
}

function normalizeCounterparty(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function numberSequences(text) {
  return replaceBengaliDigits(text).match(/\d{4,}/g) || [];
}

function counterpartyMatches(text, counterparty) {
  if (!counterparty) {
    return false;
  }

  const normalizedText = normalizeText(text);
  const counterpartyToken = normalizeCounterparty(counterparty);

  if (counterpartyToken.length >= 3 && normalizedText.replace(/[^a-z0-9]/g, "").includes(counterpartyToken)) {
    return true;
  }

  const counterpartyDigits = replaceBengaliDigits(counterparty).replace(/\D/g, "");

  if (counterpartyDigits.length < 6) {
    return false;
  }

  const suffix = counterpartyDigits.slice(-8);
  const compactTextDigits = replaceBengaliDigits(text).replace(/\D/g, "");

  if (compactTextDigits.includes(counterpartyDigits) || compactTextDigits.includes(suffix)) {
    return true;
  }

  return numberSequences(text).some((sequence) => {
    return sequence.endsWith(suffix) || counterpartyDigits.endsWith(sequence.slice(-8));
  });
}

function extractAmounts(text) {
  const normalized = normalizeText(text).replace(/,/g, "");
  const amounts = new Set();
  const moneyTokenPattern =
    /(?:৳|bdt|tk|taka|টাকা)\s*(\d+(?:\.\d+)?)(k)?|(\d+(?:\.\d+)?)(k)?\s*(?:৳|bdt|tk|taka|টাকা)/gi;

  for (const match of normalized.matchAll(moneyTokenPattern)) {
    const raw = match[1] || match[3];
    const thousand = match[2] || match[4];
    addAmount(amounts, raw, thousand);
  }

  const generalNumberPattern = /(?<![a-z0-9+])(\d{2,7}(?:\.\d+)?)(k)?(?![a-z0-9])/gi;

  for (const match of normalized.matchAll(generalNumberPattern)) {
    const index = match.index || 0;
    const before = normalized.slice(Math.max(0, index - 8), index);
    const after = normalized.slice(index + match[0].length, index + match[0].length + 8);

    if (/txn|tkt|id|phone|mobile|number|নম্বর|নাম্বার/.test(before + after)) {
      continue;
    }

    addAmount(amounts, match[1], match[2]);
  }

  return [...amounts];
}

function addAmount(amounts, raw, thousandMarker) {
  const amount = Number(raw) * (thousandMarker ? 1000 : 1);

  if (Number.isFinite(amount) && amount > 0 && amount <= 10000000) {
    amounts.add(Math.round(amount * 100) / 100);
  }
}

function amountsMatch(amounts, transactionAmount) {
  if (!Number.isFinite(Number(transactionAmount))) {
    return false;
  }

  return amounts.some((amount) => Math.abs(Number(transactionAmount) - amount) < 0.01);
}

function getTransactionIdFromText(text, transaction) {
  const transactionId = normalizeText(transaction.transaction_id);

  if (!transactionId) {
    return false;
  }

  return normalizeText(text).includes(transactionId);
}

function transactionTypeMatchesCase(caseType, transactionType) {
  const type = normalizeText(transactionType);

  const matches = {
    wrong_transfer: ["transfer"],
    payment_failed: ["payment", "transfer", "cash_out"],
    refund_request: ["payment", "transfer", "refund", "cash_out", "settlement"],
    duplicate_payment: ["payment", "transfer"],
    merchant_settlement_delay: ["settlement"],
    agent_cash_in_issue: ["cash_in"],
  };

  return (matches[caseType] || []).includes(type);
}

function detectComplaintStatus(text) {
  if (hasAny(text, KEYWORDS.failed)) {
    return "failed";
  }

  if (hasAny(text, KEYWORDS.pending)) {
    return "pending";
  }

  if (hasAny(text, KEYWORDS.reversed)) {
    return "reversed";
  }

  if (hasAny(text, KEYWORDS.completed)) {
    return "completed";
  }

  return null;
}

function detectCaseType(ticket) {
  const text = normalizeText(ticket.complaint);

  if (hasAny(text, KEYWORDS.phishing)) {
    return "phishing_or_social_engineering";
  }

  if (hasAny(text, KEYWORDS.duplicate)) {
    return "duplicate_payment";
  }

  if (hasAny(text, KEYWORDS.merchantSettlement)) {
    return "merchant_settlement_delay";
  }

  if (hasAny(text, KEYWORDS.agentCashIn)) {
    return "agent_cash_in_issue";
  }

  if (hasAny(text, KEYWORDS.wrongTransfer)) {
    return "wrong_transfer";
  }

  if (hasAny(text, KEYWORDS.paymentFailed)) {
    return "payment_failed";
  }

  if (hasAny(text, KEYWORDS.refund)) {
    return "refund_request";
  }

  return "other";
}

function scoreTransaction(transaction, context) {
  const score = {
    value: 0,
    reasons: [],
  };

  if (getTransactionIdFromText(context.text, transaction)) {
    score.value += 100;
    score.reasons.push("transaction_id_match");
  }

  if (amountsMatch(context.amounts, transaction.amount)) {
    score.value += 35;
    score.reasons.push("amount_match");
  }

  if (counterpartyMatches(context.originalComplaint, transaction.counterparty)) {
    score.value += 30;
    score.reasons.push("counterparty_match");
  }

  if (transactionTypeMatchesCase(context.caseType, transaction.type)) {
    score.value += 15;
    score.reasons.push("type_match");
  }

  if (normalizeText(transaction.status) === context.complaintStatus) {
    score.value += 20;
    score.reasons.push("status_match");
  }

  if (context.caseType === "wrong_transfer" && normalizeText(transaction.status) === "completed") {
    score.value += 10;
    score.reasons.push("completed_transfer");
  }

  if (context.historyLength === 1 && score.value >= 15) {
    score.value += 10;
    score.reasons.push("single_history_candidate");
  }

  return score;
}

function duplicateKey(transaction) {
  return [
    normalizeText(transaction.type),
    Number(transaction.amount),
    normalizeCounterparty(transaction.counterparty),
  ].join("|");
}

function findDuplicateTransaction(history, text) {
  const groups = new Map();

  history.forEach((transaction) => {
    if (!["payment", "transfer"].includes(normalizeText(transaction.type))) {
      return;
    }

    if (!["completed", "pending"].includes(normalizeText(transaction.status))) {
      return;
    }

    const key = duplicateKey(transaction);
    const existing = groups.get(key) || [];
    existing.push(transaction);
    groups.set(key, existing);
  });

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }

    const explicit = group.find((transaction) => getTransactionIdFromText(text, transaction));
    const sorted = group.slice().sort((a, b) => {
      return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    });

    return {
      transaction: explicit || sorted[sorted.length - 1],
      pair: sorted,
    };
  }

  return null;
}

function findRelevantTransaction(ticket, caseType) {
  const history = Array.isArray(ticket.transaction_history) ? ticket.transaction_history : [];
  const originalComplaint = ticket.complaint;
  const text = normalizeText(originalComplaint);
  const context = {
    amounts: extractAmounts(originalComplaint),
    caseType,
    complaintStatus: detectComplaintStatus(text),
    historyLength: history.length,
    originalComplaint,
    text,
  };

  if (caseType === "phishing_or_social_engineering" || history.length === 0) {
    return {
      transaction: null,
      score: 0,
      reasons: [],
      duplicate: null,
      context,
    };
  }

  const duplicate = caseType === "duplicate_payment" ? findDuplicateTransaction(history, text) : null;

  if (duplicate) {
    return {
      transaction: duplicate.transaction,
      score: 95,
      reasons: ["duplicate_pair", "transaction_match"],
      duplicate,
      context,
    };
  }

  const scored = history
    .map((transaction) => ({
      transaction,
      score: scoreTransaction(transaction, context),
    }))
    .sort((a, b) => b.score.value - a.score.value);

  const best = scored[0];

  if (!best) {
    return {
      transaction: null,
      score: 0,
      reasons: [],
      duplicate: null,
      context,
    };
  }

  const explicitIdMatch = best.score.reasons.includes("transaction_id_match");
  const threshold = context.historyLength === 1 ? 25 : 35;

  if (!explicitIdMatch && best.score.value < threshold) {
    return {
      transaction: null,
      score: best.score.value,
      reasons: best.score.reasons,
      duplicate: null,
      context,
    };
  }

  return {
    transaction: best.transaction,
    score: best.score.value,
    reasons: [...best.score.reasons, "transaction_match"],
    duplicate: null,
    context,
  };
}

function getEvidenceVerdict(caseType, transaction, duplicate) {
  if (caseType === "phishing_or_social_engineering") {
    return "insufficient_data";
  }

  if (!transaction) {
    return "insufficient_data";
  }

  const type = normalizeText(transaction.type);
  const status = normalizeText(transaction.status);

  if (caseType === "wrong_transfer") {
    if (type !== "transfer") {
      return "inconsistent";
    }

    return status === "completed" ? "consistent" : "inconsistent";
  }

  if (caseType === "payment_failed") {
    if (["failed", "pending"].includes(status)) {
      return "consistent";
    }

    return ["completed", "reversed"].includes(status) ? "inconsistent" : "insufficient_data";
  }

  if (caseType === "duplicate_payment") {
    return duplicate ? "consistent" : "inconsistent";
  }

  if (caseType === "merchant_settlement_delay") {
    if (type !== "settlement") {
      return "inconsistent";
    }

    if (["pending", "failed"].includes(status)) {
      return "consistent";
    }

    return status === "completed" || status === "reversed" ? "inconsistent" : "insufficient_data";
  }

  if (caseType === "agent_cash_in_issue") {
    if (type !== "cash_in") {
      return "inconsistent";
    }

    if (["completed", "pending"].includes(status)) {
      return "consistent";
    }

    return status === "failed" || status === "reversed" ? "inconsistent" : "insufficient_data";
  }

  if (caseType === "refund_request") {
    if (type === "refund" && ["pending", "failed"].includes(status)) {
      return "consistent";
    }

    if ((type === "refund" && status === "completed") || status === "reversed") {
      return "inconsistent";
    }

    return "consistent";
  }

  return transaction ? "consistent" : "insufficient_data";
}

function getPrimaryAmount(transaction, context) {
  if (transaction && Number.isFinite(Number(transaction.amount))) {
    return Number(transaction.amount);
  }

  return context.amounts.length ? Math.max(...context.amounts) : 0;
}

function getSeverity(caseType, evidenceVerdict, amount, promptInjectionDetected) {
  if (caseType === "phishing_or_social_engineering") {
    return "critical";
  }

  if (amount >= 50000) {
    return "critical";
  }

  if (promptInjectionDetected || evidenceVerdict === "inconsistent" || amount >= 5000) {
    return "high";
  }

  if (
    amount >= 1000 ||
    ["wrong_transfer", "payment_failed", "duplicate_payment", "merchant_settlement_delay", "agent_cash_in_issue"].includes(
      caseType
    )
  ) {
    return "medium";
  }

  return "low";
}

function getDepartment(caseType, severity, evidenceVerdict) {
  if (caseType === "phishing_or_social_engineering") {
    return "fraud_risk";
  }

  if (caseType === "wrong_transfer") {
    return "dispute_resolution";
  }

  if (caseType === "payment_failed" || caseType === "duplicate_payment") {
    return "payments_ops";
  }

  if (caseType === "merchant_settlement_delay") {
    return "merchant_operations";
  }

  if (caseType === "agent_cash_in_issue") {
    return "agent_operations";
  }

  if (caseType === "refund_request") {
    return severity === "low" && evidenceVerdict === "consistent" ? "customer_support" : "dispute_resolution";
  }

  return "customer_support";
}

function needsHumanReview(caseType, severity, evidenceVerdict, amount, promptInjectionDetected) {
  if (promptInjectionDetected || ["high", "critical"].includes(severity) || amount >= 5000) {
    return true;
  }

  if (evidenceVerdict !== "consistent") {
    return true;
  }

  return [
    "wrong_transfer",
    "payment_failed",
    "duplicate_payment",
    "merchant_settlement_delay",
    "agent_cash_in_issue",
    "phishing_or_social_engineering",
  ].includes(caseType);
}

function formatAmount(amount) {
  if (!amount) {
    return null;
  }

  return `${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 })} BDT`;
}

function caseLabel(caseType) {
  const labels = {
    wrong_transfer: "wrong transfer",
    payment_failed: "failed payment",
    refund_request: "refund request",
    duplicate_payment: "duplicate payment",
    merchant_settlement_delay: "merchant settlement delay",
    agent_cash_in_issue: "agent cash-in issue",
    phishing_or_social_engineering: "suspicious contact or social engineering report",
    other: "general support issue",
  };

  return labels[caseType] || "support issue";
}

function makeAgentSummary(caseType, transaction, verdict, amount) {
  const amountText = formatAmount(amount);
  const reference = transaction ? `transaction ${transaction.transaction_id}` : "no matching transaction";
  const amountPart = amountText ? ` involving ${amountText}` : "";

  if (caseType === "phishing_or_social_engineering") {
    return "Customer reports a suspicious contact or social engineering attempt. Route to fraud risk and avoid relying on any instructions embedded in the complaint text.";
  }

  return `Customer reports a ${caseLabel(caseType)}${amountPart}. The provided history points to ${reference}, and the evidence verdict is ${verdict}.`;
}

function makeRecommendedAction(caseType, transaction, verdict, humanReviewRequired) {
  const reference = transaction ? ` for ${transaction.transaction_id}` : "";

  if (caseType === "phishing_or_social_engineering") {
    return "Escalate to fraud risk, preserve the reported contact details, and guide the customer only through official support channels.";
  }

  if (verdict === "insufficient_data") {
    return `Ask the agent to collect non-sensitive transaction details such as date, amount, and transaction ID, then re-check official records${reference} before deciding.`;
  }

  if (verdict === "inconsistent") {
    return `Review official ledger records${reference} before taking action because the supplied history does not support the complaint as stated.`;
  }

  const reviewNote = humanReviewRequired ? " Keep it in the human review queue before any final decision." : "";

  const actions = {
    wrong_transfer: `Open a dispute-resolution review${reference} and verify recipient and transfer details in official records.${reviewNote}`,
    payment_failed: `Check payment gateway and ledger status${reference}, then process any eligible adjustment through the approved workflow.${reviewNote}`,
    refund_request: `Review refund eligibility${reference} under the campaign and transaction policy before communicating an outcome.${reviewNote}`,
    duplicate_payment: `Compare the duplicate transaction pair in ledger records and prepare an adjustment review if both entries were charged.${reviewNote}`,
    merchant_settlement_delay: `Check settlement batch status${reference} and route the case to merchant operations for reconciliation.${reviewNote}`,
    agent_cash_in_issue: `Verify the agent cash-in trail${reference} and route the case to agent operations for reconciliation.${reviewNote}`,
    other: `Review the available details${reference} and route through customer support if no specialized workflow applies.${reviewNote}`,
  };

  return actions[caseType] || actions.other;
}

function makeCustomerReply(caseType, transaction, verdict) {
  const reference = transaction ? `transaction ${transaction.transaction_id}` : "your reported issue";

  if (caseType === "phishing_or_social_engineering") {
    return "Thank you for reporting this suspicious contact. Please use only official support channels and avoid responding to unknown callers, messages, or links while our fraud risk team reviews the report.";
  }

  if (verdict === "insufficient_data") {
    if (transaction) {
      return `We have noted your concern about ${reference}, but the provided details are not enough to confirm the reported issue. An agent will review official records before any decision is made.`;
    }

    return "We have received your concern, but we could not identify a matching transaction from the provided details. Please provide non-sensitive transaction details such as transaction ID, amount, and date through official support channels.";
  }

  if (verdict === "inconsistent") {
    return `We have noted your concern about ${reference}. The available transaction history does not fully match the issue reported, so an agent will review official records before any decision is made.`;
  }

  const replies = {
    wrong_transfer: `We have noted your concern about ${reference}. Our support team will review the transfer details and advise the eligible next steps through official channels.`,
    payment_failed: `We have noted your concern about ${reference}. Our team will verify the payment status, and any eligible adjustment will be handled through official channels after review.`,
    refund_request: `We have received your refund request about ${reference}. Eligibility will be reviewed under the applicable policy, and any eligible amount will be handled through official channels.`,
    duplicate_payment: `We have noted your duplicate payment concern about ${reference}. Our team will compare the transaction records and handle any eligible adjustment through official channels after review.`,
    merchant_settlement_delay: `We have received your settlement concern about ${reference}. Merchant operations will review the settlement status and update you through official channels.`,
    agent_cash_in_issue: `We have received your cash-in concern about ${reference}. The agent transaction trail will be reviewed, and any eligible correction will be handled through official channels.`,
    other: "We have received your concern. Our support team will review the available details and respond through official channels.",
  };

  return replies[caseType] || replies.other;
}

function getConfidence(matchScore, verdict, caseType) {
  let confidence = 0.45;

  if (caseType === "phishing_or_social_engineering") {
    confidence = 0.86;
  } else if (matchScore >= 95) {
    confidence = 0.92;
  } else if (matchScore >= 70) {
    confidence = 0.88;
  } else if (matchScore >= 45) {
    confidence = 0.78;
  } else if (verdict === "insufficient_data") {
    confidence = 0.52;
  }

  if (verdict === "inconsistent") {
    confidence = Math.max(confidence, 0.75);
  }

  return Math.min(0.97, Math.max(0.1, Number(confidence.toFixed(2))));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function optionalEnumError(body, field, allowedValues) {
  if (body[field] === undefined) {
    return null;
  }

  if (typeof body[field] !== "string" || !allowedValues.has(body[field])) {
    return `${field} must be one of: ${[...allowedValues].join(", ")}.`;
  }

  return null;
}

function validateTransactionEntry(transaction, index) {
  const label = `transaction_history[${index}]`;

  if (!isPlainObject(transaction)) {
    return `${label} must be an object.`;
  }

  if (typeof transaction.transaction_id !== "string" || transaction.transaction_id.trim() === "") {
    return `${label}.transaction_id is required and must be a non-empty string.`;
  }

  if (
    typeof transaction.timestamp !== "string" ||
    transaction.timestamp.trim() === "" ||
    Number.isNaN(Date.parse(transaction.timestamp))
  ) {
    return `${label}.timestamp is required and must be a valid ISO 8601 string.`;
  }

  if (typeof transaction.type !== "string" || !VALID_TRANSACTION_TYPES.has(transaction.type)) {
    return `${label}.type must be one of: ${[...VALID_TRANSACTION_TYPES].join(", ")}.`;
  }

  if (typeof transaction.amount !== "number" || !Number.isFinite(transaction.amount) || transaction.amount < 0) {
    return `${label}.amount is required and must be a non-negative number.`;
  }

  if (typeof transaction.counterparty !== "string" || transaction.counterparty.trim() === "") {
    return `${label}.counterparty is required and must be a non-empty string.`;
  }

  if (typeof transaction.status !== "string" || !VALID_TRANSACTION_STATUSES.has(transaction.status)) {
    return `${label}.status must be one of: ${[...VALID_TRANSACTION_STATUSES].join(", ")}.`;
  }

  return null;
}

function analyzeTicket(ticket) {
  const caseType = detectCaseType(ticket);
  const promptInjectionDetected = hasAny(normalizeText(ticket.complaint), KEYWORDS.injection);
  const match = findRelevantTransaction(ticket, caseType);
  const evidenceVerdict = getEvidenceVerdict(caseType, match.transaction, match.duplicate);
  const amount = getPrimaryAmount(match.transaction, match.context);
  const severity = getSeverity(caseType, evidenceVerdict, amount, promptInjectionDetected);
  const department = getDepartment(caseType, severity, evidenceVerdict);
  const humanReviewRequired = needsHumanReview(
    caseType,
    severity,
    evidenceVerdict,
    amount,
    promptInjectionDetected
  );
  const reasonCodes = unique([
    caseType,
    evidenceVerdict,
    ...match.reasons,
    promptInjectionDetected ? "prompt_injection_ignored" : null,
    match.transaction ? null : "no_transaction_match",
    humanReviewRequired ? "human_review" : null,
  ]);

  const response = {
    ticket_id: ticket.ticket_id,
    relevant_transaction_id: match.transaction ? match.transaction.transaction_id : null,
    evidence_verdict: evidenceVerdict,
    case_type: caseType,
    severity,
    department,
    agent_summary: makeAgentSummary(caseType, match.transaction, evidenceVerdict, amount),
    recommended_next_action: makeRecommendedAction(caseType, match.transaction, evidenceVerdict, humanReviewRequired),
    customer_reply: makeCustomerReply(caseType, match.transaction, evidenceVerdict),
    human_review_required: humanReviewRequired,
    confidence: getConfidence(match.score, evidenceVerdict, caseType),
    reason_codes: reasonCodes,
  };

  assertValidEnums(response);
  return response;
}

function assertValidEnums(response) {
  if (!VALID_CASE_TYPES.has(response.case_type)) {
    throw new Error("Invalid case_type generated");
  }

  if (!VALID_DEPARTMENTS.has(response.department)) {
    throw new Error("Invalid department generated");
  }

  if (!["consistent", "inconsistent", "insufficient_data"].includes(response.evidence_verdict)) {
    throw new Error("Invalid evidence_verdict generated");
  }

  if (!["low", "medium", "high", "critical"].includes(response.severity)) {
    throw new Error("Invalid severity generated");
  }
}

function validateTicketRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      message: "Request body must be a JSON object.",
    };
  }

  if (typeof body.ticket_id !== "string" || body.ticket_id.trim() === "") {
    return {
      ok: false,
      status: 400,
      message: "ticket_id is required and must be a non-empty string.",
    };
  }

  if (typeof body.complaint !== "string") {
    return {
      ok: false,
      status: 400,
      message: "complaint is required and must be a string.",
    };
  }

  if (body.complaint.trim() === "") {
    return {
      ok: false,
      status: 422,
      message: "complaint must not be empty.",
    };
  }

  const optionalEnumMessage =
    optionalEnumError(body, "language", VALID_LANGUAGES) ||
    optionalEnumError(body, "channel", VALID_CHANNELS) ||
    optionalEnumError(body, "user_type", VALID_USER_TYPES);

  if (optionalEnumMessage) {
    return {
      ok: false,
      status: 400,
      message: optionalEnumMessage,
    };
  }

  if (body.campaign_context !== undefined && typeof body.campaign_context !== "string") {
    return {
      ok: false,
      status: 400,
      message: "campaign_context must be a string when provided.",
    };
  }

  if (body.metadata !== undefined && !isPlainObject(body.metadata)) {
    return {
      ok: false,
      status: 400,
      message: "metadata must be an object when provided.",
    };
  }

  if (body.transaction_history !== undefined && !Array.isArray(body.transaction_history)) {
    return {
      ok: false,
      status: 400,
      message: "transaction_history must be an array when provided.",
    };
  }

  const transactionHistory = Array.isArray(body.transaction_history) ? body.transaction_history : [];

  for (const [index, transaction] of transactionHistory.entries()) {
    const transactionError = validateTransactionEntry(transaction, index);

    if (transactionError) {
      return {
        ok: false,
        status: 400,
        message: transactionError,
      };
    }
  }

  return {
    ok: true,
    ticket: {
      ...body,
      ticket_id: body.ticket_id.trim(),
      complaint: body.complaint.trim(),
      transaction_history: transactionHistory,
    },
  };
}

module.exports = {
  analyzeTicket,
  validateTicketRequest,
  normalizeText,
  extractAmounts,
};

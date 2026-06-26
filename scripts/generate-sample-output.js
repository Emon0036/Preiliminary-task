const fs = require("node:fs");
const path = require("node:path");
const { analyzeTicket } = require("../lib/analyzeTicket");

const samplesDir = path.join(__dirname, "..", "samples");
const sourcePath = path.join(samplesDir, "QueueStorm_Preli_Sample_Cases.json");
const outputPath = path.join(samplesDir, "generated-public-sample-output.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getCases(samplePack) {
  if (Array.isArray(samplePack)) {
    return samplePack;
  }

  for (const key of ["cases", "sample_cases", "public_cases"]) {
    if (Array.isArray(samplePack[key])) {
      return samplePack[key];
    }
  }

  throw new Error("QueueStorm sample pack must contain a cases array.");
}

function getInputFromCase(sampleCase) {
  if (sampleCase.input && typeof sampleCase.input === "object") {
    return sampleCase.input;
  }

  if (sampleCase.request && typeof sampleCase.request === "object") {
    return sampleCase.request;
  }

  if (sampleCase.ticket_id && sampleCase.complaint) {
    return sampleCase;
  }

  throw new Error("Sample case must contain an input request object.");
}

const samplePack = readJson(sourcePath);
const [sampleCase] = getCases(samplePack);

if (!sampleCase) {
  throw new Error("QueueStorm sample pack does not contain any cases.");
}

const input = getInputFromCase(sampleCase);
const output = analyzeTicket(input);
const generated = {
  source_file: "samples/QueueStorm_Preli_Sample_Cases.json",
  case_id: sampleCase.case_id || sampleCase.id || input.ticket_id,
  generated_by: "scripts/generate-sample-output.js",
  endpoint: "POST /analyze-ticket",
  input,
  output,
};

fs.writeFileSync(outputPath, `${JSON.stringify(generated, null, 2)}\n`);
console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);

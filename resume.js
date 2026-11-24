"use strict";

const postingInput = document.getElementById("target-posting");
const resumeInput = document.getElementById("source-resume");
const draft = document.getElementById("tailored-resume");
const exportStatus = document.getElementById("export-status");
const bullet = /^\s*(?:[-*•▪–●]\s+|\d+[.)]\s+)/;
const stopWords = new Set(("and the for with from that this your you our are will have has using use used work working " +
  "strong experience ability skills years role team about preferred required qualifications requirements " +
  "build building built develop developed including across within into more can must should").split(" "));

function terms(value) {
  const normalized = value.toLowerCase()
    .replace(/\bretrieval[- ]augmented generation\b/g, "rag")
    .replace(/\blarge language models?\b|\bllms\b/g, "llm")
    .replace(/\bevaluations?\b|\bevals\b/g, "eval")
    .replace(/\bfine[- ]tun(?:e|ing)\b/g, "finetuning");
  return new Set((normalized.match(/[a-z][a-z0-9+#]{1,}/g) || [])
    .filter((word) => !stopWords.has(word) && (word.length > 2 || /^(ai|ml|go|ci|cd)$/.test(word))));
}

function requirementsFrom(posting) {
  const preferred = [];
  const required = [];
  const duties = [];
  const fallback = [];
  let section;
  for (const raw of posting.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.replace(/^#+\s*/, "").replace(/:$/, "").trim().replace(/\s+/g, " ");
    if (!bullet.test(line) && heading.length < 80) {
      if (/^preferred qualifications|^nice to have|^bonus points/i.test(heading)) {
        section = preferred;
        continue;
      }
      if (/^(?:(?:key |core |job )?responsibilities|what you(?:’|')ll (?:do|be doing)|in this role(?:,? you will)?|about (?:the |this )?role)$/i.test(heading)) {
        section = duties;
        continue;
      }
      if (/^(?:(?:minimum |basic |required )?(?:qualifications|requirements|skills)|what you(?:’|')ll (?:bring|need)|what we(?:’|')re looking for|you(?:’|')ll need to have)$/i.test(heading)) {
        section = required;
        continue;
      }
      if (/^(?:about|benefits|compensation|salary|equal opportunity|how to apply|what we offer)\b/i.test(heading)) {
        section = null;
        continue;
      }
    }
    const text = line.replace(bullet, "");
    if (text.length < 20 || terms(text).size < 2) continue;
    if (section) section.push(text);
    if (section !== null) fallback.push(text);
  }
  const priorities = [...required.slice(0, 3), ...duties.slice(0, 2), ...required.slice(3), ...duties.slice(2), ...preferred];
  return [...new Set(priorities.length ? priorities : fallback)].slice(0, 5);
}

function rankResume(resume, requirements, reviseWording = true) {
  const lines = resume.split(/\r?\n/);
  const targets = requirements.map(terms);
  const matches = lines.map((line) => {
    const words = terms(line);
    return targets.map((target) => [...target].filter((word) => words.has(word)).length);
  });
  const evidence = requirements.map((requirement, targetIndex) => {
    let best = 0;
    let line;
    matches.forEach((scores, index) => {
      if (scores[targetIndex] > best) {
        best = scores[targetIndex];
        line = lines[index].replace(bullet, "").trim();
      }
    });
    return { requirement, line };
  });
  const reordered = [];
  let revised = 0;
  const preferredWording = requirements.join(" ");
  for (let index = 0; index < lines.length;) {
    if (!bullet.test(lines[index])) {
      const original = lines[index];
      const edited = reviseWording && /^\s*(?:I |Was responsible for )/i.test(original)
        ? rewriteBullet(original, matches[index].some(Boolean) ? preferredWording : "")
        : original;
      if (edited !== original) revised += 1;
      reordered.push(edited);
      index += 1;
      continue;
    }
    const group = [];
    while (index < lines.length && bullet.test(lines[index])) {
      group.push({ text: lines[index], score: matches[index].reduce((sum, match) => sum + match, 0) });
      index += 1;
    }
    // Numbered items may depend on sequence. Reorder only unordered bullets.
    if (!group.some(({ text }) => /^\s*\d+[.)]/.test(text))) group.sort((a, b) => b.score - a.score);
    for (const { text, score } of group) {
      const edited = reviseWording ? rewriteBullet(text, score ? preferredWording : "") : text;
      if (edited !== text) revised += 1;
      reordered.push(edited);
    }
  }
  return { evidence, revised, text: reordered.join("\n") };
}

function rewriteBullet(line, jobWording) {
  const prefix = line.match(bullet)?.[0] || "";
  let text = line.slice(prefix.length).trim()
    .replace(/^I\s+/i, "")
    .replace(/^Was responsible for (building|developing|maintaining|testing|managing|designing|deploying|writing)\b/i,
      (_, verb) => ({
        building: "Built", developing: "Developed", maintaining: "Maintained", testing: "Tested",
        managing: "Managed", designing: "Designed", deploying: "Deployed", writing: "Wrote",
      })[verb.toLowerCase()])
    .replace(/\bin order to\b/gi, "to")
    .replace(/\butilized\b/gi, "used")
    .replace(/\butilizing\b/gi, "using");
  if (/\bRAG\b/i.test(jobWording)) {
    text = text.replace(/\bretrieval[- ]augmented generation\b(?!\s*\()/gi, "retrieval-augmented generation (RAG)");
  }
  if (/\bLLMs?\b/i.test(jobWording)) {
    text = text.replace(/\blarge language models?\b(?!\s*\()/gi, (phrase) =>
      `${phrase} (${phrase.toLowerCase().endsWith("s") ? "LLMs" : "LLM"})`);
  }
  return prefix + text.replace(/^[a-z]/, (letter) => letter.toUpperCase());
}

function pdfPageLines(items) {
  const lines = [];
  let current;
  let ended = false;
  for (const item of items) {
    if (!("str" in item)) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const height = Math.max(6, Math.abs(item.transform[3]), item.height || 0);
    if (item.str) {
      if (!current || ended || Math.abs(current.y - y) > Math.max(2, height * .35)) {
        current = { text: "", x, y, height, right: x };
        lines.push(current);
      }
      if (current.text && x - current.right > height * .12 && !/\s$/.test(current.text)) current.text += " ";
      current.text += item.str;
      current.right = x + item.width;
    }
    ended = item.hasEOL;
  }
  const output = [];
  let previous;
  let bulletStart;
  for (const line of lines) {
    const text = line.text.trim().replace(/^([•▪●])(?=\S)/, "$1 ");
    if (!text) continue;
    const gap = previous ? previous.y - line.y : 0;
    if (previous && gap > Math.max(previous.height, line.height) * 1.65) {
      output.push("");
      bulletStart = undefined;
    }
    if (bullet.test(text)) {
      bulletStart = line.x;
      output.push(text);
    } else if (bulletStart !== undefined && gap > 0 && line.x > bulletStart + 3 && gap <= previous.height * 1.65) {
      output[output.length - 1] += " " + text;
    } else {
      bulletStart = undefined;
      output.push(text);
    }
    previous = line;
  }
  return output.join("\n");
}

async function loadPdfReader() {
  if (window.location.protocol === "file:") {
    if (!globalThis.pdfjsLib || !globalThis.pdfjsWorker) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./vendor/pdfjs/pdf.local.min.js";
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          reject(new Error("The local PDF reader could not load. Use the published Jobbers résumé page or serve the full repository over HTTP."));
        };
        document.head.append(script);
      });
    }
    return globalThis.pdfjsLib;
  }
  const pdfReader = await import("./vendor/pdfjs/pdf.min.mjs");
  pdfReader.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", document.baseURI).href;
  return pdfReader;
}

async function readResumePdf(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error("Choose a PDF smaller than 20 MB.");
  const { getDocument } = await loadPdfReader();
  const task = getDocument({ data: await file.arrayBuffer(), isEvalSupported: false, useWasm: false });
  try {
    const pdf = await task.promise;
    const pages = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      pages.push(pdfPageLines((await page.getTextContent()).items));
    }
    const text = pages.join("\n\n").trim();
    if (!text) throw new Error("This PDF has no selectable text. Upload a text-based PDF or run OCR on the scan first.");
    return text;
  } catch (error) {
    if (error.name === "PasswordException") throw new Error("Upload a PDF that can be opened without a password.");
    if (error.name === "InvalidPDFException") throw new Error("Jobbers couldn't read this file as a PDF. Choose another PDF.");
    throw error;
  } finally {
    await task.destroy();
  }
}

try {
  const imported = JSON.parse(sessionStorage.getItem("jobbers-resume-posting"));
  if (imported?.text) {
    if (imported.hasDescription !== false) postingInput.value = imported.text;
    document.getElementById("resume-status").textContent = imported.hasDescription === false
      ? `The description for ${imported.title} was unavailable. Paste it from the employer posting.`
      : `Loaded ${imported.title}.`;
    sessionStorage.removeItem("jobbers-resume-posting");
  }
} catch {
  // Pasting a posting works without browser storage.
}

const coachingFocus = document.getElementById("coaching-focus");
const editPassage = document.getElementById("edit-passage");
let draftRequirements = [];
let suggestedPassage = "";

function showCoaching() {
  const lines = draft.value.split("\n").filter((line) => bullet.test(line));
  const priority = draftRequirements[0];
  let passage;
  let advice;
  if (coachingFocus.value === "fit") {
    const keywords = terms(priority || "");
    const score = (line) => [...terms(line)].filter((word) => keywords.has(word)).length;
    passage = lines.filter(score).sort((a, b) => score(b) - score(a))[0];
    advice = priority ? `Your target includes “${priority}”. ${passage ? "Which detail in this example best demonstrates that skill?" : "Where have you done similar work? Add a specific example if you have one."}` :
      "Choose a responsibility from the posting. Which project or experience shows you can do it?";
  } else if (coachingFocus.value === "impact") {
    passage = lines.find((line) => !/\d/.test(line)) || lines[0];
    advice = "What changed because of your work? Name the outcome, who benefited, or a result you can verify.";
  } else {
    passage = lines.slice().sort((a, b) => b.length - a.length)[0];
    advice = "Start with what you did. Keep the action and its result, then cut phrases that repeat the same idea.";
  }
  suggestedPassage = passage || "";
  const message = document.createElement("p");
  message.textContent = advice;
  const excerpt = document.createElement("blockquote");
  excerpt.textContent = suggestedPassage;
  document.getElementById("coaching-advice").replaceChildren(message, ...(passage ? [excerpt] : []));
  editPassage.textContent = passage ? "Edit this passage" : "Edit draft";
}

coachingFocus.addEventListener("change", showCoaching);
draft.addEventListener("change", showCoaching);
editPassage.addEventListener("click", () => {
  const start = draft.value.indexOf(suggestedPassage);
  draft.focus();
  if (suggestedPassage && start >= 0) draft.setSelectionRange(start, start + suggestedPassage.length);
});

const sourceSelect = document.getElementById("resume-source");
const removeStored = document.getElementById("remove-stored");
const storeResume = document.getElementById("store-resume");
const storageKey = "jobbers-saved-resume-text";

function refreshSources() {
  let available = false;
  try { available = Boolean(localStorage.getItem(storageKey)); } catch { /* PDF uploads still work. */ }
  if (!available) sourceSelect.value = "upload";
  document.getElementById("source-choice").hidden = !available;
  removeStored.hidden = !available;
  const upload = sourceSelect.value === "upload";
  document.getElementById("pdf-label").hidden = !upload;
  resumeInput.required = upload;
  storeResume.textContent = available ? "Replace saved draft in this browser" : "Save draft in this browser";
}
sourceSelect.addEventListener("change", refreshSources);
window.addEventListener("storage", refreshSources);
refreshSources();
storeResume.addEventListener("click", () => {
  const text = formattedResume().join("\n");
  if (!text) { exportStatus.textContent = "Add résumé text before saving."; return; }
  try {
    localStorage.setItem(storageKey, text);
    refreshSources();
    exportStatus.textContent = "Draft saved. Choose Use my saved draft for your next role.";
  } catch { exportStatus.textContent = "Browser storage is unavailable. Download a copy instead."; }
});
removeStored.addEventListener("click", () => {
  try {
    localStorage.removeItem(storageKey);
    refreshSources();
    document.getElementById("resume-status").textContent = "Saved copy deleted from this browser.";
    resumeInput.focus();
  } catch { document.getElementById("resume-status").textContent = "Browser storage is unavailable."; }
});

document.getElementById("resume-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = event.currentTarget.querySelector("button");
  if (submit.disabled) return;
  const reuse = sourceSelect.value === "saved";
  const status = document.getElementById("resume-status");
  if (!postingInput.value.trim()) {
    status.textContent = "Add the employer’s job posting before creating a draft.";
    postingInput.focus();
    return;
  }
  submit.disabled = true;
  resumeInput.disabled = true;
  status.textContent = reuse ? "Reading saved draft…" : "Reading your PDF…";
  const target = postingInput.value.trim();
  const requirements = requirementsFrom(target);
  if (!requirements.length && target.length <= 100 && !target.includes("\n")) requirements.push(target);
  let source;
  try {
    source = reuse ? localStorage.getItem(storageKey) : await readResumePdf(resumeInput.files[0]);
    if (!source) throw new Error("Choose a résumé PDF to continue.");
  } catch (error) {
    status.textContent = error.message || "Jobbers couldn't read this PDF.";
    return;
  } finally {
    submit.disabled = false;
    resumeInput.disabled = false;
  }
  const { evidence, revised, text } = rankResume(source, requirements);
  const items = evidence.map(({ requirement, line }) => {
    const item = document.createElement("li");
    item.className = "signal";
    const title = document.createElement("strong");
    title.textContent = requirement;
    const match = document.createElement("p");
    match.textContent = line ? `Possible evidence: ${line}` : "No matching wording found. Add evidence if you have it.";
    item.append(title, match);
    return item;
  });
  document.getElementById("requirement-matches").replaceChildren(...items);
  draft.value = text;
  resetRevision("");
  revisionRequest.value = "";
  draftRequirements = requirements;
  coachingFocus.value = "fit";
  showCoaching();
  updateResumePreview();
  exportStatus.textContent = "";
  document.getElementById("resume-results").hidden = false;
  document.getElementById("resume-status").textContent = requirements.length
    ? `Compared ${requirements.length} posting priorities. Revised ${revised} ${revised === 1 ? "line" : "lines"}.`
    : "No clear priorities were found. Paste the responsibilities or qualifications to compare them.";
  document.getElementById("draft-title").focus();
});

document.getElementById("copy-resume").addEventListener("click", async () => {
  const text = formattedResume().join("\n");
  if (!text) {
    exportStatus.textContent = "Add résumé text before copying.";
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    exportStatus.textContent = "Draft copied.";
  } catch {
    exportStatus.textContent = "Clipboard access is unavailable. Use Download text to keep the selected section order.";
  }
});

const printResume = document.getElementById("print-resume");
const templateSelect = document.getElementById("resume-template");
const fontSelect = document.getElementById("resume-font");
const spacingSelect = document.getElementById("resume-spacing");
const previewNote = document.getElementById("preview-note");
const resumeHeading = /^(?:(?:professional |work |relevant )?experience|(?:technical )?skills|(?:selected )?projects|education|(?:professional )?summary|certifications|publications|awards|volunteer experience)\s*:?$/i;

function formattedResume(template = templateSelect.value) {
  const lines = draft.value.trim() ? draft.value.trim().split(/\r?\n/) : [];
  if (template !== "projects") return lines;
  const experience = lines.findIndex((line) => /^(?:(?:professional|work|relevant) )?experience:?$/i.test(line.trim()));
  const projects = lines.findIndex((line) => /^(?:selected )?projects:?$/i.test(line.trim()));
  if (experience < 0 || projects < 0 || projects < experience) return lines;
  const nextHeading = lines.findIndex((line, index) => index > projects && resumeHeading.test(line.trim()));
  const section = lines.splice(projects, nextHeading < 0 ? lines.length - projects : nextHeading - projects);
  while (section.at(-1)?.trim() === "") section.pop();
  lines.splice(experience, 0, ...section, "");
  return lines;
}

const revisionRequest = document.getElementById("revision-request");
const revisionReview = document.getElementById("revision-review");
const revisionStatus = document.getElementById("revision-status");
let proposedDraft;

function resetRevision(message) {
  proposedDraft = undefined;
  revisionReview.hidden = true;
  revisionStatus.textContent = message;
}

document.getElementById("revision-form").addEventListener("submit", (event) => {
  event.preventDefault();
  resetRevision("");
  const request = revisionRequest.value.trim().replace(/[.!?]+$/, "");
  const emphasis = request.match(/^(?:please\s+)?(?:emphasi[sz]e|prioriti[sz]e|highlight|focus on)\s+(.+)$/i);
  const original = draft.value;
  let suggestion;
  let description;
  if (emphasis) {
    suggestion = rankResume(original, [emphasis[1]], false).text;
    description = "Bring matching bullets to the top of each list, keeping them with their original experience.";
  } else if (/^(?:please\s+)?(?:shorten|tighten|condense)\b/i.test(request)) {
    suggestion = original.split("\n").map((line) => {
      if (!bullet.test(line)) return line;
      return rewriteBullet(line, "").replace(/\bfor the purpose of\b/gi, "for")
        .replace(/\bat the present time\b/gi, "currently").replace(/\ba total of\s+/gi, "")
        .replace(/\bon a daily basis\b/gi, "daily");
    }).join("\n");
    description = "Simplify wordy phrases in your bullets.";
  } else if (/\bprojects?\b/i.test(request) && /\b(first|before experience)\b/i.test(request)) {
    suggestion = formattedResume("projects").join("\n");
    description = "Move the Projects section ahead of Experience.";
  } else {
    resetRevision("Choose a skill to emphasize, ask to shorten bullets, or ask to put projects first.");
    return;
  }
  if (suggestion.trim() === original.trim()) {
    resetRevision("No edit to suggest for this request. Try another skill or edit the draft directly.");
    return;
  }
  proposedDraft = suggestion;
  document.getElementById("revision-description").textContent = description;
  document.getElementById("revision-excerpt").textContent = suggestion;
  revisionReview.hidden = false;
  revisionStatus.textContent = "Revision ready to review.";
  document.getElementById("accept-revision").focus();
});

document.getElementById("accept-revision").addEventListener("click", () => {
  if (proposedDraft === undefined) return;
  draft.value = proposedDraft;
  showCoaching();
  updateResumePreview();
  resetRevision("Revision applied to your draft and preview.");
  revisionRequest.value = "";
  revisionRequest.focus();
});
document.getElementById("skip-revision").addEventListener("click", () => {
  resetRevision("Current draft kept.");
  revisionRequest.focus();
});
for (const field of [draft, revisionRequest, templateSelect]) {
  field.addEventListener("input", () => {
    if (!revisionReview.hidden) resetRevision("Preview a new revision using your latest changes.");
  });
}

function updateResumePreview() {
  const lines = formattedResume();
  printResume.dataset.font = fontSelect.value;
  printResume.dataset.spacing = spacingSelect.value;
  const projectsMissing = templateSelect.value === "projects" && !lines.some((line) => /^(?:selected )?projects:?$/i.test(line.trim()));
  previewNote.textContent = projectsMissing
    ? "Add a Projects heading to move that section ahead of Experience. Review page breaks in print preview."
    : "Review final page breaks in the browser’s print preview.";
  const formatted = lines.map((line, index) => {
    const text = line.trim();
    const heading = resumeHeading.test(text);
    const isName = index === 0 && !heading && !bullet.test(text) && text.length <= 80;
    const block = document.createElement(heading ? "h2" : isName ? "h1" : "p");
    if (!text) block.className = "print-space";
    block.textContent = text;
    return block;
  });
  printResume.replaceChildren(...formatted);
}

for (const control of [draft, templateSelect, fontSelect, spacingSelect]) {
  control.addEventListener("input", updateResumePreview);
}

function prepareResumePrint() {
  updateResumePreview();
  document.body.classList.toggle("printing-resume", Boolean(draft.value.trim()));
}

window.addEventListener("beforeprint", prepareResumePrint);
window.addEventListener("afterprint", () => document.body.classList.remove("printing-resume"));
document.getElementById("save-resume-pdf").addEventListener("click", () => {
  if (!draft.value.trim()) {
    exportStatus.textContent = "Add résumé text to the draft before saving a PDF.";
    draft.focus();
    return;
  }
  exportStatus.textContent = "In the print dialog, choose Save as PDF and turn off headers and footers.";
  prepareResumePrint();
  window.print();
});

document.getElementById("download-resume").addEventListener("click", () => {
  const text = formattedResume().join("\n");
  if (!text) {
    exportStatus.textContent = "Add résumé text before downloading.";
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "tailored-resume.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  exportStatus.textContent = "Draft downloaded as text.";
});

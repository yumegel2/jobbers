"use strict";

const postingInput = document.getElementById("target-posting");
const resumeInput = document.getElementById("source-resume");
const draft = document.getElementById("tailored-resume");
const exportStatus = document.getElementById("export-status");
const bullet = /^\s*(?:[-*•▪–]\s+|\d+[.)]\s+)/;
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
    const heading = line.replace(/^#+\s*/, "").replace(/:$/, "");
    if (!bullet.test(line) && heading.length < 80) {
      if (/^preferred qualifications|^nice to have|^bonus points/i.test(heading)) {
        section = preferred;
        continue;
      }
      if (/^(?:key responsibilities|responsibilities|what you(?:’|')ll do)$/i.test(heading)) {
        section = duties;
        continue;
      }
      if (/^(?:(?:minimum |required )?(?:qualifications|requirements|skills)|what you(?:’|')ll bring|what we(?:’|')re looking for)$/i.test(heading)) {
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

function rankResume(resume, requirements) {
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
  for (let index = 0; index < lines.length;) {
    if (!bullet.test(lines[index])) {
      reordered.push(lines[index++]);
      continue;
    }
    const group = [];
    while (index < lines.length && bullet.test(lines[index])) {
      group.push({ text: lines[index], score: matches[index].reduce((sum, match) => sum + match, 0) });
      index += 1;
    }
    // Numbered items may depend on sequence. Reorder only unordered bullets.
    if (!group.some(({ text }) => /^\s*\d+[.)]/.test(text))) group.sort((a, b) => b.score - a.score);
    reordered.push(...group.map(({ text }) => text));
  }
  return { evidence, text: reordered.join("\n") };
}

try {
  const imported = JSON.parse(sessionStorage.getItem("jobbers-resume-posting"));
  if (imported?.text) {
    postingInput.value = imported.text;
    document.getElementById("resume-status").textContent = `Loaded ${imported.title}.`;
    sessionStorage.removeItem("jobbers-resume-posting");
  }
} catch {
  // Pasting a posting works without browser storage.
}

document.getElementById("resume-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const requirements = requirementsFrom(postingInput.value);
  const { evidence, text } = rankResume(resumeInput.value, requirements);
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
  exportStatus.textContent = "";
  document.getElementById("resume-results").hidden = false;
  document.getElementById("resume-status").textContent = requirements.length
    ? `Compared ${requirements.length} posting priorities.`
    : "No clear priorities were found. Paste the responsibilities or qualifications to compare them.";
  document.getElementById("draft-title").focus();
});

document.getElementById("copy-resume").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(draft.value);
    exportStatus.textContent = "Draft copied.";
  } catch {
    draft.focus();
    draft.select();
    exportStatus.textContent = "Draft selected. Use your device’s copy command.";
  }
});

const printResume = document.getElementById("print-resume");
const resumeHeading = /^(?:(?:professional |work |relevant )?experience|(?:technical )?skills|(?:selected )?projects|education|(?:professional )?summary|certifications|publications|awards|volunteer experience)\s*:?$/i;

function prepareResumePrint() {
  const lines = draft.value.trim().split(/\r?\n/);
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
  const url = URL.createObjectURL(new Blob([draft.value], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "tailored-resume.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  exportStatus.textContent = "Draft downloaded as text.";
});

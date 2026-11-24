const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { resolve, sep, extname } = require("node:path");
const { pathToFileURL } = require("node:url");
const { before, after, test } = require("node:test");
const { chromium } = require("playwright");
const { PDFDocument, StandardFonts } = require("pdf-lib");

const root = resolve(__dirname, "..");
const date = new Date("2026-11-22T18:00:00Z");
const contentTypes = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".md": "text/plain",
};
let browser;
let server;
let base;

before(async () => {
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const file = resolve(root, pathname === "/" ? "index.html" : "." + pathname);
      const type = contentTypes[extname(file)];
      if (!file.startsWith(root + sep) || !type) throw new Error("File unavailable");
      const body = await readFile(file);
      response.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", done);
  });
  base = `http://127.0.0.1:${server.address().port}/`;
  const channel = process.env.JOBBERS_BROWSER_CHANNEL;
  browser = await chromium.launch(channel ? { channel } : {});
});

after(async () => {
  await browser?.close();
  if (server?.listening) await new Promise((done) => server.close(done));
});

async function newPage(t, options) {
  const context = await browser.newContext(options);
  t.after(() => context.close());
  const page = await context.newPage();
  await page.clock.setFixedTime(date);
  return page;
}

const jobTitles = [
  "Forward Deployed Engineer", "AI Solutions Architect", "Research Engineer, Model Evaluations",
  "Inference Engineer", "Research Engineer, Post-Training", "Agentic AI Engineer", "Product AI Engineer",
];
const description = '<h2>Responsibilities</h2><ul><li>Build RAG pipelines for search.</li></ul>' +
  '<h2>Qualifications</h2><ul><li>Test Python services in production.</li></ul>' +
  '<h2>Benefits</h2><ul><li>Health insurance</li><li>Paid leave</li><li>Retirement plan</li><li>Dental care</li></ul>' +
  '<script>document.body.dataset.feedScript = "ran";</script>';

function ashbyJob(title, id, location = "Midtown, Manhattan, NY") {
  return {
    title, location, jobUrl: `https://jobs.example.com/${id}`, applyUrl: `https://jobs.example.com/${id}/apply`,
    publishedAt: "2026-11-21T18:00:00Z", workplaceType: "Hybrid", isListed: true,
    compensation: { compensationTierSummary: "$150,000–$200,000" }, descriptionHtml: description,
  };
}

async function mockFeeds(page, state = {}) {
  await page.route(/https:\/\/(api\.ashbyhq\.com|api\.lever\.co|boards-api\.greenhouse\.io)\//, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (state.fail || (state.failOpenAI && path.endsWith("/openai"))) {
      await route.fulfill({ status: 503, body: "Offline" });
      return;
    }
    let body = { jobs: [] };
    if (path.endsWith("/openai")) {
      body.jobs = [
        ...jobTitles.map((title, id) => ashbyJob(title, id)),
        ...Array.from({ length: 26 }, (_, index) => ashbyJob(`AI Platform Engineer ${index}`, `extra-${index}`)),
        ashbyJob("AI Engineer in Princeton", "outside", "Princeton, NJ"),
        ashbyJob("AI Engineer in London", "london", "London"),
        { ...ashbyJob("Unlisted AI Engineer", "hidden"), isListed: false },
        { ...ashbyJob("AI Engineer with secondary office", "secondary", "London"), secondaryLocations: [{ location: "Jersey City, NJ" }] },
      ];
      if (state.newJob) body.jobs.push(ashbyJob("New AI Engineer, Search", "new"));
    } else if (path.endsWith("/databricks/jobs")) {
      body.jobs = [{ id: 1, title: "AI Engineer, Search", location: { name: "White Plains, NY; London" }, absolute_url: "https://jobs.example.com/greenhouse", content: description }];
    } else if (path.endsWith("/palantir")) {
      body = [{
        id: "lever", text: "Forward Deployed AI Engineer",
        categories: { location: "New York City", allLocations: ["New York City", "Hoboken, NJ"] },
        hostedUrl: "https://jobs.example.com/lever", workplaceType: "on-site",
        lists: [{ text: "Responsibilities", content: "<li>Deploy customer AI systems.</li>" }],
      }];
    }
    await route.fulfill({ json: body, headers: { "Access-Control-Allow-Origin": "*" } });
  });
}

async function waitForFeeds(page) {
  await page.getByText(/12 of 12 boards updated/).waitFor();
}

test("job feeds, seven role filters, metro and ZIP search, and keyboard pagination", async (t) => {
  const page = await newPage(t);
  await mockFeeds(page);
  await page.goto(base);
  await waitForFeeds(page);
  const roles = page.locator("#role");
  const filters = await roles.locator("option").evaluateAll((options) => options.map((option) => option.value).slice(1));
  assert.equal(filters.length, 7);
  for (const role of filters) {
    await roles.selectOption(role);
    assert.ok(await page.locator(".job").count(), role);
    assert.ok((await page.locator(".job .meta").allTextContents()).every((label) => label.startsWith(role)));
  }
  await roles.selectOption("");
  await page.getByRole("button", { name: "Show more jobs" }).press("Enter");
  const keys = await page.locator(".job").evaluateAll((cards) => cards.map((card) => card.dataset.jobKey));
  assert.ok(keys.length > 25);
  assert.equal(new Set(keys).size, keys.length);
  assert.match(await page.locator(":focus").textContent(), /View details/);

  await page.locator("#location-area").selectOption("suburbs");
  assert.match(await page.locator("#job-list").innerText(), /White Plains, NY/);
  assert.match(await page.locator("#job-list").innerText(), /Jersey City, NJ/);
  assert.doesNotMatch(await page.locator("#job-list").innerText(), /Midtown|Princeton|London|Unlisted/);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.locator("#zip-code").fill("10001");
  await page.locator("#zip-radius").selectOption("5");
  await page.getByRole("button", { name: "Find nearby jobs" }).click();
  await page.getByRole("button", { name: "Remove filter: Within 5 mi of 10001" }).waitFor();
  assert.match(await page.locator("#job-list").innerText(), /mi away/);
  assert.equal(await page.locator("#sort").inputValue(), "distance");
  await page.locator("#zip-code").fill("94103");
  await page.getByRole("button", { name: "Find nearby jobs" }).click();
  assert.match(await page.locator("#results").innerText(), /No matching roles/);
});

test("save and reload, refreshed discoveries, filters, and cached feed errors", async (t) => {
  const page = await newPage(t);
  const state = {};
  await mockFeeds(page, state);
  await page.goto(base);
  await waitForFeeds(page);
  await page.locator("#search").fill("Forward Deployed");
  await page.locator("#workplace").selectOption("Hybrid");
  await page.locator("#published").selectOption("7");
  assert.equal(await page.locator(".job").count(), 1);
  await page.locator(".save-job[aria-pressed=false]").click();
  await page.reload();
  await waitForFeeds(page);
  await page.locator("#saved-only").check();
  assert.equal(await page.locator(".job").count(), 1);
  await page.locator("#saved-only").uncheck();
  state.newJob = true;
  await page.getByRole("button", { name: "Refresh jobs" }).click();
  await waitForFeeds(page);
  await page.locator("#new-only").check();
  assert.equal(await page.locator(".job").count(), 1);
  assert.match(await page.locator(".job").innerText(), /New AI Engineer, Search/);
  await page.locator("#new-only").uncheck();
  state.failOpenAI = true;
  await page.getByRole("button", { name: "Refresh jobs" }).click();
  await page.getByText(/Unavailable: OpenAI/).waitFor();
  await page.locator("#saved-only").check();
  assert.match(await page.locator(".job .meta").innerText(), /Cached/);
});

test("job details show all benefits, close by Escape or backdrop, and transfer the posting", async (t) => {
  const page = await newPage(t);
  await mockFeeds(page);
  await page.goto(base);
  await waitForFeeds(page);
  await page.locator("#search").fill("Product AI Engineer");
  const button = page.getByRole("button", { name: "View details for Product AI Engineer", exact: true });
  await button.click();
  const dialog = page.getByRole("dialog");
  const benefits = dialog.getByRole("heading", { name: "Benefits", exact: true });
  assert.equal(await benefits.evaluate((heading) => heading.nextElementSibling.children.length), 4);
  assert.equal(await page.locator("body").getAttribute("data-feed-script"), null);
  assert.equal(await dialog.getByRole("link", { name: "Apply on employer site" }).getAttribute("href"), "https://jobs.example.com/6/apply");
  await dialog.locator("summary").click();
  assert.ok(await dialog.locator("#detail-description").isVisible());
  await page.keyboard.press("Escape");
  assert.equal(await button.evaluate((element) => element === document.activeElement), true);
  await button.click();
  await page.mouse.click(2, 2);
  await dialog.waitFor({ state: "hidden" });
  await button.click();
  await dialog.getByRole("link", { name: "Tailor your résumé" }).click();
  await page.getByText(/Loaded Product AI Engineer/).waitFor();
  assert.match(await page.locator("#target-posting").inputValue(), /Build RAG pipelines/);
});

test("early signals render their sources and report an unavailable document", async (t) => {
  const page = await newPage(t);
  await page.goto(base + "signals.html");
  await page.locator("#signal-list article").first().waitFor();
  const cards = page.locator("#signal-list article");
  assert.ok(await cards.count());
  assert.match(await cards.first().getByRole("link").first().getAttribute("href"), /^https:\/\//);
  await page.route("**/doc/Early_Hiring_Signals.md", (route) => route.abort());
  await page.reload();
  await page.getByText(/Research notes could not be loaded/).waitFor();
  assert.equal(await cards.count(), 0);
});

test("an unavailable job board can recover from the results area on mobile", async (t) => {
  const page = await newPage(t, { viewport: { width: 320, height: 740 } });
  const state = { fail: true };
  await mockFeeds(page, state);
  await page.goto(base);
  await page.locator("#search").fill("Product AI Engineer");
  await page.getByText("Employer feeds unavailable.", { exact: true }).waitFor();
  state.fail = false;
  await page.getByRole("button", { name: "Retry feeds" }).click();
  await waitForFeeds(page);
  assert.equal(await page.locator("#search").inputValue(), "Product AI Engineer");
  assert.equal(await page.locator(".job").count(), 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
});

async function samplePdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const lines = [
    "Taylor Example", "Experience", "- Wrote documentation.",
    "- Was responsible for building retrieval-augmented generation pipelines in order to improve search.",
    "Selected Projects", "- Tested a Python service.", "Education", "BS Computer Science",
  ];
  lines.forEach((text, index) => page.drawText(text, { x: 48, y: 740 - index * 14, size: 10, font }));
  return Buffer.from(await pdf.save());
}

async function tailorPdf(page) {
  await page.locator("#target-posting").fill("Basic qualifications:\n- Experience testing Python services.\nWhat you'll be doing:\n- Build RAG pipelines for search.");
  await page.locator("#source-resume").setInputFiles({ name: "sample.pdf", mimeType: "application/pdf", buffer: await samplePdf() });
  await page.getByRole("button", { name: "Create tailored draft" }).click();
  await page.getByRole("heading", { name: "Your tailored draft" }).waitFor();
  assert.equal(await page.locator("#requirement-matches li").count(), 2);
  assert.match(await page.locator("#tailored-resume").inputValue(), /Experience\n- Built retrieval-augmented generation \(RAG\) pipelines to improve search\./);
}

test("PDF upload, tailoring, editable templates, text download, and printable PDF", async (t) => {
  const page = await newPage(t, { viewport: { width: 390, height: 844 } });
  await page.goto(base + "resume.html");
  await tailorPdf(page);
  await page.locator("#coaching-focus").selectOption("wording");
  const passage = await page.locator("#coaching-advice blockquote").innerText();
  await page.getByRole("button", { name: "Edit this passage" }).click();
  assert.equal(await page.locator("#tailored-resume").evaluate(
    (field) => field.value.slice(field.selectionStart, field.selectionEnd)
  ), passage);
  await page.locator("#resume-template").selectOption("projects");
  await page.locator("#resume-font").selectOption("serif");
  await page.locator("#resume-spacing").selectOption("compact");
  assert.deepEqual(await page.locator("#print-resume h2").allTextContents(), ["Selected Projects", "Experience", "Education"]);
  assert.equal(await page.locator("#print-resume").getAttribute("data-font"), "serif");
  assert.equal(await page.locator("#print-resume").getAttribute("data-spacing"), "compact");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download text" }).click();
  const text = await readFile(await (await download).path(), "utf8");
  assert.ok(text.indexOf("Selected Projects") < text.indexOf("Experience"));

  const pdf = await page.pdf();
  const printText = await page.evaluate(async (bytes) => {
    const { getDocument, GlobalWorkerOptions } = await import("./vendor/pdfjs/pdf.min.mjs");
    GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", location.href).href;
    const task = getDocument({ data: Uint8Array.from(bytes) });
    try {
      const rendered = await task.promise;
      const pages = [];
      for (let index = 1; index <= rendered.numPages; index++) {
        pages.push((await (await rendered.getPage(index)).getTextContent()).items.map((item) => item.str).join(" "));
      }
      return pages.join(" ");
    } finally {
      await task.destroy();
    }
  }, Array.from(pdf));
  assert.match(printText, /Taylor Example/);
  assert.ok(printText.indexOf("Selected Projects") < printText.indexOf("Experience"));
  assert.doesNotMatch(printText, /Jobbers|Template and styling|Create tailored draft/);
  await page.locator("#tailored-resume").fill("");
  await page.getByRole("button", { name: "Save as PDF" }).click();
  assert.match(await page.locator("#export-status").innerText(), /Add résumé text/);
});

test("preview, decline and apply requests, then reuse and delete a saved résumé", async (t) => {
  const page = await newPage(t, { viewport: { width: 390, height: 844 } });
  await page.goto(base + "resume.html");
  await tailorPdf(page);
  const draft = page.locator("#tailored-resume");
  const request = page.locator("#revision-request");
  const before = await draft.inputValue();
  const preview = async (command) => {
    await request.fill(command);
    await page.getByRole("button", { name: "Preview revision" }).click();
  };
  await preview("emphasize documentation");
  assert.equal(await draft.inputValue(), before);
  assert.match(await page.locator("#revision-excerpt").innerText(), /Experience\n- Wrote documentation/);
  await page.locator("#skip-revision").click();
  assert.equal(await draft.inputValue(), before);
  await preview("put projects first");
  await page.locator("#accept-revision").click();
  assert.equal((await page.locator("#print-resume h2").allTextContents())[0], "Selected Projects");
  await draft.fill((await draft.inputValue()).replace("Wrote documentation.", "Wrote documentation on a daily basis."));
  await preview("shorten my bullets");
  await draft.fill((await draft.inputValue()) + "\n- Added a release note.");
  assert.ok(await page.locator("#revision-review").isHidden());
  await preview("shorten my bullets");
  await page.locator("#accept-revision").click();
  assert.match(await draft.inputValue(), /documentation daily\./);
  await page.locator("#store-resume").click();
  await page.reload();
  await page.locator("#resume-source").selectOption("saved");
  await page.locator("#target-posting").fill("Python engineer");
  await page.getByRole("button", { name: "Create tailored draft" }).click();
  await page.locator("#draft-title").waitFor();
  assert.match(await draft.inputValue(), /documentation daily\./);
  assert.match(await page.locator("#requirement-matches").textContent(), /Python engineer/);
  await page.locator("#remove-stored").click();
  await page.reload();
  assert.ok(await page.locator("#resume-source").isHidden());
});

test("PDF processing also works when the résumé page is opened from disk", async (t) => {
  const page = await newPage(t);
  await page.goto(pathToFileURL(resolve(root, "resume.html")).href);
  await tailorPdf(page);
});

test("invalid or image-only PDFs give feedback and allow another upload", async (t) => {
  const page = await newPage(t);
  await page.goto(base + "resume.html");
  await page.locator("#target-posting").fill("Responsibilities:\n- Build RAG pipelines for search.");
  const input = page.locator("#source-resume");
  const submit = page.getByRole("button", { name: "Create tailored draft" });
  await input.setInputFiles({ name: "broken.pdf", mimeType: "application/pdf", buffer: Buffer.from("Not a PDF") });
  await submit.click();
  await page.getByText(/couldn't read this file as a PDF/).waitFor();
  const empty = await PDFDocument.create();
  empty.addPage();
  await input.setInputFiles({ name: "no-text.pdf", mimeType: "application/pdf", buffer: Buffer.from(await empty.save()) });
  await submit.click();
  await page.getByText(/This PDF has no selectable text/).waitFor();
  await tailorPdf(page);
});
test("mobile filters remain keyboard accessible and all pages fit narrow viewports", async (t) => {
  const page = await newPage(t, { viewport: { width: 320, height: 740 } });
  await mockFeeds(page);
  await page.goto(base);
  await waitForFeeds(page);
  const summary = page.locator(".filter-options summary");
  assert.equal(await page.locator("#role").isVisible(), false);
  await summary.press("Enter");
  await page.locator("#workplace").selectOption("Hybrid");
  await summary.press("Enter");
  await page.getByRole("button", { name: "Remove filter: Hybrid" }).click();
  assert.equal(await summary.evaluate((node) => node === document.activeElement), true);
  for (const path of ["", "signals.html", "resume.html"]) {
    await page.goto(base + path);
    assert.equal(await page.locator("nav [aria-current=page]").count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path);
  }
});

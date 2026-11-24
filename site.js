"use strict";

const boards = [
  { company: "Databricks", slug: "databricks", provider: "greenhouse" },
  { company: "Together AI", slug: "togetherai", provider: "greenhouse" },
  { company: "Fireworks AI", slug: "fireworks", provider: "ashby" },
  { company: "OpenAI", slug: "openai", provider: "ashby" },
  { company: "Anthropic", slug: "anthropic", provider: "greenhouse" },
  { company: "Scale AI", slug: "scaleai", provider: "greenhouse" },
  { company: "Turing", slug: "turing", provider: "greenhouse" },
  { company: "Harvey", slug: "harvey", provider: "ashby" },
  { company: "LangChain", slug: "langchain", provider: "ashby" },
  { company: "Perplexity", slug: "perplexity", provider: "ashby" },
  { company: "Palantir", slug: "palantir", provider: "lever" },
  { company: "GenScript", slug: "genscript", provider: "greenhouse" },
];

// Employer postings checked individually. Hide them after the review window.
const reviewedMetroJobs = [
  {
    id: "verizon-r1101071", company: "Verizon", title: "Senior Agentic AI Engineer",
    location: "Basking Ridge, NJ", role: "Agentic AI Engineer", workplace: "Hybrid",
    compensation: "$101,000–$194,000 annually",
    url: "https://mycareer.verizon.com/jobs/r-1101071/senior-agentic-ai-engineer/",
    summary: "Design and deploy multi-agent systems, connect LLMs to enterprise tools, and build RAG and agent memory. The posting lists at least three office days per week and a November 28 application deadline.",
  },
  {
    id: "citi-261001616", company: "Citi", title: "AI Engineer – Startups & Partnerships",
    location: "Jersey City, NJ", role: "AI Engineer (Product & Application)", workplace: "Hybrid",
    published: Date.parse("2026-10-19T00:00:00-04:00"), compensation: "$142,320–$213,480 annually",
    url: "https://jobs.citi.com/job/jersey-city/ai-engineer-startups-and-partnerships/287/102161067024",
    summary: "Build and ship full-stack LLM applications and agent workflows for business teams. The role asks for experience deploying AI products in production and integrating backend services and APIs.",
  },
  {
    id: "jpmc-210762503", company: "JPMorganChase", title: "AI Engineer – Lead Software Engineer",
    location: "Jersey City, NJ", role: "AI Engineer (Product & Application)",
    published: Date.parse("2026-10-09T00:00:00-04:00"), compensation: "$156,750–$215,000 base annually",
    url: "https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1002/job/210762503/",
    summary: "Lead architecture and implementation for enterprise LLM applications and agent platforms. Own technical decisions on evaluation, observability, and deployment reliability.",
  },
  {
    id: "ey-1444423933", company: "EY", title: "AI Execution Analyst and Reporting Lead",
    location: "Hoboken, NJ", role: "Agentic AI Engineer",
    url: "https://careers.ey.com/ey/job/Hoboken-AI-Execution-Analyst-and-Reporting-Lead-1-1-1-NJ-07030/1444423933/",
    summary: "Build and operate Claude-based reporting agents with Python and enterprise automation tools. Define how agent outputs are verified and when a workflow should escalate to a person.",
  },
  {
    id: "regeneron-r50147", company: "Regeneron", title: "Lead AI Engineer",
    location: "Tarrytown, NY; Sleepy Hollow, NY", role: "AI Engineer (Product & Application)", workplace: "On-site",
    compensation: "$109,900–$179,300 annually",
    url: "https://careers.regeneron.com/en/jobs/r50147/lead-ai-engineer/",
    summary: "Build enterprise AI capabilities and operate the multi-model LLM gateway, including routing, access control and observability.",
  },
].map((job) => ({
  published: 0, ...job, reviewed: "Nov 21, 2026", expires: Date.parse("2026-11-28T00:00:00-05:00"),
}));

const roles = [
  ["Forward Deployed Engineer", /forward[- ]deploy|\bfds?e\b|deployed (?:software )?engineer/],
  ["AI Solutions Engineer / Architect", /ai deployment strategist|ai field engineer|applied ai architect|deployed architect|solutions? (?:engineer|architect).*\b(?:ai|ml|llms?|genai)\b|\b(?:ai|ml|llms?|genai)\b.*solutions? (?:engineer|architect)/],
  ["AI Evaluation Engineer", /\bevals?\b|evaluations?|benchmark/],
  ["Inference & AI Systems Engineer", /inference|model (serving|runtime)|\bgpus?\b|accelerator|cuda|triton|\btpus?\b|\bai systems\b/],
  ["Post-Training & Alignment Engineer", /post[- ]?training|alignment|reinforcement learning|\brl\b|fine[- ]?tuning|preference (?:learning|optimization)/],
  ["Agentic AI Engineer", /agentic|\bagents?\b|agent engineering|agent infrastructure/],
  ["AI Engineer (Product & Application)", /\bai[- ](?:engineer|product|application|platform|enablement)|applied ai|\b(?:llms?|genai|rag|genie)\b|generative ai|foundation models?/],
];

function classifyRole(title, team = "") {
  if (!/engineer|architect|scientist|researcher|member of technical staff|ai deployment strategist/i.test(title)) return undefined;
  return roles.find(([, pattern]) => pattern.test(title.toLowerCase()))?.[0] ||
    roles.find(([, pattern]) => pattern.test(team.toLowerCase()))?.[0];
}

const storageKey = "jobbers-feed-history-v1";
const savedJobsKey = "jobbers-saved-jobs-v1";
const day = 24 * 60 * 60 * 1000;
const week = 7 * day;
const pageSize = 25;
const byId = (id) => document.getElementById(id);
const refresh = byId("refresh");
const search = byId("search");
const zipCode = byId("zip-code");
const zipRadius = byId("zip-radius");
const zipStatus = byId("zip-status");
const role = byId("role");
const workplace = byId("workplace");
const sort = byId("sort");
const published = byId("published");
const newOnly = byId("new-only");
const savedOnly = byId("saved-only");
const status = byId("feed-status");
const more = byId("more");
const jobDetails = byId("job-details");
const locationArea = byId("location-area");
const filterControls = [role, locationArea, workplace, published, newOnly, savedOnly];
let zipCoordinates;
let nearby;
let zipRequest = 0;
let detailsOpener;
let announcementTimer;
let feedPending = false;
let limit = pageSize;
let historyByBoard = {};
let savedJobs = new Set();

try {
  historyByBoard = JSON.parse(localStorage.getItem(storageKey)) || {};
} catch {
  // Keep tracking within this session if browser storage is unavailable.
}
try {
  savedJobs = new Set(JSON.parse(localStorage.getItem(savedJobsKey)) || []);
} catch {
  // Keep saved jobs in memory when storage is unavailable.
}

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function sourceLink(label, url) {
  const link = element("a", label);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const metroCounties = {
  NY: { bronx: "36005", kings: "36047", nassau: "36059", "new york": "36061", putnam: "36079", queens: "36081", richmond: "36085", rockland: "36087", suffolk: "36103", westchester: "36119" },
  NJ: { bergen: "34003", essex: "34013", hudson: "34017", hunterdon: "34019", middlesex: "34023", monmouth: "34025", morris: "34027", ocean: "34029", passaic: "34031", somerset: "34035", sussex: "34037", union: "34039" },
};
const metroAliases = Object.fromEntries([
  ["10001", "new york city|new york|nyc|manhattan|nyc metro|new york metro|greater new york|chelsea|hudson yards"],
  ["10036", "midtown|midtown manhattan|times square|hell's kitchen"],
  ["10003", "flatiron|flatiron district|union square|east village|gramercy"],
  ["10012", "soho|noho|greenwich village"], ["10013", "tribeca"], ["10004", "financial district|fidi|lower manhattan"],
  ["10014", "west village"], ["10011", "meatpacking district"], ["10005", "wall street"],
  ["10280", "battery park city"], ["10024", "upper west side"], ["10028", "upper east side"],
  ["10027", "harlem"], ["11201", "brooklyn|downtown brooklyn|dumbo|brooklyn heights"],
  ["11211", "williamsburg"], ["11222", "greenpoint"], ["11205", "brooklyn navy yard"], ["11220", "sunset park"],
  ["11217", "fort greene|boerum hill"], ["11215", "park slope|gowanus"], ["11237", "bushwick"],
  ["11101", "long island city|lic"], ["11103", "astoria"], ["11354", "flushing"], ["11375", "queens|forest hills"],
  ["11432", "jamaica"], ["10451", "bronx|the bronx"], ["10454", "mott haven"],
  ["10458", "fordham"], ["10471", "riverdale"], ["10463", "kingsbridge"], ["10474", "hunts point"],
  ["10301", "staten island|st. george"], ["10304", "stapleton"], ["10306", "new dorp"], ["10307", "tottenville"],
  ["11772", "long island"], ["07078", "short hills, nj"], ["10577", "purchase, ny"], ["11747", "melville, ny"],
  ["11753", "jericho, ny"], ["11530", "garden city, ny"], ["11553", "uniondale, ny"],
  ["11788", "hauppauge, ny"], ["11790", "stony brook, ny"], ["10591", "tarrytown, ny|sleepy hollow, ny"],
  ["07920", "basking ridge, nj"],
].flatMap(([zip, names]) => names.split("|").map((name) => [name, zip])));

const nycLabel = "New York City";
const boroughCounties = new Set(["36005", "36047", "36061", "36081", "36085"]);
const locationAreaLabels = { nyc: "NYC", suburbs: "NYC metro outside the city" };
const nycPlaceNames = {
  "new york": nycLabel, "new york city": nycLabel, nyc: nycLabel,
  "new york metro": "NYC metro", "nyc metro": "NYC metro", "greater new york": "NYC metro",
  "midtown manhattan": "Midtown", "the bronx": "The Bronx",
  lic: "Long Island City", dumbo: "DUMBO", fidi: "Financial District",
  soho: "SoHo", noho: "NoHo", tribeca: "Tribeca",
  "st. george": "St. George",
};

function placeName(name) {
  return Object.hasOwn(nycPlaceNames, name)
    ? nycPlaceNames[name]
    : name.replace(/(^|[ -])([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

function metroLocation(location) {
  let text = location.toLowerCase().replace(/\u2019/g, "'").trim()
    .replace(/^(?:us|usa|united states)\s*[-\u2013\u2014,:]\s*/, "")
    .replace(/\s*[, ]\s*(?:united states|usa|us)$/, "")
    .replace(/\s*\((?:hybrid|remote|on.site)\)$/, "")
    .replace(/^(?:hybrid|remote|on.site)\s*[-\u2013\u2014,:]\s*/, "")
    .replace(/^(?:hybrid|remote|on.site)\s+(?=\w)/, "")
    .replace(/\s*-\s*(?:hybrid|remote|on.site)$/, "");
  const postal = text.match(/\s+(\d{5})(?:-\d{4})?$/);
  if (postal) text = text.slice(0, postal.index).trim();
  const stateMatch = text.match(/(?:,\s*|\s+)(ny|nj|new york|new jersey)$/);
  let state;
  if (stateMatch && text !== "new york") {
    state = /^(nj|new jersey)$/.test(stateMatch[1]) ? "NJ" : "NY";
    text = text.slice(0, stateMatch.index).trim();
  }
  text = text.replace(/\s+metropolitan area$|\s+metro area$/, " metro")
    .replace(/^(?:city|township|town|borough|village) of /, "")
    .replace(/ (?:city|township|town|borough|village)$/, (suffix) =>
      Object.hasOwn(metroAliases, text) || text === "jersey city" ? suffix : "");
  const nycArea = "(?:new york(?: city)?|nyc|manhattan|brooklyn|queens|(?:the )?bronx|staten island)";
  const specific = text.match(new RegExp(`^${nycArea} \\((.+)\\)$`))?.[1]
    || text.match(new RegExp(`^(.+?),? +${nycArea}$`))?.[1];
  if (state !== "NJ" && specific && Object.hasOwn(metroAliases, specific) && metroAliases[specific].startsWith("1")) {
    text = specific;
  }
  const qualified = state ? `${text}, ${state.toLowerCase()}` : text;
  const alias = Object.hasOwn(metroAliases, qualified) ? metroAliases[qualified]
    : state !== "NJ" && Object.hasOwn(metroAliases, text) ? metroAliases[text] : undefined;
  if (alias) {
    const stateQualified = state && Object.hasOwn(metroAliases, qualified);
    const display = stateQualified ? `${placeName(text)}, ${state}` : placeName(text);
    const area = display === "NYC metro" ? undefined
      : stateQualified || text === "long island" ? "suburbs" : "nyc";
    return { zip: postal?.[1] || alias, display, area };
  }

  const parts = text.split(/,\s*/);
  const [name, qualifier] = parts;
  if (parts.length > 2 || (qualifier && !qualifier.endsWith(" county"))) return null;
  const countyName = (qualifier || name).replace(/ county$/, "");
  const candidates = state ? [state] : ["NY", "NJ"];
  if (name.endsWith(" county")) {
    const counties = candidates.map((code) => metroCounties[code][countyName]).filter(Boolean);
    if (counties.length !== 1) return null;
    const county = counties[0];
    return {
      county, display: `${placeName(countyName)} County, ${county.startsWith("36") ? "NY" : "NJ"}`,
      area: boroughCounties.has(county) ? "nyc" : "suburbs",
    };
  }
  if (!state && !qualifier && !["jersey city", "hoboken"].includes(name)) return null;
  for (const code of candidates) {
    if (!Object.hasOwn(metroPlaces[code], name)) continue;
    const [hasOutsideMatch, entries] = metroPlaces[code][name];
    const matches = qualifier ? entries.filter(([county]) => county === metroCounties[code][countyName])
      : hasOutsideMatch ? [] : entries;
    if (matches.length === 1) return {
      zip: postal?.[1], point: matches[0].slice(1), display: `${placeName(name)}, ${code}`,
      area: boroughCounties.has(matches[0][0]) ? "nyc" : "suburbs",
    };
  }
  return null;
}

function metroLocations(location) {
  if (typeof location !== "string") return [];
  return location
    .replace(/\b(?:US|USA|United States)\s+[-\u2013\u2014]\s+/gi, "")
    .replace(/\b(?:Remote|Hybrid|On.site)\s+[-\u2013\u2014]\s+/gi, "")
    .replace(/\s+[-\u2013\u2014]\s+(?:Remote|Hybrid|On.site)(?=\s*(?:[;|/\u00b7\u2022]|$))/gi, "")
    .split(/\s*[;|/\u00b7\u2022]\s*|\s+[-\u2013\u2014]\s+/u)
    .map((label) => ({ label: label.trim(), match: metroLocation(label) }))
    .filter(({ match }) => match);
}

async function getBoard(board) {
  const ashby = board.provider === "ashby";
  const lever = board.provider === "lever";
  const url = ashby
    ? `https://api.ashbyhq.com/posting-api/job-board/${board.slug}?includeCompensation=true`
    : lever ? `https://api.lever.co/v0/postings/${board.slug}?mode=json`
    : `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (!response.ok) throw new Error(`Job board returned ${response.status}`);
  const data = await response.json();
  const postings = lever ? data : data.jobs;
  if (!Array.isArray(postings)) throw new Error("Missing job list");
  const jobs = new Map();
  for (const posting of postings) {
    const title = lever ? posting.text : posting.title;
    if (posting.isListed === false || typeof title !== "string") continue;
    const url = httpsUrl(ashby ? posting.jobUrl : lever ? posting.hostedUrl : posting.absolute_url);
    const teams = ashby ? [posting.team, posting.department]
      : lever ? [posting.categories?.team, posting.categories?.department]
      : (posting.departments ?? []).map((department) => department.name);
    const role = classifyRole(title, teams.filter(Boolean).join(" "));
    const locations = ashby
      ? [posting.location, ...(posting.secondaryLocations ?? []).map((entry) => entry.location)]
      : lever ? [posting.categories?.location, ...(posting.categories?.allLocations ?? [])] : [posting.location?.name];
    const location = [...new Set(locations.flatMap(metroLocations).map(({ label }) => label))].join(" · ");
    if (!url || !role || !location) continue;
    const id = String(posting.id ?? url);
    jobs.set(id, {
      id, url, role, company: board.company, title,
      location,
      published: ashby ? Date.parse(posting.publishedAt) || 0 : 0,
      workplace: { OnSite: "On-site", Remote: "Remote", Hybrid: "Hybrid", "on-site": "On-site", remote: "Remote", hybrid: "Hybrid" }[posting.workplaceType],
      compensation: ashby ? posting.compensation?.compensationTierSummary : lever ? posting.salaryDescriptionPlain : undefined,
      descriptionHtml: ashby ? posting.descriptionHtml : lever ? leverDescription(posting) : posting.content,
      descriptionText: ashby || lever ? posting.descriptionPlain : undefined,
      applyUrl: ashby || lever ? httpsUrl(posting.applyUrl) : undefined,
    });
  }
  return [...jobs.values()];
}

function leverDescription(posting) {
  const escape = (value) => String(value ?? "").replace(/[&<>]/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]);
  const sections = (posting.lists ?? []).map(({ text, content }) =>
    `<h3>${escape(text)}</h3><ul>${content ?? ""}</ul>`);
  return [posting.description, ...sections, posting.additional, posting.salaryDescription].filter(Boolean).join("");
}

function employerDescription(job) {
  const template = document.createElement("template");
  template.innerHTML = job.descriptionHtml || "";
  // Greenhouse can return the HTML entity-encoded.
  if (!template.content.firstElementChild && /^\s*<[a-z]/i.test(template.content.textContent)) {
    template.innerHTML = template.content.textContent;
  }
  const allowed = new Set(["p", "div", "br", "ul", "ol", "li", "strong", "b", "em", "i", "blockquote", "hr", "table", "thead", "tbody", "tr", "th", "td", "a"]);
  const discarded = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "template"]);
  function copy(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    const fragment = document.createDocumentFragment();
    if (node.nodeType !== Node.ELEMENT_NODE || discarded.has(node.localName)) return fragment;
    const tag = node.localName;
    const standaloneBold = ["p", "div"].includes(tag) && node.children.length === 1 &&
      ["strong", "b"].includes(node.firstElementChild.localName) &&
      node.firstElementChild.textContent.trim() === node.textContent.trim();
    const heading = /^h[1-6]$/.test(tag) || standaloneBold;
    const label = node.textContent.trim();
    const section = [
      [/^(responsibilities|what you.ll do|in this role,? you will)[:.]?$/i, "Responsibilities"],
      [/^(qualifications|requirements|what you.ll bring|what we.re looking for)[:.]?$/i, "Qualifications"],
      [/^benefits[:.]?$/i, "Benefits"],
      [/^(compensation and benefits|pay and benefits)[:.]?$/i, "Pay and benefits"],
    ].find(([pattern]) => pattern.test(label));
    if (heading && (section || !standaloneBold)) return element("h3", section?.[1] || label);
    const link = tag === "a" ? httpsUrl(node.getAttribute("href")) : null;
    const target = link ? sourceLink("", link) : allowed.has(tag) && tag !== "a" ? element(tag) : fragment;
    for (const child of node.childNodes) target.append(copy(child));
    return target;
  }
  const content = document.createDocumentFragment();
  for (const node of template.content.childNodes) content.append(copy(node));
  if (!content.textContent.trim()) {
    content.append(element("p", job.descriptionText || "Full details are unavailable here. View the employer posting for the complete listing.", "plain-description"));
  }
  return content;
}

function summarizeDescription(description) {
  const sections = new Map([
    ["Role overview", []],
    ["Responsibilities", []],
    ["Qualifications", []],
    ["Preferred qualifications", []],
    ["Compensation", []],
    ["Benefits", []],
    ["Schedule and travel", []],
    ["Application instructions", []],
  ]);
  const headings = [
    [/preferred|nice.to.have|bonus points|strong candidates/i, "Preferred qualifications"],
    [/qualifications|^requirements|what (we look for|we.re looking for|you.ll bring)|you.ll (thrive|excel)|good fit|minimum requirements/i, "Qualifications"],
    [/responsibilities|what you.ll do|^in this role|impact you will have|^your impact/i, "Responsibilities"],
    [/^about the role|^role overview/i, "Role overview"],
    [/^(?:(?:pay|compensation|salary) (?:and|&) )?(?:our |employee |total )?(?:benefits|perks)\b|^what we offer|^why (join|fireworks)/i, "Benefits"],
    [/^pay range|^compensation|^salary range/i, "Compensation"],
    [/^how to apply|application process|hiring process/i, "Application instructions"],
  ];
  let current;
  const blocks = description.querySelectorAll("h3, p, li, div, strong, b");
  for (const block of blocks) {
    if (block.parentElement?.closest("li")) continue;
    if (block.localName === "div" && block.querySelector("h3, p, li, div")) continue;
    const text = block.textContent.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const heading = headings.find(([pattern]) => pattern.test(text) && text.length <= 72);
    if (heading) {
      current = heading[1];
      continue;
    }
    if (block.localName === "strong" || block.localName === "b") continue;
    if (block.localName === "h3") {
      if (/^about (us|the team|openai|databricks)|^equal opportunity|^compliance|^pay range|^our commitment|^compensation/i.test(text)) current = undefined;
      continue;
    }
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
    for (const sentence of sentences) {
      if (/\b(?:travel up to|travel required|% travel|days (?:per|a) week|in the office|office attendance|on[- ]call|weekend shifts)\b/i.test(sentence)) {
        sections.get("Schedule and travel").push(sentence.trim());
      }
    }
    if (current && !/\b(?:equal opportunity employer|reasonable accommodation|privacy notice)\b/i.test(text)) {
      if (current === "Benefits") {
        sections.get(current).push(text);
        continue;
      }
      const firstSentence = sentences[0].trim();
      const keyPoint = firstSentence.length > 165
        ? firstSentence.slice(0, 162).replace(/\s+\S*$/, "") + "…"
        : firstSentence;
      sections.get(current).push(keyPoint);
    }
  }
  const summary = document.createDocumentFragment();
  for (const [title, points] of sections) {
    if (!points.length) continue;
    const list = element("ul");
    const unique = [...new Set(points)];
    const visible = title === "Benefits" ? unique : unique.slice(0, title === "Role overview" ? 1 : 3);
    for (const point of visible) list.append(element("li", point));
    summary.append(element("h3", title), list);
  }
  if (!summary.childNodes.length) {
    summary.append(element("p", "Key details could not be identified in this posting. Open the full employer description below."));
  }
  return summary;
}

function openJobDetails(job, opener) {
  detailsOpener = opener.dataset.jobControl;
  byId("detail-title").textContent = job.title;
  byId("detail-company").textContent = job.company;
  byId("detail-pay").textContent = job.compensation || "Not provided";
  byId("detail-location").textContent = job.locationDisplay;
  byId("detail-workplace").textContent = job.workplace || "Not provided";
  byId("detail-posting").href = job.url;
  byId("detail-apply").href = job.applyUrl || job.url;
  const description = employerDescription(job);
  byId("detail-summary").replaceChildren(job.summary
    ? element("p", job.summary) : summarizeDescription(description));
  byId("detail-description").replaceChildren(description);
  byId("detail-full").open = false;
  byId("detail-full").hidden = Boolean(job.reviewed);
  byId("detail-resume").onclick = () => {
    const posting = byId("detail-description");
    const lines = Array.from(posting.querySelectorAll("h3, p, li"))
      .filter((node) => !node.parentElement?.closest("li"))
      .map((node) => (node.localName === "li" ? "- " : "") + node.textContent.trim());
    const body = job.summary || ((job.descriptionHtml || job.descriptionText) &&
      (lines.join("\n").trim() || posting.textContent.trim())) || "";
    try {
      sessionStorage.setItem("jobbers-resume-posting", JSON.stringify({
        title: `${job.title} at ${job.company}`,
        text: [job.title, job.company, body].join("\n\n"),
        hasDescription: Boolean(body),
      }));
    } catch {
      // The résumé page also accepts pasted postings.
    }
  };
  jobDetails.showModal();
  byId("detail-title").focus();
  jobDetails.scrollTop = 0;
}

function clearFilter(control) {
  if (control.type === "checkbox") control.checked = false;
  else control.value = "";
}

function jobDistance(locations) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const [latitude, longitude] = nearby.center;
  let nearest = Infinity;
  for (const { match } of locations) {
    const point = zipCoordinates[match.zip] || match.point;
    if (!point) continue;
    const [lat, lon] = point;
    const halfChord = Math.sin(radians(lat - latitude) / 2) ** 2 +
      Math.cos(radians(latitude)) * Math.cos(radians(lat)) * Math.sin(radians(lon - longitude) / 2) ** 2;
    nearest = Math.min(nearest, 3959 * 2 * Math.asin(Math.sqrt(Math.min(1, halfChord))));
  }
  return nearest;
}

function clearNearby() {
  zipRequest += 1;
  nearby = undefined;
  zipCode.value = "";
  zipCode.removeAttribute("aria-invalid");
  zipStatus.textContent = "";
  if (sort.value === "distance") sort.value = "discovered";
  sort.querySelector('[value="distance"]').disabled = true;
}

async function applyNearby(event) {
  event.preventDefault();
  const zip = zipCode.value.trim();
  const radius = Number(zipRadius.value);
  if (!/^\d{5}$/.test(zip)) {
    zipStatus.textContent = "Enter a five-digit US ZIP code.";
    zipCode.setAttribute("aria-invalid", "true");
    zipCode.focus();
    return;
  }
  const submit = event.currentTarget.querySelector("button");
  if (submit.disabled) return;
  const request = ++zipRequest;
  const current = () => request === zipRequest && zipCode.value.trim() === zip && Number(zipRadius.value) === radius;
  submit.disabled = true;
  try {
    if (!zipCoordinates) {
      zipStatus.textContent = "Loading ZIP coordinates…";
      const response = await fetch("./zip-coordinates.json", { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("ZIP coordinates unavailable");
      zipCoordinates = await response.json();
    }
    if (!current()) return;
    const center = zipCoordinates[zip];
    if (!center) {
      zipStatus.textContent = "This ZIP code has no Census area. Try a nearby street-address ZIP.";
      zipCode.setAttribute("aria-invalid", "true");
      zipCode.focus();
      return;
    }
    nearby = { zip, radius, center };
    zipCode.removeAttribute("aria-invalid");
    zipStatus.textContent = "Distances are approximate and measured in a straight line.";
    sort.querySelector('[value="distance"]').disabled = false;
    sort.value = "distance";
    limit = pageSize;
    renderJobs();
  } catch {
    if (current()) zipStatus.textContent = "ZIP lookup is unavailable. Try again.";
  } finally {
    submit.disabled = false;
    if (zipStatus.textContent === "Loading ZIP coordinates…") zipStatus.textContent = "";
  }
}

function updateFilters() {
  const group = byId("active-filters");
  const active = filterControls.filter((control) => control.type === "checkbox" ? control.checked : control.value);
  const nearbyLabel = nearby ? `Within ${nearby.radius} mi of ${nearby.zip}` : "";
  const count = active.length + Number(Boolean(nearby));
  const signature = JSON.stringify([nearbyLabel, active.map((control) => [control.id, control.value])]);
  if (group.dataset.filters === signature) return count;
  group.dataset.filters = signature;
  const buttons = active.map((control) => {
    const label = control.type === "checkbox" ? control.parentElement.textContent.trim() : control.selectedOptions[0].textContent;
    const button = element("button", `${label} ×`, "save-job");
    button.type = "button";
    button.setAttribute("aria-label", `Remove filter: ${label}`);
    button.addEventListener("click", () => {
      clearFilter(control);
      limit = pageSize;
      renderJobs();
      const collapsed = control.closest("details:not([open])");
      (collapsed ? collapsed.querySelector("summary") : control).focus();
    });
    return button;
  });
  if (nearby) {
    const button = element("button", `${nearbyLabel} ×`, "save-job");
    button.type = "button";
    button.setAttribute("aria-label", `Remove filter: ${nearbyLabel}`);
    button.addEventListener("click", () => {
      clearNearby();
      limit = pageSize;
      renderJobs();
      zipCode.focus();
    });
    buttons.unshift(button);
  }
  if (count) {
    const clear = element("button", "Clear filters", "save-job");
    clear.type = "button";
    clear.addEventListener("click", () => {
      filterControls.forEach(clearFilter);
      clearNearby();
      limit = pageSize;
      renderJobs();
      search.focus();
    });
    buttons.push(clear);
  }
  group.replaceChildren(...buttons);
  group.hidden = !count;
  return count;
}

function renderJobs(appendFrom = 0) {
  const now = Date.now();
  const query = search.value.trim().toLowerCase();
  const candidates = boards.flatMap((board) => {
    const snapshot = historyByBoard[board.slug];
    return (snapshot?.jobs || []).map((job) => ({ ...job, key: `${board.slug}:${job.id}`, stale: board.failed !== false }));
  });
  candidates.push(...reviewedMetroJobs.filter((job) => job.expires > now)
    .map((job) => ({ ...job, key: `reviewed:${job.id}` })));
  const jobs = candidates.flatMap((job) => {
    const locations = metroLocations(job.location).filter(({ match }) =>
      !locationArea.value || match.area === locationArea.value);
    if (!locations.length) return [];
    return [{
      ...job,
      location: [...new Set(locations.map(({ match }) => match.display))].join(" · "),
      locationDisplay: [...new Set(locations.map(({ match }) => {
        const area = locationAreaLabels[match.area];
        return area && match.display !== nycLabel ? `${match.display} (${area})` : match.display;
      }))].join(" · "),
      sourceLocation: locations.map(({ label }) => label).join(" "),
      distance: nearby ? jobDistance(locations) : undefined,
      isNew: Boolean(job.discovered && now - job.discovered < week && !job.stale),
    }];
  });
  const results = jobs.filter((job) =>
    (!nearby || job.distance <= nearby.radius) &&
    (!role.value || job.role === role.value) &&
    (!workplace.value || job.workplace === workplace.value) &&
    (!published.value || (job.published > 0 && job.published <= now && now - job.published <= Number(published.value) * day)) &&
    (!newOnly.checked || job.isNew) &&
    (!savedOnly.checked || savedJobs.has(job.key)) &&
    `${job.title} ${job.company} ${job.location} ${job.sourceLocation}`.toLowerCase().includes(query)
  ).sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title);
    if (sort.value === "distance") return a.distance - b.distance || byTitle;
    if (sort.value === "title") return byTitle;
    if (sort.value === "published") return b.published - a.published || byTitle;
    return Number(b.isNew) - Number(a.isNew) ||
      (b.discovered || b.published) - (a.discovered || a.published) || byTitle;
  });

  const filterCount = updateFilters();
  const allUnavailable = boards.every((board) => board.failed);
  const message = results.length
    ? `Showing ${Math.min(limit, results.length)} of ${results.length} matching roles`
    : feedPending ? "Loading jobs…" : allUnavailable ? "Employer feeds unavailable." : "No matching roles.";
  byId("results").textContent = message;
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => {
    byId("results-announcement").textContent = message;
  }, 450);
  const showHelp = !results.length && !feedPending;
  byId("results-help").hidden = !showHelp;
  if (showHelp) {
    const action = byId("results-action");
    byId("results-hint").textContent = allUnavailable
      ? "Try refreshing the employer feeds."
      : nearby ? "Try a wider distance or remove a filter." : "Try a different search or remove a filter.";
    action.textContent = allUnavailable ? "Retry feeds" : filterCount > 0 ? "Clear filters" : "Edit search";
    action.onclick = () => {
      if (allUnavailable) {
        refresh.focus();
        refreshJobs();
      } else {
        filterControls.forEach(clearFilter);
        clearNearby();
        limit = pageSize;
        renderJobs();
        search.focus();
      }
    };
  }
  const list = byId("job-list");
  const firstNew = appendFrom;
  if (appendFrom && (list.children.length !== appendFrom ||
    [...list.children].some((card, index) => card.dataset.jobKey !== results[index]?.key))) appendFrom = 0;
  const active = document.activeElement;
  const focusedKey = list.contains(active) ? active.dataset.jobControl : undefined;
  const focusedIndex = focusedKey ? [...list.children].indexOf(active.closest("li")) : -1;
  const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "America/New_York" });
  const cards = results.slice(appendFrom, limit).map((job) => {
    const item = element("li", "", "job");
    item.dataset.jobKey = job.key;
    const details = element("div");
    const title = element("h3", job.title);
    if (job.isNew) title.append(element("span", "New", "badge"));
    const meta = [job.role];
    if (nearby) meta.push(`About ${Math.round(job.distance)} mi away`);
    if (job.published) meta.push(`Published ${dateFormat.format(job.published)}`);
    if (job.stale) meta.push("Cached");
    if (job.reviewed) meta.push(`Employer posting checked ${job.reviewed}`);
    const facts = element("dl", "", "job-facts");
    for (const [label, value] of [["Salary", job.compensation], ["Location", job.locationDisplay], ["Work arrangement", job.workplace]]) {
      const fact = element("div");
      fact.append(element("dt", label), element("dd", value || "Not provided"));
      facts.append(fact);
    }
    details.append(element("p", job.company, "job-company"), title, facts, element("p", meta.join(" · "), "meta"));
    const actions = element("div", "", "job-actions");
    const view = element("button", "View details");
    view.type = "button";
    view.setAttribute("aria-label", `View details for ${job.title}`);
    view.setAttribute("aria-haspopup", "dialog");
    view.dataset.jobControl = `details:${job.key}`;
    view.addEventListener("click", () => openJobDetails(job, view));
    const isSaved = savedJobs.has(job.key);
    const save = element("button", "Save", "save-job");
    save.type = "button";
    save.setAttribute("aria-label", `Save ${job.title}`);
    save.setAttribute("aria-pressed", String(isSaved));
    save.dataset.jobControl = `save:${job.key}`;
    save.addEventListener("click", () => {
      let message = isSaved ? "Job removed from saved jobs." : "Job saved.";
      try {
        const latest = JSON.parse(localStorage.getItem(savedJobsKey));
        if (Array.isArray(latest)) savedJobs = new Set(latest);
        if (isSaved) savedJobs.delete(job.key);
        else savedJobs.add(job.key);
        localStorage.setItem(savedJobsKey, JSON.stringify([...savedJobs]));
      } catch {
        if (isSaved) savedJobs.delete(job.key);
        else savedJobs.add(job.key);
        message += " This change is limited to this session.";
      }
      byId("save-status").textContent = message;
      renderJobs();
    });
    actions.append(view, save);
    item.append(details, actions);
    return item;
  });
  if (appendFrom) list.append(...cards);
  else list.replaceChildren(...cards);
  more.hidden = results.length <= limit;
  if (firstNew) (list.children[firstNew]?.querySelector("button") || byId("jobs-heading")).focus();
  if (focusedKey) {
    const equivalent = [...list.querySelectorAll("[data-job-control]")].find(
      (control) => control.dataset.jobControl === focusedKey
    );
    const next = list.children[Math.min(focusedIndex, list.children.length - 1)]?.querySelector("button");
    (equivalent || next || savedOnly).focus({ preventScroll: Boolean(equivalent) });
  }
}

async function refreshJobs() {
  if (refresh.getAttribute("aria-disabled") === "true") return;
  refresh.setAttribute("aria-disabled", "true");
  feedPending = true;
  status.textContent = "Checking employer job boards…";
  if (!byId("job-list").children.length) renderJobs();
  try {
    const results = await Promise.allSettled(boards.map(getBoard));
    const now = Date.now();
    const failed = [];
    results.forEach((result, index) => {
      const board = boards[index];
      board.failed = result.status === "rejected";
      if (board.failed) {
        failed.push(board.company);
        return;
      }
      const previous = historyByBoard[board.slug];
      const seen = new Map(previous?.seen || []);
      for (const job of result.value) {
        if (!seen.has(job.id)) seen.set(job.id, previous ? now : 0);
        job.discovered = seen.get(job.id);
      }
      historyByBoard[board.slug] = { jobs: result.value, seen: [...seen] };
    });
    let saved = true;
    try {
      localStorage.setItem(storageKey, JSON.stringify(historyByBoard, (key, value) =>
        key === "descriptionHtml" || key === "descriptionText" ? undefined : value
      ));
    } catch {
      saved = false;
    }
    const updated = boards.length - failed.length;
    const message = updated ? `${updated} of ${boards.length} boards updated at ${new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.` : "No boards could be updated.";
    const unavailable = failed.length ? ` Unavailable: ${failed.join(", ")}. Cached roles are shown when available.` : "";
    status.textContent = message + unavailable + (saved ? "" : " Tracking is limited to this session.");
    feedPending = false;
    renderJobs();
  } finally {
    feedPending = false;
    refresh.removeAttribute("aria-disabled");
  }
}

async function loadSignals() {
  const list = byId("signal-list");
  const status = byId("signal-status");
  status.textContent = "Loading research notes…";
  try {
    const response = await fetch("./doc/Early_Hiring_Signals.md", { cache: "no-cache", signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("Research file unavailable");
    const rows = (await response.text()).split(/\r?\n/)
      .filter((line) => line.startsWith("|"))
      .slice(2)
      .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
      .filter((cells) => cells.length === 4);
    if (!rows.length) throw new Error("Research table unavailable");
    list.replaceChildren(...rows.map(([company, signal, roles, sources]) => {
      const card = element("article", "", "signal");
      const links = element("p", "", "signal-sources");
      for (const [, label, value] of sources.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        const url = httpsUrl(value);
        if (url) links.append(sourceLink(label, url));
      }
      const [date, summary] = signal.match(/^([A-Z][a-z]{2} \d{1,2}, \d{4})\. (.+)$/)?.slice(1) ?? ["", signal];
      card.append(element("h3", company));
      if (date) card.append(element("p", date, "meta"));
      const possibleRoles = element("p");
      possibleRoles.append(element("strong", "Could hire for"), " ", roles);
      card.append(element("p", summary), possibleRoles, links);
      return card;
    }));
    status.textContent = "";
  } catch {
    status.textContent = "Research notes could not be loaded. Open the source file using the Research notes link.";
  }
}

if (refresh) {
  document.querySelector(".filter-options").open = window.matchMedia("(min-width: 48rem)").matches;
  window.addEventListener("storage", (event) => {
    if (event.key !== savedJobsKey) return;
    try {
      const latest = JSON.parse(event.newValue) || [];
      if (!Array.isArray(latest)) return;
      savedJobs = new Set(latest);
      renderJobs();
    } catch {
      // Ignore invalid saved-job data.
    }
  });
  let backdropPointer;
  const onBackdrop = (event) => {
    if (event.target !== jobDetails) return false;
    const bounds = jobDetails.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX >= bounds.right ||
      event.clientY < bounds.top || event.clientY >= bounds.bottom;
  };
  jobDetails.addEventListener("pointerdown", (event) => {
    backdropPointer = event.isPrimary && event.button === 0 && onBackdrop(event) ? event.pointerId : undefined;
  });
  jobDetails.addEventListener("pointercancel", () => { backdropPointer = undefined; });
  jobDetails.addEventListener("pointerup", (event) => {
    if (event.pointerId === backdropPointer && onBackdrop(event)) jobDetails.close();
    backdropPointer = undefined;
  });
  jobDetails.addEventListener("close", () => {
    const opener = [...document.querySelectorAll("[data-job-control]")].find(
      (control) => control.dataset.jobControl === detailsOpener
    );
    (opener || search).focus({ preventScroll: Boolean(opener) });
  });
  byId("zip-search").addEventListener("submit", applyNearby);
  for (const [label] of roles) role.add(new Option(label, label));
  for (const filter of [search, sort, ...filterControls]) {
    filter.addEventListener("input", () => {
      limit = pageSize;
      renderJobs();
    });
  }
  more.addEventListener("click", () => {
    const previousLimit = limit;
    limit += pageSize;
    renderJobs(previousLimit);
  });
  refresh.addEventListener("click", refreshJobs);
  refreshJobs();
  setInterval(() => {
    if (!document.hidden) refreshJobs();
  }, 15 * 60 * 1000);
}

if (byId("signal-list")) loadSignals();

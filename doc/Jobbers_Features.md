# Jobbers Website Features

Jobbers tracks AI engineering jobs with a recognized NYC metro location and shows company announcements that could lead to future openings.

| Feature | What it does |
| --- | --- |
| Live job feeds | Pulls public postings from Anthropic, Databricks, Fireworks AI, GenScript, Harvey, LangChain, OpenAI, Palantir, Perplexity, Scale AI, Together AI, and Turing. Checks on page load, on refresh, and every 15 minutes while the tab is visible. Shows cached postings if a feed is unavailable. |
| Individually reviewed listings | Shows selected openings from employer career pages with a check date, a short summary, and an employer link. These listings expire after a week unless reviewed again. |
| NYC vs. NYC metro | The **Location area** filter offers all NYC metro locations, New York City only, or the metro outside the city. A posting that says only “NYC metro” appears in the combined view. See [NYC metro cities and neighborhoods](./NYC_Metro_Cities_and_Neighborhoods.md). |
| Location display | Job cards and **View details** show the neighborhood for jobs within NYC and the city or town for jobs elsewhere in the metro. When employers give only a broader location, Jobbers displays the borough, city, county, or region they provide. |
| Search and filters | Search by job title, company, or location. Use a ZIP code and distance to find nearby NYC metro jobs, or filter by AI role, work arrangement, publication date, new discoveries, or saved jobs. |
| Résumé tailoring | Import a posting from **View details** or paste it alongside your résumé. Compare posting priorities with existing evidence, reorder relevant bullets, and edit the draft. Copy it, download plain text, or use **Save as PDF** for a single-column layout with selectable text. The résumé is processed in the browser. |
| Sorting and results | Sort by new to Jobbers, most recently published, or job title A–Z. The result count and **Show more jobs** help you browse longer lists. |
| Listing details | Shows the employer prominently above the job title, followed by location and role category. Adds work arrangement, publication date, and compensation when the feed supplies them. **View posting** opens the full employer listing. |
| New job tracking | The first successful check establishes a baseline per employer. Jobs discovered after that check receive a **New** badge for seven days. |
| Saved jobs | Save or remove jobs and use **Saved jobs only** to revisit them. Saves persist in the same browser, and jobs appear while still listed. |
| Early hiring signals | A separate page shows dated company announcements, possible roles, and links to original sources. It reads from [Early Hiring Signals](./Early_Hiring_Signals.md). |
| Mobile and accessibility | Uses a single-column layout on phones, larger touch targets, a keyboard skip link, visible focus indicators, and status updates for results and refreshes. |

The site also links to the [AI job requirements](./Requirements.md) and the [guide to finding jobs before they’re posted](./Finding_Jobs_Before_They_Are_Posted.md).

**Role coverage.** The job board matches posting titles and team names to the [seven original AI role categories](./AI_JOB_ROLES.md). **All roles** includes matching openings from the connected feeds.

## Listing content requirement

**Job details inside Jobbers.** Each listing should offer a **View details** action that opens the full job information within Jobbers. Include the employer’s description, responsibilities, qualifications, compensation, benefits, location, work arrangement, and application instructions when available. Keep the company name on its own line above the job title and include a link to the original employer posting.

## Make applicant information easy to find

- **On each job card**, put the company name above the job title. Group salary range, NYC metro location, and work arrangement directly below the title so applicants can compare jobs at a glance. Place **View details** beside **Save**.
- **In View details**, repeat the key facts at the top and lead with a short summary. Group available information under **Responsibilities**, **Qualifications**, **Pay and benefits**, and **How to apply**. Keep preferred qualifications separate where labeled and surface published schedule or travel requirements. Put the full employer description behind an expandable section.
- **Keep the next step visible.** Place a clearly labeled **View employer posting** link near the top of the detail view. Use **Not provided** for missing key facts such as salary or work arrangement.
- **Show all listed benefits.** Give employer-provided benefits their own **Benefits** section with a bulleted list. Display every item in the employer’s benefits section without applying the summary length limit.
- **On mobile**, keep the same order in a single column. Let long text wrap and make **View details** and the employer link easy to reach by touch or keyboard.

These priorities come from [What Applicants Check Before Applying](./What_Applicants_Check_Before_Applying.md).

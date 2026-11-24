# UX Research and Design Techniques

Start with a task users struggle to complete. Observe where they get stuck, prototype a focused change, then test the same task again. Choose the method based on the question you need to answer. Research reviewed November 23, 2026. [GOV.UK user research manual](https://www.gov.uk/service-manual/user-research)

| Technique | When to use it | Jobbers example |
| --- | --- | --- |
| Contextual interviews and observation | Learn how people do the task today. Ask them to walk through a recent example on their own device. | Watch how a job seeker compares pay, location, and requirements across real listings. [GOV.UK contextual research](https://www.gov.uk/service-manual/user-research/contextual-research-and-observation) |
| Journey mapping | Organize observations across steps and spot where people lose context or repeat work. | Map search, filtering, opening details, returning to results, and tailoring a résumé. Mark where someone loses their place. [GOV.UK experience research](https://www.gov.uk/service-manual/user-research/researching-user-experiences) |
| Card sorting and tree testing | Use card sorting to learn how users group information. Use tree testing to see whether they can find it using labels alone. | Test where people expect to find **Saved jobs**, **Early hiring signals**, and **Résumé tailoring**. [Defra research methods](https://digital.defra.gov.uk/user-research/research-methods) |
| Prototyping and task-based usability testing | Compare a low-cost prototype with the current experience. Give realistic tasks in neutral language and observe without coaching. | Ask someone to find a qualifying role outside NYC, check the pay, and return to the same results. [GOV.UK prototyping](https://www.gov.uk/service-manual/design/making-prototypes), [Moderated usability testing](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing) |
| Accessibility evaluation | Combine automated checks, manual checks, and sessions with people who use assistive technology. | Test keyboard access, screen-reader announcements, mobile reflow, and returning focus after closing a job dialog. [W3C evaluation tools](https://www.w3.org/WAI/test-evaluate/tools/selecting/), [GOV.UK research planning](https://www.gov.uk/service-manual/user-research/plan-user-research-for-your-service) |
| Task metrics and controlled experiments | Pick a user goal, define what success looks like, and measure it. Use a randomized A/B test when traffic can support it. | Track whether users recover from zero matches. Measure recovery alongside errors and performance so an increase in clicks has context. [Google UX metrics research](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/), [Microsoft experimentation research](https://www.microsoft.com/en-us/research/articles/for-event-based-a-b-tests-why-they-are-special/) |

## A first usability round for Jobbers

GOV.UK suggests four to eight participants per qualitative round. Include job seekers on phones and people who use assistive technology. Use sample résumés for upload and export tasks. [GOV.UK research planning](https://www.gov.uk/service-manual/user-research/plan-user-research-for-your-service)

1. Ask participants to find a job outside NYC within 25 miles of a sample ZIP code and identify its work arrangement.
2. Ask them to recover from a search with zero results, then open a job, close its details, and resume browsing.
3. Ask them to import a posting, upload a sample résumé, switch templates, and export a PDF.
4. Record completion without help, wrong turns, time on task, and where help was needed. Group observed problems, fix blockers first, and repeat the tasks in a new round. [GOV.UK research analysis](https://www.gov.uk/service-manual/user-research/analyse-a-research-session)

Use the [Jobbers Brand Guide](./Brand_Guide.md) for implementation and release checks.

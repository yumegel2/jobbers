# Jobbers Brand Guide

Jobbers helps people find AI engineering jobs in the NYC metro area and spot early hiring signals. The site should feel calm, direct, and easy to scan on a phone.

## Visual identity

Keep the **Jobbers** wordmark and square **J** mark. Use charcoal for the header and mint for reading surfaces. Give each accent a consistent job across the site.

| Color | Purpose | Jobbers example |
| --- | --- | --- |
| Charcoal `#292F36` | Make the most important information easy to scan. | Use for company names, job titles, and body text on mint (13.26:1). Underline charcoal links in job details. |
| Teal `#4ECDC4` | Draw attention to the primary action. | Give **Apply** a teal fill and charcoal label (6.98:1). On mint, add a charcoal border so the button edge stays visible. |
| Mint `#F7FFF7` | Give long-form content a consistent reading surface. | Use behind listings, benefits, and résumé previews. In the charcoal header, use mint for navigation text. |
| Lavender `#A799B7` | Mark secondary information without competing with **Apply**. | Use as the fill for a **New** badge or an active filter chip. Charcoal labels (5.07:1) communicate the meaning in words. |
| Slate violet `#8C86AA` | Make controls and keyboard focus easy to locate. | Outline ZIP and search fields on mint (3.37:1). Use an offset focus ring on mint or charcoal (3.93:1 on charcoal). Reserve this shade for outlines and indicators. |

Use the system sans-serif stack. Set body text to `1rem` with `1.5` line height, page titles to `2rem` on mobile, card titles to `1.125rem`, and metadata to at least `0.875rem`. Use a spacing scale of 4, 8, 12, 16, 24, and 32px. Give cards a 12px radius and 16px padding.

## Mobile-first layout

- Start with one column and 16px side gutters. Keep **Job board** and **Early hiring signals** visible in the header and let them wrap. Indicate the current page visually and with `aria-current="page"`.
- On the job board, show search and filters above results. Stack and label the controls on phones. Put the company above the job title, followed by pay, NYC metro location, and work arrangement. Keep **View details** and **Save** together. Let long titles and locations wrap.
- On the signals page, show the company and date, what happened, possible roles, and source links in that order. Use “could hire for” for inferred roles. Use full dates when the year could be unclear.
- Add columns with `min-width` queries. Start with two-column filters and signal cards at `48rem` where space permits. Keep job results in one column for scanning. Cap the desktop content width at `70rem`.

## Browsing and dismissing details

- **Make the way back predictable.** When a user closes job details or returns from a separate detail page, preserve their search, filters, sort order, and position in the results. For a separate page, use a descriptive **Back to results** link and preserve normal browser Back behavior. [GOV.UK Design System back link](https://design-system.service.gov.uk/components/back-link/)
- **Let users dismiss read-only details.** Close **View details** when someone clicks or taps the dimmed area outside the dialog. Keep a visible **Close** button near the top and support Escape. Scrolling, selecting text, or interacting inside the details should leave them open. Keep backdrop dismissal for read-only panels. Use explicit actions for steps that could discard unsaved input. [MDN dialog guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- **Keep keyboard focus predictable.** Give the dialog an accessible title, move focus into it on open, and keep Tab and Shift+Tab inside while it is open. On close, return focus to the job card’s **View details** button or a logical nearby control if the card disappeared. The backdrop should block interaction with the results underneath. [W3C native modal dialog technique](https://www.w3.org/WAI/WCAG22/Techniques/html/H102)

## Search, results, and feedback

Reviewed November 21, 2026. The list and filter patterns below adapt Baymard’s retail usability research to job browsing.

- **Show what’s filtering the list.** Put active filter values next to the result count. Let users remove each filter or select **Clear filters** without losing their keyword search. Let filter buttons wrap on phones. NYC metro remains the job board’s geographic scope. [Baymard applied-filter research](https://baymard.com/research-articles/how-to-design-applied-filters)
- **Give empty and unavailable results different messages.** For zero matches, offer a way to clear filters or edit the search. If a feed fails, name the affected company, label cached listings, and offer **Refresh jobs**. Announce meaningful result and save updates without moving focus or announcing every keystroke. [W3C status messages guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- **Keep browsing under the user’s control.** Use **Show more jobs** with a visible “Showing X of Y” count. Keep already loaded cards in place and make the first newly revealed job easy to reach by keyboard. Preserve loaded results when returning from details. [Baymard list-loading research](https://baymard.com/research-articles/number-of-items-loaded-by-default)
- **Prioritize a fast, stable mobile view.** Make search and filters usable while feeds load. Keep loading messages and refreshed results from shifting controls unexpectedly. Where real-user measurements are available, target LCP of 2.5 seconds or less, INP of 200 milliseconds or less, and CLS of 0.1 or less at the 75th percentile. [Google Core Web Vitals](https://web.dev/articles/vitals)

## Accessibility and release checks

Target [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/). Use at least 4.5:1 text contrast for normal text, 3:1 for large text, and 3:1 for essential control and state indicators against adjacent colors. Recheck colors over gradients and in hover and focus states. Give primary touch controls a Jobbers target of **44 × 44 CSS pixels** or larger.

- Check both pages at 320px and 390px widths, at 200% text size, and at 400% browser zoom from a 1280px viewport. Confirm that navigation, filters, and cards reflow without horizontal scrolling or clipped content.
- Tab through both pages in reading order. Keep focus visible and unobscured, provide a skip link, and use native links, buttons, and labeled form controls. Give repeated posting links accessible names that include the job title.
- Test a refresh, an empty search, and an unavailable feed with a screen reader. Announce meaningful status updates without moving focus. Pair conditions such as **New** and **Cached** with visible text and respect reduced-motion preferences.
- Open details from a filtered, scrolled list. Check Close, Escape, and mouse and touch dismissal on the backdrop. Confirm that gestures inside the dialog keep it open and that closing restores focus and the list state.
- Apply and remove filters, recover from zero results, and load more jobs using only the keyboard. Repeat the browse flow at phone width on a throttled connection to check for layout shifts and usable loading feedback.

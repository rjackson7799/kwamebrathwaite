// Founder's Circle terms version.
//
// Bumped whenever the binding terms a Founder accepts on the invitation page
// change (hold-until-2036, secondary-market contribution %, donation/tax
// acknowledgment). Both the member accept-terms route and the admin activate
// route stamp this value, so `founders.terms_version` records exactly which
// wording each member agreed to.
//
// ⚠️ Pending legal/tax sign-off before launch (see the plan's release gates).
export const FOUNDER_TERMS_VERSION = 'fc-2026-05'

# Hireline — Interface design system

## Direction

Recruiter-first operations console, inspired by real ATS patterns: compact candidate table, metrics strip, visible pipeline progression, and a right-side profile with notes. Favor information density and clear next actions over ornamental decoration. The app adapts patterns from Ashby/Greenhouse workflows and the supplied HRMS/pipeline references, without copying an existing template.

## Structure

- Left rail: brand, overview, candidates, pipeline, demo workspace indicator
- Top bar: breadcrumb, visible demo status, recruiter context
- Overview: four genuine-count stat cards, pipeline distribution, coming-up count, latest candidates
- Directory: query/filters, paginated table; click name to open profile
- Pipeline: five columns, drag-and-drop plus native stage select (keyboard/mobile fallback)
- Candidate profile: side drawer for contact, skills, stage, notes, timeline
- Add/edit: modal form with required labels and error feedback

## Tokens

- Sidebar: `#182f2b`
- Primary action: `#23785c`
- Canvas: `#f5f7f5`
- Surfaces: `#ffffff`
- Border: `#e4e9e5`
- Text: `#202e2b`
- Secondary text: `#819187`
- Stage colors: applied slate, screening amber, interview blue, selected green, rejected rose
- Typography: system sans with mono uppercase micro-labels
- Border radius: mostly 3–6px, no giant pills
- Spacing: 4/8/12/16/20/24/32px scale

## Responsive

Below 1130px metrics become two columns and the board can scroll horizontally. Below 820px sidebar becomes a togglable off-canvas rail. Below 580px controls stack, filters wrap, table scrolls horizontally, and forms use one column.

## Interactions and a11y

Use native button/input/select semantics, focus-visible keyboard outlines, reduced-motion support, validation errors, loading and empty states, confirmation before deletion, and stage selectors as a non-drag alternative.

Never show invented analytics or pretend a missing backend is functioning. Numeric metrics come from `/api/stats`. The demo warning remains visible.

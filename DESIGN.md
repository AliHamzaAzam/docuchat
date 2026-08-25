---
name: DocuChat
description: A document workbench for source-grounded answers.
colors:
  paper: "#f4f1e8"
  paper-deep: "#e9e8dd"
  surface: "#fffdf7"
  ink: "#202625"
  ink-soft: "#58625e"
  ink-faint: "#666c68"
  rule: "#d9ddd2"
  highlighter: "#f3c94f"
  ready: "#216c5c"
  processing: "#905d1a"
  error: "#a4463a"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(3.3rem, 7vw, 6.4rem)"
    fontWeight: 500
    lineHeight: 0.93
    letterSpacing: "-0.055em"
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.65rem"
    fontWeight: 600
    letterSpacing: "0.1em"
rounded:
  sm: "8px"
  md: "14px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "34px"
components:
  button-primary:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "13px 17px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
---

# Design System: DocuChat

## Overview

**Creative North Star: "The Document Workbench"**

DocuChat is designed as a calm reading room where the source set stays close, questions have a clear place to begin, and evidence is treated as part of the answer rather than secondary metadata. Warm paper, ink-like text, quiet rules, and a single highlighter accent give the interface an editorial character without turning the product into a visual metaphor.

**Key Characteristics:**

- Source-grounded, not chatbot-generic.
- Editorial display type paired with practical sans and mono labels.
- Highlighter yellow reserved for action, selection, and citation.
- Two-column workbench that collapses into a mobile drawer.

## Colors

The palette is warm and paper-based, with charcoal ink for reading and a restrained highlighter signal for the moments that need attention.

### Primary

- **Highlighter Yellow** (`#f3c94f`): Primary actions, selected states, source indices, and the brand mark.

### Secondary

- **Evidence Teal** (`#216c5c`): Ready and grounded status states.
- **Processing Amber** (`#905d1a`): In-progress status and the honest-refusal message label.
- **Failure Red** (`#a4463a`): Errors and destructive feedback.

### Neutral

- **Paper** (`#f4f1e8`): The ambient page field.
- **Surface** (`#fffdf7`): Work surfaces, inputs, and answer panels.
- **Ink** (`#202625`): Primary text and user message surfaces.
- **Soft Ink** (`#58625e`): Supporting copy and secondary controls.
- **Faint Ink** (`#666c68`): Meta text, mono labels, and placeholders. Darkened from the original draft to clear WCAG AA (4.5:1) at the small sizes it's actually set in.
- **Rule** (`#d9ddd2`): Dividers and quiet boundaries.

### Named Rules

**The Highlighter Rule.** Yellow should signal something actionable, selected, or cited; it is not a general decoration color.

## Typography

**Display Font:** Newsreader (with Georgia fallback)
**Body Font:** IBM Plex Sans
**Label/Mono Font:** IBM Plex Mono

**Character:** Newsreader provides an editorial, source-reading voice. IBM Plex Sans keeps the workbench legible, while IBM Plex Mono is reserved for filenames, statuses, and interface measurements.

### Hierarchy

- **Display** (500, `clamp(3.3rem, 7vw, 6.4rem)`, `0.93`): Auth thesis and the largest reading-room statements.
- **Headline** (500, `clamp(1.8rem, 3vw, 2.6rem)`, `1`): Chat and page titles.
- **Title** (500, `clamp(1.7rem, 3vw, 2.35rem)`, `1.05`): Empty-state invitation.
- **Body** (400, `0.9375rem`, `1.55`): Conversation copy and supporting explanation.
- **Label** (600, `0.65rem`, `0.1em`, uppercase): Workspace context, evidence state, and compact system labels.

## Layout

Authenticated screens use a two-column workbench with a 292px source rail and a flexible answer surface, inside a 1440px max-width container with 34px outer padding. The rail is sticky on desktop and becomes a fixed drawer below 760px. The composer stays visually anchored to the answer surface with a sticky bottom position. The login screen uses a split thesis-and-form composition and stacks vertically on mobile.

## Elevation & Depth

Depth is a hybrid of tonal layering and ambient shadows. The page field and work surfaces are separated by warm value shifts first; soft shadows are used for the auth card, composer, active tabs, and small lifted controls.

### Shadow Vocabulary

- **Ambient** (`0 18px 45px rgba(47, 53, 45, 0.09), 0 2px 8px rgba(47, 53, 45, 0.06)`): Large work surfaces and the persistent composer.
- **Small lift** (`0 6px 16px rgba(47, 53, 45, 0.08)`): Active tab, buttons, and small state changes.

## Shapes

The system uses 8px control radii and 14px work-surface radii. Answer panels and messages use asymmetric corners to distinguish speaker roles. Citation chips use a tab-like squared lower edge. Borders are 1px and quiet; the highlighter mark is the only repeated hard-edged accent.

## Components

### Buttons

- **Shape:** 8px controls; the primary send action is a compact 9px square button.
- **Primary:** Highlighter yellow background, ink text, 13px × 17px padding for full-width actions.
- **Hover / Focus:** Darker yellow with a small ambient lift; keyboard focus uses a 2px ink outline.
- **Secondary:** Surface background with a rule border; selected buttons use the highlighter wash.

### Chips

- **Style:** Quiet surface-quiet background, mono filename text, and a yellow numbered index.
- **State:** Open citations shift to the highlighter wash and reveal the source excerpt in-place.

### Cards / Containers

- **Corner Style:** 14px for work surfaces; asymmetric 4px/15px message corners.
- **Background:** Surface or surface-soft over the paper field.
- **Shadow Strategy:** Ambient only where a surface is persistent or elevated.
- **Border:** 1px rule or rule-strong, never heavy colored rails.

### Inputs / Fields

- **Style:** Surface background, 1px rule border, 8px radius, 12px × 14px padding.
- **Focus:** Ink border with a 3px highlighter wash ring.
- **Error / Disabled:** Error uses a warm red wash; disabled controls lower opacity and retain the same geometry.

### Navigation

Top navigation is sparse and text-led. The chat rail uses tabs for Chats/Documents and a sticky desktop panel that becomes a drawer on mobile.

### Source excerpt

The source excerpt is the signature component: a citation chip opens the exact passage beneath the answer, with the quoted text highlighted and the originating filename retained as a mono citation.

## Do's and Don'ts

### Do:

- **Do** use the highlighter only for action, selection, or evidence.
- **Do** keep citations close to the answer and expandable without leaving the conversation.
- **Do** preserve the workbench's generous reading measure and quiet rule rhythm.
- **Do** keep focus states and reduced-motion behavior visible and intentional.

### Don't:

- **Don't** turn the interface into a generic dark chatbot shell.
- **Don't** use yellow as a broad decorative fill.
- **Don't** use gradients, emoji, or a display face as a substitute for document evidence.

Direction seed: `c5bde1d6` (assigned direction 4, degraded roll with no challengers). Implemented in the client shell, auth flow, chat surface, conversation rail, and document panel on 2026-08-25.

Polish pass on 2026-08-25: darkened `ink-faint`, `ready`, `processing`, and `error` to clear WCAG AA contrast (see Colors above); added a visible close control, Escape-to-close, and focus return to the mobile workspace drawer to match the document preview dialog's existing pattern. Direction and layout unchanged.

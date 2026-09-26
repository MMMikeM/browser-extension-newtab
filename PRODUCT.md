# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal use: Mike, his wife, family and friends. Two distinct contexts:

1. **New-tab page (desktop).** Quick capture while working. Opened dozens of times a day, so speed and frictionlessness are paramount; the app should get out of the way.
2. **PWA (mobile).** Both quick capture on the go and leisurely review (reading the list on the couch). Mobile needs full feature parity, not a stripped-down view.

Late-night use is common. The interface may be the last or first thing seen in a day.

## Product Purpose

A calm, fast, offline-ready task list for daily capture. Typing a task should feel like jotting it on a notepad: effortless, personal, no ceremony.

## Operating Context

- One codebase, two targets: a Manifest V2 browser extension that replaces the new-tab page, and an installable PWA.
- Local-first. Works signed out ("Saved on this device"); signing in syncs across devices and people.
- Background sync keeps data fresh before a tab is opened: the extension's persistent background page, or the PWA's service worker with Web Push.

## Capabilities and Constraints

- Tasks with subtasks, descriptions, due dates, notes and assignees; drag to reorder, or drag onto a category to move.
- An Inbox plus user categories, expected to number **3–5** (e.g. Work, Personal).
- Sharing: individual tasks with contacts, or whole categories with collaborators. Contacts connect through invite links.
- Undo for destructive or completing actions, via toasts.
- Dark mode only. Light-mode CSS exists but is dormant and not a design target.

## Brand Commitments

- **Name:** Ajot. The wordmark is "AJOT" set in DM Serif Display.
- **Personality:** clear, focused, peaceful. A calm tool that respects your attention. More "quiet instrument" than "productivity app".
- **Anti-references:** loud productivity apps, gamified task managers, anything that creates anxiety, and generic templated or AI-looking UI.

## Product Principles

1. **Respect the hour.** Late-night use is normal, so the product stays low-stimulus; nothing should jar at 2am.
2. **Disappear when not needed.** Chrome fades; the task list is the interface.
3. **Instant capture.** Adding a task should feel frictionless, like thinking out loud.
4. **Personal, not corporate.** This is a home tool, not a SaaS dashboard.
5. **Mobile is first-class.** Capture and review both happen on the phone. No feature amputations; adapt the layout instead.

## Accessibility & Inclusion

- Contrast is a hard requirement: readable text meets 4.5:1 on every surface it sits on. Verify new text tokens against their surface before shipping.
- Touch is a primary input. Nothing essential may depend on hover.

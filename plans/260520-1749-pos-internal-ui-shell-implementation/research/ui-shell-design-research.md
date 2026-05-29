# UI Shell Design Research

---
type: research
date: 2026-05-20
topic: pos-internal-ui-shell-design
---

## Summary

The approved shell is desktop-first but responsive. Implement canonical measurements for desktop, then adapt the same information architecture to wide desktop, tablet, and mobile.

## Decisions

| Topic | Decision |
|---|---|
| Desktop target | `1440x1024` viewport |
| Wide desktop target | `1920x1080` and `2560x1440`, full-width shell with constrained readable content |
| Sidebar | `225px`, dark green `#143D00` |
| Topbar | `60px`, white, subtle shadow |
| Active nav | Dark green text surface with white text |
| Accent | `#3CB018` for accent/hover/UI-only states |
| Main bg | `#F2F3ED` |
| Icons | `lucide-react` for standard UI icons |
| Brand | Committed SVG assets, not raw embedded paths |
| Responsive | Verify `2560x1440`, `1920x1080`, `1024x768`, and `390x844` |

## Red-Team Carryover

- White text on `#3CB018` fails normal-text contrast; avoid for active nav text.
- Full canonical SVG should be saved as a plan or design asset before visual QA.
- Do not change RBAC code for UI labels.

## Unresolved Questions

None.

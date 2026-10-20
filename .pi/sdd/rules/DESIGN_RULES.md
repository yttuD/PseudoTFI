# DESIGN_RULES

Load for UI, interaction, responsive presentation, accessibility and localization.
Use applicable inmobiliaria-ui-ux skill; consult relevant ARQUITECTURA-Y-PRODUCTO UX
sections. The supplied palette defines tokens, not the example home's composition.

## Palette

| Role | Light | Dark |
| --- | --- | --- |
| Main background | #F7F5F0 | #0B1428 |
| Background / secondary | #EEEAE1 | #131F3C |
| Cards | #FFFFFF | #182747 |
| Main text | #131F3C | #F5F3EE |
| Brand accent | #B89355 | #B89355 |
| Highlight | #D2AD68 | #D2AD68 |
| Accent hover | #9F783E | #C9A35F |
| Secondary text | #667085 | #AEB7C7 |
| Borders | #D9D5CC | #293956 |

Original logo colors also include #F5F3EE, #B8BFCC, #1C2B4D, #0D172E.
Brand colors cannot override accessibility.

## Acceptance and evidence

- WCAG 2.1 AA, visible focus, semantic labels, reduced motion, 44×44 px touch targets,
  inline errors and explicit loading/empty/error states. System copy uses ES/PT/EN i18n,
  except Spanish-only dev dashboard.
- Inventory every affected view/form/dialog/destructive action/validation/permission/
  loading/empty/error state and its functional/UI disposition. Evaluate public and
  management surfaces separately, not through a shared fixture.
- Always use Playwright for visual/interaction verification; browser subagent/manual
  observation complements tests but is never sole acceptance evidence.
- Capture each affected desktop and responsive-mobile presentation where both exist.
  Add 375/768/1024/1440, themes and actors/states where behavior differs; broad
  responsive/theme/access changes require the full relevant matrix. Explain exclusions.
- Name captures by criterion/route/viewport/theme/state; retain paths/test IDs in feature
  evidence. Antigravity inspects relevant real captures even for LOW UI and records concrete
  findings per criterion and desktop/mobile presentation. Sol reviews the report, not media;
  if analysis is insufficient, show Carlos the actual captures/videos in chat for feedback.
  No visual acceptance on capture existence alone; defects still block.
- Declare mocks, missing external assets and runtime failures. Fixtures do not prove
  Supabase/account integration or production visual quality.
- Desktop, responsive web, Capacitor readiness and native Android are separate. Native
  phase requires Carlos's authorization and physical Android/wireless debugging; acceptance
  covers installation, interaction, permissions, keyboard, lifecycle, deep links, offline,
  performance and security on-device.

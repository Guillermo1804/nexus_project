---
version: alpha
name: N.E.X.U.S. Institutional Design System
description: Official design system specification for Núcleo de Expediente y Seguimiento Universitario Superior (N.E.X.U.S.), tailored for academic rigor, operational clarity, and responsive data visualization.
colors:
  primary: "#6365EF"
  primary-hover: "#4E50DC"
  primary-light: "#EEEEFF"
  primary-subtle: "#F5F6FF"
  emphasis: "#2C1867"
  emphasis-dark: "#1F1048"
  bg-app: "#F5F7FB"
  bg-card: "#FFFFFF"
  bg-sidebar: "#FFFFFF"
  bg-navbar: "#FFFFFF"
  border: "#E4E7EC"
  border-light: "#F2F4F7"
  text-primary: "#101828"
  text-secondary: "#475467"
  text-muted: "#667085"
  text-subtle: "#98A2B3"
  text-inverse: "#FFFFFF"
  badge-pending-bg: "#F6FCFE"
  badge-pending-text: "#57949D"
  badge-pending-border: "#57949D"
  badge-in-progress-bg: "#FEF8F3"
  badge-in-progress-text: "#B57136"
  badge-in-progress-border: "#B57136"
  badge-concluded-bg: "#E9FEF1"
  badge-concluded-text: "#437E5C"
  badge-concluded-border: "#437E5C"
  badge-overdue-bg: "#F8F1FF"
  badge-overdue-text: "#A14D98"
  badge-overdue-border: "#A14D98"
  badge-active-bg: "#E9FEF1"
  badge-active-text: "#437E5C"
  badge-inactive-bg: "#F3F4F6"
  badge-inactive-text: "#6B7280"
  badge-info-bg: "#F0F5FF"
  badge-info-text: "#3B82F6"
  danger-bg: "#FEF3F2"
  danger-text: "#B42318"
  danger-border: "#FECDCA"
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.25
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.3
  h4:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  badge-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: 0.05em
  font-mono:
    fontFamily: monospace
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
spacing:
  2xs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.md}"
    padding: 9px 18px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  card:
    backgroundColor: "{colors.bg-card}"
    rounded: "{rounded.lg}"
    padding: 20px
  pill-badge:
    rounded: "{rounded.pill}"
    padding: 4px 10px
  input:
    backgroundColor: "{colors.bg-card}"
    rounded: "{rounded.md}"
    padding: 8px 12px
---

# N.E.X.U.S. Institutional Design System

A unified, production-grade visual specification and component language designed for the **Núcleo de Expediente y Seguimiento Universitario Superior (N.E.X.U.S.)**.

---

## Overview

The N.E.X.U.S. Design System embodies **Institutional Academic Rigor combined with Modern Operational Agility**. It is purpose-built for high-stakes postgraduate governance, doctoral trajectory monitoring, tutoring oversight, and official multi-sheet accreditation dossiers.

### Core Design Pillars

1. **Authoritative & Trustworthy Presence**: Rooted in deep academic tones (*Deep Academic Plum* `#2C1867`) balanced by an energetic, contemporary interaction driver (*Nexus Royal Indigo* `#6365EF`).
2. **Cognitive Clarity & Asymmetry (70/30 Rule)**: Complex operational tracking (milestones, tutoring, agreements, thesis components) is strictly separated from executive context (student fact sheet, committee members, risk semaphores, quick actions).
3. **Reactive Semaphores**: Immediate visual triaging via a specialized institutional 4-state traffic light system (*Pendiente*, *En Proceso*, *Concluido*, *Vencido*) designed for instant comprehension across dense cohorts.
4. **Data Density with Breathing Room**: Generous typographic scale based on `Inter`, 8px spacing increments, card elevation, and crisp 1px borders (`#E4E7EC`) over a soft slate background (`#F5F7FB`).

---

## Colors

The color architecture is divided into three tiers: **Institutional Brand Palette**, **Neutral Surfaces & Typography**, and the **Academic Semaphore & State Indicators**.

### 1. Institutional Brand Palette

| Token Name | Value | Purpose & Rationale |
|:---|:---|:---|
| `primary` | `#6365EF` | **Nexus Royal Indigo**. Primary action driver, active state indicator, focus rings, progress bar fills. |
| `primary-hover` | `#4E50DC` | Darkened indigo for interactive hover feedback on primary buttons and links. |
| `primary-light` | `#EEEEFF` | Tinted background for active sidebar links, selected tabs, and subtle badges. |
| `primary-subtle` | `#F5F6FF` | Ultra-light wash for objective callouts, hover states on list items, and secondary backgrounds. |
| `emphasis` | `#2C1867` | **Deep Academic Plum**. Headings, brand logos, card headers, and authoritative text. |
| `emphasis-dark` | `#1F1048` | Deepest institutional shadow and high-emphasis accents. |

### 2. Neutrals, Surfaces & Typography

| Token Name | Value | Purpose & Rationale |
|:---|:---|:---|
| `bg-app` | `#F5F7FB` | Neutral slate app background providing soft contrast against pure white cards. |
| `bg-card` | `#FFFFFF` | Card surface, modal surface, and sidebar foundation. |
| `bg-sidebar` | `#FFFFFF` | Fixed left navigation surface. |
| `bg-navbar` | `#FFFFFF` | Sticky top navigation bar surface. |
| `border` | `#E4E7EC` | Standard structural border for cards, inputs, and dividers. |
| `border-light` | `#F2F4F7` | Subtle divider line for card headers and inner rows. |
| `text-primary` | `#101828` | High-contrast charcoal for titles, values, and primary body content. |
| `text-secondary`| `#475467` | Medium slate for descriptions, table contents, and secondary labels. |
| `text-muted` | `#667085` | Muted cool gray for timestamps, subtitles, and field hints. |
| `text-subtle` | `#98A2B3` | Light gray for uppercase section labels and placeholder text. |
| `text-inverse` | `#FFFFFF` | Pure white text on primary buttons, badges, and dark backdrops. |

### 3. Semáforo de Acuerdos & State Indicators

| Token Name | Value (Hex) | Visual Semantics & Usage |
|:---|:---|:---|
| `badge-pending-bg` / `text` | `#F6FCFE` / `#57949D` | **Pendiente / Blue-Teal**: Initial commitment state, waiting for action start. |
| `badge-in-progress-bg` / `text` | `#FEF8F3` / `#B57136` | **En Proceso / Warm Amber**: Active commitment in execution; preventive alert. |
| `badge-concluded-bg` / `text` | `#E9FEF1` / `#437E5C` | **Concluido / Emerald Green**: Satisfactorily concluded, compliant, on-track milestone. |
| `badge-overdue-bg` / `text` | `#F8F1FF` / `#A14D98` | **Vencido / Deep Magenta**: Overdue agreement or critical risk requiring immediate escalation. |
| `danger-bg` / `text` / `border` | `#FEF3F2` / `#B42318` / `#FECDCA` | **Error & Critical Alert**: Form validation errors, student risk banners, delete actions. |
| `badge-info-bg` / `text` | `#F0F5FF` / `#3B82F6` | **Informativo / Sky Blue**: System notifications, informational tags. |
| `badge-inactive-bg` / `text` | `#F3F4F6` / `#6B7280` | **Inactivo / Neutral Gray**: Inactive records, archived states. |

---

## Typography

Typography is set exclusively in **Inter** with fallback to standard system sans-serif font stacks. Monospaced elements use standard fixed-width fonts for numeric alignment.

### Type Scale & Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Context / Role |
|:---|:---|:---|:---|:---|:---|
| `display-lg` | `32px` (2.0rem) | 800 (Extra Bold) | 1.15 | `-0.02em` | Login brand titles, dossier header titles. |
| `h1` | `26px` (1.625rem) | 800 (Extra Bold) | 1.20 | `-0.02em` | Main dashboard & student overview page titles. |
| `h2` | `24px` (1.5rem) | 700 (Bold) | 1.25 | normal | Student profile name, major section headers. |
| `h3` | `20px` (1.25rem) | 700 (Bold) | 1.30 | normal | Card titles, modal headers, accordion titles. |
| `h4` | `18px` (1.125rem) | 600 (Semi Bold) | 1.35 | normal | Widget subtitles, subsection headings. |
| `body-lg` | `16px` (1.0rem) | 400 / 500 | 1.50 | normal | Lead paragraphs, modal intro copy, toolbar labels. |
| `body-md` | `14px` (0.875rem) | 400 / 500 / 600 | 1.50 | normal | Standard body text, form controls, table data. |
| `body-sm` | `13px` (0.8125rem) | 500 / 600 | 1.45 | normal | Secondary descriptions, fact sheet labels, dropdown items. |
| `caption` | `12px` (0.75rem) | 500 / 600 | 1.40 | normal | Timestamps, author metadata, helper hints. |
| `badge-label` | `11px` (0.6875rem) | 700 (Bold) | 1.00 | `0.05em` | Status badges, role tags, section counters (uppercase). |
| `font-mono` | `12px` (0.75rem) | 600 / 700 | 1.40 | normal | Academic IDs, student matricula, DOIs, Folios. |

---

## Layout

The layout system is designed to handle dense institutional workflows while maintaining clear visual hierarchy across all viewport resolutions.

### Macro Layout Constants

- **AppShell Sidebar Width**: `260px` (Expanded), `76px` (Collapsed).
- **Sticky Navbar Height**: `64px` (Z-index: `90`).
- **Standard Desktop Max-Width**: `1440px` centered container.
- **Dossier Document Max-Width**: `1000px` centered print-ready container.
- **Drawer Widths**: Right slide-in drawer is `400px` (Agreements) and `380px` (Timeline Event Inspector).

### The Asymmetric Grid 70/30 (Expediente Doctoral)

The doctoral student dossier is partitioned into an **asymmetric 70/30 two-column CSS grid**:
- **70% Operations Column (`grid-column: 7fr`)**:
  - Horizontal Semester Navigation Tabs (`1°` to `6°` + `Todos`).
  - Active Semester Objectives & Operational Stats (Tutorías, Acuerdos, Avance de Tesis, Evidencias).
  - Longitudinal Timeline with vertical connected nodes.
  - Agreements audit list with inline transition triggers.
- **30% Executive & Context Column (`grid-column: 3fr`)**:
  - Red Overdue Alert Banner (conditional, high priority).
  - Quick Actions Widget (Registrar Tutoría, Nuevo Acuerdo).
  - Student Fact Sheet (Matrícula, Cohorte, Programa, Estatus).
  - Tutorial Committee Roster with Primary Advisor highlight.
  - Overall Thesis Progress Widget with interactive slider trigger.
  - Historical Semester Comparison Bar Chart.

### Responsive Breakpoints

- **Desktop (>= 992px)**: Full AppShell with fixed sidebar (260px) and 70/30 Grid.
- **Tablet (< 992px)**: Sidebar translates off-canvas (`translateX(-100%)`) with mobile hamburger toggle and backdrop overlay. Grid falls back to 1 column.
- **Mobile (< 640px)**: KPI grids collapse to single columns, modal dialogs become full-width (95vw).

---

## Elevation & Depth

Surfaces use subtle, refined multi-tier shadows with dark slate and deep plum undertones rather than harsh black drop-shadows.

| Level | CSS Shadow Value | Usage |
|:---|:---|:---|
| `xs` | `0 1px 2px rgba(16, 24, 40, 0.05)` | Sticky navbar bottom border, subtle tags, stat pills. |
| `sm` | `0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)` | Standard cards, timeline cards, summary panels. |
| `md` | `0 4px 8px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)` | Card hover states, avatar rings, active tabs. |
| `lg` | `0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)` | User profile dropdowns, notifications popover. |
| `modal` | `0 12px 48px rgba(44, 24, 103, 0.22)` | Centered dialogs with backdrop filter blur (3px - 4px). |
| `drawer` | `-4px 0 24px rgba(44, 24, 103, 0.15)` | Slide-out right drawers (Agreements & Flyout Inspector). |

---

## Shapes

A consistent border-radius scale provides structural harmony from micro-badges to full modal cards.

- **`xs` (4px)**: Code tags, matricula pills, inner progress tracks.
- **`sm` (6px)**: Form inputs, secondary buttons, sub-tab badges, participant checkboxes.
- **`md` (8px)**: Primary buttons, select menus, fact sheet panels, alert containers.
- **`lg` (12px)**: Nexus cards, modal dialogs, dashboard widget containers.
- **`xl` (16px)**: Login container, notifications dropdown.
- **`pill` (9999px)**: Status pill badges, filter pills, avatars, scrollbar thumbs.

---

## Components

The N.E.X.U.S. component library is designed with strict modularity, TypeScript type safety, and Angular 20 Signals.

### 1. AppShell (`shared/components/app-shell`)
- **Structure**: Sticky Top Navbar (64px) + Fixed Left Sidebar (260px) + Main Content area.
- **Navbar Features**: Dynamic breadcrumb trail, Active Period Selector dropdown, Reactive Notification Bell with unread count badge & dropdown popover, User Avatar with role dropdown.
- **Sidebar Features**: Brand logo header with N.E.X.U.S. diamond icon, section titles (`ADMINISTRACIÓN`, `OPERACIÓN ACADÉMICA`), active link styling (`#EEEEFF` background, `#6365EF` text with left indicator).

### 2. PillBadge (`shared/components/pill-badge`)
- **Structure**: Rounded pill (`border-radius: 9999px`) with dot indicator (`width: 6px; height: 6px; border-radius: 50%`) and bold uppercase text.
- **Variants**:
  - `pendiente`: `#F6FCFE` bg, `#57949D` text/border.
  - `en-proceso`: `#FEF8F3` bg, `#B57136` text/border.
  - `concluido` / `activo` / `success`: `#E9FEF1` bg, `#437E5C` text/border.
  - `vencido` / `critico`: `#F8F1FF` bg, `#A14D98` text/border.
  - `info`: `#F0F5FF` bg, `#3B82F6` text/border.
  - `inactivo`: `#F3F4F6` bg, `#6B7280` text/border.

### 3. Longitudinal Timeline (`shared/components/timeline`)
- **Structure**: Vertical continuous rail (`2px` solid `#E4E7EC`) with centered `36px` circular milestone nodes and interactive card items.
- **Milestone Node Types**:
  - `Tutoría`: `#6365EF` / `#F5F6FF`
  - `Acuerdo`: `#B57136` / `#FEF8F3`
  - `Tesis`: `#2C1867` / `#F8F1FF`
  - `Evidencia`: `#57949D` / `#F6FCFE`
  - `Producción Científica`: `#437E5C` / `#E9FEF1`
- **Flyout Drawer (380px)**: Clicking any milestone opens a right slide-in inspector displaying participant attendance, structured observations, thesis components, and evidence download buttons.

### 4. AgreementDrawer (`features/agreements/agreement-drawer`)
- **Structure**: 400px right drawer with dual mode: (1) Creation mode with deadline picker and responsible party selector, (2) Status transition mode with semaphore buttons (`Pendiente`, `En Proceso`, `Concluido`, `Vencido`) and audit transition history log.

### 5. TutoringModal (`features/tutoring/tutoring-modal`)
- **Structure**: 960px centered modal with 2-column layout:
  - *Left Column*: Session date, semester, modality (Presencial, Virtual, Híbrida), and participant checklist with real-time attendance toggle.
  - *Right Column*: General summary textarea, dynamic structured observations by advisor, and next meeting scheduling.

### 6. ThesisProgressForm (`features/thesis/thesis-progress-form`)
- **Structure**: 720px centered modal featuring a master overall progress slider (0% - 100%) and an accordion breakdown for the **6 Canonical Research Components**:
  1. *Protocolo de Investigación* (10%)
  2. *Estado del Arte y Antecedentes* (15%)
  3. *Marco Teórico y Conceptual* (15%)
  4. *Metodología y Diseño Experimental* (25%)
  5. *Análisis e Interpretación de Resultados* (20%)
  6. *Redacción del Documento de Tesis* (15%)

### 7. EvidenceDropzone (`features/evidence/evidence-upload`)
- **Structure**: 680px modal with dual-mode navigation tabs:
  - *Archivo Local*: Drag-and-drop zone supporting up to 15 MB (PDF, DOCX, ZIP, PNG).
  - *Enlace Digital*: Form with regex validator for DOIs (`10.xxxx/...`) and secure institutional URLs.

### 8. FullDossierReport (`features/reporting/full-dossier-report`)
- **Structure**: Official 10-section compiled accreditation document with watermark (`rgba(44, 24, 103, 0.03)`), unique official folio (`CED-DOC-DOC-2025-001-2026`), student identification grid, committee signatures block, and strict `@media print` layout rules.

---

## Do's and Don'ts

### Do's

- **DO** maintain strict adherence to the Semáforo de Acuerdos color tokens (`#57949D`, `#B57136`, `#437E5C`, `#A14D98`).
- **DO** use the 70/30 grid layout for student dossier views to prevent cognitive overload.
- **DO** render student matricula, DOIs, audit hashes, and official folio numbers in monospace font (`font-mono`).
- **DO** provide clear empty, loading (with spinner), and error states for all asynchronous data cards.
- **DO** support `@media print` directives in all reporting views, stripping AppShell navigation and forcing high-contrast typography.
- **DO** use subtle hover transitions (`0.15s ease`) and active scale-down (`transform: scale(0.98)`) on interactive controls.

### Don'ts

- **DON'T** introduce arbitrary RGB or generic primary colors (e.g. pure red `#FF0000` or generic blue `#0000FF`); use designated tokens.
- **DON'T** place dense operational forms inside the 30% side column; keep that column reserved for summary cards, committee rosters, and quick action triggers.
- **DON'T** hide overdue or high-risk alert banners behind accordion panels or secondary tabs.
- **DON'T** use modal dialogs for simple status updates when an inline trigger or drawer is more context-preserving.
- **DON'T** allow text to wrap inside status badges or matricula chips (`white-space: nowrap` is mandatory).

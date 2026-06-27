# Dashboard Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Redesign the AgriTrace Web-Admin dashboard to look clean, modern, and professional by removing all excessive borders, introducing soft shadows, custom cards, and organic agricultural HSL colors.

**Architecture:** We will modify the layout grid, sidebar, header, stats panels, chart components, and action items in Next.js. We will substitute structural borders with light-background contrast and soft drop shadows, and style Recharts graphs with custom gradients.

**Tech Stack:** Next.js, React, TailwindCSS, Recharts, Lucide Icons

---

### Task 1: Refactor Layout and Header

**Files:**
- Modify: `Web-Admin/src/app/(dashboard)/layout.tsx`
- Modify: `Web-Admin/src/components/shared/Header.tsx`

**Step 1: Modify layout wrapper background and padding**
Update the background color of the main content area in layout to a soft, organic `#f4f6f3` and remove borders.

**Step 2: Redesign Header**
Remove the bottom border of the header, change its background to a glassmorphism style (`bg-white/75 backdrop-blur-md`), and style the user info / badge components to be borderless.

---

### Task 2: Refactor Sidebar

**Files:**
- Modify: `Web-Admin/src/components/shared/Sidebar.tsx`

**Step 1: Remove right border and style sidebar wrapper**
Remove the `border-r border-[#e6ebe3]` from the sidebar, changing the background to `#fbfcf9` and adding a very soft separation shadow or letting it float.

**Step 2: Restyle navigation links**
Update the links to have a larger border radius (`rounded-2xl`), a soft mint background on hover, and an elegant active style using a soft forest-green gradient or background.

**Step 3: Restyle user profile/logout footer**
Remove the top border from the footer and style it to match the clean, borderless style of the sidebar.

---

### Task 3: Refactor Dashboard Header & Section

**Files:**
- Modify: `Web-Admin/src/components/dashboard/DashboardHeader.tsx`
- Modify: `Web-Admin/src/components/dashboard/DashboardSection.tsx`

**Step 1: Redesign DashboardHeader layout and Carbon Pulse**
Update the greeting spacing. Restyle the carbon credit pulse card to have absolutely zero border, featuring a sleek gradient and custom-styled shadow.

**Step 2: Update DashboardSection container**
Remove borders from `DashboardSection`, change border radius to `rounded-[28px]`, and apply the unified shadow: `shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_40px_rgba(27,67,50,0.03)]`.

---

### Task 4: Refactor Dashboard Stats Cards

**Files:**
- Modify: `Web-Admin/src/components/dashboard/DashboardStatsCards.tsx`

**Step 1: Redesign Carbon Credits Hero Card**
Change the gradient of the Carbon Credits card to a premium dark-forest green (`bg-gradient-to-br from-[#1b4332] via-[#24523d] to-[#1b4332]`) and add a subtle, radial SVG pattern background instead of plain solid colors.

**Step 2: Redesign Yield Hero Card**
Modify the Yield card to use a soft warm sand/gold background (`bg-gradient-to-br from-[#fbf8f1] to-[#f5ebd2]`), warm brown/gold typography, and wheat icon accents.

**Step 3: Redesign Operational Metric Cards**
Update the 6 operational metric cards (farmers, zones, seasons, batches, QRs, carbon pending) to be borderless white cards with soft drop shadows, pastel HSL-tinted icon wrappers, and clean typography. Add a micro-lift on hover (`hover:-translate-y-0.5`).

---

### Task 5: Refactor Charts

**Files:**
- Modify: `Web-Admin/src/components/charts/CarbonTrendChart.tsx`
- Modify: `Web-Admin/src/components/charts/YieldChart.tsx`

**Step 1: Redesign CarbonTrendChart Recharts styling**
Remove harsh borders from the select dropdown. Update grid lines to a very light `#f0f2ef`. Style the tooltip container to be borderless with custom shadows, and round the bar charts.

**Step 2: Redesign YieldChart area gradient**
Apply a smooth, organic forest-green area gradient (`from-[#2d6a4f] with opacity 0.25 to 0.00`). Style the area stroke, tooltip container, and select dropdown to match.

---

### Task 6: Refactor Quick Actions & Recent Activities

**Files:**
- Modify: `Web-Admin/src/components/dashboard/QuickActions.tsx`
- Modify: `Web-Admin/src/components/dashboard/RecentActivitiesPanel.tsx`

**Step 1: Redesign QuickActions**
Update the quick action items to be borderless white cards with soft shadows, subtle micro-hover transformations (`hover:scale-[1.02] hover:-translate-y-0.5`), and pastel mint icon wrappers.

**Step 2: Redesign RecentActivitiesPanel**
Remove the outer border and divider lines. Restructure the list items to float on clean white panels or extremely soft background tints with clean icon badges and spacing.

---

### Task 7: Build Verification and Review

**Step 1: Verify TypeScript & build execution**
Run local Next.js build or TypeScript compilation command to ensure there are no compilation errors in the redesigned components.

# Superadmin Dashboard Design

## Goal

Build a dashboard that only super administrators can enter. The dashboard shows inspection progress across the three buildings, highlights completed and remaining bed checks, lets super administrators mark empty beds, and lets them inspect each staff member's completed records.

The dashboard should use bed count as the primary inspection unit. A staff member's inspection count is the number of unique beds they checked, not their assigned floor, QR count, or luggage piece count.

## Access

Only users treated as super administrators can access the dashboard.

The app already identifies super administrators with `isSuperAdminUser(userData)`, which checks the master email and `roleId === "superadmin"`. The dashboard route and navigation entry should use that logic. Other admin roles may keep access to the existing admin area, but they should not see or open the superadmin dashboard.

## Data Sources

The dashboard is settings-driven instead of hard-coded.

- `settings/buildings`: building-level layout settings owned by the super administrator.
- `settings/config_<building>`: existing building configuration, including total people, staff count, and luggage limit.
- `settings/dataValidity`: existing date range for active inspection data.
- `luggages`: inspection records, including `ownerId`, `building`, `checkerEmail`, `checkerName`, `scannedAt`, `conditions`, and `remarks`.
- New setting document for empty beds, stored under settings, with one canonical map of empty bed ids.

The implementation should extend superadmin building settings if the current structure is not detailed enough to generate all rooms and beds. The dashboard should prefer settings over built-in defaults, and built-in defaults should only be a fallback for missing settings.

## Bed Identity

A bed is represented as:

```text
<building>|<roomNumber>-<bedNumber>
```

Examples:

```text
毅志|20501-1
弘德|10305-4
慧樓|50210-2
```

The dashboard should normalize records so each bed is counted once per active data range. If duplicate records exist for the same bed, the latest record wins for display, while staff detail can still show the relevant record history when needed.

## Status Rules

Each bed has one of three visual statuses:

- Empty: marked by superadmin. Display gray. Empty beds do not count as remaining.
- Checked: there is an active inspection record for the bed. Display green.
- Missing: generated from settings but not empty and not checked. Display red.

Each room is a large rectangle containing four bed rectangles by default. A room is green when all generated beds in that room are either checked or empty. A room is red when one or more non-empty beds are missing. Empty beds remain gray inside the room.

## Dashboard Views

### Three-Building Summary

The first section shows one card per building:

- checked bed count
- target bed count, excluding empty beds
- remaining bed count
- empty bed count
- progress percentage

The summary uses the active `settings/dataValidity` range.

### Staff Cards

Staff cards show inspection work by checker, independent of assigned building or floor.

Each card shows:

- checker name or email
- unique checked bed count
- today's checked bed count if available from the active records
- last inspection time
- compact coverage chips, such as `毅志 5F`, `弘德 3F`, `慧樓 2F`

Clicking a staff card opens a detail view listing that staff member's checked records across buildings and floors. Records should include building, room-bed, QR id, time, and inspection remarks/conditions when present.

### Floor Cards

The selected building view shows floor cards.

Each floor card shows:

- checked count
- target count excluding empty beds
- remaining count
- empty count
- progress bar

Clicking a floor card opens the room map for that floor.

### Room And Bed Map

The floor detail shows rooms as large rectangles. Each room contains four smaller rectangles for bed 1 to bed 4 unless building settings later define a different bed count.

Superadmins can click a bed to toggle empty-bed status. Toggling should update the empty-bed settings document and immediately update the dashboard colors and counts.

## Empty Bed Management

Empty beds are managed only by superadmins.

The empty bed setting should be easy to query and update:

```ts
type EmptyBedSettings = {
  beds: Record<string, true>;
  updatedAt?: unknown;
  updatedBy?: string;
};
```

The key is the normalized bed id, such as `毅志|20501-4`.

When a bed is marked empty:

- the bed tile turns gray
- the bed is removed from remaining counts
- the room can become complete if all other beds are checked or empty

When an empty mark is removed:

- the bed returns to checked if it has an inspection record
- otherwise it returns to missing

## Firestore Rules

Rules should allow:

- approved users to read existing data they already can read
- superadmins to read and write dashboard settings, including empty beds
- non-superadmins not to write empty bed settings

The current `settings/{docId}` rule already allows writes only for superadmins. The implementation should reuse that pattern unless a more specific rule is needed.

## Components And Services

Add a dashboard-specific data layer so the page component stays readable:

- `dashboardLayout` utilities: generate buildings, floors, rooms, and beds from settings.
- `dashboardStats` utilities: merge generated beds, luggage records, and empty-bed settings into summary stats.
- `SuperAdminDashboard` page: renders the full dashboard.
- Optional child components: building summary cards, staff cards, floor cards, room map, bed tile, staff detail panel.

The stats utilities should be pure functions where possible and covered by tests.

## Testing

Use test-first implementation for pure dashboard utilities.

Minimum tests:

- generated beds are counted as checked, missing, or empty correctly
- empty beds are excluded from remaining counts
- room completion treats empty beds as complete
- duplicate records for the same bed count once
- staff counts aggregate across multiple buildings and floors
- non-superadmin access logic does not expose the dashboard route

## UX Notes

The dashboard should feel like an operational control panel, not a landing page.

- Avoid decorative hero sections.
- Keep cards dense and scannable.
- Use green, red, and gray consistently for bed status.
- Make the dashboard responsive, but optimize the primary layout for tablet and desktop because the room map is spatial.
- Keep mobile usable by stacking sections and letting the room map wrap.

## Open Decisions

No open decisions remain from the current discussion.

Confirmed decisions:

- use bed count as the inspection count
- staff cards are not tied to one assigned floor
- room status uses red, green, and gray
- room and bed generation comes from superadmin settings, with defaults only as fallback

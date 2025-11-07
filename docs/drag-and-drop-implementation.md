# Drag-and-Drop Card Reordering Implementation

**Date:** Nov 7, 2025  
**Feature:** Drag-and-drop reordering for flashcards in edit stack page

## Overview

Added drag-and-drop functionality to allow users to reorder flashcards within custom stacks on both desktop and mobile devices. The implementation uses @dnd-kit for React 19 compatibility and excellent touch support.

## Changes Made

### 1. Database Schema (`lib/db/schema.ts`)

- **Added `position` field** to `card` table (integer, not null, default 0)
- **Added composite index** `card_stack_id_position_idx` for efficient ordering queries
- Migration applied via Neon MCP with initial position values based on `created_at` order

### 2. API Routes

#### Updated: `app/api/stacks/[id]/cards/route.ts`
- GET: Cards now ordered by `position` field (then `created_at` as fallback)
- POST: New cards automatically assigned next available position in stack

#### Created: `app/api/stacks/[id]/cards/reorder/route.ts`
- PATCH endpoint for bulk card reordering
- Validates stack ownership and protection status
- Updates card positions in a transaction
- Returns updated count on success

### 3. UI Components (`app/(app)/stacks/[id]/edit/page.tsx`)

#### New Dependencies
- `@dnd-kit/core` - Core drag-and-drop functionality
- `@dnd-kit/sortable` - Sortable list implementation
- `@dnd-kit/utilities` - Helper utilities for transforms

#### New Component: `SortableCard`
- Individual card wrapper with drag handle
- Visual feedback during drag (opacity, shadow, scale)
- GripVertical icon for clear drag affordance
- Disabled for protected stacks

#### Drag-and-Drop Features
- **Touch-friendly**: 8px activation threshold prevents accidental drags
- **Keyboard accessible**: Arrow keys support for reordering
- **Immediate save**: Card order persisted on drag end
- **Visual feedback**: 
  - Drag overlay shows card being moved
  - Elevated shadow and scale on active drag
  - Opacity change on dragged card
  - Smooth transitions

#### Behavior
- **Protected stacks**: Drag handles hidden, reordering disabled
- **New cards**: Automatically positioned at end of list
- **Order persistence**: Saves immediately on drag (no need to click "Save Changes")
- **Validation**: All cards validated before allowing reorder

## Testing Checklist

### Desktop Testing
- [ ] Drag cards with mouse
- [ ] Keyboard navigation (arrow keys)
- [ ] Visual feedback during drag
- [ ] Order persists after drag
- [ ] Protected stack cannot be reordered
- [ ] Multiple cards can be reordered in sequence

### Mobile Testing
- [ ] Touch drag works smoothly
- [ ] 8px threshold prevents accidental drags
- [ ] Visual feedback on touch devices
- [ ] Scroll doesn't interfere with drag
- [ ] Order persists on mobile

### Edge Cases
- [ ] Single card stack (no reordering needed)
- [ ] Empty stack behavior
- [ ] Network errors during save
- [ ] Concurrent edits from multiple tabs
- [ ] Protected SAT Vocabulary stack

## Technical Details

### Position Management
- Cards maintain integer position (0-indexed)
- New cards get `max(position) + 1`
- Reordering updates all affected positions
- Position used as primary sort, `created_at` as fallback

### Performance
- Composite index on `(stack_id, position)` for fast queries
- Bulk update in single transaction for reordering
- Optimistic UI updates (immediate visual feedback)
- Debounced save on drag end

### Accessibility
- Keyboard navigation supported
- Screen reader compatible (ARIA labels from @dnd-kit)
- Visual drag handles (GripVertical icon)
- Clear affordance for draggable items

## Files Modified

1. `lib/db/schema.ts` - Added position field and index
2. `app/api/stacks/[id]/cards/route.ts` - Updated ordering logic
3. `app/api/stacks/[id]/cards/reorder/route.ts` - New reorder endpoint
4. `app/(app)/stacks/[id]/edit/page.tsx` - Drag-and-drop UI
5. `docs/prd.md` - Updated user stories
6. `docs/plan.md` - Added feature section
7. `package.json` - Already had @dnd-kit packages

## Migration Applied

```sql
-- Add position column with default
ALTER TABLE card ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

-- Add composite index for efficient ordering
CREATE INDEX card_stack_id_position_idx ON card(stack_id, position);

-- Set initial positions based on created_at order
WITH ranked_cards AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY stack_id ORDER BY created_at) - 1 AS pos
  FROM card
)
UPDATE card
SET position = ranked_cards.pos
FROM ranked_cards
WHERE card.id = ranked_cards.id;
```

## Future Enhancements

- Drag-and-drop in Review mode (optional)
- Batch operations (move multiple cards)
- Undo/redo for reordering
- Drag-to-delete gesture
- Animation presets (spring, ease-in-out)

## Notes

- Order saves **automatically** on drag end
- Protected stacks (SAT Vocabulary) cannot be reordered
- Mobile-optimized with touch-friendly drag areas
- No page refresh needed - all updates are immediate

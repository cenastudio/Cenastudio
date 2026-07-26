# Mobile Touch Target Testing Guide — AdminDashboard

**Purpose:** Manual verification checklist for touch target sizing on actual mobile devices

---

## Prerequisites

1. Access to AdminDashboard (`/admin` route)
2. Admin account credentials
3. Physical mobile device OR browser DevTools mobile emulation
4. At least one test user account in the system

---

## Testing Devices

### Minimum Test Coverage

- **Small phone:** iPhone SE (375×667px) or equivalent
- **Standard phone:** iPhone 12/13 (390×844px) or equivalent
- **Large phone:** iPhone 14 Pro Max (430×932px) or equivalent
- **Android reference:** Pixel 5 (393×851px) or equivalent

### Browser DevTools (Alternative)

```
Chrome DevTools → Toggle Device Toolbar (Cmd+Shift+M)
Select device: iPhone SE, iPhone 12 Pro, Pixel 5
Emulate touch: Enabled
```

---

## Test Scenarios

### ✅ Scenario 1: Delete Button Touch Target

**Navigation:** Admin Dashboard → Users tab → Locate any user row

**Steps:**
1. Identify the delete button (trash icon, red border)
2. Attempt to tap the delete button with your thumb
3. Verify that:
   - [ ] Button responds to tap without requiring precision
   - [ ] No accidental taps on adjacent buttons (Settings, Promote/Demote)
   - [ ] AlertDialog confirmation appears
   - [ ] Can tap "Cancelar" button easily
   - [ ] Can tap "Confirmar exclusão" button easily

**Expected Behavior:**
- Button should be easily tappable even with larger fingers/thumbs
- No "fat finger" issues - tap registers on first attempt
- Visual feedback on tap (border/background change)
- Confirmation dialog buttons are also easily tappable

**Pass Criteria:**
- ✅ Can tap delete button 5 times in a row without missing
- ✅ No accidental taps on Settings button
- ✅ Confirmation dialog appears every time

---

### ✅ Scenario 2: Visual Separator Effectiveness

**Navigation:** Admin Dashboard → Users tab → Any user row

**Steps:**
1. Locate the visual separator (thin vertical line) between Settings and Delete buttons
2. Attempt to tap Settings button 5 times quickly
3. Attempt to tap Delete button 5 times quickly
4. Verify that:
   - [ ] Settings button taps never trigger Delete button
   - [ ] Delete button taps never trigger Settings button
   - [ ] Visual separator is visible and provides clear boundary

**Expected Behavior:**
- Separator creates clear visual and spatial boundary
- No cross-button activation
- Buttons feel distinct and separate

**Pass Criteria:**
- ✅ 10/10 taps hit intended target (0% error rate)
- ✅ Visual separator is visible (not hidden or too subtle)

---

### ✅ Scenario 3: Button Spacing in Action Row

**Navigation:** Admin Dashboard → Users tab → Any user row

**Steps:**
1. Identify the action button row: [Plan Selector] [Promote/Demote] [Settings] | [Delete]
2. Tap each button in sequence 3 times
3. Verify that:
   - [ ] Each button is distinct and easy to target
   - [ ] No accidental activation of adjacent buttons
   - [ ] Spacing feels comfortable (not cramped)

**Expected Behavior:**
- All buttons easily targetable
- Comfortable spacing - doesn't feel cramped
- Can tap accurately even with gloves (if testing in that context)

**Pass Criteria:**
- ✅ Can tap each button accurately 3 consecutive times
- ✅ Spacing feels comfortable and intentional
- ✅ No frustration or required "precision tapping"

---

### ✅ Scenario 4: Mobile Layout Vertical Stacking

**Navigation:** Admin Dashboard → Users tab → Switch to mobile viewport (< 1024px width)

**Steps:**
1. Observe layout changes when viewport is narrow
2. Verify that:
   - [ ] User info and actions stack vertically
   - [ ] Action buttons remain horizontally arranged
   - [ ] All buttons remain easily tappable
   - [ ] No buttons are cut off or require scrolling

**Expected Behavior:**
- Layout adapts gracefully to narrow screens
- Action buttons maintain horizontal arrangement
- Adequate vertical spacing between user info and action buttons (16px)

**Pass Criteria:**
- ✅ Layout looks intentional (not broken)
- ✅ All interactive elements remain accessible
- ✅ No horizontal scrolling required

---

### ✅ Scenario 5: Orientation Changes

**Navigation:** Admin Dashboard → Users tab (on physical device)

**Steps:**
1. Start in portrait orientation
2. Verify all buttons are tappable
3. Rotate to landscape orientation
4. Verify all buttons remain tappable
5. Verify that:
   - [ ] Buttons maintain proper sizing in both orientations
   - [ ] Layout adapts appropriately
   - [ ] No UI breakage on rotation

**Expected Behavior:**
- Smooth transition between orientations
- Buttons remain properly sized
- Layout remains functional

**Pass Criteria:**
- ✅ No visual glitches on rotation
- ✅ All buttons remain tappable in both orientations
- ✅ Spacing remains adequate in both orientations

---

## Common Issues to Watch For

### ❌ Fat Finger Problems
**Symptom:** Frequently tapping wrong button or needing multiple attempts
**Cause:** Touch targets too small or too close together
**Current Status:** Should NOT occur (44×44px targets with 8px spacing)

### ❌ Accidental Deletions
**Symptom:** Tapping Settings but triggering Delete instead
**Cause:** Insufficient spacing or visual separation
**Current Status:** Should NOT occur (8px separator + confirmation dialog)

### ❌ Button Crowding
**Symptom:** Action buttons feel cramped, hard to distinguish
**Cause:** Insufficient gap between buttons
**Current Status:** Should NOT occur (8px gap-2 spacing)

### ❌ Broken Mobile Layout
**Symptom:** Buttons cut off, overlapping, or requiring horizontal scroll
**Cause:** Lack of responsive design
**Current Status:** Should NOT occur (proper flex-col/flex-row responsive classes)

---

## Reporting Issues

If any test scenario fails, document:

1. **Device/Browser:** Model and OS version
2. **Viewport Size:** Width × Height in pixels
3. **Scenario:** Which test scenario failed
4. **Behavior:** What happened vs. what was expected
5. **Frequency:** Does it happen consistently or intermittently?
6. **Screenshot:** Visual evidence of the issue

**Report to:** `.kiro/specs/auditoria-ux-2026-07/issues.md` (create if needed)

---

## Accessibility Considerations

### Screen Reader Testing (Optional)

**VoiceOver (iOS):**
1. Enable: Settings → Accessibility → VoiceOver
2. Navigate to AdminDashboard → Users tab
3. Verify that:
   - [ ] All buttons have clear, descriptive labels
   - [ ] Delete button clearly announces its destructive nature
   - [ ] Confirmation dialog is properly announced

**TalkBack (Android):**
1. Enable: Settings → Accessibility → TalkBack
2. Navigate to AdminDashboard → Users tab
3. Verify same criteria as VoiceOver

**Pass Criteria:**
- ✅ All interactive elements are discoverable
- ✅ Button purposes are clear from labels
- ✅ Destructive actions are clearly announced

---

## Test Results Template

```markdown
## Mobile Touch Target Test Results

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Device:** [Model and OS]

### Scenario 1: Delete Button Touch Target
- [ ] PASS / [ ] FAIL
- Notes: _______________

### Scenario 2: Visual Separator Effectiveness
- [ ] PASS / [ ] FAIL
- Notes: _______________

### Scenario 3: Button Spacing in Action Row
- [ ] PASS / [ ] FAIL
- Notes: _______________

### Scenario 4: Mobile Layout Vertical Stacking
- [ ] PASS / [ ] FAIL
- Notes: _______________

### Scenario 5: Orientation Changes
- [ ] PASS / [ ] FAIL
- Notes: _______________

### Overall Assessment
- [ ] All tests passed - no issues found
- [ ] Minor issues found (document below)
- [ ] Major issues found (document below)

### Issues Found
1. _______________
2. _______________

### Recommendations
1. _______________
2. _______________
```

---

## Conclusion

This manual testing guide complements the automated test suite (`mobile-touch-targets.test.tsx`) by verifying actual user experience on real devices.

**Automated tests verify:** Technical specifications (pixel dimensions, CSS classes)
**Manual tests verify:** Real-world usability and touch interaction quality

Both are necessary for comprehensive touch target validation.

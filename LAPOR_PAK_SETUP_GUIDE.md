# LAPOR PAK System - Implementation Guide

## Overview
The LAPOR PAK system is a complete multi-role anonymous reporting workflow integrated into the bot. It allows:
- **Reporters** (Pelapor) to submit anonymous reports and track updates
- **Team Members** (SH/PSD) to manage follow-ups and approve updates
- **Super Users** to approve reports and manage team members

---

## Environment Configuration

### Required Environment Variables

Add these to your `.env` file:

```env
# Existing variables (keep these)
TELEGRAM_ID_OWNER=your_telegram_id
BOT_TOKEN=your_bot_token

# New LAPOR PAK variables
SUPER_USER_ID=super_user_telegram_id
TEAM_GROUP_ID=-1001234567890  # Your "Tim Follow-up" group ID (negative for groups)
ENCRYPTION_KEY=lapor-pak-2026  # Change to a secure key in production
```

### How to Get Team Group ID

1. Add your bot to a Telegram group
2. Send a message: `/start`
3. Check bot logs for the group ID (will appear as negative number like `-1001234567890`)
4. Use that ID in `TEAM_GROUP_ID`

---

## Database Setup

The required tables are already defined in `db_laporpak.sql`:

```sql
-- Tables created:
- users (reporter identities, encrypted)
- team_members (SH/PSD team roster)
- laporan (reports)
- updates (follow-up updates from team)
- feedbacks (reporter feedback, requires approval)
```

Run the schema if not already applied:
```bash
mysql -u root -p your_database < db_laporpak.sql
```

---

## User Workflows

### 1. Reporter (Pelapor) Workflow

**Registration:**
- User: `/start_[REFERENCE_CODE]` (uses existing reference code system)

**Create Report:**
```
User: /lapor
Bot: Asks for report description
User: Types report (10-1000 chars)
Bot: Replies with LAP-ID (e.g., LAP-00001)
Report Status: pending_approval (waits for Super User)
```

**Track Reports:**
```
User: /laporansaya
Bot: Shows all their reports with statuses
User: Clicks report ID
Bot: Shows full detail with updates/feedback history
User: Can add Feedback or Close report
```

**Receive Updates:**
- When Super User approves report → team can add updates
- When PIC approves update → reporter receives: `[LAP-101] Update: <text>` + [Close] [Feedback]
- Reporter clicks [Feedback] → enters feedback, Super User approves, team sees feedback

---

### 2. Team Member (SH/PSD) Workflow

**Membership:**
- Admin uses: `/addmember @username SH` or `/addmember @username PSD`
- User becomes team member, can see team commands

**View Reports:**
```
User: /listlaporan
Bot: Shows active approved reports
User: Clicks report
Bot: Shows report detail + history
User: Can assign PIC or add update
```

**Assign PIC (Person In Charge):**
```
User: /pic
Bot: Asks for report ID
User: LAP-00001
Bot: Shows team members as buttons
User: Clicks member name
Bot: PIC assigned, both user and PIC notified
```

**Add Update:**
```
User: /update
Bot: Asks for report ID
User: LAP-00001
Bot: (Check: must have PIC) Asks for update text
User: Types update (5-500 chars)
Update Status: pending_approval (waits for PIC)
PIC gets: [Approve] [Reject] buttons
```

**Review as PIC:**
```
User: /listtugas
Bot: Shows reports where user is PIC
User: Clicks report
Bot: Shows pending updates + history
User: Clicks [Approve] on update
Update sent to reporter + group
```

---

### 3. Super User Workflow

**Setup Team:**
```
Super User: /addmember @sari_sh SH
Bot: Sari added to team
Super User: /addmember @budi_psd PSD
Bot: Budi added to team

Super User: /listmember
Bot: Shows: SH: Sari, PSD: Budi
```

**Approve Reports:**
```
Super User: /approve
Bot: Shows approval queue:
  📋 Laporan Baru (3 pending)
  💬 Feedback (1 pending)
Super User: Clicks [✅ Approve LAP-101]
Bot: Report marked follow_up, team notified
```

**View Summary:**
```
Super User: /summary
Bot: Shows:
  Total: 10 | Open: 3 | Follow-up: 5 | Closed: 2
```

---

## Command Reference

### Reporter Commands
- `/lapor` — Create new report
- `/laporansaya` — View my reports
- (Buttons for feedback & close in report detail)

### Team Commands  
- `/listlaporan` — View all active reports
- `/pic` — Assign PIC to report
- `/update` — Add update to report
- `/listtugas` — Show my PIC assignments

### Super User Commands
- `/approve` — Approval queue for reports & feedback
- `/addmember @user SH|PSD` — Add team member
- `/removemember @user` — Remove team member
- `/listmember` — Show team roster
- `/summary` — Show statistics

### Shared (All Users)
- `/lapor_pak_menu` (or button) — Access LAPOR PAK menu
- (Menu adapts based on user role)

---

## Data Flow Diagram

```
Reporter         Super User         Team              Group
   |                 |                |                 |
   |—— /lapor ——→    |                |                 |
   |                 |                |                 |
   |            (pending_approval)    |                 |
   |                 |                |                 |
   |            [Approve/Reject]      |                 |
   |                 |                |                 |
   |            ✅ follow_up          |                 |
   |                 |———————————— Posted ————————————→ |
   |                 |                |                 |
   |                 |            /pic command          |
   |                 |            (assign PIC)          |
   |                 |                |                 |
   |                 |            /update              |
   |                 |            (pending approval)    |
   |                 |                |                 |
   |                 |            [Approve/Reject]      |
   |                 |                |                 |
   |←————— Notified ←———————————— Approved Update      |
   |                 |                |                 |
   | [Feedback]      |                |                 |
   | (pending)       |                |                 |
   |—— Send ————→    |                |                 |
   |                 |                |                 |
   |            [Approve/Reject]      |                 |
   |                 |———————————— Posted ————————————→ |
   |                 |                |                 |
   | [Close]         |                |                 |
   |                 |———————— (closed) ———————————————→|
```

---

## State Management

All LAPOR PAK states use the existing state machine:

| State | User | Step |
|-------|------|------|
| `awaiting_laporan_description` | Reporter | Step 1: Enter report |
| `awaiting_feedback_content` | Reporter | Step 1: Enter feedback |
| `awaiting_pic_laporan_id` | Team | Step 1: Enter report ID for PIC |
| `awaiting_pic_selection` | Team | Step 2: Select PIC member |
| `awaiting_update_laporan_id` | Team | Step 1: Enter report ID for update |
| `awaiting_update_content` | Team | Step 2: Enter update text |
| `awaiting_addmember_username` | Super User | Step 1: Enter username |
| `awaiting_addmember_role` | Super User | Step 2: Select role (SH/PSD) |

Use `/cancel` to abort any workflow.

---

## Services Architecture

### `services/encryptionService.js`
- `encryptTelegramId(telegram_id)` — One-way hash for anonymity
- `generateLaporPakId(sequence)` — Create LAP-00001 format
- Validation helpers for LAP-ID format

### `services/laporanService.js`
- Report CRUD: `createReport()`, `getReporterReports()`, `closeReport()`
- Team operations: `getActiveReports()`, `assignPIC()`, `getReportsByPIC()`
- Update workflow: `addUpdate()`, `approveUpdate()`, `rejectUpdate()`
- Feedback workflow: `addFeedback()`, `approveFeedback()`, `rejectFeedback()`
- Super User: `getPendingApprovalReports()`, `approveReport()`

### `services/teamService.js`
- Team management: `addTeamMember()`, `removeTeamMember()`, `listTeamMembers()`
- Role queries: `getTeamRole()`, `isTeamMember()`
- Filtering: `listSHMembers()`, `listPSDMembers()`

### `services/notificationService.js`
- Message routing: `notifyUser()`, `notifyGroup()`
- Approval workflows: `notifyPICForApproval()`, `notifyApprovalQueue()`
- Update notifications: `notifyReporterAboutUpdate()`, `notifyPSDAboutRejection()`
- Group announcements: `notifyGroupAboutApprovedReport()`, `notifyGroupAboutApprovedFeedback()`

---

## Middleware Updates

### `middleware/stateMiddleware.js`
Added:
- `ctx.state.isSuperUser` — Check if user is Super User
- `ctx.state.teamRole` — 'SH', 'PSD', or null
- `ctx.state.isTeamMember` — Boolean flag

### `middleware/messageRouter.js`
Added state routes for all LAPOR PAK workflows

---

## Important Notes

### Anonymity & Security
- Reporter's `telegram_id` is encrypted (SHA256) in database
- Never displayed in UI or sent to group
- Only encrypted ID stored; raw ID not exposed

### Report ID Format
- Sequential: LAP-00001, LAP-00002, etc.
- Uses database auto-increment
- Always 5 digits, zero-padded

### Workflow Constraints
- Report must be APPROVED before team can add updates
- Update must have PIC before it can be submitted
- PIC must APPROVE update before reporter sees it
- Feedback must be APPROVED before team sees it

### Error Handling
- All callbacks answer with `answerCallbackQuery()` to remove button loading state
- Services throw errors; commands catch and reply with user-friendly messages
- State is cleared on error to prevent stuck states

---

## Testing Checklist

- [ ] Reporter can create report, get LAP-ID
- [ ] Reporter can list reports, view detail
- [ ] Reporter can add feedback (pending approval)
- [ ] Reporter can close report
- [ ] Super User can see approval queue
- [ ] Super User can approve/reject reports
- [ ] Team member can view active reports
- [ ] Team member can assign PIC
- [ ] PIC receives notification with [Approve]/[Reject]
- [ ] PIC approval sends update to reporter
- [ ] Reporter receives update with [Feedback]/[Close]
- [ ] Approved feedback posted to group
- [ ] `/summary` shows correct counts
- [ ] State transitions work correctly
- [ ] Role gating prevents unauthorized access

---

## Troubleshooting

**Reporter not seeing reports:**
- Check: `encrypted_telegram_id` matches in `users` table
- Verify: Report status is not 'pending_approval'

**Team member can't assign PIC:**
- Check: Team member exists in `team_members` table with `is_active=TRUE`
- Verify: `isTeamMember` flag is set in middleware

**Super User can't approve reports:**
- Check: `SUPER_USER_ID` in `.env` matches user's Telegram ID
- Verify: `isSuperUser` flag is set in middleware

**Updates not reaching PIC:**
- Check: `pic_id` is set on the report
- Verify: Notification service has access to bot instance

---

## Future Enhancements

1. **Filters & Search:**
   - Filter reports by date range, status, PIC
   - Search by report content

2. **Notifications:**
   - Send reminders for pending approvals
   - Daily summary emails to Super User

3. **Analytics:**
   - Report resolution time statistics
   - Team performance metrics
   - Most common report categories

4. **Attachments:**
   - Allow photos/documents with reports
   - Evidence storage

5. **Multi-Language:**
   - Support Indonesian & English UI

6. **Escalation:**
   - Auto-escalate old reports
   - Timeout warnings

---

## File Structure

```
bot/
├── commands/
│   ├── lapor.js                    # Create report
│   ├── laporansaya.js              # List reporter's reports
│   ├── laporan_detail.js           # Report detail + feedback
│   ├── assign_pic.js               # Assign PIC
│   ├── add_update.js               # Team add update
│   ├── list_tugas.js               # PIC's assignments
│   ├── approve.js                  # Super User approval queue
│   ├── team_management.js          # Add/remove/list members
│   ├── summary.js                  # Statistics
│   └── approval_handlers.js        # Callback handlers for approvals
├── services/
│   ├── encryptionService.js        # Encrypt telegram_id
│   ├── laporanService.js           # Report CRUD & queries
│   ├── teamService.js              # Team member management
│   └── notificationService.js      # Message routing
├── middleware/
│   ├── stateMiddleware.js          # Updated with role detection
│   └── messageRouter.js            # Updated with LAPOR PAK states
├── index.js                        # Updated with commands & callbacks
├── start.js & start_with_code.js   # Updated with menu button
└── db_laporpak.sql                 # Database schema
```

---

**Implementation Date:** June 2, 2026
**Status:** ✅ Complete - Ready for Testing

# State Management & Multi-Step Chaining Chat System

## Overview
This system enables Telegram bot users to navigate multi-step conversational flows while maintaining their state in the `ms_user` table. The bot can now handle complex task creation, listing, and removal workflows with automatic timeout handling.

---

## Architecture

### State Flow Diagram
```
User sends command → State Middleware checks timeout → State attached to ctx → Command handler → Update state → Message routing → Step handler → Final action
```

### Data Structures

#### `ms_user` Table (State Storage)
- `telegram_id` (BIGINT) - User's Telegram ID
- `current_state` (VARCHAR) - Current state (null = idle)
- `context_data` (JSON) - Multi-step intermediate data
- `updated_at` (TIMESTAMP) - Last update time (for timeout checking)

#### `reminders` Table (Task Storage)
- `task_id` (INT) - Auto-increment ID
- `telegram_id` (BIGINT) - User ID
- `task_description` (TEXT) - Task description
- `checkpoint_time` (TIME) - Reminder time (HH:MM)
- `target` (VARCHAR) - Number of reminders
- `status` (VARCHAR) - 'OPEN' or 'COMPLETED' /deprecated/

---

## State Machine States

### Add Task Flow
```
NULL → awaiting_task_description → awaiting_checkpoint_time → awaiting_target → NULL
   ↓
/add_task command (Step 1)
   ↓
User sends description (Step 2)
   ↓
User sends time (Step 3)
   ↓
User sends target number (Step 4)
   ↓
Task created → State cleared
```

### Remove Task Flow
```
NULL → awaiting_task_selection_for_removal → awaiting_remove_confirmation → NULL
   ↓
/remove_task command (Step 1)
   ↓
User selects task number (Step 2)
   ↓
User confirms (Yes/No button) (Step 3)
   ↓
Task deleted or cancelled → State cleared
```

### Timeout & Cancel
- **Timeout**: After 5 minutes of inactivity, state auto-resets with user notification
- **Cancel**: `/cancel` command at any time clears state and exits flow

---

## File Structure

### Services (`services/`)

#### `stateService.js`
Manages user state in `ms_user` table:
- `getState(telegram_id)` - Fetch current state + context
- `setState(telegram_id, state_name, context_data)` - Set new state
- `clearState(telegram_id)` - Reset to NULL
- `getContext(telegram_id)` - Extract context data
- `updateContext(telegram_id, contextUpdates)` - Merge context
- `isStateTimedOut(telegram_id)` - Check 5-minute timeout

#### `taskService.js`
Manages tasks in `reminders` table:
- `getAllTasks(telegram_id)` - List user's open tasks
- `getTaskById(task_id)` - Fetch single task
- `createTask(telegram_id, taskData)` - Create new task
- `deleteTask(task_id)` - Remove task
- `updateTask(task_id, updates)` - Update progress/status /*deprecated*/

### Middleware (`middleware/`)

#### `stateMiddleware.js`
Applied with `bot.use()` before command handlers:
- Checks for 5-minute timeout
- Sends timeout notification if expired
- Attaches `ctx.state.userState`, `ctx.state.userContext`, `ctx.state.telegram_id` to context
- Runs for every incoming message

#### `messageRouter.js`
Applied with `bot.on("message:text", messageRouter)`:
- Routes text messages to step handlers based on current state
- Handles: `awaiting_task_description`, `awaiting_checkpoint_time`, `awaiting_target`, `awaiting_task_selection_for_removal`
- Falls back to "I don't understand" if no state

### Commands (`commands/`)

#### `list_task.js`
Shows all user's open tasks with inline buttons for quick actions

#### `add_task.js`
Multi-step task creation:
- Step 1: `/add_task` command prompt
- Step 2: Collect task description
- Step 3: Collect checkpoint time (HH:MM validation)
- Step 4: Collect target number (validation for positive integer)
- Final: Insert into `reminders` table, clear state

#### `remove_task.js`
Multi-step task removal:
- Step 1: `/remove_task` displays task list with numbers
- Step 2: User selects task number (numbered emoji buttons)
- Step 3: Confirmation dialog (Yes/No buttons)
- Final: Delete from `reminders`, clear state

#### `cancel.js`
Clears current state and returns to idle mode

---

## Request Flow Example

### Adding a Task
```
1. User: /add_task
   → addTaskCommand() runs
   → Sets state: "awaiting_task_description"
   → Asks for description

2. User sends: "Water plants"
   → messageRouter() intercepts
   → Routes to addTaskStep2()
   → Validates & updates context
   → Sets state: "awaiting_checkpoint_time"
   → Asks for time

3. User sends: "14:30"
   → messageRouter() intercepts
   → Routes to addTaskStep3()
   → Validates time format
   → Sets state: "awaiting_target"
   → Asks for reminder count

4. User sends: "3"
   → messageRouter() intercepts
   → Routes to addTaskStep4()
   → Validates & inserts into reminders
   → Clears state (back to NULL)
   → Shows success message
```

---

## Key Features

### Timeout Protection
- Auto-resets after 5 minutes of inactivity
- User receives: "⏱️ Your session timed out..."
- Prevents abandoned states

### Data Persistence
- All multi-step data stored in `context_data` JSON
- Survives bot restarts if using persistent context
- Safe to refresh or retry

### User-Friendly
- Emoji buttons (1️⃣, 2️⃣, etc.) for task selection
- Inline confirmation dialogs (Yes/No)
- Clear instructions at each step
- Validation with helpful error messages

### Cancellable
- `/cancel` available at any step
- Discards all unsaved changes
- Returns to idle state

---

## Integration Checklist

✅ State middleware applied with `bot.use(stateMiddleware)`
✅ All commands registered with `bot.command()`
✅ Callback handler for button clicks with `bot.on("callback_query:data")`
✅ Message router with `bot.on("message:text", messageRouter)`
✅ Database tables created (`ms_user`, `reminders`)
✅ Error handling with try-catch
✅ State validation at each step

---

## Testing Workflow

### Basic Flow Test
1. Send `/add_task`
2. Enter "Test task" for description
3. Enter "10:30" for time
4. Enter "2" for target
5. Verify task appears in DB and `/list_task` shows it

### Timeout Test
1. Send `/add_task`
2. Wait 5+ minutes without responding
3. Send any message
4. Verify bot sends timeout notification and state clears

### Removal Test
1. Send `/remove_task`
2. Select task #1
3. Confirm deletion
4. Verify task removed from DB

### Cancel Test
1. Send `/add_task`
2. Send `/cancel`
3. Verify state cleared
4. Send normal message → "I don't understand"

---

## Future Enhancements

### Phase 2: Cron Scheduling
- Background cron job to send reminders
- Update task `progress` when reminder sent
- Reset state when user responds

### Phase 3: Task Editing
- `/edit_task` command with multi-step editing
- Change description, time, or target

### Phase 4: Recurring Tasks
- Add `interval` support (daily, weekly, etc.)
- Scheduler to create recurring task instances

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| State not persisting | DB connection lost | Check db.js credentials and MySQL connection |
| Messages ignored | Message router not registered | Verify `bot.on("message:text", messageRouter)` in index.js |
| Timeout not working | isStateTimedOut() returns false | Check DB for updated_at timestamps, verify 5-minute logic |
| Commands not working | Middleware not applied | Ensure `bot.use(stateMiddleware)` BEFORE `bot.command()` |
| Buttons not clickable | Callback handler missing | Verify `bot.on("callback_query:data")` in index.js |


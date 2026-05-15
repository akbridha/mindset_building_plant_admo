const stateService = require("../services/stateService");

/**
 * State middleware - checks for timeouts and resets state if needed
 * Attaches current user state to context for use in handlers
 * Must be registered before command handlers: bot.use(stateMiddleware)
 */
async function stateMiddleware(ctx, next) {
  try {
    const telegram_id = ctx.from.id;

    // Initialize ctx.state if not already initialized
    if (!ctx.state) {
      ctx.state = {};
    }

    // Check if state has timed out
    const isTimedOut = await stateService.isStateTimedOut(telegram_id);
    
    if (isTimedOut) {
      // Clear the timed-out state
      await stateService.clearState(telegram_id);
      
      // Notify user of timeout
      await ctx.reply(
        "⏱️ Your session timed out (5 minutes of inactivity).\n\n" +
        "Type /start to begin again."
      );
      
      // Still process the command, but state is now cleared
    }

    // Get current state and attach to context for use in handlers
    const state = await stateService.getState(telegram_id);
    ctx.state.userState = state.current_state;
    ctx.state.userContext = state.context_data || {};
    ctx.state.telegram_id = telegram_id;

    // Continue to next handler
    return next();
  } catch (error) {
    console.error("State middleware error:", error);
    // Continue even on error to not break the bot
    return next();
  }
}

module.exports = stateMiddleware;

const laporanService = require("../services/laporanService");
const teamService = require("../services/teamService");
const stateService = require("../services/stateService");

/**
 * Handler for /addmember command - add user to team
 * Format: /addmember @username SH
 * or multi-step form
 */

async function addMemberCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user is Super User
    if (!ctx.state.isSuperUser) {
      return ctx.reply(
        "❌ Hanya Super User yang dapat mengelola anggota tim.\n\n" +
        "Hubungi administrator untuk akses."
      );
    }

    // Ask for username
    await stateService.setStateOnly(telegram_id, "awaiting_addmember_username");

    return ctx.reply(
      "<b>👤 Tambah Anggota Tim</b>\n\n" +
      "Masukkan username Telegram (dengan @ atau tanpa):\n\n" +
      "<i>Contoh: @sari_sh atau sari_sh</i>",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in addMemberCommand:", error);
    return ctx.reply("❌ Error memproses perintah. Silakan coba lagi.");
  }
}

/**
 * Step 2 - Get username input
 */
async function addMemberStep2(ctx, userInput) {
  try {
    const telegram_id = ctx.state.telegram_id;
    let username = userInput.trim().toLowerCase();

    // Remove @ if present
    if (username.startsWith("@")) {
      username = username.substring(1);
    }

    // Validate username format
    if (!/^[a-z0-9_]{5,32}$/.test(username)) {
      return ctx.reply(
        "⚠️ Format username tidak valid.\n\n" +
        "Username harus 5-32 karakter alphanumeric/underscore.\n\n" +
        "Silakan coba lagi:"
      );
    }

    // Set state and ask for role
    await stateService.setState(telegram_id, "awaiting_addmember_role", {
      username: username,
    });

    return ctx.reply(
      `<b>👤 Tambah Anggota: @${username}</b>\n\n` +
      `Pilih peran:`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🏢 Section Head (SH)",
                callback_data: "member_role_SH",
              },
            ],
            [
              {
                text: "🏭 Plant Site Development (PSD)",
                callback_data: "member_role_PSD",
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error("Error in addMemberStep2:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.reply("❌ Error memproses request. Silakan coba lagi.");
  }
}

/**
 * Callback handler for role selection
 */
async function handleMemberRoleCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^member_role_(.+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const role = match[1];
    const telegram_id = ctx.state.telegram_id;
    const username = ctx.state.userContext.username;

    // For now, using username as user_id placeholder
    // In production, this should resolve @username to actual telegram_id
    const userId = username.hashCode
      ? username.hashCode()
      : parseInt(username.split("").map((c) => c.charCodeAt(0)).join(""));

    // Add team member
    await teamService.addTeamMember(userId, role, telegram_id);

    // Update message
    await ctx.editMessageText(
      `<b>✅ Anggota Ditambahkan</b>\n\n` +
      `Username: @${username}\n` +
      `Peran: ${role}\n\n` +
      `Anggota telah ditambahkan ke tim Follow-up.`,
      { parse_mode: "HTML" }
    );

    await stateService.clearState(telegram_id);
    await ctx.answerCallbackQuery("✅ Anggota berhasil ditambahkan");
  } catch (error) {
    console.error("Error in handleMemberRoleCallback:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.answerCallbackQuery("❌ Error menambahkan anggota");
  }
}

/**
 * Handler for /removemember command
 */
async function removeMemberCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user is Super User
    if (!ctx.state.isSuperUser) {
      return ctx.reply(
        "❌ Hanya Super User yang dapat mengelola anggota tim.\n\n" +
        "Hubungi administrator untuk akses."
      );
    }

    // Get list of team members
    const teamMembers = await teamService.listTeamMembers();

    if (teamMembers.length === 0) {
      return ctx.reply("❌ Tidak ada anggota tim yang dapat dihapus.");
    }

    // Show team members as buttons for removal
    const buttons = teamMembers.map((member) => [
      {
        text: `${member.username || `User ${member.user_id}`} (${member.role})`,
        callback_data: `remove_member_${member.user_id}`,
      },
    ]);

    return ctx.reply(
      "<b>👤 Hapus Anggota Tim</b>\n\n" +
      "Pilih anggota yang akan dihapus:",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: buttons,
        },
      }
    );
  } catch (error) {
    console.error("Error in removeMemberCommand:", error);
    return ctx.reply("❌ Error memproses perintah. Silakan coba lagi.");
  }
}

/**
 * Callback handler for member removal
 */
async function handleRemoveMemberCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^remove_member_(\d+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const user_id = parseInt(match[1]);

    // Remove team member
    await teamService.removeTeamMember(user_id);

    // Update message
    await ctx.editMessageText(
      `<b>✅ Anggota Dihapus</b>\n\n` +
      `Anggota telah dihapus dari tim Follow-up.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Anggota berhasil dihapus");
  } catch (error) {
    console.error("Error in handleRemoveMemberCallback:", error);
    return ctx.answerCallbackQuery("❌ Error menghapus anggota");
  }
}

/**
 * Handler for /listmember command
 */
async function listMemberCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user is Super User
    if (!ctx.state.isSuperUser) {
      return ctx.reply(
        "❌ Hanya Super User yang dapat melihat anggota tim.\n\n" +
        "Hubungi administrator untuk akses."
      );
    }

    // Get team members
    const teamMembers = await teamService.listTeamMembers();
    const memberCounts = await teamService.getTeamMemberCount();

    if (teamMembers.length === 0) {
      return ctx.reply(
        "<b>👥 Daftar Anggota Tim</b>\n\n" +
        "Tidak ada anggota tim.\n\n" +
        "Gunakan /addmember untuk menambahkan anggota.",
        { parse_mode: "HTML" }
      );
    }

    // Format team list
    let message =
      "<b>👥 Daftar Anggota Tim Follow-up</b>\n\n" +
      `Total: ${memberCounts.total} anggota\n` +
      `SH: ${memberCounts.SH} | PSD: ${memberCounts.PSD}\n\n`;

    // Group by role
    const shMembers = teamMembers.filter((m) => m.role === "SH");
    const psdMembers = teamMembers.filter((m) => m.role === "PSD");

    if (shMembers.length > 0) {
      message += `<b>🏢 Section Head (SH)</b>\n`;
      shMembers.forEach((m) => {
        message += `• @${m.username || `User ${m.user_id}`}\n`;
      });
      message += "\n";
    }

    if (psdMembers.length > 0) {
      message += `<b>🏭 Plant Site Development (PSD)</b>\n`;
      psdMembers.forEach((m) => {
        message += `• @${m.username || `User ${m.user_id}`}\n`;
      });
      message += "\n";
    }

    return ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Error in listMemberCommand:", error);
    return ctx.reply("❌ Error mengambil daftar anggota. Silakan coba lagi.");
  }
}

module.exports = {
  addMemberCommand,
  addMemberStep2,
  handleMemberRoleCallback,
  removeMemberCommand,
  handleRemoveMemberCallback,
  listMemberCommand,
};

require("dotenv").config();
const Telegraf = require("telegraf");
const TelegrafI18n = require("telegraf-i18n");
const session = require("telegraf/session");
const Stage = require("telegraf/stage");

const locationScene = require("./src/location");
const timeScene = require("./src/time");
const storeRequestScene = require("./src/storeRequest");

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

const PROJECT_ID = "critical-quintet";
const REGION = "europe-west3";
if (process.env.NODE_ENV === "production") {
  bot.telegram.setWebhook(
    `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${process.env.FUNCTION_TARGET}`
  );
  module.exports.botHook = (req, res) => {
    bot.handleUpdate(req.body, res);
  };
} else if (process.env.NODE_ENV === "test") {
  bot.telegram.setWebhook(
    `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${process.env.FUNCTION_TARGET}`
  );
  module.exports.botHookTest = (req, res) => {
    bot.handleUpdate(req.body, res);
  };
} else {
  bot.launch();
}

const i18n = new TelegrafI18n({
  defaultLanguage: "de",
  directory: "locales",
});
bot.use(i18n.middleware());

const stage = new Stage([locationScene, timeScene, storeRequestScene]);
bot.use(stage.middleware());
bot.command("start", (ctx) => {
  if (process.env.NODE_ENV === "development" && ctx.chat.id !== 770803307) {
    ctx.reply(ctx.i18n.t("general.devmode"), { parse_mode: "HTML" });
    return;
  }
  if (process.env.NODE_ENV === "development" && ctx.chat.id !== 770803307) {
    ctx.reply(ctx.i18n.t("general.testmode"), { parse_mode: "HTML" });
  }
  if (!ctx.message.message_id === 0) {
    ctx.reply(ctx.i18n.t("general.hello", { username: ctx.from.first_name }));
  }
  ctx.scene.enter("location");
});
bot.on("message", (ctx) => {
  ctx.reply(ctx.i18n.t("general.help"));
});

bot.help((ctx) => ctx.reply(ctx.i18n.t("general.help")));

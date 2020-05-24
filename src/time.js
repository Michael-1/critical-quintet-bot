const Stage = require("telegraf/stage");
const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const chrono = require("chrono-node");

const { locationCollection } = require("./db");
const { formatTimeOfDay, formatDateAndTime } = require("./helper");

const MINUTES_15 = 15 * 60 * 1000;

const timeScene = new Scene("time");
timeScene.enter(async (ctx) => {
  const choices = await getChoices(ctx);
  ctx.reply(
    ctx.i18n.t("time.initial", { location: ctx.session.location }) +
      (choices.reply_markup.inline_keyboard
        ? " " + ctx.i18n.t("time.choose")
        : ""),
    choices
  );
});

timeScene.command("cancel", Stage.leave());

timeScene.on("text", async (ctx) => {
  let parsedTimes = chrono.de.parse(ctx.message.text);
  if (parsedTimes.length === 0) {
    parsedTimes = chrono.parse(ctx.message.text);
  }
  if (parsedTimes.length === 0) {
    ctx.reply(ctx.i18n.t("time.not_understood"));
    return;
  }
  let parsedTime = parsedTimes[0];
  let time = parsedTime.date();
  if (!parsedTime.start.knownValues.hasOwnProperty("hour")) {
    ctx.reply(ctx.i18n.t("time.missing_time"));
    ctx.scene.state.lastParsedDate = time;
    return;
  }
  if (
    !parsedTime.start.knownValues.hasOwnProperty("day") &&
    !parsedTime.start.knownValues.hasOwnProperty("weekday") &&
    ctx.scene.state.lastParsedDate
  ) {
    const previousDate = ctx.scene.state.lastParsedDate;
    time.setFullYear(previousDate.getFullYear());
    time.setMonth(previousDate.getMonth());
    time.setDate(previousDate.getDate());
  }
  if (time - Date.now() < MINUTES_15) {
    ctx.reply(ctx.i18n.t("time.in_past"));
    return;
  }
  if (time.getTime() % MINUTES_15 !== 0) {
    const minutes = time.getMinutes();
    const hours = time.getHours();
    const roundedMinutes = ((((minutes + 7.5) / 15) | 0) * 15) % 60;
    const roundedHours = (((minutes / 105 + 0.5) | 0) + hours) % 24;
    time.setHours(roundedHours);
    time.setMinutes(roundedMinutes);
    time.setSeconds(0);
    time.setMilliseconds(0);
    ctx.reply(
      ctx.i18n.t("time.rounded", {
        roundedTime: formatTimeOfDay(ctx, time),
      })
    );
  }
  const choices = await getChoices(ctx, time.getTime());
  ctx.reply(ctx.i18n.t("time.conclude"), choices);
});

const getChoices = async (ctx, newTime) => {
  const timeCollection = locationCollection
    .doc(ctx.session.location)
    .collection("Time")
    .where("time", ">=", Date.now() + MINUTES_15);
  const snapshot = await timeCollection.get();
  const docs = [];
  for (const doc of snapshot.docs) {
    docs.push({ time: doc.get("time"), popularity: doc.get("popularity") });
  }
  docs.sort((a, b) =>
    a.popularity !== b.popularity
      ? b.popularity - a.popularity
      : a.time - b.time
  );
  const choices = [];
  for (const d of docs) {
    choices.push(timeButton(ctx, d.time));
    if (choices.length >= 3) {
      break;
    }
  }
  if (newTime) choices.push(timeButton(ctx, newTime));
  return Markup.inlineKeyboard(choices).extra();
};

timeScene.on("callback_query", (ctx) => {
  ctx.session.time = parseInt(ctx.update.callback_query.data);
  ctx.scene.enter("storeRequest");
});

const timeButton = (ctx, time) => [
  Markup.callbackButton(formatDateAndTime(ctx, time), time),
];

module.exports = timeScene;

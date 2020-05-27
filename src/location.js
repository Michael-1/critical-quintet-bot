const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const stringSimilarity = require("string-similarity");

const { locationCollection } = require("./db");

const locationScene = new Scene("location");

locationScene.command("cancel", (ctx) => {
  ctx.reply(ctx.i18n.t("general.cancel"));
  ctx.scene.leave();
});

locationScene.enter((ctx) => {
  locationCollection
    .orderBy("popularity", "desc")
    .limit(3)
    .get()
    .then((snapshot) => {
      const choices = [];
      for (const doc of snapshot.docs) {
        choices.push(locationButton(doc.get("name")));
        if (choices.length >= 3) {
          break;
        }
      }
      ctx.reply(
        ctx.i18n.t("location.initial") +
          (choices.length ? " " + ctx.i18n.t("location.choose") : ""),
        Markup.inlineKeyboard(choices).extra()
      );
    });
});

locationScene.on("text", async (ctx) => {
  let location = ctx.message.text.trim();
  if (!RegExp(/^\p{L}/, "u").test(location)) {
    ctx.reply(ctx.i18n.t("location.no_location"));
    return;
  }
  if (location === location.toUpperCase()) {
    location = location.toLowerCase();
  }
  if (location.charAt(0) === location.charAt(0).toLowerCase()) {
    location = location.replace(/(?:^|\s|-|["'([{])+\S/g, (c) =>
      c.toUpperCase()
    );
  }
  const doc = await locationCollection.doc(location).get();
  if (!doc.exists) {
    const allLocationSnapshot = await locationCollection.get();
    const locations = [];
    for (const doc of allLocationSnapshot.docs) {
      const object = doc.data();
      const similarity = stringSimilarity.compareTwoStrings(
        location,
        object.name
      );
      if (similarity < 0.2) continue;
      object.similarity = similarity;
      locations.push(object);
    }
    if (locations.length !== 0) {
      locations.sort((a, b) =>
        a.similarity !== b.similarity
          ? b.similarity - a.similarity
          : b.rating - a.rating
      );
      const choices = [];
      for (const l of locations) {
        choices.push(locationButton(l.name));
        if (choices.length >= 3) {
          break;
        }
      }
      choices.push(
        locationButton(ctx.i18n.t("location.confirmNew", { name: location }))
      );
      ctx.reply(
        ctx.i18n.t("location.similar"),
        Markup.inlineKeyboard(choices).extra()
      );
      return;
    }
  }
  concludeLocationSelection(ctx, location);
});

locationScene.on("callback_query", (ctx) => {
  const location = ctx.update.callback_query.data;
  if (!RegExp(/^\p{L}/, "u").test(location)) {
    ctx.telegram.answerCbQuery(ctx.update.callback_query.id);
    return;
  }
  concludeLocationSelection(ctx, location);
  ctx.telegram.answerCbQuery(ctx.update.callback_query.id);
});

const concludeLocationSelection = (ctx, location) => {
  ctx.scene.state.location = location;
  ctx.scene.enter("time", ctx.scene.state);
  ctx.scene.leave();
};

const locationButton = (label) => [Markup.callbackButton(label, label)];

module.exports = locationScene;

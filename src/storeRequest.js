const Scene = require("telegraf/scenes/base");

const { Firestore, locationCollection, requestCollection } = require("./db");
const { formatTimeOfDay, formatDate } = require("./helper");
const match = require("./match");

const storeRequestScene = new Scene("storeRequest");

const HOURS_2 = 1000 * 60 * 60 * 2;

storeRequestScene.enter(async (ctx) => {
  const request = {
    location: ctx.session.location,
    rawTime: ctx.session.time,
    time: formatTimeOfDay(ctx, ctx.session.time),
    date: formatDate(ctx, ctx.session.time),
  };
  const requestDocs = await requestCollection
    .where("requester", "==", ctx.chat.id)
    .where("time", ">", request.rawTime - HOURS_2)
    .get();
  for (const doc of requestDocs.docs) {
    const time = doc.get("time");
    const location = doc.get("location");
    if (time <= request.rawTime + HOURS_2) {
      if (location === request.location) {
        if (time === request.rawTime) {
          ctx.reply(ctx.i18n.t("store.match", request));
        } else {
          ctx.reply(
            ctx.i18n.t("store.match", {
              ...request,
              date: formatDate(ctx, time),
              time: formatTimeOfDay(ctx, time),
              newTime: request.time,
            })
          );
        }
      } else {
        ctx.reply(
          ctx.i18n.t("store.match", {
            date: formatDate(ctx, time),
            time: formatTimeOfDay(ctx, time),
            location,
            newLocation: request.location,
          })
        );
      }
      return;
    }
  }
  const locationDoc = await locationCollection.doc(request.location).get();
  if (!locationDoc.exists) {
    await locationDoc.ref.create({ name: request.location, popularity: 1 });
  } else {
    locationDoc.ref.update("popularity", Firestore.FieldValue.increment(1));
  }
  const timeDoc = await locationDoc.ref
    .collection("Time")
    .doc(request.rawTime.toString())
    .get();
  if (!timeDoc.exists) {
    timeDoc.ref.create({ time: request.rawTime, popularity: 1 });
  } else {
    locationDoc.ref.update("popularity", Firestore.FieldValue.increment(1));
  }
  ctx.reply(ctx.i18n.t("store.confirmation", request));
  if (process.env.NODE_ENV !== "production")
    ctx.reply(ctx.i18n.t("general.testmode"), { parse_mode: "HTML" });
  await requestCollection.add({
    requester: ctx.chat.id,
    requesterName: ctx.chat.first_name,
    requesterUserName: ctx.chat.username,
    time: request.rawTime,
    location: request.location,
    status: "unmatched",
    language: ctx.i18n.languageCode,
  });
  match(ctx, request.location, request.rawTime);
});

module.exports = storeRequestScene;

const Telegram = require("telegraf/telegram");
const telegram = new Telegram(process.env.BOT_TOKEN);

const { database, requestCollection } = require("./db");
const { formatTimeOfDay, formatDate } = require("./helper");

const match = (ctx, location, time) => {
  const matches = [];
  database.runTransaction((transaction) =>
    transaction
      .get(
        requestCollection
          .where("location", "==", location)
          .where("time", "==", time)
          .where("status", "==", "unmatched")
          .limit(5)
      )
      .then((snapshot) => {
        if (snapshot.docs.length < 5) {
          return;
        }
        for (let i = 0; i < 5; i++) {
          const doc = snapshot.docs[i];
          matches.push({
            requester: doc.get("requester"),
            requesterName: doc.get("requesterName"),
            language: doc.get("language"),
          });
        }
        for (let i = 0; i < 5; i++) {
          const doc = snapshot.docs[i];
          transaction.update(doc.ref, { status: "matched", matches });
          const match = matches[i];
          ctx.i18n.locale(match.language);
          let message =
            ctx.i18n.t("match.success", {
              location,
              date: formatDate(ctx, time),
              time: formatTimeOfDay(ctx, time),
            }) + "\n";
          for (const m of matches) {
            if (m.requester !== match.requester) {
              message += `  • <a href="tg://user?id=${m.requester}">${m.requesterName}</a>\n`;
            }
          }
          message += ctx.i18n.t("match.follow_up");
          message += "\n🚴🚴‍♀️🚴🏿‍♂️🚴🏽🚴🏻‍♀️";
          telegram
            .sendMessage(match.requester, message, { parse_mode: "HTML" })
            .catch((e) => {
              console.error(e);
            });
        }
      })
  );
};

module.exports = match;

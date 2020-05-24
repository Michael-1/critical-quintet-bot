const dayjs = require("dayjs");
const localizedFormat = require("dayjs/plugin/localizedFormat");
dayjs.extend(localizedFormat);
require("dayjs/locale/de");

const formatDate = (ctx, time) =>
  dayjs(time).locale(ctx.i18n.languageCode).format("LL");
const formatTimeOfDay = (ctx, time) =>
  dayjs(time).locale(ctx.i18n.languageCode).format("LT");
const formatDateAndTime = (ctx, time) =>
  dayjs(time).locale(ctx.i18n.languageCode).format("LLLL");

/**/

module.exports = {
  formatDate,
  formatTimeOfDay,
  formatDateAndTime,
};

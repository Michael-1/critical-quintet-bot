const { Firestore } = require("@google-cloud/firestore");

const database = new Firestore({
  projectId: "critical-quintet",
});

database.settings({ ignoreUndefinedProperties: true });

const environmentPostfix =
  process.env.NODE_ENV !== "production" ? "-" + process.env.NODE_ENV : "";

module.exports = {
  Firestore,
  database,
  locationCollection: database.collection("Location" + environmentPostfix),
  requestCollection: database.collection("Request" + environmentPostfix),
};

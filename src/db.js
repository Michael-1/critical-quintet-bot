const { Firestore } = require("@google-cloud/firestore");

const database = new Firestore({
  projectId: "critical-quintet",
});

database.settings({ ignoreUndefinedProperties: true });

module.exports = {
  Firestore,
  database,
  locationCollection: database.collection("Location"),
  requestCollection: database.collection("Request"),
};

const mongoose = require('mongoose');
require('./models/entry');
require('./models/event');
require('./models/race');
require('./models/rider');
require('./models/promoter');
const express = require('express');
const _async = require('async-express');
const app = express();

app.use(express.json());

const mongoConnect = _async(async (req, res, next) => {
  await mongoose.connect(process.env.DB_URI, {
    connectTimeoutMS: 5000,
    useNewUrlParser: true,
  });
  next();
});

/**
 * Establish a connection to the mongo database, then continue the request
 **/
app.use(mongoConnect);

require('./routes/event')(app);
require('./routes/promoter')(app);

module.exports = app;

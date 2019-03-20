const mongoose = require('mongoose');
const express = require('express');
const asyncHandler = require('express-async-handler');
const app = express();

app.use(express.json());

/**
 * Establish a connection to the mongo database, then continue the request
 **/
app.use(
  asyncHandler(async (req, res, next) => {
    await mongoose.connect(process.env.DB_URI, {
      connectTimeoutMS: 5000,
      useNewUrlParser: true,
    });
    next();
  })
);

app.use((req, res) => res.end('Hello World'));

module.exports = app;

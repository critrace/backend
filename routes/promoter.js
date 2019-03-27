const mongoose = require('mongoose');
const Promoter = mongoose.model('Promoter');
const _async = require('async-express');
const emailValidator = require('email-validator');

module.exports = (app) => {
  app.post('/promoter', create);
  app.post('/promoter/login', login);
};

const create = _async(async (req, res) => {
  if (!req.body.password || req.body.password.length < 6) {
    res.status(400);
    res.send('Please make sure your password is at least 6 characters.');
    return;
  }
  if (!emailValidator.validate(req.body.email)) {
    res.status(400);
    res.send('Invalid email supplied.');
    return;
  }
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(req.body.password, salt);
  const created = await Promoter.create({ ...req.body, passwordHash });
  res.json(created);
});

const login = _async(async (req, res) => {
  const promoter = await Promoter.findOne({
    email: req.body.email
  }).lean().exec();
  if (!promoter) {
    res.status(400);
    res.send('Promoter email not registered.');
    return;
  }
  const passwordMatch = await bcrypt.compare(req.body.password, promoter.passwordHash);
  if (!passwordMatch) {
    res.status(401);
    res.send('There was a problem logging you in.');
    return;
  }
  const token = jwt.sign({ ...promoter, passwordHash: '' }, process.env.WEB_TOKEN_SECRET);
  res.json({ token });
});

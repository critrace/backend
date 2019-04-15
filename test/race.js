import test from 'ava'
import supertest from 'supertest'
import app from '..'
import nanoid from 'nanoid'
import moment from 'moment'

test.before(async (t) => {
  const { body: promoter } = await supertest(app)
    .post('/promoters')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(200)
  const { body: series } = await supertest(app)
    .post('/series')
    .send({
      token: promoter.token,
      name: 'A Test Series',
    })
    .expect(200)
  const { body: event } = await supertest(app)
    .post('/events')
    .send({
      token: promoter.token,
      name: 'A test event',
      startDate: new Date(),
      seriesId: series._id,
    })
    .expect(200)
  const { body: race } = await supertest(app)
    .post('/races')
    .send({
      token: promoter.token,
      name: 'A Test Race',
      eventId: event._id,
      scheduledStartTime: '15:00',
    })
    .expect(200)
  const { body: rider } = await supertest(app)
    .post('/riders')
    .send({
      token: promoter.token,
      license: nanoid(),
      licenseExpirationDate: moment().add(1, 'year'),
      firstname: 'will',
      lastname: 'guy',
    })
    .expect(200)
  Object.assign(t.context, {
    promoter,
    series,
    event,
    race,
    rider,
  })
})

test('should fail to start if not promoter', async (t) => {
  const { body: promoter } = await supertest(app)
    .post('/promoters')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(200)
  await supertest(app)
    .post('/races/start')
    .send({
      token: promoter.token,
      _id: t.context.race._id,
    })
    .expect(401)
  t.pass()
})

test('should start race', async (t) => {
  await supertest(app)
    .post('/races/start')
    .send({
      token: t.context.promoter.token,
      _id: t.context.race._id,
      actualStart: new Date(),
    })
    .expect(204)
  // Should fail to start twice
  await supertest(app)
    .post('/races/start')
    .send({
      token: t.context.promoter.token,
      _id: t.context.race._id,
      actualStart: new Date(),
    })
    .expect(400)
  t.pass()
})

test('should get entries', async (t) => {
  await supertest(app)
    .get('/races/entries')
    .query({
      raceId: t.context.race._id,
    })
    .expect(200)
  t.pass()
})

test('should get races if not authed', async (t) => {
  await supertest(app)
    .get('/races')
    .expect(200)
  t.pass()
})

test('should get races', async (t) => {
  await supertest(app)
    .get('/races')
    .query({
      token: t.context.promoter.token,
    })
    .expect(200)
  t.pass()
})

test('should get race by id', async (t) => {
  const { body: race } = await supertest(app)
    .get('/races')
    .query({
      _id: t.context.race._id,
    })
    .expect(200)
  t.true(race._id === t.context.race._id)
  t.pass()
})

test('should get races by event', async (t) => {
  const { body: races } = await supertest(app)
    .get('/races')
    .query({
      eventId: t.context.event._id,
    })
    .expect(200)
  t.truthy(races.find((race) => race._id === t.context.race._id))
  t.pass()
})

test('should create entry', async (t) => {
  const { body: bib } = await supertest(app)
    .post('/bibs')
    .send({
      token: t.context.promoter.token,
      seriesId: t.context.series._id,
      riderId: t.context.rider._id,
      bibNumber: 5000,
    })
    .expect(200)
  await supertest(app)
    .post('/races/entry')
    .send({
      token: t.context.promoter.token,
      riderId: t.context.rider._id,
      raceId: t.context.race._id,
      bibId: bib._id,
    })
    .expect(200)
  t.pass()
})

test('should delete entry', async (t) => {
  const { body: rider } = await supertest(app)
    .post('/riders')
    .send({
      token: t.context.promoter.token,
      license: nanoid(),
      licenseExpirationDate: moment().add(1, 'year'),
      firstname: 'will',
      lastname: 'guy',
    })
    .expect(200)
  const { body: bib } = await supertest(app)
    .post('/bibs')
    .send({
      token: t.context.promoter.token,
      seriesId: t.context.series._id,
      riderId: rider._id,
      bibNumber: 5001,
    })
    .expect(200)
  await supertest(app)
    .post('/races/entry')
    .send({
      token: t.context.promoter.token,
      raceId: t.context.race._id,
      riderId: rider._id,
      bibId: bib._id,
    })
    .expect(200)
  await supertest(app)
    .delete('/races/entries')
    .send({
      token: t.context.promoter.token,
      raceId: t.context.race._id,
      riderId: rider._id,
    })
    .expect(204)
  t.pass()
})

test('should fail to create entry if not promoter', async (t) => {
  const { body: promoter } = await supertest(app)
    .post('/promoters')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(200)
  await supertest(app)
    .post('/races/entry')
    .send({
      token: promoter.token,
      raceId: t.context.race._id,
    })
    .expect(401)
  t.pass()
})

test('should get leaderboard', async (t) => {
  const transponder = nanoid()
  const { body: rider } = await supertest(app)
    .post('/riders')
    .send({
      token: t.context.promoter.token,
      license: nanoid(),
      licenseExpirationDate: moment().add(1, 'year'),
      firstname: 'keith',
      lastname: 'noot',
      transponder,
    })
    .expect(200)
  const { body: bib } = await supertest(app)
    .post('/bibs')
    .send({
      token: t.context.promoter.token,
      seriesId: t.context.series._id,
      riderId: rider._id,
      bibNumber: 5001,
    })
    .expect(200)
  await supertest(app)
    .post('/races/entry')
    .send({
      token: t.context.promoter.token,
      riderId: rider._id,
      raceId: t.context.race._id,
      bibId: bib._id,
    })
    .expect(200)
  // Add 5 laps
  for (let x = 0; x < 5; x += 1) {
    await supertest(app)
      .post('/passings')
      .send({
        token: t.context.promoter.token,
        raceId: t.context.race._id,
        transponder,
        riderId: rider._id,
        date: moment().add(x, 'minutes'),
      })
      .expect(204)
  }
  await supertest(app)
    .get('/races/leaderboard')
    .query({
      raceId: t.context.race._id,
    })
    .expect(200)
  t.pass()
})

test('should delete a race', async (t) => {
  const { body: race } = await supertest(app)
    .post('/races')
    .send({
      token: t.context.promoter.token,
      name: 'A Test Race',
      eventId: t.context.event._id,
      scheduledStartTime: '15:00',
    })
    .expect(200)
  await supertest(app)
    .delete('/races')
    .send({
      token: t.context.promoter.token,
      _id: race._id,
    })
    .expect(204)
  t.pass()
})

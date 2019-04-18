import test from 'ava'
import supertest from 'supertest'
import app from '..'
import nanoid from 'nanoid'
import moment from 'moment'
import randomObjectId from 'random-objectid'

const createPromoter = async (token, body = {}) =>
  supertest(app)
    .post('/promoters')
    .send(
      Object.assign(
        {
          token,
          email: `${nanoid()}@email.com`,
          password: 'password',
        },
        body
      )
    )

const createSeries = async (token, body = {}) =>
  supertest(app)
    .post('/series')
    .send(
      Object.assign(
        {
          token,
          name: nanoid(),
        },
        body
      )
    )

const createEvent = async (token, body = {}) =>
  supertest(app)
    .post('/events')
    .send(
      Object.assign(
        {
          token,
          name: nanoid(),
          startDate: new Date(),
        },
        body
      )
    )

const createRace = async (token, body = {}) =>
  supertest(app)
    .post('/races')
    .send(
      Object.assign(
        {
          token,
          name: nanoid(),
          scheduledStartTime: '00:00',
        },
        body
      )
    )

const createEntry = async (token, body = {}) =>
  supertest(app)
    .post('/entry')
    .send(
      Object.assign(
        {
          token,
        },
        body
      )
    )

const createRider = async (token, body = {}) =>
  supertest(app)
    .post('/riders')
    .send(
      Object.assign(
        {
          token,
          license: nanoid(),
          licenseExpirationDate: moment().add(1, 'year'),
          firstname: nanoid(),
          lastname: nanoid(),
          transponder: nanoid(),
        },
        body
      )
    )

const createBib = async (token, body = {}) =>
  supertest(app)
    .post('/bibs')
    .send(
      Object.assign(
        {
          token,
          bibNumber: Math.floor(Math.random() * 1000),
        },
        body
      )
    )

const getBibs = async (token, query = {}) =>
  supertest(app)
    .get('/bibs')
    .query(
      Object.assign(
        {
          token,
        },
        query
      )
    )

test.before(async (t) => {
  const { body: promoter } = await createPromoter(app)
  t.context.promoter = promoter
})

test('should create a bib', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  await createBib(t.context.promoter.token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  t.pass()
})

test('should load bibs for series', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  const { body: bibs } = await getBibs(token, {
    seriesId: series._id,
  })
  t.true(bibs.length === 1)
  t.pass()
})

test('should load bibs for race', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  const { body: bibs } = await getBibs(token, {
    raceId: race._id,
  })
  t.true(bibs.length === 1)
  t.pass()
})

test('should load bib by id', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .get('/bibs')
    .query({
      _id: bib._id,
    })
  t.pass()
})

test('should delete bib by id', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .delete('/bibs')
    .send({
      token,
      _id: bib._id,
    })
  t.pass()
})

test('should fail to delete bib if not promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: promoter } = await createPromoter()
  const { body: series } = await createSeries(promoter.token)
  const { body: rider } = await createRider(promoter.token)
  const { body: bib } = await createBib(promoter.token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .delete('/bibs')
    .send({
      token,
      _id: bib._id,
    })
    .expect(401)
  t.pass()
})

test('should fail to delete non-existent bib', async (t) => {
  const { token } = t.context.promoter
  await supertest(app)
    .delete('/bibs')
    .send({
      token,
      _id: await randomObjectId(),
    })
    .expect(404)
  t.pass()
})

test('should update bib number', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .put('/bibs')
    .send({
      token,
      where: {
        _id: bib._id,
      },
      changes: {
        bibNumber: 1,
      },
    })
  t.pass()
})

test('should fail to update bib if not series promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  const { body: promoter } = await createPromoter(token)
  await supertest(app)
    .put('/bibs')
    .send({
      token: promoter.token,
      where: {
        _id: bib._id,
      },
      changes: {
        bibNumber: 1,
      },
    })
    .expect(401)
  t.pass()
})

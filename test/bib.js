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
      name: 'A Test Event',
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
      firstname: 'test',
      lastname: 'test',
      transponder: nanoid(),
    })
    .expect(200)
  const { body: bib } = await supertest(app)
    .post('/bibs')
    .send({
      token: promoter.token,
      seriesId: series._id,
      riderId: rider._id,
      bibNumber: 1,
    })
    .expect(200)
  Object.assign(t.context, {
    promoter,
    series,
    event,
    race,
    rider,
    bib,
  })
})

test('should create a bib', async (t) => {
  const { body: rider } = await supertest(app)
    .post('/riders')
    .send({
      token: t.context.promoter.token,
      license: nanoid(),
      licenseExpirationDate: moment().add(1, 'year'),
      firstname: 'test',
      lastname: 'test',
      transponder: nanoid(),
    })
    .expect(200)
  await supertest(app)
    .post('/bibs')
    .send({
      token: t.context.promoter.token,
      seriesId: t.context.series._id,
      riderId: rider._id,
      bibNumber: 100,
    })
    .expect(200)
  await supertest(app)
    .post('/bibs')
    .send({
      token: t.context.promoter.token,
      seriesId: t.context.series._id,
      riderId: rider._id,
      bibNumber: 100,
    })
    .expect(400)
  t.pass()
})

test('should load bibs for series', async (t) => {
  await supertest(app)
    .get('/bibs')
    .query({
      seriesId: t.context.series._id,
    })
    .expect(200)
  t.pass()
})

test('should load bibs for race', async (t) => {
  await supertest(app)
    .get('/bibs')
    .query({
      raceId: t.context.race._id,
    })
    .expect(200)
  t.pass()
})

test('should load bib by id', async (t) => {
  const { body: rider } = await supertest(app)
    .post('/riders')
    .send({
      token: t.context.promoter.token,
      license: nanoid(),
      licenseExpirationDate: moment().add(1, 'year'),
      firstname: 'test',
      lastname: 'test',
      transponder: nanoid(),
    })
    .expect(200)
  const { body: bib } = await supertest(app)
    .post('/bibs')
    .send({
      token: t.context.promoter.token,
      seriesId: t.context.series._id,
      riderId: rider._id,
      bibNumber: 101,
    })
    .expect(200)
  await supertest(app)
    .get('/bibs')
    .query({
      _id: bib._id,
    })
    .expect(200)
  t.pass()
})

test('should delete bib by id', async (t) => {
  const { body: rider } = await supertest(app)
    .post('/riders')
    .send({
      token: t.context.promoter.token,
      license: nanoid(),
      licenseExpirationDate: moment().add(1, 'year'),
      firstname: 'test',
      lastname: 'test',
      transponder: nanoid(),
    })
    .expect(200)
  const { body: bib } = await supertest(app)
    .post('/bibs')
    .send({
      token: t.context.promoter.token,
      seriesId: t.context.series._id,
      riderId: rider._id,
      bibNumber: 102,
    })
    .expect(200)
  await supertest(app)
    .delete('/bibs')
    .send({
      token: t.context.promoter.token,
      _id: bib._id,
    })
    .expect(204)
  t.pass()
})

test('should fail to delete bib if not promoter', async (t) => {
  const { body: promoter } = await supertest(app)
    .post('/promoters')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(200)
  await supertest(app)
    .delete('/bibs')
    .send({
      token: promoter.token,
      _id: t.context.bib._id,
    })
    .expect(401)
  t.pass()
})

test('should fail to delete non-existent bib', async (t) => {
  await supertest(app)
    .delete('/bibs')
    .send({
      token: t.context.promoter.token,
      _id: t.context.series._id,
    })
    .expect(404)
  t.pass()
})

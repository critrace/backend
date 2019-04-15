import test from 'ava'
import supertest from 'supertest'
import app from '..'
import moment from 'moment'
import nanoid from 'nanoid'

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

test('should create passing', async (t) => {
  await supertest(app)
    .post('/passings')
    .send({
      token: t.context.promoter.token,
      transponder: nanoid(),
      date: new Date(),
      raceId: t.context.race._id,
    })
    .expect(204)
  t.pass()
})

test('should fail to create passing for non-existant race', async (t) => {
  await supertest(app)
    .post('/passings')
    .send({
      token: t.context.promoter.token,
      transponder: nanoid(),
      date: new Date(),
      raceId: t.context.promoter._id,
    })
    .expect(404)
  t.pass()
})

test('should fail to create passing if not series promoter', async (t) => {
  const { body: promoter } = await supertest(app)
    .post('/promoters')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(200)
  await supertest(app)
    .post('/passings')
    .send({
      token: promoter.token,
      transponder: nanoid(),
      date: new Date(),
      raceId: t.context.race._id,
    })
    .expect(401)
  t.pass()
})

test('should delete passing', async (t) => {
  await supertest(app)
    .post('/passings')
    .send({
      token: t.context.promoter.token,
      transponder: nanoid(),
      date: new Date(),
      raceId: t.context.race._id,
    })
    .expect(204)
  const { body: passings } = await supertest(app)
    .get('/passings')
    .query({
      raceId: t.context.race._id,
    })
    .expect(200)
  await supertest(app)
    .delete('/passings')
    .send({
      token: t.context.promoter.token,
      _id: passings[0]._id,
    })
    .expect(204)
  t.pass()
})

test('should fail to delete passing if not series promoter', async (t) => {
  const { body: promoter } = await supertest(app)
    .post('/promoters')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(200)
  const { body: passings } = await supertest(app)
    .get('/passings')
    .query({
      raceId: t.context.race._id,
    })
    .expect(200)
  await supertest(app)
    .delete('/passings')
    .send({
      token: promoter.token,
      _id: passings[0]._id,
    })
    .expect(401)
  t.pass()
})

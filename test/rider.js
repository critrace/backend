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
  const { body: rider } = await supertest(app)
    .post('/riders')
    .send({
      token: promoter.token,
      license: nanoid(),
      licenseExpirationDate: moment().add(1, 'year'),
      firstname: 'john',
      lastname: 'doe',
    })
    .expect(200)
  Object.assign(t.context, {
    promoter,
    rider,
  })
})

test('should create one day rider', async (t) => {
  await supertest(app)
    .post('/riders')
    .send({
      token: t.context.promoter.token,
      firstname: 'tom',
      lastname: 'willaby',
    })
    .expect(200)
  t.pass()
})

test('should search for rider', async (t) => {
  const { body } = await supertest(app)
    .get('/riders/search')
    .query({
      search: 'jo',
    })
    .expect(200)
  t.true(body.length !== 0)
  t.pass()
})

test('should update rider', async (t) => {
  await supertest(app)
    .put('/riders')
    .send({
      token: t.context.promoter.token,
      where: {
        _id: t.context.rider._id,
      },
      changes: {
        firstname: 'jonathan',
      },
    })
    .expect(204)
  t.pass()
})

test('should fail to update rider with no where', async (t) => {
  await supertest(app)
    .put('/riders')
    .send({
      token: t.context.promoter.token,
      changes: {
        firstname: 'jonathan',
      },
    })
    .expect(400)
  t.pass()
})

test('should fail to update rider if not authenticated', async (t) => {
  await supertest(app)
    .put('/riders')
    .send({
      where: {
        _id: t.context.rider._id,
      },
      changes: {
        firstname: 'jonathan',
      },
    })
    .expect(401)
  t.pass()
})

test('should load multiple riders', async (t) => {
  const { body: riders } = await supertest(app)
    .post('/riders/byId')
    .send({
      _ids: [t.context.rider._id],
    })
    .expect(200)
  t.true(riders[0]._id === t.context.rider._id)
  t.true(riders.length === 1)
  t.pass()
})

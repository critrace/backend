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

test('should search for rider', async (t) => {
  const { body } = await supertest(app)
    .get('/riders/search')
    .query({
      search: 'john',
    })
    .expect(200)
  t.true(body.length === 1)
  t.pass()
})

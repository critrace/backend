import supertest from 'supertest'
import app from '../build'
import nanoid from 'nanoid'
import moment from 'moment'
import test from 'ava'

test('api stub', (t) => t.pass())

export const createPromoter = (token, body = {}) =>
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

export const createSeries = (token, body = {}) =>
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

export const createEvent = (token, body = {}) =>
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

export const createRace = (token, body = {}) =>
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

export const createEntry = (token, body = {}) =>
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

export const createRider = (token, body = {}) =>
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

export const createBib = (token, body = {}) =>
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

export const getBibs = (token, query = {}) =>
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

export const deleteBib = (token, body = {}) =>
  supertest(app)
    .delete('/bibs')
    .send(
      Object.assign(
        {
          token,
        },
        body
      )
    )

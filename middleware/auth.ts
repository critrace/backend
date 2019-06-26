import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import express from 'express'

export type AuthReq = express.Request & {
  promoter: {
    _id: mongoose.Types.ObjectId
  }
}

export type OptionalAuthReq = express.Request & {
  promoter?:
    | {
        _id: mongoose.Types.ObjectId
      }
    | {}
}

export default (
  req: AuthReq,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    loadPromoter(req)
    if (!req.promoter) {
      res.status(401)
      res.send('No authentication token supplied in body or query.')
      res.end()
      return
    }
    next()
  } catch (err) {
    res.status(500)
    res.send(err.toString())
  }
}

export const authNotRequired = (
  req: OptionalAuthReq,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    loadPromoter(req)
    next()
  } catch (err) {
    req.promoter = {}
    next()
  }
}

const loadPromoter = (req: AuthReq | OptionalAuthReq) => {
  const token = req.body.token || req.query.token
  if (!token) return
  const promoter: any = jwt.verify(token, process.env.WEB_TOKEN_SECRET)
  if (promoter._id) {
    promoter._id = mongoose.Types.ObjectId(promoter._id)
  }
  req.promoter = promoter
}

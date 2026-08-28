import type { NextFunction, Request, Response } from 'express'

/**
 * حماية Swagger UI/JSON بيوزر+باسورد (HTTP Basic Auth) — عشان مستند الـ API
 * كامل (كل الـ endpoints والـ schemas) يبقى مش عام للكل على الإنترنت.
 * لو SWAGGER_USER/SWAGGER_PASSWORD مش متظبطين في البيئة (زي وقت التطوير
 * المحلي)، الحماية بتتعدّى تلقائيًا من غير ما تعطّل حد.
 */
export function swaggerBasicAuth(req: Request, res: Response, next: NextFunction): void {
  const user = process.env.SWAGGER_USER
  const pass = process.env.SWAGGER_PASSWORD
  if (!user || !pass) {
    next()
    return
  }

  const header = req.headers.authorization
  if (header?.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf-8')
    const separatorIndex = decoded.indexOf(':')
    const reqUser = decoded.slice(0, separatorIndex)
    const reqPass = decoded.slice(separatorIndex + 1)
    if (reqUser === user && reqPass === pass) {
      next()
      return
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="STEP API Docs"')
  res.status(401).send('Authentication required')
}

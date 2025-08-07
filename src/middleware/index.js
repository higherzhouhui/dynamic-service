const {
  authErrorResp,
  tokenInvalidateErrorResp
} = require('./request')

const jwt = require('jsonwebtoken')
const getLogger = require('../utils/logger');



function logger(req, resp, next) {
  if (req.method == 'GET') {
    getLogger('middleware').info(
      `用户: ${req.username} id: ${req.id}-GET请求url: ${req.url} -请求参数：${JSON.stringify(
        req.query
      )}`
    )
  } else if (req.method == 'POST') {
    getLogger('middleware').info(
      `用户: ${req.username} id: ${req.id}-POST请求url: ${req.url} -请求body: ${JSON.stringify(
        req.body
      )}`
    )
  }
  next()
}

async function token_auth(req, resp, next) {
  let token = req.headers['authorization']
  getLogger('middleware').info('token:', token)
  if (token == '' || token == undefined) {
    return authErrorResp(resp)
  }
  if (!token.startsWith('Bearer ')) {
    return tokenInvalidateErrorResp(resp)
  }
  token = token.substring(7)
  jwt.verify(token, 'FACE_LIVE', (error, jwtData) => {
    if (error) {
      return tokenInvalidateErrorResp(resp, 'token is expired')
    }
    req.id = jwtData.user.id
    req.username = jwtData.user.username
    next()
  })
}

module.exports = {
  logger,
  token_auth
}

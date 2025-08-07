// 环境变量加载提前
require('dotenv').config({ path: './.env' });
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const getLogger = require('./utils/logger');

const { logger } = require('./middleware/index');
require('./utils/swaggerUI');

const app = express();

// 跨域配置
// app.use(cors());

// 配置静态文件目录（修正路径）
// app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ limit: '2mb', extended: false }));

// 限流中间件
const rateLimitCache = new Map();
setInterval(() => rateLimitCache.clear(), 20000);
const rateLimiter = (req, res, next) => {
  let ip = req.headers['authorization'] || req.body.id;
  if (!rateLimitCache.has(ip)) {
    rateLimitCache.set(ip, 1);
  } else {
    const count = rateLimitCache.get(ip);
    if (count >= 100) {
      return res.status(429).send('Too Many Requests');
    }
    rateLimitCache.set(ip, count + 1);
  }
  next();
};
app.use(rateLimiter);

// 白名单校验中间件
// const white_list = require('./config/whiteList');
// app.use((req, resp, next) => {
//   const path = req.path;
//   if (
//     white_list.some((item) => (typeof item === 'string' ? item === path : item instanceof RegExp && item.test(path))) ||
//     path.includes('/video/')
//   ) {
//     return next();
//   }
//   token_auth(req, resp, next);
// });

// 日志中间件
app.use(logger);

// 路由
app.use('/v1', require('./router/index'));

const port = process.env.INIT == 1 ? 10002 : process.env.SERVER_PORT
app.listen(port, function () {
  getLogger('system').info('1.Api server is listen port:' + port)
})


module.exports = app;

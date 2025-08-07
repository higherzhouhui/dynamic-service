// 日志工具，统一 log4js 配置和 logger 获取
const log4js = require('log4js');
const path = require('path');

log4js.configure({
  appenders: {
    out: { type: 'console' },
    app: {
      type: 'dateFile',
      filename: path.join(__dirname, '../../logs/system/s'),
      pattern: 'yyyy-MM-dd.log',
      alwaysIncludePattern: true
    }
  },
  categories: {
    default: { appenders: ['out', 'app'], level: 'debug' }
  }
});

/**
 * 获取指定模块的 logger
 * @param {string} name logger 名称
 */
function getLogger(name = 'system') {
  return log4js.getLogger(name);
}

module.exports = getLogger; 
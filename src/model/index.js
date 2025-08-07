const { DataTypes } = require('sequelize')
const db = require('./database')

const User = db.sequelize.define(
  'User',
  {
    // 基础用户信息
    lang: { type: DataTypes.STRING, defaultValue: '' },
    uuid: { type: DataTypes.STRING, defaultValue: ''},
    
    // 访问统计核心字段
    ip: { type: DataTypes.STRING, defaultValue: '' }, // IP地址
    address: { type: DataTypes.STRING, defaultValue: '' }, // 国家+城市
    // 页面访问信息
    originUrl: { type: DataTypes.TEXT, defaultValue: 'direct'}, // 来源页面
    
    // 访问行为统计
    downNum: { type: DataTypes.INTEGER, defaultValue: 0 }, // 点击次数
    visitNum: { type: DataTypes.INTEGER, defaultValue: 1 }, // 登录次数
    stayTime: { type: DataTypes.BIGINT, defaultValue: 30 }, // 停留时间(秒)
    
    // 时间相关
    comeTime: { type: DataTypes.BIGINT, defaultValue: 0}, // 首次访问时间
    leaveTime: { type: DataTypes.BIGINT, defaultValue: 0}, // 最后离开时间

    // 设备信息
    deviceType: { type: DataTypes.TEXT, defaultValue: '' }, // 设备类型(mobile/desktop/tablet)
    platform: { type: DataTypes.STRING, defaultValue: '' }, // 平台
    // 其他统计信息
    screenResolution: { type: DataTypes.STRING, defaultValue: '' }, // 屏幕分辨率
    timezone: { type: DataTypes.STRING, defaultValue: '' }, // 时区
    // 是否为管理员
    manager: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: 'user',
    indexes: [
      {
        fields: ['uuid']
      },
      {
        fields: ['ip']
      },
    ]
  }
)
// User.sync({ alter: true })

module.exports = {
  User
}

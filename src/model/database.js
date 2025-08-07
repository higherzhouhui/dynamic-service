const { Sequelize, QueryTypes, Op } = require('sequelize')

const getLogger = require('../utils/logger');
const logger = getLogger('system');

const config = process.env


// 配置数据库连接
const sequelize = new Sequelize(
  config.DB_NAME,
  config.DB_USER,
  config.DB_PASSWORD,
  {
    host: config.DB_HOST,
    dialect: 'mysql',
    logging: false,
    // define: {
    //   createdAt: 'created_at',
    //   updatedAt: 'updated_at',
    //   deletedAt: 'deleted_at',
    //   underscored: true
    // }
    pool: {
      max: 30,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
)

// 测试连接
async function connectDB() {
  try {
    await sequelize.authenticate()
    logger.info('2.Mysql connection has establish successfully!')
    // 初始化
    if (process.env.INIT == 1) {
      await sequelize.sync({ force: true }); // 删除并重新创建所有表
      logger.log('3.waiting...');
      setTimeout(() => {
        logger.log(`4.Init Successful`)
        logger.log('5.You can run pm2')
        process.exit(0)
      }, 2000);
    } else {
      // await sequelize.sync({ force: false }); // 将 force 设置为 true 将会删除并重新创建所有表
      await sequelize.sync({ alter: true }); // 将 force 设置为 true 将会删除并重新创建所有表
      logger.log('3.Database synchronization successful!');
      logger.log('4.Server started successful!');
    }
  } catch (error) {
    logger.error('connect db error', error)
  }
}

connectDB()

module.exports = {
  sequelize,
  QueryTypes,
  Op,
}

const getLogger = require('../utils/logger');
const { errorResp, successResp } = require('../middleware/request')
const Model = require('../model/index')
const dataBase = require('../model/database')

/**
 * post /api/v1/login
 * @summary 访问
 * @tags user
 * @description 访问接口
 * @param {string}  id.query.required  -  id
 * @param {string}  hash.query.required  -  hash
 * @param {string}  authDate.query.required  -  authDate
 * @param {string}  username.query.required  -  username
 * @security - Authorization
 */
async function login(req, resp) {
  getLogger('user').info('发起访问', req.body)
  try {
    await dataBase.sequelize.transaction(async (t) => {
      if (req.body.id) {
        const isUser = await Model.User.findOne({ where: { id: req.body.id } })
        if (isUser) {
          await isUser.update({
            visitNum: isUser.visitNum + 1
          }, {
            transaction: t
          })
          return successResp(resp, { ...isUser.dataValues }, '访问+1')
        }
      }
      const user = await Model.User.create(req.body, { transaction: t })
      return successResp(resp, { id: user.id }, '第一次')
    })
  } catch (error) {
    getLogger('user').error('Login failed:', error)
    console.error(`Login failed:${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

async function loginOut(req, resp) {
  getLogger('user').info('发起退出', req.body)
  try {
    await dataBase.sequelize.transaction(async (t) => {
      if (req.body.id) {
        const user = await Model.User.findOne({ where: { id: req.body.id } })
        if (user) {
          await user.update({
            leaveTime: req.body.leaveTime,
            stayTime: req.body.leaveTime - user.comeTime,
          }, {
            transaction: t
          })
          return successResp(resp, { id: user.id }, '退出成功')
        } else {
          return errorResp(resp, 404, '用户不存在')
        }
      } else {
        return errorResp(resp, 400, '缺少用户ID')
      }
    })
  } catch (error) {
    getLogger('user').error('loginOut failed:', error)
    console.error(`loginOut failed:${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

async function clickDown(req, resp) {
  getLogger('user').info('发起点击下载', req.body)
  try {
    await dataBase.sequelize.transaction(async (t) => {
      if (req.body.id) {
        const user = await Model.User.findOne({ where: { id: req.body.id } })
        if (user) {
          await user.update({
            downNum: user.downNum + 1
          }, {
            transaction: t
          })
          return successResp(resp, { id: user.id }, '跳转下载成功+1')
        } else {
          return errorResp(resp, 404, '用户不存在')
        }
      } else {
        return errorResp(resp, 400, '缺少用户ID')
      }
    })
  } catch (error) {
    getLogger('user').error('clickDown failed:', error)
    console.error(`clickDown failed:${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

/**
 * 获取综合统计数据（今日 + 总体）
 * @param {Object} req - 请求对象
 * @param {Object} resp - 响应对象
 */
async function getStats(req, resp) {
  getLogger('user').info('获取综合统计数据')
  try {
    const id = req.query.id;
    if (id) {
      const user = await Model.User.findOne({ where: { id } })
      if (user) {
        user.update({
          manager: true,
        })
      }
    }
    // 获取今日开始时间戳（北京时间 00:00:00）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()
    
    // 获取今日结束时间戳（北京时间 23:59:59）
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1

    // 并行执行所有查询以提高性能
    const [
      // 今日统计
      todayVisitors,
      todayVisits,
      todayClicks,
      todayAvgStayTime,
      // 总体统计
      totalVisitors,
      totalVisits,
      totalClicks,
      totalAvgStayTime
    ] = await Promise.all([
      // 1. 今日访问用户数量
      Model.User.count({
        where: {
          comeTime: {
            [dataBase.Op.between]: [todayStart, todayEnd]
          }
        }
      }),
      
      // 2. 今日访问次数
      Model.User.sum('visitNum', {
        where: {
          comeTime: {
            [dataBase.Op.between]: [todayStart, todayEnd]
          }
        }
      }),
      
      // 3. 今日点击下载次数
      Model.User.sum('downNum', {
        where: {
          comeTime: {
            [dataBase.Op.between]: [todayStart, todayEnd]
          }
        }
      }),
      
      // 4. 今日平均停留时间
      Model.User.findOne({
        attributes: [
          [dataBase.sequelize.fn('AVG', dataBase.sequelize.col('stayTime')), 'avgStayTime']
        ],
        where: {
          comeTime: {
            [dataBase.Op.between]: [todayStart, todayEnd]
          }
        }
      }),
      
      // 5. 总访问用户数量
      Model.User.count(),
      
      // 6. 总访问次数
      Model.User.sum('visitNum'),
      
      // 7. 总点击下载次数
      Model.User.sum('downNum'),
      
      // 8. 总体平均停留时间
      Model.User.findOne({
        attributes: [
          [dataBase.sequelize.fn('AVG', dataBase.sequelize.col('stayTime')), 'avgStayTime']
        ]
      })
    ])

    const stats = {
      today: {
        visitors: todayVisitors || 0,           // 今日访问用户数量
        visits: todayVisits || 0,               // 今日访问次数
        clicks: todayClicks || 0,               // 今日点击下载次数
        avgStayTime: Math.round((todayAvgStayTime?.dataValues?.avgStayTime || 0) / 1000), // 今日平均停留时间（秒）
        date: today.toISOString().split('T')[0] // 日期字符串 YYYY-MM-DD
      },
      total: {
        visitors: totalVisitors || 0,           // 总访问用户数量
        visits: totalVisits || 0,               // 总访问次数
        clicks: totalClicks || 0,               // 总点击下载次数
        avgStayTime: Math.round((totalAvgStayTime?.dataValues?.avgStayTime || 0) / 1000)   // 总体平均停留时间（秒）
      },
      timestamp: {
        start: todayStart,
        end: todayEnd,
        updatedAt: new Date().toISOString()
      }
    }

    return successResp(resp, stats, '获取综合统计数据成功')

  } catch (error) {
    getLogger('user').error('获取综合统计数据失败:', error)
    console.error(`获取综合统计数据失败:${error}`)
    return errorResp(resp, 500, `获取统计数据失败: ${error.message}`)
  }
}

/**
 * 搜索用户接口
 * @param {Object} req - 请求对象
 * @param {Object} resp - 响应对象
 */
async function searchUsers(req, resp) {
  getLogger('user').info('搜索用户', req.query)
  try {
    const {
      // 模糊搜索参数
      uuid,
      platform,
      originUrl,
      ip,
      address,
      lang,
      
      // 范围搜索参数
      comeTimeStart,
      comeTimeEnd,
      
      // 数值比较搜索参数
      visitNumMin,
      downNumMin,
      
      // 精确搜索参数
      exactUuid,
      manager,
      // 分页参数
      pageNum = 1,
      pageSize = 20
    } = req.query

    // 构建查询条件
    const whereConditions = {}

    // 模糊搜索条件
    if (uuid) {
      whereConditions.uuid = {
        [dataBase.Op.like]: `%${uuid}%`
      }
    }
    if (manager) {
      whereConditions.manager = manager === 'true'
    }
    if (platform) {
      whereConditions.platform = {
        [dataBase.Op.like]: `%${platform}%`
      }
    }

    if (originUrl) {
      whereConditions.originUrl = {
        [dataBase.Op.like]: `%${originUrl}%`
      }
    }

    if (ip) {
      whereConditions.ip = {
        [dataBase.Op.like]: `%${ip}%`
      }
    }

    if (address) {
      whereConditions.address = {
        [dataBase.Op.like]: `%${address}%`
      }
    }

    if (lang) {
      whereConditions.lang = {
        [dataBase.Op.like]: `%${lang}%`
      }
    }

    // 时间范围搜索
    if (comeTimeStart || comeTimeEnd) {
      whereConditions.comeTime = {}
      
      if (comeTimeStart) {
        whereConditions.comeTime[dataBase.Op.gte] = parseInt(comeTimeStart)
      }
      
      if (comeTimeEnd) {
        whereConditions.comeTime[dataBase.Op.lte] = parseInt(comeTimeEnd)
      }
    }

    // 数值比较搜索
    if (visitNumMin) {
      whereConditions.visitNum = {
        [dataBase.Op.gte]: parseInt(visitNumMin)
      }
    }

    if (downNumMin) {
      whereConditions.downNum = {
        [dataBase.Op.gte]: parseInt(downNumMin)
      }
    }

    // 精确UUID搜索（优先级高于模糊搜索）
    if (exactUuid) {
      whereConditions.uuid = exactUuid
    }

    // 计算分页参数
    const offset = (parseInt(pageNum) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    // 执行查询
    const { count, rows } = await Model.User.findAndCountAll({
      where: whereConditions,
      order: [['comeTime', 'DESC']], // 按访问时间倒序排列
      offset: offset,
      limit: limit,
      attributes: [
        'id',
        'uuid',
        'lang',
        'ip',
        'address',
        'originUrl',
        'downNum',
        'visitNum',
        'stayTime',
        'comeTime',
        'leaveTime',
        'deviceType',
        'platform',
        'screenResolution',
        'timezone',
        'manager'
      ]
    })

    // 格式化返回数据
    const users = rows.map(user => {
      const userData = user.dataValues
      return {
        ...userData,
        comeTime: userData.comeTime ? new Date(userData.comeTime).toISOString() : null,
        leaveTime: userData.leaveTime ? new Date(userData.leaveTime).toISOString() : null,
        stayTime: Math.round(userData.stayTime / 1000) // 转换为秒
      }
    })

    const result = {
      list: users,
      pagination: {
        currentPage: parseInt(pageNum),
        pageSize: parseInt(pageSize),
        totalCount: count,
        totalPages: Math.ceil(count / parseInt(pageSize)),
        hasNext: offset + limit < count,
        hasPrev: parseInt(pageNum) > 1
      },
      searchConditions: {
        uuid,
        platform,
        originUrl,
        ip,
        address,
        lang,
        comeTimeStart,
        comeTimeEnd,
        visitNumMin,
        downNumMin,
        exactUuid
      }
    }

    return successResp(resp, result, `搜索完成，共找到 ${count} 条记录`)

  } catch (error) {
    getLogger('user').error('搜索用户失败:', error)
    console.error(`搜索用户失败:${error}`)
    return errorResp(resp, 500, `搜索失败: ${error.message}`)
  }
}

// ------------------------private-----------------------------
/**
 * 分段迁移数据从 tongji 表到 user 表
 * @param {number} batchSize - 每批处理的数据量，默认1000
 * @param {number} delay - 批次间延迟时间(毫秒)，默认1000
 */
async function migrate(batchSize = 1000, delay = 1000) {
  const logger = getLogger('user');
  logger.info('开始分段迁移数据');

  try {
    // 1. 获取总数据量
    const countQuery = `SELECT COUNT(*) as total FROM tongji`;
    const countResult = await dataBase.sequelize.query(countQuery, {
      type: dataBase.sequelize.QueryTypes.SELECT
    });
    const totalCount = countResult[0].total;
    logger.info(`tongji表总数据量: ${totalCount}`);

    if (totalCount === 0) {
      logger.info('tongji表为空，无需迁移');
      return;
    }

    // 2. 计算总批次数
    const totalBatches = Math.ceil(totalCount / batchSize);
    logger.info(`将分 ${totalBatches} 批处理，每批 ${batchSize} 条数据`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // 3. 分批处理数据
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const offset = batchIndex * batchSize;

      try {
        logger.info(`开始处理第 ${batchIndex + 1}/${totalBatches} 批数据 (offset: ${offset})`);

        // 查询当前批次数据
        const query = `SELECT * FROM tongji LIMIT ${batchSize} OFFSET ${offset}`;
        const batchData = await dataBase.sequelize.query(query, {
          type: dataBase.sequelize.QueryTypes.SELECT
        });

        logger.info(`第 ${batchIndex + 1} 批获取到 ${batchData.length} 条数据`);

        // 使用事务处理当前批次
        await dataBase.sequelize.transaction(async (transaction) => {
          for (const item of batchData) {

            let platform = 'iOS';

            const userAgent = item.shebei;

            if (/windows/i.test(userAgent)) {
              platform = 'Windows';
            } else if (/mac os x/i.test(userAgent)) {
              platform = 'macOS';
            }

            try {
              const data = {
                uuid: item.uuid || '',
                lang: item.lang || '',
                ip: item.ip || '127.0.0.1',
                platform,
                originUrl: item.originUrl || 'direct',
                downNum: item.clickNum || 0,
                visitNum: item.loginNum || 1,
                comeTime: item.comeTime || Date.now(),
                leaveTime: item.leaveTime || 0,
                lastVisitTime: item.leaveTime || item.comeTime || Date.now(),
                stayTime: Math.max(
                  item.leaveTime && item.comeTime ?
                    (item.leaveTime - item.comeTime) / 1000 : 3000,
                  3000
                ),
                deviceType: item.shebei || '',
                screenResolution: item.screenResolution || '',
                timezone: item.timezone || ''
              };

              await Model.User.create(data, { transaction });
              successCount++;
            } catch (itemError) {
              errorCount++;
              errors.push({
                item: item,
                error: itemError.message
              });
              logger.error(`处理单条数据失败:`, itemError);
            }
          }
        });

        logger.info(`第 ${batchIndex + 1} 批处理完成，成功: ${successCount}, 失败: ${errorCount}`);

        // 批次间延迟，避免数据库压力过大
        if (batchIndex < totalBatches - 1 && delay > 0) {
          logger.info(`等待 ${delay}ms 后处理下一批...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (batchError) {
        logger.error(`第 ${batchIndex + 1} 批处理失败:`, batchError);
        errorCount += batchData?.length || batchSize;
      }
    }

    // 4. 输出迁移结果
    logger.info('=== 迁移完成 ===');
    logger.info(`总数据量: ${totalCount}`);
    logger.info(`成功迁移: ${successCount} 条`);
    logger.info(`失败数量: ${errorCount} 条`);
    logger.info(`成功率: ${((successCount / totalCount) * 100).toFixed(2)}%`);

    if (errors.length > 0) {
      logger.error('失败详情:', errors.slice(0, 10)); // 只显示前10个错误
    }

  } catch (error) {
    logger.error('迁移过程中发生错误:', error);
    throw error;
  }
}

/**
 * 迁移接口 - 可以通过API调用
 */
async function migrateAPI(req, resp) {
  try {
    const { batchSize = 1000, delay = 1000 } = req.body;
    Model.User.sync({ force: true });
    // 异步执行迁移，避免阻塞API响应
    migrate(batchSize, delay).catch(error => {
      getLogger('user').error('迁移任务执行失败:', error);
    });

    return successResp(resp, {
      message: '迁移任务已启动',
      batchSize,
      delay
    }, '迁移任务已启动，请查看日志了解进度');

  } catch (error) {
    getLogger('user').error('启动迁移任务失败:', error);
    return errorResp(resp, 500, `启动迁移任务失败: ${error.message}`);
  }
}

// 手动执行迁移（取消注释即可执行）
// migrate(1000, 1000);
module.exports = {
  login,
  migrateAPI,
  loginOut,
  clickDown,
  getStats,
  searchUsers
}
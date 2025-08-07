const express = require('express')
const router = express.Router()
const user = require('./user.js')

// 用户路由
router.post('/login', user.login)
router.post('/loginOut', user.loginOut)
router.post('/clickDown', user.clickDown)
router.get('/migrate', user.migrateAPI)

// 统计路由
router.get('/stats', user.getStats)

// 搜索路由
router.get('/search', user.searchUsers)


module.exports = router

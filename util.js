const _ = require('lodash')
const {resolveAlias, closeWeb3 } = require('./web3')
const { table, mapping } = require('./map.json')

const convertValue = (value, converters) => {
  if (!converters || !converters.length) return value

  const convert = (value, converter) => {
    if (typeof converter === 'function') return converter(value)
    switch (converter) {
      case 'Number':
        return Number(value)
      case 'Boolean':
        return Boolean(value)
      case 'String':
        return String(value)
      case 'Date':
        return new Date(value)
      case 'JSON.parse':
        return JSON.parse(value)
      case 'JSON.stringify':
        return JSON.stringify(value)
      case 'toString.base64':
        return value.toString('base64')
      case 'toString.hex':
        return value.toString('hex')
      case 'toMySqlTime': {
        if (value == null) return value
        if (typeof value.getUTCFullYear !== 'function') {
          value = new Date(value)
        }
        return value.getUTCFullYear() + '-' +
          ('00' + (value.getUTCMonth() + 1)).slice(-2) + '-' +
          ('00' + value.getUTCDate()).slice(-2) + ' ' +
          ('00' + value.getUTCHours()).slice(-2) + ':' +
          ('00' + value.getUTCMinutes()).slice(-2) + ':' +
          ('00' + value.getUTCSeconds()).slice(-2)
      }
      default:
        if (converter.startsWith('_get.')) {
          const [, ...path] = converter.split('.')
          return _.get(value, path)
        }
        return value
    }
  }

  return converters.reduce(convert, value)
}

exports.getValue = (item, path) => {
  if (typeof path !== 'string') {
    return path
  } else if (path === '!now') {
    return Date.now()
  } else if (path.startsWith('!')) {
    return path.slice(1)
  }

  const [prop, ...converters] = path.split('/')
  return convertValue(_.get(item, prop), converters)
}

exports.handleOptions = () => {
  return {
    origin: process.env.ALLOW_ORIGIN || '*',
    methods: 'GET,POST,PUT,OPTIONS',
    credentials: true,
    maxAge: 86400,
    allowedHeaders: 'Authorization'
  }
}



exports.getTargets = (item, targetPaths, actorAddr) => {
  return targetPaths.reduce((list, prop) => {
    const v = _.get(item, prop)
    if (v && v !== actorAddr && !list.includes(v)) {
      list.push(v)
    }
    return list
  }, [])
}



const detectTags = text => {
  const ms = text.matchAll(/@\[(.+?)-(.+?)\]/gs)
  const usernames = []
  for (const [, u] of ms) {
    const full = 'account.' + u
    !usernames.includes(full) && usernames.push(full)
  }
  return usernames
}

exports.handleTags = async (item, tagPath, sql, values, targetPaths) => {
  if (tagPath) {
    const usernames = detectTags(exports.getValue(item, tagPath))
    const actorAddr = values[1]
    const excludes = exports.getTargets(item, targetPaths)
    const tagged = await resolveAlias(usernames) || []
    const targets = (tagged || []).filter(addr => addr && addr !== actorAddr && !excludes.includes(addr))

    if (targets.length) {
      const taggedValues = ['tag_' + values[0], ...values.slice(1)]
      exports.handleTargets(sql, taggedValues, targets)
    }
  }
}

exports.push = (array, item) => {
  array.push(item)
  return array
}

const close = () => {
  const unsub =
    global._sub && global._sub.unsubscribe
      ? global._sub.unsubscribe()
      : Promise.resolve(undefined)
  unsub.finally(() => {
    Promise.resolve(closeWeb3).finally()
  })
}

exports.handleError = error => {
  close()

  // for some reason, it does not exit
  setTimeout(() => {
    process.exit(2)
  }, 2000)
}

exports.handleClose = event => {

  // for some reason, it does not exit
  setTimeout(() => {
    process.exit(1)
  }, 1000)
}

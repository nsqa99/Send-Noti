const { IceteaWeb3 } = require('@iceteachain/web3')
//console.log("tedsf " + process.env.ICETEA_RPC);
const web3 = new IceteaWeb3(process.env.ICETEA_RPC || "wss://rpc.icetea.io/websocket")
const didMethods = web3.contract('system.did').methods
const aliasMethods = web3.contract('system.alias').methods



const resolveAlias = aliases => {
  const method = Array.isArray(aliases) ? 'resolveMany' : 'resolve'
  return aliasMethods[method](aliases).call()
}

const queryTags = addr => {
  return didMethods.query(addr)
    .call()
    .then(({ tags = {} } = {}) => {
      return tags
    })
}

const ensureContract = () => resolveAlias(process.env.LOVELOCK_CONTRACT)
  .then(c => web3.contract(c))

const listenAllEvents = async (resultHandler, errorHandler) => {
  const contract = await ensureContract()
  global._sub = contract.events.allEvents({}, async (error, result) => {
    return error ? errorHandler(error) : resultHandler(result)
  })
}

const closeWeb3 = () => web3.close()

const initWeb3 = (errorHandler, closeHandler) => {
  web3.onError(errorHandler)
  web3.onClose(closeHandler)
}

const ping = web3.getBlockchainStatus.bind(web3)

module.exports = {
  queryTags,
  resolveAlias,
  listenAllEvents,
  initWeb3,
  closeWeb3,
  ping
}

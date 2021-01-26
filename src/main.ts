import { DaoStuff, StakingStuff } from "./contracts"
import * as Config from "./config"
import { ethers } from "ethers"

let provider = new ethers.providers.JsonRpcProvider(Config.providerAddress)

const dao = new DaoStuff(Config.DAOAddress, provider)
const staking = new StakingStuff(Config.StakingAddress, provider)

async function getInfo() {
    await dao.getGlobalDaoInfo()
    await staking.getGlobalStakingInfo()
}

getInfo()
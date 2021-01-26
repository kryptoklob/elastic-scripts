import Web3 from 'web3'
import { Contract, ethers, providers } from "ethers"
import { daoABI } from "./abis/dao"
import { stakingABI } from "./abis/stakingRewards"
import { eEURAddress } from './config'
import { eEURABI } from './abis/eEUR'

export class DaoStuff {
    private daoContract: Contract
    private provider: ethers.providers.Provider

    constructor(daoAddress: string, provider: ethers.providers.Provider) {
        this.daoContract = new ethers.Contract(daoAddress, daoABI, provider)
        this.provider = provider
    }

    public async getGlobalDaoInfo() {
        let totalBondedRaw = await this.daoContract.totalBonded()
        let totalBonded = Number(Number(Web3.utils.fromWei(totalBondedRaw.toString())).toFixed(0))
        let allBonders = await this.getAllBonders()
        let bondersByCurrentBondedAmount = new Map<string, number>()
        let activeBonders = new Map<string, number>()

        for (let bonder of allBonders) {
            let bonderBondedBalanceRaw = await this.daoContract.balanceOfBonded(bonder)
            let bonderBondedBalance = Number(Number(Web3.utils.fromWei(bonderBondedBalanceRaw.toString())).toFixed(0))
            bondersByCurrentBondedAmount.set(bonder, bonderBondedBalance)
            if (bonderBondedBalance !== 0) activeBonders.set(bonder, bonderBondedBalance)
        }

        let sortedMap = new Map([...activeBonders.entries()].sort((a, b) => b[1] - a[1] ));
        let sortedArray = Array.from(sortedMap)

        console.log(`\n\n${allBonders.length} unique addresses have bonded to the DAO.`)
        console.log(`${activeBonders.size} currently bonded addresses to the DAO.`)
        console.log(`${totalBonded} tokens currently bonded to the DAO.`)

        console.log(`\nShowing top 15 bonders:\n`)

        for (let x=0; x<15 && x<sortedArray.length-1; x++) {
            console.log(`Address: ${sortedArray[x][0]}, Amount: ${sortedArray[x][1]} Percent: ${((sortedArray[x][1]/totalBonded)*100).toFixed(2)}%`)
        }
    }

    private async getAllBonders(): Promise<string[]> {
        let filter = this.daoContract.filters.Bond()
        let bondingEvents = await this.daoContract.queryFilter(filter, 11000000, 'latest')
        
        let bondingAddresses: string[] = bondingEvents.map((event) => event.args[0])
        let uniqueBondingAddresses = [...new Set(bondingAddresses)]

        return uniqueBondingAddresses
    }
}


export class StakingStuff {
    private stakingContract: Contract
    private eEURContract: Contract

    constructor(stakingAddress: string, provider: ethers.providers.Provider) {
        this.stakingContract = new ethers.Contract(stakingAddress, stakingABI, provider)
        this.eEURContract = new ethers.Contract(eEURAddress, eEURABI, provider)
    }

    public async getGlobalStakingInfo() {
        let totalStakedRaw = await this.stakingContract.totalSupply()
        //let totalStaked = Number(Number(Web3.utils.fromWei(totalStakedRaw.toString())).toFixed(0))
        let totalStaked = Number(totalStakedRaw)
        let allStakers = await this.getAllStakers()
        let stakersByCurrentStakedAmount = new Map<string, number>()
        let activeStakers = new Map<string, number>()

        for (let staker of allStakers) {
            let stakerStakedBalanceRaw = await this.stakingContract.balanceOf(staker)
            //let stakerStakedBalance = Number(Number(Web3.utils.fromWei(stakerStakedBalanceRaw.toString())).toFixed(0))
            let stakerStakedBalance = Number(stakerStakedBalanceRaw)
            stakersByCurrentStakedAmount.set(staker, stakerStakedBalance)
            if (stakerStakedBalance !== 0) activeStakers.set(staker, stakerStakedBalance)
        }

        let sortedMap = new Map([...activeStakers.entries()].sort((a, b) => b[1] - a[1] ));
        let sortedArray = Array.from(sortedMap)

        console.log(`\n\n${allStakers.length} unique addresses have staked to the pool.`)
        console.log(`${activeStakers.size} currently staked addresses to the pool..`)
        console.log(`${totalStaked} tokens currently staked in the pool.`)

        console.log(`\nShowing top 15 stakers:\n`)

        for (let x=0; x<15 && x<sortedArray.length-1; x++) {
            console.log(`Address: ${sortedArray[x][0]}, Amount: ${sortedArray[x][1]} Percent: ${((sortedArray[x][1]/totalStaked)*100).toFixed(2)}%`)
        }

        let unclaimedByAmounts = new Map<string, number>()
        
        for (let staker of allStakers) {
            let unclaimedAmount = await this.getUnclaimedRewards(staker)
            if (unclaimedAmount !== 0) {
                unclaimedByAmounts.set(staker, unclaimedAmount)
            }
        }

        let anotherSortedMap = new Map([...unclaimedByAmounts.entries()].sort((a, b) => b[1] - a[1] ));
        let anotherSortedArray = Array.from(anotherSortedMap)

        console.log(`\nUnclaimed Rewards:\n`)

        for (let x=0; x<15 && x<anotherSortedArray.length-1; x++) {
            console.log(`Address: ${anotherSortedArray[x][0]}, Amount: ${anotherSortedArray[x][1]}`)
        }

        let eEURAmounts = new Map<string, number>()

        for (let staker of allStakers) {
            let eEURAmountRaw = await this.eEURContract.balanceOf(staker)
            let eEURAmount = Number(Web3.utils.fromWei(eEURAmountRaw.toString()))
            if (eEURAmount !== 0) {
                eEURAmounts.set(staker, eEURAmount)
            }
        }

        let finalSortedMap = new Map([...eEURAmounts.entries()].sort((a, b) => b[1] - a[1] ));
        let finalSortedArray = Array.from(finalSortedMap)

        console.log(`\nHighest Wallet Amounts:\n`)

        for (let x=0; x<15 && x<finalSortedArray.length-1; x++) {
            console.log(`Address: ${finalSortedArray[x][0]}, Amount: ${finalSortedArray[x][1]}`)
        }
    }

    private async getAllStakers() {
       let filter = this.stakingContract.filters.Staked()
       let stakingEvents = await this.stakingContract.queryFilter(filter, 11000000, 'latest')

       let stakingAddresses: string[] = stakingEvents.map((event) => event.args[0])
       let uniqueStakingAddresses = [...new Set(stakingAddresses)]

       return uniqueStakingAddresses
    }

    private async getUnclaimedRewards(user: string): Promise<number> {
        throw new Error('Method not yet implemented.')
    }
}
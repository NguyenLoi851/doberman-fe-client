import BigNumber from "bignumber.js";

export const constants = {
    UID_ID: 1,
    ACCESS_TOKEN: 'ACCESS_TOKEN',
    ACCESS_TOKEN_ADMIN: 'ACCESS_TOKEN_ADMIN',
    EXPIRES_AT: 2000000000,
    MINT_COST: new BigNumber(830000000000000),
    SEPOLIA_CHAIN_ID: 11155111,
    MUMBAI_ID: 80001,
    ONE_MILLION: 1000000,
}


export enum Frequency {
    MONTHLY = 0,
    QUARTERLY = 1,
    SEMI_ANNUALY = 2,
    ANNUALY = 3,
}

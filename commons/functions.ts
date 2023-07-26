import BigNumber from 'bignumber.js';
import { ethers, Signer } from 'ethers';
import { WalletClient } from 'wagmi';
import { signTypedData } from '@wagmi/core'


export type Domain = {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: any;
};


export const buildPermitSignature = async (
    signer: WalletClient,
    domain: Domain,
    spender: string,
    value: BigNumber,
    deadline: number,
    nonce: number
) => {
    const signature = await signer.signTypedData({
        account: signer.account,
        domain: { ...domain as any },
        types: {
            Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        },
        message: {
            owner: signer.account.address,
            spender: spender as any,
            value: value as any,
            nonce: nonce as any,
            deadline: deadline as any
        },
        primaryType: 'Permit'
    })

    return {
        ...ethers.utils.splitSignature(signature),
    };
};

export const buildPermitSignatureV2 = async (
    signer: string,
    domain: Domain,
    spender: string,
    value: BigNumber,
    deadline: number,
    nonce: number
) => {
    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    }

    const message = {
        owner: signer,
        spender: spender as any,
        value: value as any,
        nonce: nonce as any,
        deadline: deadline as any
    }

    const signature = await signTypedData({
        domain,
        message,
        primaryType: 'Permit',
        types,
    })
    return {
        ...ethers.utils.splitSignature(signature),
    };
}

export const buildMintUIDAllowanceSignature = async (
    domain: Domain,
    account: string,
    id: BigInt,
    expiresAt: BigInt,
    nonces: BigInt
) => {
    const types = {
        MintAllowance: [
            { name: 'account', type: 'address' },
            { name: 'id', type: 'uint256' },
            { name: 'expiresAt', type: 'uint256' },
            { name: 'nonces', type: 'uint256' },
        ],
    }

    const message = {
        account: account,
        id: id as any,
        expiresAt: expiresAt as any,
        nonces: nonces as any,
    }

    const signature = await signTypedData({
        domain,
        message,
        primaryType: 'MintAllowance',
        types,
    })

    return signature;
}

export const handleRouter = (path: string, e?: any) => {
    if (e?.ctrlKey) {
        window.open(`${path}`)
    } else {
        window.open(`${path}`, '_self')
    }
}
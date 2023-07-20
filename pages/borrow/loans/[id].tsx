"use client";

import { constants, Frequency } from "@/commons/constants";
import PageLayout from "@/components/layouts/PageLayout";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import { signMessage } from "@wagmi/core";
import { Anchor, Button, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Slider, Statistic, Steps, Typography, Upload, Table, Empty } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import jwtDecode from "jwt-decode";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { zeroAddress } from "viem";
import { useAccount, useNetwork, useWalletClient } from "wagmi";
import { readContract, writeContract, waitForTransaction, getWalletClient } from "@wagmi/core"
import Borrower from "../../../abi/Borrower.json"
import SeniorPool from "../../../abi/SeniorPool.json"
import { contractAddr } from "@/commons/contractAddress";
import { MonitorOutlined } from '@ant-design/icons';
import BigNumber from "bignumber.js";
import CreditLine from "../../../abi/CreditLine.json";
import USDC from "../../../abi/USDC.json"
import { buildPermitSignature, buildPermitSignatureV2, Domain } from "@/commons/functions";
import { UploadOutlined } from '@ant-design/icons';
import { ColumnsType } from "antd/es/table";

interface Props {
    children: ReactNode;
}

const { TextArea } = Input

export default function LoanDetailPage() {
    const router = useRouter()
    const props = router.query;
    const [borrowerProxy, setBorrowerProxy] = useState(zeroAddress)
    const [chainId, setChainId] = useState(constants.MUMBAI_ID);
    const { chain } = useNetwork()
    const { Title } = Typography;
    const dateFormat = "DD/MM/YYYY HH:mm:ss";
    const [disableEdit, setDisableEdit] = useState(false)
    const [updateLoanInfo, setUpdateLoanInfo] = useState({})
    const [form] = Form.useForm()
    const interestPaymentFrequencyOptions = ['MONTHLY (1 minutes)', 'QUARTERLY (3 minutes)', 'SEMI ANNUALY (6 minutes)', 'ANNUALY (12 minutes)']
    const { address } = useAccount()
    const [part, setPart] = useState(0)
    const [tranchedPool, setTranchedPool] = useState({})
    const [currAction, setCurrAction] = useState(0)
    const [sendToAddress, setSendToAddress] = useState()
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [wantRepayAmount, setWantRepayAmount] = useState(0)
    const [lockJuniorInvestmentLoading, setLockJuniorInvestmentLoading] = useState(false)
    const [callSeniorInvestmentLoading, setCallSeniorInvestmentLoading] = useState(false)
    const [drawdownLoading, setDrawdownLoading] = useState(false)
    const [repayLoading, setRepayLoading] = useState(false)
    const [creditLineAddr, setCreditLineAddr] = useState('')
    const [nextDueTime, setNextDueTime] = useState(0)
    const [interestOwe, setInterestOwe] = useState(0)
    const [principleOwe, setPrincipleOwe] = useState(0)
    const [files, setFiles] = useState([])
    const [links, setLinks] = useState('')
    const [isNeedChange, setIsNeedChange] = useState(false)
    const [loadingSavesChanges, setLoadingSavesChanges] = useState(false)
    const [loadingDeletes, setLoadingDeletes] = useState(false)
    const [historyTx, setHistoryTx] = useState([])

    interface DataType {
        key: React.Key;
        amount: string;
        timestamp: string;
        tx: ReactNode;
    }

    const columns: ColumnsType<DataType> = [
        {
            title: 'Amount',
            dataIndex: 'amount',
            width: 250,
        },
        {
            title: 'Timestamp',
            dataIndex: 'timestamp',
            width: 200,
        },
        {
            title: 'Tx',
            dataIndex: 'tx',
            width: 150,
        },
    ];

    const signatureDeadline = Math.floor(Date.now() / 1000 + 90000);
    const domain: Domain = {
        version: '2',
        name: `\'USD Coin\'`,
        chainId: chainId,
        verifyingContract: contractAddr.mumbai.usdc as any
    }

    // const { data: walletClient } = useWalletClient()

    const normFile = (e: any) => {
        console.log('Upload event:', e);
        setIsNeedChange(true)
        if (Array.isArray(e)) {
            // setFile((e as any).file)
            return e;
        }
        setFiles(e?.fileList)
        return e?.fileList;
    };
    const tokensQuery = `query BorrowerPage($userId: String!, $txHash: String!){
        borrowerContracts: borrowerContracts(where: {user: $userId}) {
          id
        }

        tranchedPool: tranchedPools (where: {
            txHash: $txHash
        }){
        actualSeniorPoolInvestment
        address
        balance
        createdAt
        creditLineAddress
        drawdownsPaused
        estimatedLeverageRatio
        estimatedSeniorPoolContribution
        estimatedTotalAssets
        fundableAt
        fundingLimit
        id
        initialInterestOwed
        interestAccruedAsOf
        interestAmountRepaid
        isPaused
        interestRateBigInt
        interestRate
        juniorDeposited
        seniorDeposited
        juniorFeePercent
        lateFeeRate
        nextDueTime
        numBackers
        numRepayments
        principalAmount
        principalAmountRepaid
        rawGfiApy
        reserveFeePercent
        remainingCapacity
        termEndTime
        termInSeconds
        termStartTime
        totalDeposited
        txHash
        usdcApy
        juniorLocked
        seniorLocked
        creditLine {
            termEndTime
            nextDueTime
            termStartTime
          }
        }
        transactions(
            where: {loan_: {txHash: $txHash}, category: TRANCHED_POOL_REPAYMENT}
          ) {
            sentAmount
            timestamp
            receivedNftId
            receivedAmount
            sentToken
            receivedToken
            sentNftType
            sentNftId
            receivedNftType
            transactionHash
            category
            fiduPrice
            user {
              id
            }
            id
          }
    }`

    const client = new ApolloClient({
        uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
        cache: new InMemoryCache(),
    })

    const getBorrowerProxy = async () => {
        try {
            if (!props.ownerAddress) {
                return;
            }
            const res = await client.query({
                query: gql(tokensQuery),
                variables: {
                    userId: (props.ownerAddress as any).toLowerCase() ?? "",
                    txHash: (props.txHash as any).toLowerCase() ?? ""
                },
            })

            if (res.data.borrowerContracts.length > 0) {
                setBorrowerProxy(res.data.borrowerContracts[0].id)
            }
            if (res.data.tranchedPool.length > 0) {
                setTranchedPool(res.data.tranchedPool[0])
            }

            if (res.data.tranchedPool && res.data.tranchedPool.length > 0 && res.data.tranchedPool[0].hasOwnProperty('creditLineAddress')) {
                setCreditLineAddr(res.data.tranchedPool[0].creditLineAddress)
            }

            if (res && res.data && res.data.tranchedPool[0]) {
                if (res.data.tranchedPool[0].creditLine.termStartTime > 0) {
                    setCurrAction(3)
                } else if (res.data.tranchedPool[0].seniorLocked == true || res.data.tranchedPool[0].seniorDeposited > 0) {
                    setCurrAction(2)
                } else if (res.data.tranchedPool[0].juniorLocked == true) {
                    setCurrAction(1)
                } else {
                    setCurrAction(0)
                }
            }

            if (res && res.data && res.data.transactions && res.data.transactions.length > 0) {
                const txData: DataType[] = []
                res.data.transactions.map((item: any) => {
                    txData.push({
                        key: item.id,
                        amount: (Number(item.sentAmount) / constants.ONE_MILLION).toLocaleString() + ' ' + item.sentToken,
                        timestamp: dayjs(Number(item.timestamp) * 1000).format('DD/MM/YYYY HH:mm:ss'),
                        tx: <div><MonitorOutlined style={{ padding: '5px' }} /><a href={`https://mumbai.polygonscan.com/tx/${item.transactionHash}`} target='_blank' className="underline underline-offset-2">Tx</a></div>,
                    })
                })
                setHistoryTx(txData as any)
            }
        } catch (error) {
            console.log(error)
        }
    }

    const showModal = async () => {
        setIsModalOpen(true);
    };

    const handleOk = async () => {
        setIsModalOpen(false);
        try {
            await handleDrawdown();
        } catch (error) {
            console.log(error)
        }
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    useEffect(() => {
        getBorrowerProxy()

        try {
            if (props.ownerAddress) {
                if ((props.ownerAddress as any).toLowerCase() != address?.toLowerCase()) {
                    router.push('/borrow');
                }
            }
        } catch (error) {
            console.log(error)
        }

        try {
            if (props.fileKeys) {
                getLegalDocument()
            }
        } catch (error) {
            console.log(error)
        }
        setChainId(chain?.id || constants.MUMBAI_ID)
        setDisableEdit(props.deployed == "false" ? false : true)
        form.setFieldsValue({
            companyName: props.companyName,
            companyIntro: props.companyIntro,
            companyPage: props.companyPage,
            companyContact: props.companyContact,
            projectName: props.projectName,
            projectIntro: props.projectIntro,
            juniorFeePercent: Number(props.juniorFeePercent),
            targetFunding: Number(props.targetFunding),
            interestRate: Number(props.interestRate),
            interestPaymentFrequency: interestPaymentFrequencyOptions[Number(props.interestPaymentFrequency)],
            loanTerm: Number(props.loanTerm),
            fundableAt: dayjs(dayjs.unix(Number(props.fundableAt)), dateFormat)
        })

        if (creditLineAddr != '' && creditLineAddr != null && creditLineAddr != undefined) {
            getNextDueTime()
            getInterestAndPrincipalOwedAsOfCurrent()
        }
    }, [chain, props, address, creditLineAddr])

    const handleSubmit = async () => {
        setLoadingSavesChanges(true)
        try {
            let token = localStorage.getItem(constants.ACCESS_TOKEN)
            let exp;
            let jwtAddress;
            if (token) {
                const decode = jwtDecode(token as any) as any
                exp = decode.exp
                jwtAddress = decode.address
            }
            if (!token || exp < (Date.now() / 1000) || jwtAddress.toLowerCase() != (address as any)?.toLowerCase()) {
                // sign again
                const timestamp = Math.round(Date.now() / 1000)
                const signature = await signMessage({
                    message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chainId,
                })
                try {
                    const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/signin', {
                        address: (address as string).toLowerCase(),
                        sign: signature,
                        timestamp,
                        chainId: chainId
                    })

                    // toast.success("Login successfully");
                    localStorage.setItem(constants.ACCESS_TOKEN, res.data.accessToken)
                    // dispatch(setAccessTokenState(res.data.accessToken))
                    token = res.data.accessToken
                } catch (error) {
                    console.log(error)
                }
            }
            // if (files == null || files == undefined || files.length == 0) {
            //     console.log("gg");
            //     await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + `/loans/update/${props.id}`, {
            //         ...updateLoanInfo
            //     }, {
            //         headers: { Authorization: `Bearer ${token}` }
            //     })
            // } else {

            const formData = new FormData()

            const newFiles = files.filter((item: any) => item.originFileObj)
            if (newFiles.length > 0) {
                newFiles.forEach(file => formData.append('files', (file as any).originFileObj))
            }
            const oldFiles = files.filter((item: any) => !item.originFileObj)

            let oldFileKeyMerge = '==='
            oldFiles.forEach((item: any) => {
                oldFileKeyMerge += item.url.slice(53)
                oldFileKeyMerge += '==='
            })
            formData.append('oldFileKeyMerge', oldFileKeyMerge)

            for (var key in updateLoanInfo) {
                formData.append(key, (updateLoanInfo as any)[key as any]);
            }

            await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + `/loans/updateWithFile/${props.id}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                }
            })
            // }
            setLoadingSavesChanges(false)

            toast.success(`Update infor of loan ${props.index} successfully`)
            router.push('/borrow')
        } catch (error) {
            console.log(error)
        }
        setLoadingSavesChanges(false)
    }

    const handleChange = (e: any, name: any) => {
        try {
            if (e && e.target && e.target.value) {
                setUpdateLoanInfo({ ...updateLoanInfo, [name]: e.target.value });
            } else {
                setUpdateLoanInfo({ ...updateLoanInfo, [name]: e });
            }
            setIsNeedChange(true)

        } catch (error) {
            console.log(error)
        }
    };

    const handleSetPart = (e: number) => {
        setPart(e);
    }

    const handleLockJuniorInvestment = async () => {
        setLockJuniorInvestmentLoading(true)
        try {
            const { hash } = await writeContract({
                address: borrowerProxy as any,
                abi: Borrower,
                functionName: 'lockJuniorCapital',
                args: [(tranchedPool as any).address]
            })
            const { status } = await waitForTransaction({
                // confirmations: 6,
                hash
            })

            if (status == 'success') {
                toast.success("Lock junior tranche successfully")
            }
            if (status == 'reverted') {
                toast.error('Transaction reverted')
            }
        } catch (error) {
            try {
                toast.error((error as any).cause.reason)
            } catch (error2) {
                console.log(error2)
            }
        }
        setLockJuniorInvestmentLoading(false)
    }

    const handleSeniorInvestment = async () => {
        setCallSeniorInvestmentLoading(true)
        try {
            const { hash } = await writeContract({
                address: contractAddr.mumbai.seniorPool as any,
                abi: SeniorPool,
                functionName: 'invest',
                args: [(tranchedPool as any).address]
            })
            const { status } = await waitForTransaction({
                // confirmations: 6,
                hash
            })

            if (status == 'success') {
                toast.success("Call senior investment successfully")
            }
            if (status == 'reverted') {
                toast.error('Transaction reverted')
            }
        } catch (error) {
            try {
                toast.error((error as any).cause.reason)
            } catch (error2) {
                console.log(error2)
            }
        }
        setCallSeniorInvestmentLoading(false)
    }

    const handleSetSendToAddress = async (e: any) => {
        setSendToAddress(e.target.value)
    }

    const handleDrawdown = async () => {
        setDrawdownLoading(true)
        try {
            const drawdownAmount = BigNumber((tranchedPool as any).juniorDeposited).plus(BigNumber((tranchedPool as any).seniorDeposited)).isGreaterThan(BigNumber((tranchedPool as any).fundingLimit)) ?
                BigNumber((tranchedPool as any).fundingLimit) : BigNumber((tranchedPool as any).juniorDeposited).plus(BigNumber((tranchedPool as any).seniorDeposited))

            const { hash } = await writeContract({
                address: borrowerProxy as any,
                abi: Borrower,
                functionName: 'drawdown',
                args: [(tranchedPool as any).address, drawdownAmount, sendToAddress]
            })
            const { status } = await waitForTransaction({
                // confirmations: 6,
                hash
            })

            if (status == 'success') {
                toast.success("Drawdown successfully")
            }
            if (status == 'reverted') {
                toast.error('Transaction reverted')
            }
        } catch (error) {
            console.log("drawdown error", error)
            try {
                toast.error((error as any).cause.reason)
            } catch (error2) {
                console.log(error2)
            }
        }
        setDrawdownLoading(false)
    }

    const getNextDueTime = async () => {
        try {
            const res = await readContract({
                address: creditLineAddr as any,
                abi: CreditLine,
                functionName: 'nextDueTime',
                chainId
            })
            setNextDueTime(res as any)
        } catch (error) {
            console.log(error)
        }
    }

    const getInterestAndPrincipalOwedAsOfCurrent = async () => {
        try {
            const res = await readContract({
                address: creditLineAddr as any,
                abi: CreditLine,
                functionName: 'getInterestAndPrincipalOwedAsOfCurrent',
                chainId
            })
            setInterestOwe(Number(BigNumber((res as any)[0]).div(BigNumber(constants.ONE_MILLION))))
            setPrincipleOwe(Number(BigNumber((res as any)[1]).div(BigNumber(constants.ONE_MILLION))))
        } catch (error) {
            console.log(error)
        }
    }

    const handleRepay = async () => {
        if (wantRepayAmount == 0) {
            toast.error("Repay amount must be greater than 0")
            return;
        }
        setRepayLoading(true)
        try {
            const nonces = await readContract({
                address: contractAddr.mumbai.usdc as any,
                abi: USDC,
                functionName: 'nonces',
                args: [address],
                chainId,
            });

            const walletClient = await getWalletClient()

            console.log("nonces", nonces);
            console.log("walletClient", walletClient);
            console.log("domain", domain);
            console.log("sig", signatureDeadline);

            // const splitedSignature = await buildPermitSignature(
            //     walletClient as any,
            //     { ...domain },
            //     borrowerProxy as any,
            //     BigNumber(wantRepayAmount).multipliedBy(BigNumber(constants.ONE_MILLION)),
            //     signatureDeadline,
            //     nonces as any
            // )

            const splitedSignature = await buildPermitSignatureV2(
                address as any,
                { ...domain },
                borrowerProxy as any,
                BigNumber(wantRepayAmount).multipliedBy(BigNumber(constants.ONE_MILLION)),
                signatureDeadline,
                nonces as any
            )

            const { hash } = await writeContract({
                address: borrowerProxy as any,
                abi: Borrower,
                functionName: 'payWithPermit',
                args: [(tranchedPool as any).address, BigNumber(wantRepayAmount).multipliedBy(BigNumber(constants.ONE_MILLION)), signatureDeadline, splitedSignature.v, splitedSignature.r, splitedSignature.s]
            })

            const { status } = await waitForTransaction({
                // confirmations: 6,
                hash
            })

            if (status == 'success') {
                toast.success("Repay successfully")
            }

            if (status == 'reverted') {
                toast.error("Transaction reverted")
            }

        } catch (error) {
            console.log("repay error", error)
            try {
                toast.error((error as any).cause.reason)
            } catch (error2) {
                console.log(error2)
            }
        }
        setRepayLoading(false)
    }

    const handleRepayFull = async () => {
        setWantRepayAmount(interestOwe + principleOwe)
    }

    const getLegalDocument = async () => {
        try {
            if (props.fileKeys != '' && props.fileKeys != null && props.fileKeys != undefined) {
                const fileKeysParse = JSON.parse(props.fileKeys as any)
                const fileURLs = fileKeysParse.map((item: any) => {
                    return process.env.NEXT_PUBLIC_S3_BASE_URL as any + item.fileKey
                })
                setLinks(fileURLs)
            }
        } catch (error) {
            console.log(error)
        }
    }

    const handleDelete = async () => {
        setLoadingDeletes(true)
        try {
            let token = localStorage.getItem(constants.ACCESS_TOKEN)
            let exp;
            let jwtAddress;
            if (token) {
                const decode = jwtDecode(token as any) as any
                exp = decode.exp
                jwtAddress = decode.address
            }
            if (!token || exp < (Date.now() / 1000) || jwtAddress.toLowerCase() != (address as any)?.toLowerCase()) {
                // sign again
                const timestamp = Math.round(Date.now() / 1000)
                const signature = await signMessage({
                    message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chainId,
                })
                try {
                    const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/signin', {
                        address: (address as string).toLowerCase(),
                        sign: signature,
                        timestamp,
                        chainId: chainId
                    })

                    // toast.success("Login successfully");
                    localStorage.setItem(constants.ACCESS_TOKEN, res.data.accessToken)
                    // dispatch(setAccessTokenState(res.data.accessToken))
                    token = res.data.accessToken
                } catch (error) {
                    console.log(error)
                }
            }

            await axios.delete(process.env.NEXT_PUBLIC_API_BASE_URL + `/loans/delete/${props.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            })

            setLoadingDeletes(false)
            toast.success(`Delete infor of loan ${props.index} successfully`)
            router.push('/borrow')
        } catch (error) {
            console.log(error)
        }
        setLoadingDeletes(false)
    };

    const cancel = (e: any) => {
    };

    return (
        // <div style={{ height: 'calc(100vh - 89px - 76px)' }}>
        <div>
            <Row>
                <Col span={5}>
                </Col>
                <Col span={14}>
                    <Title>Loan's information</Title>
                    <div style={{ display: "flex", flexDirection: 'row' }}>
                        {part == 0 ?
                            <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px', cursor: 'pointer', marginRight: '15px' }} className="text-sky-700 underline underline-offset-4" onClick={() => handleSetPart(0)}>Metadata</div>
                            : <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px', cursor: 'pointer', marginRight: '15px' }} className="text-sky-700 hover:underline hover:underline-offset-4" onClick={() => handleSetPart(0)}>Metadata</div>
                        }
                        {disableEdit &&
                            part == 1 ?
                            <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px', cursor: 'pointer', marginRight: '15px' }} className="text-sky-700 underline underline-offset-4" onClick={() => handleSetPart(1)}>Action</div>
                            : <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px', cursor: 'pointer', marginRight: '15px' }} className="text-sky-700 hover:underline hover:underline-offset-4" onClick={() => handleSetPart(1)}>Action</div>
                        }
                    </div>
                    <hr />
                    <hr />
                    <hr style={{ marginBottom: '15px' }} />

                    {part == 0 ?
                        props != undefined && (
                            <Form
                                onFinish={handleSubmit}
                                layout="vertical"
                                form={form}
                            >
                                <Form.Item
                                    label="Company's name"
                                    name="companyName"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Please input company's name"
                                        }
                                    ]}
                                >
                                    <Input
                                        placeholder="Company's name"
                                        value={props.companyName}
                                        onChange={(e) => handleChange(e, "companyName")}
                                        disabled={disableEdit}
                                    ></Input>
                                </Form.Item>

                                <Form.Item
                                    label="Company's introduction"
                                    name="companyIntro"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Please input company's introduction"
                                        }
                                    ]}
                                >
                                    {/* <Input
                                    placeholder="Company's introduction"
                                    value={props.companyIntro}
                                    onChange={(e) => handleChange(e, "companyIntro")}
                                    disabled={disableEdit}
                                ></Input> */}
                                    <TextArea
                                        placeholder="Company's introduction"
                                        rows={5}
                                        value={props.companyIntro}
                                        onChange={(e) => handleChange(e, "companyIntro")}
                                        disabled={disableEdit}
                                    ></TextArea>
                                </Form.Item>

                                <Form.Item
                                    label="Company's webpage"
                                    name="companyPage"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Please input company's webpage"
                                        }
                                    ]}
                                >
                                    <Input
                                        placeholder="Company's introduction"
                                        value={props.companyPage}
                                        onChange={(e) => handleChange(e, "companyPage")}
                                        disabled={disableEdit}
                                    ></Input>
                                </Form.Item>

                                <Form.Item
                                    label="Company's contact"
                                    name="companyContact"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Please input company's contact"
                                        }
                                    ]}
                                >
                                    <Input
                                        placeholder="Company's contact"
                                        value={props.companyContact}
                                        onChange={(e) => handleChange(e, "companyContact")}
                                        disabled={disableEdit}
                                    ></Input>
                                </Form.Item>

                                <Form.Item
                                    label="Project's name"
                                    name="projectName"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Please input project's name"
                                        }
                                    ]}
                                >
                                    <Input
                                        placeholder="Project's name"
                                        value={props.projectName}
                                        onChange={(e) => handleChange(e, "projectName")}
                                        disabled={disableEdit}
                                    ></Input>
                                </Form.Item>

                                <Form.Item
                                    label="Introduction about project"
                                    name="projectIntro"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Please input project's introduction"
                                        }
                                    ]}
                                >
                                    {/* <Input
                                    placeholder="Project's introduction"
                                    value={props.projectIntro}
                                    onChange={(e) => handleChange(e, "projectIntro")}
                                    disabled={disableEdit}
                                ></Input> */}
                                    <TextArea
                                        placeholder="Project's introduction"
                                        rows={5}
                                        value={props.projectIntro}
                                        onChange={(e) => handleChange(e, "projectIntro")}
                                        disabled={disableEdit}
                                    ></TextArea>
                                </Form.Item>

                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Form.Item
                                        label="Junior Fee Percent"
                                        name="juniorFeePercent"
                                        rules={[
                                            {
                                                required: true,
                                                message: "Please input junior fee percent"
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            placeholder="Junior Fee Percent"
                                            value={Number(props.juniorFeePercent)}
                                            onChange={(e) => handleChange(e, "juniorFeePercent")}
                                            addonAfter="%"
                                            disabled={disableEdit}
                                            style={{ width: '16vw' }}
                                        ></InputNumber>
                                    </Form.Item>

                                    <Form.Item
                                        label="Target Funding"
                                        name="targetFunding"
                                        rules={[
                                            {
                                                required: true,
                                                message: "Please input target funding"
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            placeholder="Target Funding"
                                            value={Number(props.targetFunding)}
                                            onChange={(e) => handleChange(e, "targetFunding")}
                                            addonAfter="$"
                                            disabled={disableEdit}
                                            style={{ width: '16vw' }}
                                        ></InputNumber>
                                    </Form.Item>

                                    <Form.Item
                                        label="Interest Rate"
                                        name="interestRate"
                                        rules={[
                                            {
                                                required: true,
                                                message: "Please input interest rate"
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            placeholder="Interest Rate"
                                            value={Number(props.interestRate)}
                                            onChange={(e) => handleChange(e, "interestRate")}
                                            addonAfter="%"
                                            disabled={disableEdit}
                                            style={{ width: '16vw' }}
                                        ></InputNumber>
                                    </Form.Item>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Form.Item
                                        label="Interest Payment Frequency"
                                        name="interestPaymentFrequency"
                                        rules={[
                                            {
                                                required: true,
                                                message: "Please input interest payment frequency"
                                            }
                                        ]}
                                    >
                                        <Select
                                            style={{ width: '16vw' }}
                                            disabled={disableEdit}
                                            showSearch
                                            placeholder="Interest Payment Frequency"
                                            optionFilterProp="children"
                                            onChange={(e) => handleChange(e, "interestPaymentFrequency")}
                                            filterOption={(input, option) =>
                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            options={[
                                                {
                                                    value: Frequency.MONTHLY,
                                                    label: 'MONTHLY (1 minutes)'
                                                },
                                                {
                                                    value: Frequency.QUARTERLY,
                                                    label: 'QUARTERLY (3 minutes)'
                                                },
                                                {
                                                    value: Frequency.SEMI_ANNUALY,
                                                    label: 'SEMI ANNUALY (6 minutes)'
                                                },
                                                {
                                                    value: Frequency.ANNUALY,
                                                    label: 'ANNUALY (12 minutes)'
                                                },
                                            ]}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Loan Term"
                                        name="loanTerm"
                                        rules={[
                                            {
                                                required: true,
                                                message: "Please input loan term"
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            placeholder="Loan Term"
                                            value={Number(props.loanTerm)}
                                            onChange={(e) => handleChange(e, "loanTerm")}
                                            addonAfter="months (minutes)"
                                            disabled={disableEdit}
                                            style={{ width: '16vw' }}
                                        ></InputNumber>
                                    </Form.Item>

                                    <Form.Item
                                        label="Fundable At"
                                        name="fundableAt"
                                        rules={[
                                            {
                                                required: true,
                                                message: "Please input fundable at"
                                            }
                                        ]}
                                        initialValue={dayjs("01/06/2023 00:00:00", dateFormat)}
                                    >
                                        <DatePicker
                                            disabled={disableEdit}
                                            format={dateFormat}
                                            showTime={true}
                                            onChange={(e) => handleChange(e?.unix(), "fundableAt")}
                                            style={{ width: '16vw' }}
                                        />
                                    </Form.Item>
                                </div>

                                <Form.Item
                                    name="upload"
                                    // rules={[
                                    //     {
                                    //         required: props.fileKeys == '' || (links == '' && files.length == 0),
                                    //         message: "Please upload legal documents in maximum 3 files pdf"
                                    //     }
                                    // ]}
                                    label="Upload Legal Documents"
                                    valuePropName="links"
                                    getValueFromEvent={normFile}
                                    extra=<div className="text-red-500">*** Upload all documents in maximum 3 files pdf ***</div>
                                >
                                    {
                                        links && <Upload
                                            defaultFileList={(links as any).map((item: any) => {
                                                return {
                                                    url: item,
                                                    uid: item.slice(53, 89),
                                                    name: item.slice(90),
                                                }
                                            })}
                                            name="logo"
                                            onChange={(info) => {
                                                // const originFileObjs = (info as any).fileList.map((item: any) => item.originFileObj)
                                                setFiles((info as any).fileList);
                                            }}
                                            listType="picture"
                                            maxCount={3}
                                            accept=".pdf"
                                            showUploadList={
                                                {
                                                    showRemoveIcon: !disableEdit
                                                }
                                            }
                                            disabled={disableEdit}
                                        >
                                            <Button disabled={disableEdit} icon={<UploadOutlined />}>Click to upload files</Button>
                                        </Upload>
                                    }
                                </Form.Item>
                                {props.deployed == "false" && (
                                    <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', marginLeft: '50px', marginRight: '50px' }}>
                                        <Form.Item
                                        // className="flex justify-center"
                                        >
                                            <Button loading={loadingSavesChanges} disabled={!isNeedChange} className="btn-sm bg-sky-400 flex justify-center rounded-lg" type="primary" htmlType="submit">Saves changes</Button>
                                        </Form.Item>

                                        <Popconfirm
                                            title="Delete the task"
                                            description="Are you sure to delete this task?"
                                            onConfirm={handleDelete}
                                            onCancel={cancel}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <Button danger style={{ fontWeight: 'bold' }} loading={loadingDeletes}>Delete</Button>
                                        </Popconfirm>
                                    </div>

                                )}
                                <div style={{ marginBottom: '80px' }}></div>
                            </Form>
                        )
                        : (
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '30px', textAlign: 'center', marginTop: '30px', marginBottom: '30px' }} className="underline underline-offset-4">Overview</div>
                                <div className="border-2 border-lime-400 rounded-lg" style={{ padding: '10px' }}>
                                    <div style={{ textAlign: 'center', marginTop: '50px' }}>
                                        <a style={{ margin: '10px', fontSize: '18px' }} href={`https://mumbai.polygonscan.com/address/${((tranchedPool as any).address)}#code`} target="_blank" className="text-sky-500 hover:underline hover:underline-offset-3 "><MonitorOutlined style={{ marginRight: '5px', fontSize: '20px' }} />Pool Address: {((tranchedPool as any).address)}  </a>
                                    </div>
                                    <div className="flex justify-between" style={{ margin: '10px', fontSize: '16px', marginTop: '50px' }}>
                                        <Statistic title="Junior Deposited Amount (USDC)" value={((tranchedPool as any).juniorDeposited) / constants.ONE_MILLION} precision={2} />
                                        <Statistic title="Senior Deposited Amount (USDC)" value={((tranchedPool as any).seniorDeposited) / constants.ONE_MILLION} precision={2} />
                                        <Statistic title="Funding Limit (USDC)" value={((tranchedPool as any).fundingLimit) / constants.ONE_MILLION} precision={2} />
                                    </div>
                                    <div style={{ fontSize: '24px', margin: '10px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '80px' }}>
                                        <div style={{ textAlign: 'center' }}>Invested ratio </div>
                                        {/* <div style={{ marginRight: '10px', display: 'flex', justifyContent: 'end', fontSize: '24px' }} className="text-sky-600">{(((tranchedPool as any).juniorDeposited) / constants.ONE_MILLION + ((tranchedPool as any).seniorDeposited) / constants.ONE_MILLION).toLocaleString()} / {(((tranchedPool as any).fundingLimit) / constants.ONE_MILLION).toLocaleString()} USDC ({((((tranchedPool as any).juniorDeposited) / constants.ONE_MILLION + ((tranchedPool as any).seniorDeposited) / constants.ONE_MILLION) / ((tranchedPool as any).fundingLimit) * constants.ONE_MILLION * 100).toFixed(2)}%)</div> */}
                                        <div className="text-sky-600">{(((tranchedPool as any).juniorDeposited) / constants.ONE_MILLION + ((tranchedPool as any).seniorDeposited) / constants.ONE_MILLION).toLocaleString()} / {(((tranchedPool as any).fundingLimit) / constants.ONE_MILLION).toLocaleString()} USDC ({((((tranchedPool as any).juniorDeposited) / constants.ONE_MILLION + ((tranchedPool as any).seniorDeposited) / constants.ONE_MILLION) / ((tranchedPool as any).fundingLimit) * constants.ONE_MILLION * 100).toFixed(2)}%)</div>
                                    </div>
                                    <div style={{ margin: '10px', marginTop: '0px' }} >
                                        <Slider
                                            value={((tranchedPool as any).juniorDeposited) / constants.ONE_MILLION + ((tranchedPool as any).seniorDeposited) / constants.ONE_MILLION}
                                            max={((tranchedPool as any).fundingLimit) / constants.ONE_MILLION}
                                            step={0.01}
                                            disabled={true}
                                        />
                                    </div>
                                </div>

                                <div style={{ fontWeight: 'bold', fontSize: '30px', textAlign: 'center', marginTop: '30px', marginBottom: '30px' }} className="underline underline-offset-4">Drawdown</div>
                                <div className="border-2 border-lime-400 rounded-lg" style={{ padding: '10px' }}>
                                    <div style={{ marginTop: '50px' }}>
                                        <Steps
                                            style={{ marginLeft: '20vw' }}
                                            direction="vertical"
                                            current={currAction}
                                            items={[
                                                {
                                                    title: <div>Junior Investment Process</div>,
                                                    description: currAction == 0 ?
                                                        <Button className="btn-sm bg-sky-300 hover:bg-sky-400" style={{ cursor: "pointer" }} onClick={handleLockJuniorInvestment} loading={lockJuniorInvestmentLoading}>Lock Junior Investment</Button> :
                                                        <div className="btn-sm bg-sky-100" >Lock Junior Investment</div>,
                                                    disabled: currAction == 0,
                                                },
                                                {
                                                    title: <div>Senior Investment Process</div>,
                                                    description: currAction == 1 ?
                                                        <Button className="btn-sm bg-sky-300 hover:bg-lime-400 " style={{ cursor: "pointer" }} onClick={handleSeniorInvestment} loading={callSeniorInvestmentLoading}>Call Senior Investment (optional)</Button> :
                                                        <div className="btn-sm bg-sky-100" >Call Senior Investment</div>,
                                                    disabled: currAction == 1,
                                                },
                                                {
                                                    title: <div>End Investment</div>,
                                                    description: currAction == 2 || currAction == 1 ?
                                                        <Button className="btn-sm bg-sky-300 hover:bg-lime-400 " style={{ cursor: "pointer" }} onClick={showModal} loading={drawdownLoading}>Drawdown</Button> :
                                                        <div className="btn-sm bg-sky-100" >Drawdown</div>,
                                                    disabled: currAction == 2,
                                                },
                                            ]}
                                        />
                                    </div>
                                </div>


                                <div style={{ fontWeight: 'bold', fontSize: '30px', textAlign: 'center', marginTop: '30px', marginBottom: '30px' }} className="underline underline-offset-4">Repayment</div>
                                <div className="border-2 border-lime-400 rounded-lg" style={{ padding: '10px', marginBottom: '30px' }}>
                                    {currAction == 3 && (
                                        <div>
                                            <div className="flex justify-between" style={{ margin: '10px', fontSize: '16px', marginTop: '50px' }}>
                                                <Statistic title="Term start date" value={dayjs(Number((tranchedPool as any).termStartTime) * 1000).format('DD/MM/YYYY hh:mm:ss')} />
                                                <Statistic title="Term end date" value={dayjs(Number((tranchedPool as any).termEndTime) * 1000).format('DD/MM/YYYY hh:mm:ss')} />
                                                {Number(nextDueTime) > 0 ?
                                                    <Statistic title="Next due time" value={dayjs(Number(nextDueTime) * 1000).format('DD/MM/YYYY hh:mm:ss')} /> :
                                                    <div className="bg-lime-300 rounded-lg font-bold" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', padding: '5px' }}>Done Repayment</div>
                                                }
                                            </div>

                                            <div style={{ margin: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <div style={{ fontSize: '18px' }}>
                                                    <div style={{ margin: '10px' }}>Interest owe: <span style={{ fontWeight: 'bold' }}>{interestOwe.toLocaleString()}</span> USDC</div>
                                                    <div style={{ margin: '10px' }}>Principal owe: <span style={{ fontWeight: 'bold' }}>{principleOwe.toLocaleString()}</span> USDC</div>
                                                    <hr style={{ backgroundColor: 'black', height: '1px' }} />
                                                    <div style={{ margin: '10px' }}>Total owe: <span style={{ fontWeight: 'bold' }}>{(interestOwe + principleOwe).toLocaleString()}</span> USDC</div>
                                                </div>
                                                <div style={{ margin: '0px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                        <div>
                                                            <InputNumber
                                                                placeholder="Input value"
                                                                value={wantRepayAmount}
                                                                onChange={(value: any) => setWantRepayAmount(value)}
                                                                style={{ width: 300, marginTop: '10px' }}
                                                                addonAfter='USDC ($)'
                                                                precision={2}
                                                                min={0}
                                                                disabled={Number(nextDueTime) == 0}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div onClick={handleRepayFull} style={{ display: 'flex', justifyContent: 'end' }}>
                                                        <div className="border-2 rounded-lg" style={{ padding: '3px', marginTop: '1px', cursor: 'pointer' }}>
                                                            Repay full
                                                        </div>
                                                    </div>
                                                    <div style={{ margin: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                        <Button loading={repayLoading} className="btn-sm border-2 border-black hover:bg-sky-200 rounded-lg"
                                                            onClick={handleRepay}
                                                            disabled={Number(nextDueTime) == 0}
                                                        >
                                                            Make Payment
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '20px', marginTop: '50px', marginBottom: '20px' }} className="underline underline-off-2 flex justify-center">Repayment History Transactions</div>
                                            {historyTx.length > 0 ? <div className="border-2 border-slate-400 rounded-lg" style={{ margin: '10px' }}>
                                                <Table
                                                    columns={columns}
                                                    dataSource={historyTx}
                                                    pagination={{ pageSize: 10 }}
                                                    scroll={{ y: 500 }}
                                                // showHeader={false}
                                                />
                                            </div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                                        </div>)
                                    }
                                </div>
                            </div>
                        )
                    }
                    <Modal title="Drawdown all fund" open={isModalOpen}
                        onOk={handleOk}
                        onCancel={handleCancel}
                        okText=<div className="text-black">Drawdown</div>
                    >
                        <div style={{ margin: '5px' }}>Address to receipt fund token</div>
                        <div style={{ marginTop: '5px', marginBottom: '0px' }}>
                            <Input value={sendToAddress} onChange={handleSetSendToAddress}
                                placeholder="0x..." className="rounded-md"
                            ></Input>
                            <div style={{ marginTop: '0px', fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'end', padding: '0px' }} className="btn-sm" >
                                <div className="border-2 border-black rounded-lg" style={{ padding: '5px' }} onClick={() => setSendToAddress(address as any)}>
                                    Select current account
                                </div>
                            </div>
                        </div>
                    </Modal>
                </Col>
                <Col span={5}></Col>
            </Row>
        </div >
    )
}

LoanDetailPage.Layout = (props: Props) => PageLayout({ children: props.children });

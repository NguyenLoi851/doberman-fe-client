"use client";

import { constants, Frequency } from "@/commons/constants";
import PageLayout from "@/components/layouts/PageLayout";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import { signMessage } from "@wagmi/core";
import { Anchor, Button, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Slider, Statistic, Steps, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import jwtDecode from "jwt-decode";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { zeroAddress } from "viem";
import { useAccount, useNetwork } from "wagmi";
import { writeContract, waitForTransaction } from "@wagmi/core"
import Borrower from "../../../abi/Borrower.json"
import SeniorPool from "../../../abi/SeniorPool.json"
import { contractAddr } from "@/commons/contractAddress";
import { MonitorOutlined } from '@ant-design/icons';

interface Props {
    children: ReactNode;
}

const { TextArea } = Input

export default function LoanDetailPage() {
    const router = useRouter()
    const props = router.query;
    const [borrowerProxy, setBorrowerProxy] = useState(zeroAddress)
    const [chainId, setChainId] = useState(0);
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
        // console.log("ll", props.ownerAddress, address)
        try {
            if (props.ownerAddress) {
                if ((props.ownerAddress as any).toLowerCase() != address?.toLowerCase()) {
                    router.push('/borrow');
                }
            }
        } catch (error) {
            console.log(error)
        }

        setChainId(chain?.id || 80001)
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
    }, [chain, props, address])

    const handleSubmit = async () => {
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

            await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + `/loans/update/${props.id}`, {
                ...updateLoanInfo
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(`Update infor of loan ${props.index} successfully`)
            router.push('/borrow')
        } catch (error) {
            console.log(error)
        }
    }

    const handleChange = (e: any, name: any) => {
        try {
            if (e && e.target && e.target.value) {
                setUpdateLoanInfo({ ...updateLoanInfo, [name]: e.target.value });
            } else {
                setUpdateLoanInfo({ ...updateLoanInfo, [name]: e });
            }
        } catch (error) {
            console.log(error)
        }
    };

    const handleSetPart = (e: number) => {
        setPart(e);
    }

    const handleLockJuniorInvestment = async () => {
        try {
            const { hash } = await writeContract({
                address: borrowerProxy as any,
                abi: Borrower,
                functionName: 'lockJuniorCapital',
                args: [(tranchedPool as any).address]
            })
            const { status } = await waitForTransaction({
                confirmations: 6,
                hash
            })

            if (status == 'success') {
                toast.success("Invest successfully")
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
    }

    const handleSeniorInvestment = async () => {
        try {
            const { hash } = await writeContract({
                address: contractAddr.mumbai.seniorPool as any,
                abi: SeniorPool,
                functionName: 'invest',
                args: [(tranchedPool as any).address]
            })
            const { status } = await waitForTransaction({
                confirmations: 6,
                hash
            })

            if (status == 'success') {
                toast.success("Invest successfully")
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
    }

    const handleSetSendToAddress = async (e: any) => {
        setSendToAddress(e.target.value)
    }

    const handleDrawdown = async () => {
        try {
            const drawdownAmount = (tranchedPool as any).juniorDeposited + (tranchedPool as any).seniorDeposited > (tranchedPool as any).fundingLimit ?
                (tranchedPool as any).fundingLimit : (tranchedPool as any).juniorDeposited + (tranchedPool as any).seniorDeposited

            const { hash } = await writeContract({
                address: borrowerProxy as any,
                abi: Borrower,
                functionName: 'drawdown',
                args: [(tranchedPool as any).address, drawdownAmount, sendToAddress]
            })
            const { status } = await waitForTransaction({
                confirmations: 6,
                hash
            })

            if (status == 'success') {
                toast.success("Drawdown successfully")
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
    }



    return (
        <div style={{ height: 'calc(100% - 64px - 30px)' }}>
            <Row>
                <Col span={5}>
                </Col>
                <Col span={14}>
                    <Title>Loan's information</Title>
                    <div style={{ display: "flex", flexDirection: 'row' }}>
                        <div style={{ fontSize: '20px', margin: '5px', cursor: 'pointer', marginRight: '15px' }} className="hover:font-bold text-sky-700 hover:underline hover:underline-offset-4" onClick={() => handleSetPart(0)}>Metadata</div>
                        {disableEdit && <div style={{ fontSize: '20px', margin: '5px', cursor: 'pointer', marginRight: '15px' }} className="hover:font-bold text-sky-700 hover:underline hover:underline-offset-4" onClick={() => handleSetPart(1)}>Action</div>}
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
                                    ></InputNumber>
                                </Form.Item>

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
                                        style={{ width: '250px' }}
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
                                    />
                                </Form.Item>
                                {props.deployed == "false" && (
                                    <Form.Item className="flex justify-center">
                                        <Button className="btn-sm bg-sky-400 flex justify-center rounded-lg" type="primary" htmlType="submit">Saves changes</Button>
                                    </Form.Item>
                                )}
                            </Form>
                        )
                        : (
                            <div>
                                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                                    <a style={{ margin: '10px', fontSize: '18px' }} href={`https://mumbai.polygonscan.com/address/${((tranchedPool as any).address)}#code`} target="_blank" className="text-sky-500 hover:underline hover:underline-offset-3 "><MonitorOutlined style={{ marginRight: '5px', fontSize: '20px' }} />Pool Address: {((tranchedPool as any).address)}  </a>
                                </div>
                                <div className="flex justify-between" style={{ margin: '10px', fontSize: '16px', marginTop: '50px' }}>
                                    <Statistic title="Junior Deposited Amount (USDC)" value={((tranchedPool as any).juniorDeposited) / constants.ONE_MILLION} precision={2} />
                                    <Statistic title="Senior Deposited Amount (USDC)" value={((tranchedPool as any).seniorDeposited) / constants.ONE_MILLION} precision={2} />
                                    <Statistic title="Funding Limit (USDC)" value={((tranchedPool as any).fundingLimit) / constants.ONE_MILLION} precision={2} />
                                </div>
                                <div style={{ margin: '10px', fontSize: '16px', textAlign: 'center', marginTop: '50px' }}>Invested ratio </div>
                                <div style={{ margin: '10px', marginTop: '20px' }} >
                                    <Slider
                                        value={((tranchedPool as any).juniorDeposited) / constants.ONE_MILLION + ((tranchedPool as any).seniorDeposited) / constants.ONE_MILLION}
                                        max={((tranchedPool as any).fundingLimit) / constants.ONE_MILLION}
                                        step={0.01}
                                        disabled={true}
                                    />
                                </div>
                                <div style={{ marginTop: '50px' }}>
                                    <Steps
                                        direction="vertical"
                                        current={currAction}
                                        items={[
                                            {
                                                title: <div>Junior Investment Process</div>,
                                                description: currAction == 0 ?
                                                    <div className="btn-sm bg-sky-200 hover:bg-sky-300" style={{ cursor: "pointer" }} onClick={handleLockJuniorInvestment}>Lock Junior Investment</div> :
                                                    <div className="btn-sm bg-sky-200" >Lock Junior Investment</div>,
                                                disabled: currAction == 0,
                                            },
                                            {
                                                title: <div>Senior Investment Process</div>,
                                                description: currAction == 1 ?
                                                    <div className="btn-sm bg-sky-200 hover:bg-sky-300" style={{ cursor: "pointer" }} onClick={handleSeniorInvestment}>Call Senior Investment</div> :
                                                    <div className="btn-sm bg-sky-200" >Call Senior Investment</div>,
                                                disabled: currAction == 1,
                                            },
                                            {
                                                title: <div>End Investment</div>,
                                                description: currAction == 2 ?
                                                    <div className="btn-sm bg-sky-200 hover:bg-sky-300" style={{ cursor: "pointer" }} onClick={showModal}>Drawdown</div> :
                                                    <div className="btn-sm bg-sky-200" >Drawdown</div>,
                                                disabled: currAction == 2,
                                            },
                                        ]}
                                    />
                                </div>
                            </div>
                        )
                    }
                    <Modal title="Drawdown all fund" open={isModalOpen}
                        // onOk={handleOk} 
                        onCancel={handleCancel}
                        // okText="Drawdown"

                        footer={[
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'end' }}>
                                <div style={{ margin: '5px', cursor: 'pointer' }} className="btn-sm rounded-md border-solid border-2 border-slate-200"
                                    onClick={handleCancel}
                                >Cancel</div>
                                <div style={{ margin: '5px', cursor: 'pointer' }} className="btn-sm hover:bg-sky-500 hover:text-white rounded-md border-solid border-2 border-slate-200 hover:border-sky-500"
                                    onClick={handleOk}
                                >Drawdown</div>
                            </div>
                        ]}>
                        <div style={{ margin: '5px' }}>Address to receipt fund token</div>
                        <div style={{ margin: '5px' }}>
                            <Input value={sendToAddress} onChange={handleSetSendToAddress}
                                placeholder="0x..." className="rounded-md"
                            ></Input>
                            <div style={{ fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'end', paddingLeft: '0px' }} className="btn-sm" onClick={() => setSendToAddress(address as any)}>
                                Select current account
                            </div>
                        </div>

                    </Modal>
                </Col>
                <Col span={5}></Col>
            </Row>


        </div>
    )
}

LoanDetailPage.Layout = (props: Props) => PageLayout({ children: props.children });

import { constants, Frequency } from "@/commons/constants";
import PageLayout from "@/components/layouts/PageLayout";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import { signMessage } from "@wagmi/core";
import { Button, Col, DatePicker, Form, Input, InputNumber, Row, Select, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import jwtDecode from "jwt-decode";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { zeroAddress } from "viem";
import { useAccount, useNetwork } from "wagmi";

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

    const tokensQuery = `query BorrowerPage($userId: String!){
        borrowerContracts(where: {user: $userId}) {
          id
        }
    }`

    const client = new ApolloClient({
        uri: process.env.NEXT_PUBLIC_SUB_GRAPH_API_URL as string,
        cache: new InMemoryCache(),
    })

    const getBorrowerProxy = async () => {
        if (!props.ownerAddress) {
            return;
        }
        const res = await client.query({
            query: gql(tokensQuery),
            variables: {
                userId: (props.ownerAddress as any).toLowerCase() ?? "",
            },
        })
        if (res.data.borrowerContracts.length > 0) {
            setBorrowerProxy(res.data.borrowerContracts[0].id)
        }
    }

    useEffect(() => {
        getBorrowerProxy()
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
    }, [chain, props])

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
                console.log('signature', signature);
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

    return (
        <div style={{ height: 'calc(100% - 64px - 30px)' }}>
            <Row>
                <Col span={5}></Col>
                <Col span={14}>
                    <Title>Loan's information</Title>
                    {props != undefined && (
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
                    )}
                </Col>
                <Col span={5}></Col>
            </Row>


        </div>
    )
}

LoanDetailPage.Layout = (props: Props) => PageLayout({ children: props.children });

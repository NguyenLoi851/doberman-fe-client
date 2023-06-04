import Footer from "@/components/footer";
import Header from "@/components/header";
import PageLayout from "@/components/layouts/PageLayout";
import { ReactNode, useEffect, useState } from "react";
import {
    InputNumber,
    Select,
    Form,
    Typography,
    Button,
    notification,
    Row,
    Col,
    Input,
    DatePicker,
} from "antd";
import { constants, Frequency } from "@/commons/constants";
import dayjs from "dayjs";
import { useAccount, useNetwork, useSignMessage } from "wagmi";
import { signMessage } from '@wagmi/core'
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAccessTokenState } from "@/store/accessTokenSlice";
import { toast } from "react-toastify";
import { useRouter } from "next/router";

interface Props {
    children: ReactNode;
}

export default function ApplyNewLoan() {
    const dateFormat = "DD/MM/YYYY HH:mm:ss";
    const { Title } = Typography;
    const [chainId, setChainId] = useState(0)
    const { chain } = useNetwork()
    const { address } = useAccount()
    const dispatch = useDispatch();
    const router = useRouter();

    useEffect(() => {
        setChainId(chain?.id || 0)
    }, [chain])

    const [loanInfo, setLoanInfo] = useState({
        companyName: "",
        companyIntro: "",
        companyPage: "",
        companyContact: "",
        projectName: "",
        projectIntro: "",
        juniorFeePercent: 0,
        targetFunding: 0,
        interestRate: 0,
        interestPaymentFrequency: 0,
        loanTerm: 0,
        fundableAt: 0
    })

    const handleChange = (e: any, name: any) => {
        try {
            if (e && e.target && e.target.value) {
                setLoanInfo({ ...loanInfo, [name]: e.target.value });
            } else {
                setLoanInfo({ ...loanInfo, [name]: e });
            }
        } catch (error) {
            console.log(error)
        }
    };

    const handleSubmit = async () => {
        const timestamp = Math.round(Date.now() / 1000)
        const signature = await signMessage({
            message: process.env.NEXT_PUBLIC_APP_ID + '#' + timestamp + '#' + chainId,
        })

        const res = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/auth/signin', {
            address: (address as string).toLowerCase(),
            sign: signature,
            timestamp,
            chainId
        })

        localStorage.setItem(constants.ACCESS_TOKEN, res.data.accessToken)
        dispatch(setAccessTokenState(res.data.accessToken))

        try {
            const res2 = await axios.post(process.env.NEXT_PUBLIC_API_BASE_URL + '/loans/apply', loanInfo, {
                headers: { Authorization: `Bearer ${res.data.accessToken}` }
            })
            toast.success("Apply new loan successfully.")
            router.push('/borrow')
        } catch (error) {
            console.log(error);
        }

    }

    return (
        <div>
            <div style={{ height: 'calc(100vh - 64px - 30px)', display: 'block', overflowY: 'scroll' }}>
                <Title>Loan's information</Title>
                <Form
                    onFinish={handleSubmit}
                    layout="vertical"
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
                            value={loanInfo.companyName}
                            onChange={(e) => handleChange(e, "companyName")}
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
                        <Input
                            placeholder="Company's introduction"
                            value={loanInfo.companyIntro}
                            onChange={(e) => handleChange(e, "companyIntro")}
                        ></Input>
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
                            value={loanInfo.companyPage}
                            onChange={(e) => handleChange(e, "companyPage")}
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
                            value={loanInfo.companyContact}
                            onChange={(e) => handleChange(e, "companyContact")}
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
                            value={loanInfo.projectName}
                            onChange={(e) => handleChange(e, "projectName")}
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
                        <Input
                            placeholder="Project's introduction"
                            value={loanInfo.projectIntro}
                            onChange={(e) => handleChange(e, "projectIntro")}
                        ></Input>
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
                            value={loanInfo.juniorFeePercent}
                            onChange={(e) => handleChange(e, "juniorFeePercent")}
                            addonAfter="%"
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
                            value={loanInfo.targetFunding}
                            onChange={(e) => handleChange(e, "targetFunding")}
                            addonAfter="$"
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
                            value={loanInfo.interestRate}
                            onChange={(e) => handleChange(e, "interestRate")}
                            addonAfter="%"
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
                            value={loanInfo.loanTerm}
                            onChange={(e) => handleChange(e, "loanTerm")}
                            addonAfter="months (minutes)"
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
                            format={dateFormat}
                            showTime={true}
                            onChange={(e) => handleChange(e?.unix(), "fundableAt")}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">Submit</Button>
                    </Form.Item>
                </Form>
            </div>
        </div>
    )
}

ApplyNewLoan.Layout = (props: Props) => PageLayout({ children: props.children });

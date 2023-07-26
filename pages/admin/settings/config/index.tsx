import { contractAddr } from "@/commons/contractAddress";
import AdminLayout from "@/components/layouts/AdminLayout";
import { readContract, waitForTransaction, writeContract } from "@wagmi/core";
import { Button, Descriptions, InputNumber, Modal } from "antd";
import BigNumber from "bignumber.js";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";
import DobermanConfig from "../../../../abi/DobermanConfig.json";

interface Props {
    children: ReactNode;
}

export default function AdminConfigPage() {

    const [reserveDenominator, setReserveDenominator] = useState(0)
    const [withdrawFeeDenominator, setWithdrawFeeDenominator] = useState(0)
    const [leverageRatio, setLeverageRatio] = useState(0)
    const [minBidIncrease, setMinBidIncrease] = useState(0)
    const [title, setTitle] = useState("")
    const [openModal, setOpenModal] = useState(false)
    const [paramIndex, setParamIndex] = useState(0)
    const [updateLoading, setUpdateLoading] = useState(false)
    const [valueInSC, setValueInSC] = useState(BigNumber(1))
    const [valueBussiness, setValueBussiness] = useState('')

    const router = useRouter();
    const { address } = useAccount()

    const handleCancel = () => {
        setOpenModal(false);
    };

    const getReserveDenominator = async () => {
        try {
            const res = await readContract({
                address: contractAddr.mumbai.dobermanConfig as any,
                abi: DobermanConfig,
                functionName: 'getNumber',
                args: [3]
            })
            setReserveDenominator(res as any)
        } catch (error) {
            console.log(error)
        }
    }

    const getWithdrawFeeDenominator = async () => {
        try {
            const res = await readContract({
                address: contractAddr.mumbai.dobermanConfig as any,
                abi: DobermanConfig,
                functionName: 'getNumber',
                args: [4]
            })
            setWithdrawFeeDenominator(res as any)
        } catch (error) {
            console.log(error)
        }
    }

    const getLeverageRatio = async () => {
        try {
            const res = await readContract({
                address: contractAddr.mumbai.dobermanConfig as any,
                abi: DobermanConfig,
                functionName: 'getNumber',
                args: [9]
            })
            setLeverageRatio(res as any)
        } catch (error) {
            console.log(error)
        }
    }

    const getMinBidIncrease = async () => {
        try {
            const res = await readContract({
                address: contractAddr.mumbai.dobermanConfig as any,
                abi: DobermanConfig,
                functionName: 'getNumber',
                args: [10]
            })
            setMinBidIncrease(res as any)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        if (address == null) {
            router.push('/admin')
        }
        if (updateLoading == false) {
            getReserveDenominator()
            getWithdrawFeeDenominator()
            getLeverageRatio()
            getMinBidIncrease()
        }
    }, [updateLoading])

    const handleSetNumber = async (idx: number) => {
        setUpdateLoading(true)
        try {
            const { hash } = await writeContract({
                address: contractAddr.mumbai.dobermanConfig as any,
                abi: DobermanConfig,
                functionName: 'setNumber',
                args: [idx, valueInSC]
            })
            const { status } = await waitForTransaction({
                // confirmations: 6,
                hash
            })
            if (status == 'success') {
                toast.success(`Set ${title} successfully`)
            }
            if (status == 'reverted') {
                toast.error('Transaction reverted')
            }
            setParamIndex(0)
        } catch (error) {
            console.log(error)
            try {
                toast.error((error as any).cause.reason)
            } catch (error2) {
                console.log(error2)
            }
        }
        setUpdateLoading(false)
        setOpenModal(false)
    }

    const handleOpenModal = async (idx: number) => {
        setOpenModal(true)
        setParamIndex(idx)
        switch (idx) {
            case 3: {
                setTitle("Reserve Ratio")
                setValueInSC(BigNumber(reserveDenominator))
                setValueBussiness((BigNumber(100).dividedBy(reserveDenominator)).toFormat(2).toString())
                break;
            };
            case 4: {
                setTitle("Withdraw Fee Ratio")
                setValueInSC(BigNumber(withdrawFeeDenominator))
                setValueBussiness((BigNumber(100).dividedBy(withdrawFeeDenominator)).toFormat(2).toString())
                break;
            };
            case 9: {
                setTitle("Leverage Ratio")
                setValueInSC(BigNumber(leverageRatio))
                setValueBussiness(BigNumber(leverageRatio).div(BigNumber(10).pow(BigNumber(18))).toFormat(2).toString())
                break;
            };
            case 10: {
                setTitle("Min Bid Increase Ratio")
                setValueInSC(BigNumber(minBidIncrease))
                setValueBussiness(BigNumber(minBidIncrease).div(BigNumber(100)).toFormat(2).toString())
                break;
            };
        }
    }

    const handleChangeValue = async (e: any, idx: number) => {
        try {
            if (e == null || Number(e) == 0) {
                return;
            }
            const newValueBussiness = e as number != 0 ? e as number : 1
            setValueBussiness(e.toString())

            switch (idx) {
                case 3: {
                    setValueInSC(BigNumber((100 / newValueBussiness).toFixed(0)))
                    break;
                };
                case 4: {
                    setValueInSC(BigNumber((100 / newValueBussiness).toFixed(0)))
                    break;
                };
                case 9: {
                    setValueInSC(BigNumber(BigNumber(newValueBussiness).multipliedBy(BigNumber(10).pow(BigNumber(18))).toFixed(0)))
                    break;
                };
                case 10: {
                    setValueInSC(BigNumber(BigNumber(newValueBussiness).multipliedBy(BigNumber(100)).toFixed(0)))
                    break;
                }
            }
        } catch (error) {
            console.log(error)
        }

    }

    return (
        <div>
            <div style={{ padding: '20px' }}>
                <Descriptions title="Configuration params" bordered>
                    <Descriptions.Item style={{ fontSize: '18px' }} span={1} label="Reserve Ratio">
                        {(BigNumber(100).dividedBy(reserveDenominator)).toFormat(2).toString()} %
                    </Descriptions.Item>
                    <Descriptions.Item style={{ fontSize: '18px' }} span={2} label="Reserve Denominator (in SC)">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>{reserveDenominator.toString()}</div>
                            <Button onClick={() => handleOpenModal(3)}>Edit</Button>
                        </div>
                    </Descriptions.Item>

                    <Descriptions.Item style={{ fontSize: '18px' }} span={1} label="Withdraw Fee Ratio">
                        {(BigNumber(100).dividedBy(withdrawFeeDenominator)).toFormat(2).toString()} %
                    </Descriptions.Item>
                    <Descriptions.Item style={{ fontSize: '18px' }} span={3} label="Withdraw Fee Denominator (in SC)">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>{withdrawFeeDenominator.toString()}</div>
                            <Button onClick={() => handleOpenModal(4)}>Edit</Button>
                        </div>
                    </Descriptions.Item>

                    <Descriptions.Item style={{ fontSize: '18px' }} span={1} label="Leverage Ratio">
                        {BigNumber(leverageRatio).div(BigNumber(10).pow(BigNumber(18))).toFormat(2).toString()}
                    </Descriptions.Item>
                    <Descriptions.Item style={{ fontSize: '18px' }} span={3} label="Leverage Ratio (in SC)">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>{leverageRatio.toString()}</div>
                            <Button onClick={() => handleOpenModal(9)}>Edit</Button>
                        </div>
                    </Descriptions.Item>

                    <Descriptions.Item style={{ fontSize: '18px' }} span={1} label="Min Bid Increase Ratio">
                        {BigNumber(minBidIncrease).div(BigNumber(100)).toFormat(2).toString()} %
                    </Descriptions.Item>
                    <Descriptions.Item style={{ fontSize: '18px' }} span={3} label="Min Bid Increase Ratio (in SC)">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>{minBidIncrease.toString()}</div>
                            <Button onClick={() => handleOpenModal(10)}>Edit</Button>
                        </div>
                    </Descriptions.Item>
                </Descriptions>

            </div>

            <Modal title={title} open={openModal} onOk={() => handleSetNumber(paramIndex)} onCancel={handleCancel}
                footer={[
                    <Button key="back" onClick={handleCancel}>
                        Cancel
                    </Button>,
                    <Button loading={updateLoading} onClick={() => handleSetNumber(paramIndex)}>
                        Submit
                    </Button>,
                ]}
            >
                <div className="flex justify-center">
                    <div style={{ marginTop: '10px', marginRight: '20px' }}>
                        Update {title} to:
                    </div>
                    <div>
                        <InputNumber
                            className="flex justify-center"
                            placeholder={valueBussiness}
                            addonAfter={[3, 4, 10].includes(paramIndex) ? '%' : ''}
                            value={valueBussiness}
                            onChange={(e: any) => handleChangeValue(e, paramIndex)}
                        ></InputNumber>
                    </div>
                </div>
                <div className="flex justify-center" style={{ marginTop: '10px' }} >
                    <div style={{ marginRight: '20px' }}>
                        Value in SC:
                    </div>
                    <div>{valueInSC.toString()}</div>
                </div>

            </Modal>
        </div>
    )
}

AdminConfigPage.Layout = (props: Props) => AdminLayout({ children: props.children });

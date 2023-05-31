import Footer from "@/components/footer";
import Header from "@/components/header";
import { Input } from "antd";

export default function ApplyNewLoan() {
    return (
        <div>
            <Header />
            <div style={{height: 'calc(100vh - 64px - 30px)', display: 'block', overflowY: 'scroll'}}>
                <div style={{display:'flex', justifyContent: 'center'}}>Apply a new loan</div>
                <div>Loan's information</div>
                
                <div style={{height: '30px'}}></div>

                <div>Company's name</div>
                <Input placeholder="company's name"/>
                <div>Company's introduction</div>
                <Input placeholder="company's introduction"/>
                <div>Company's website</div>
                <Input placeholder="company's website"/>
                <div>Company's contact</div>
                <Input placeholder="company's contact"/>
                <div>Project's name</div>
                <Input placeholder="project's name"/>
                <div>Introduction about project</div>
                <Input placeholder="introduction about project"/>
                
                <div style={{height: '30px'}}></div>

                <div>Junior Fee Percent</div>
                <Input placeholder="junior fee percent"/>
                <div>Target Funding</div>
                <Input placeholder="target funding"/>
                <div>Interest Rate</div>
                <Input placeholder="interest rate"/>
                <div>Interest Payment Frequency</div>
                <Input placeholder="interest payment frequency"/>
                <div>Loan term</div>
                <Input placeholder="loan term"/>
                <div>Fundable at</div>
                <Input placeholder="fundable at"/>

                <button>Submit</button>
            </div>
            <Footer />
        </div>
    )
}
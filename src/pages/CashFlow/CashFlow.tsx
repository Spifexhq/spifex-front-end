import Navbar from '@/components/Navbar';
import CashFlowTable from '@/components/CashFlowTable/CashFlowTable';

const CashFlow = () => {
    return (
        <div>
            <Navbar />
            <div className='mt-30 ml-30 mr-30'>            
                <CashFlowTable />
            </div>
        </div>
    );
};

export default CashFlow;

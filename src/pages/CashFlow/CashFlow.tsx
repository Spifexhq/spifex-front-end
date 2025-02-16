import Navbar from '@/components/Navbar';
import EntriesTable from '@/components/CashflowEntry/CashflowEntry';

const CashFlow = () => {
    return (
        <div>
            <Navbar />
            <EntriesTable 
                banks={[]} 
                fetchBanks={() => {}} 
                entries={[]} 
                fetchEntries={() => {}} 
                keyword="" 
                tags={[]} 
                selectedMonths={[]} 
                mode="cashflow" 
            />
        </div>
    );
};

export default CashFlow;

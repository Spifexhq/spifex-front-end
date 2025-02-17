/**
 * CashFlow.tsx
 * 
 * This page renders the Cash Flow table within a structured layout.
 * 
 * Features:
 * - Includes the global `Navbar` component for navigation
 * - Displays the `CashFlowTable` component to manage financial entries
 * - Uses padding and margin for proper spacing and layout
 * 
 * Usage:
 * ```tsx
 * <CashFlow />
 * ```
 */

import Navbar from 'src/components/Navbar';
import CashFlowTable from '@/components/CashFlowTable/CashFlowTable';

const CashFlow = () => {
    return (
        <div>
            <Navbar />
            <div className="mt-30 ml-30 mr-30">            
                <CashFlowTable />
            </div>
        </div>
    );
};

export default CashFlow;

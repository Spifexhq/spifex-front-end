import { useState } from 'react';

const useTabs = (initialTabValue = 0) => {
  const [tabValue, setTabValue] = useState(initialTabValue);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const resetTabs = () => {
    setTabValue(initialTabValue);
  };

  return {
    tabValue,
    handleChangeTab,
    resetTabs,
  };
};

export default useTabs;

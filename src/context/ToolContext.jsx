import { createContext, useContext } from 'react';

const ToolContext = createContext(null);

export const useTools = () => {
  const context = useContext(ToolContext);
  if (!context) {
    throw new Error('useTools must be used within a ToolProvider');
  }
  return context;
};

export default ToolContext;

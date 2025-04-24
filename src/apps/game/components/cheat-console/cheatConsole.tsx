import React, { useState } from "react";

export const CheatConsole = () => {

  const [consoleInput, setConsoleInput] = useState('');

  const handleConsoleInput = (e: React.ChangeEvent<HTMLInputElement>) => {  
    setConsoleInput(e.target.value);
  }

  const handleConsoleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log(consoleInput);
      setConsoleInput('');
    }
  }

  return (
    <div className="console on">
      <input type="text" value={consoleInput} onChange={handleConsoleInput} onKeyDown={handleConsoleSubmit} />
    </div>
  );
};

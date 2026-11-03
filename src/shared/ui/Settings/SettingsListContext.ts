import { createContext } from "react";
export const ListContext = createContext({ index: 0, size: 20, server: false, setCount: (count: number) => { void count; } });

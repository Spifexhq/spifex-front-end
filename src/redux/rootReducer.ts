// redux/rootReducer.ts
import authReducer from "./reducers/authReducer";

const rootReducer = {
  auth: authReducer,
};

export type RootState = {
  auth: ReturnType<typeof authReducer>;
};

export default rootReducer;

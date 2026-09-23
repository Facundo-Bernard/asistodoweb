import { configureStore } from "@reduxjs/toolkit";
import adelantoReducer from "./adelantoSlice";

const store = configureStore({
  reducer: {
    adelanto: adelantoReducer,
  },
});

export default store;


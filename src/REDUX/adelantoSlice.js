import { createSlice } from "@reduxjs/toolkit";

const initialDetails = {
  fullName: "",
  dni: "",
  email: "",
  phone: "",
  address: "",
  gender: "",
  age: "",
  employment: "",
  income: "",
};

const createInitialState = () => ({
  screen: "banco",
  selectedBanks: [],
  selectionLimit: false,
  details: { ...initialDetails },
  selectedOffer: null,
  submission: {
    status: "idle",
    error: "",
    id: "",
    channel: "",
  },
});

const adelantoSlice = createSlice({
  name: "adelanto",
  initialState: createInitialState(),
  reducers: {
    setAdvanceScreen: (state, action) => {
      state.screen = action.payload;
    },
    toggleSelectedBank: (state, action) => {
      const bankId = action.payload;
      state.selectionLimit = false;

      if (state.selectedBanks.includes(bankId)) {
        state.selectedBanks = state.selectedBanks.filter((id) => id !== bankId);
        return;
      }

      if (state.selectedBanks.length === 2) {
        state.selectionLimit = true;
        return;
      }

      state.selectedBanks.push(bankId);
    },
    updateAdvanceDetails: (state, action) => {
      Object.assign(state.details, action.payload);
    },
    selectAdvanceOffer: (state, action) => {
      state.selectedOffer = action.payload;
      state.submission = { status: "idle", error: "", id: "", channel: "" };
    },
    clearAdvanceOffer: (state) => {
      state.selectedOffer = null;
    },
    startAdvanceSubmission: (state, action) => {
      state.submission = { status: "sending", error: "", id: "", channel: action.payload };
    },
    advanceSubmissionSucceeded: (state, action) => {
      state.submission.status = "success";
      state.submission.id = action.payload;
      state.screen = "exito";
    },
    advanceSubmissionFailed: (state, action) => {
      state.submission.status = "error";
      state.submission.error = action.payload;
    },
    resetAdvance: () => createInitialState(),
  },
});

export const {
  advanceSubmissionFailed,
  advanceSubmissionSucceeded,
  clearAdvanceOffer,
  resetAdvance,
  selectAdvanceOffer,
  setAdvanceScreen,
  startAdvanceSubmission,
  toggleSelectedBank,
  updateAdvanceDetails,
} = adelantoSlice.actions;

export default adelantoSlice.reducer;

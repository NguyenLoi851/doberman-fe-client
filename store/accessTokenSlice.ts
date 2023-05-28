import { createSlice } from "@reduxjs/toolkit";
import { AppState } from "./store";
import { HYDRATE } from "next-redux-wrapper";

// Type for our state
export interface AccessTokenState {
  accessTokenState: string;
}

// Initial state
const initialState: AccessTokenState = {
    accessTokenState: '',
};

// Actual Slice
export const accessTokenSlice = createSlice({
  name: "accessToken",
  initialState,
  reducers: {
    // Action to set the authentication status
    setAccessTokenState(state, action) {
      state.accessTokenState = action.payload;
    },
  },

});

export const { setAccessTokenState } = accessTokenSlice.actions;

export const selectAccessTokenState = (state: AppState) => state.accessToken.accessTokenState;

export default accessTokenSlice.reducer;
import { createSlice } from "@reduxjs/toolkit";
import { accessKey } from "../../utils/constants";

const initialState = {
  user: JSON.parse(localStorage.getItem("user")) || null,
  token: localStorage.getItem(accessKey) || null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, { payload }) => {
      state.user = payload.user;
      if (payload.token) {
        state.token = payload.token;
        localStorage.setItem(accessKey, payload.token);
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem(accessKey);
    },
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;

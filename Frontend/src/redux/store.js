import { configureStore } from "@reduxjs/toolkit";
import { voiceBotApi } from "./api/voiceBotApi";
import userReducer from "./slices/User";

const store = configureStore({
  reducer: {
    user: userReducer,
    [voiceBotApi.reducerPath]: voiceBotApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(voiceBotApi.middleware),
});

export default store;

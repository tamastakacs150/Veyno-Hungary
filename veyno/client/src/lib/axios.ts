//client/src/lib/axios.ts
import axios from "axios";
import { loadingBus } from "./loadingBus";


export const api = axios.create({
baseURL: import.meta.env.VITE_API_URL ?? "/api",
withCredentials: true,
});


let timer: number | null = null;


api.interceptors.request.use((config) => {
if (timer) window.clearTimeout(timer);
timer = window.setTimeout(() => {
loadingBus.show("Loading data...");
}, 400);
return config;
});


api.interceptors.response.use(
(res) => {
if (timer) window.clearTimeout(timer);
loadingBus.hide();
return res;
},
(err) => {
if (timer) window.clearTimeout(timer);
loadingBus.hide();
return Promise.reject(err);
}
);
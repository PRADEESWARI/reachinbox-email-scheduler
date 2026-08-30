import axios from "axios";

export const api = axios.create({ baseURL: "https://reachinbox-api-45cg.onrender.com/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

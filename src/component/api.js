// src/api.js
import axios from "axios";

const token = localStorage.getItem("userToken");

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    Authorization: token ? `Bearer ${token}` : undefined,
  },
});

export default api;

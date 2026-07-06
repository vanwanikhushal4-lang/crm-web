import axios from "axios";

export const API_BASE_URL = 'http://45.118.160.135:9192/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 1000000,
});

api.interceptors.request.use(
  (config) => {
    if (config.url !== "/login" && config.url !== '/createUser') {
      const token = localStorage.getItem("jwtToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
  }, 
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized, redirecting to login...");
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

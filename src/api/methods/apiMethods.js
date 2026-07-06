import api from "../AxiosInterceptor";

const apiMethods = {
  get: async (url, params) => {
    const res = await api.get(url, { params });
    return res.data;
  },

  post: async (url, data, config = {}) => {
    const res = await api.post(url, data, config);
    return res.data;
  },

  put: async (url, data) => {
    const res = await api.put(url, data);
    return res.data;
  },

  patch: async (url, data) => {
    const res = await api.patch(url, data);
    return res.data;
  },

  delete: async (url) => {
    const res = await api.delete(url);
    return res.data;
  },
};

export default apiMethods;

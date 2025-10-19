// Axios with base URL and auth header
const api = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 15000,
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ojpms_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('ojpms_token');
      localStorage.removeItem('ojpms_user');
      window.location.href = '/index.html';
    }
    return Promise.reject(err);
  }
);

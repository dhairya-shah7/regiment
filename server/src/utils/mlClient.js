const axios = require('axios');

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  timeout: 600000, // 10 min — training can be slow
  headers: { 'Content-Type': 'application/json' },
});

mlClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.code === 'ECONNREFUSED') {
      const e = new Error('ML service is unavailable. Ensure the FastAPI server is running on port 8000.');
      e.statusCode = 503;
      e.code = 'ML_SERVICE_UNAVAILABLE';
      return Promise.reject(e);
    }
    return Promise.reject(err);
  }
);

module.exports = mlClient;

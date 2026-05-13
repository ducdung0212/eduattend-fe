import axios from 'axios';

// 1. Tạo một instance Axios độc lập
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. REQUEST INTERCEPTOR: Tự động nhét Token vào trước khi gửi đi
api.interceptors.request.use(
  (config) => {
    // Chỉ chạy ở môi trường Client (Browser)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. RESPONSE INTERCEPTOR: Xử lý dữ liệu trả về (Bóc tách 'data')
api.interceptors.response.use(
  (response) => {
    // Trả thẳng dữ liệu từ Backend vào logic code, bỏ qua các lớp metadata thừa
    return response.data; 
  },
  (error) => {
    // Tự động đá văng ra trang đăng nhập nếu Token hết hạn (Lỗi 401)
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    // Trả về đúng câu thông báo lỗi bằng tiếng Việt từ NestJS Exception Filter
    return Promise.reject(error.response?.data?.message || 'Có lỗi xảy ra');
  }
);

export default api;
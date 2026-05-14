import axios from 'axios';

// 1. Tạo một instance Axios độc lập
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
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

// 3. RESPONSE INTERCEPTOR: Xử lý dữ liệu trả về
api.interceptors.response.use(
  (response) => {
    // Để nguyên response để bên page.tsx có thể check res.status === 200
    return response; 
  },
  (error) => {
    // Lấy url đang gọi để kiểm tra
    const requestUrl = error.config?.url || '';
    const isLoginRequest = requestUrl.includes('/auth/login');

    // Tự động đá văng ra trang đăng nhập nếu Token hết hạn (Lỗi 401)
    // NHƯNG PHẢI BỎ QUA nếu người dùng đang ở trang đăng nhập gọi api login
    if (error.response?.status === 401 && typeof window !== 'undefined' && !isLoginRequest) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user'); // Nhớ clear cả user
      window.location.href = '/login';
    }
    
    // Trả nguyên object error về cho page.tsx tự xử lý hiển thị
    return Promise.reject(error);
  }
);

export default api;
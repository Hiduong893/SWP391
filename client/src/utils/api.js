const API_BASE = '/api';

// Helper to make fetch calls with authorization header
const request = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Đã xảy ra lỗi không xác định.');
  }

  return data;
};

export const api = {
  auth: {
    register: (name, email, password) => 
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      }),
      
    verifyEmail: (token) => 
      request(`/auth/verify-email?token=${token}`, {
        method: 'GET'
      }),
      
    login: (email, password) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
      
    googleLogin: (credential) => 
      request('/auth/google-login', {
        method: 'POST',
        body: JSON.stringify({ credential })
      }),
      
    forgotPassword: (email) => 
      request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
      
    verifyResetCode: (email, code) => 
      request('/auth/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify({ email, code })
      }),
      
    resetPassword: (email, code, newPassword) => 
      request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword })
      })
  },
  
  user: {
    getProfile: () => 
      request('/user/profile', {
        method: 'GET'
      }),
      
    editProfile: (name, bio) => 
      request('/user/profile/edit', {
        method: 'PUT',
        body: JSON.stringify({ name, bio })
      }),
      
    updateAvatar: (avatar) => 
      request('/user/profile/avatar', {
        method: 'PUT',
        body: JSON.stringify({ avatar })
      }),
      
    changePassword: (currentPassword, newPassword) => 
      request('/user/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      }),
      
    uploadLicense: (licenseImage) =>
      request('/user/license', {
        method: 'PUT',
        body: JSON.stringify({ licenseImage })
      }),

    uploadKyc: (cccdImage, licenseImage, carPapersImage) =>
      request('/user/kyc', {
        method: 'PUT',
        body: JSON.stringify({ cccdImage, licenseImage, carPapersImage })
      }),

    getWallet: () =>
      request('/user/wallet', {
        method: 'GET'
      }),

    transactWallet: (type, amount) =>
      request('/user/wallet/transaction', {
        method: 'POST',
        body: JSON.stringify({ type, amount })
      }),

    linkBank: (bankName, accountNumber, accountHolder) =>
      request('/user/bank-account', {
        method: 'PUT',
        body: JSON.stringify({ bankName, accountNumber, accountHolder })
      }),

    registerOwner: () =>
      request('/user/register-owner', {
        method: 'POST'
      })
  },
  
  cars: {
    getCars: (filters = {}) => {
      const params = new URLSearchParams();
      for (const key in filters) {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/cars${query}`, { method: 'GET' });
    },
    
    listCar: (carData) => 
      request('/cars', {
        method: 'POST',
        body: JSON.stringify(carData)
      })
  },
  
  bookings: {
    create: (bookingData) => 
      request('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      }),
      
    getMyTrips: () => 
      request('/bookings/my-trips', {
        method: 'GET'
      }),
      
    cancel: (id) => 
      request(`/bookings/${id}/cancel`, {
        method: 'PUT'
      }),

    signHandover: (id, type, checklist, signature) =>
      request(`/bookings/${id}/handover`, {
        method: 'PUT',
        body: JSON.stringify({ type, checklist, signature })
      }),

    reportIncident: (id, description, image) =>
      request(`/bookings/${id}/incident`, {
        method: 'POST',
        body: JSON.stringify({ description, image })
      })
  },

  owner: {
    getCars: () =>
      request('/owner/cars', {
        method: 'GET'
      }),

    getStats: () =>
      request('/owner/stats', {
        method: 'GET'
      }),

    approveBooking: (id, approved) =>
      request(`/owner/bookings/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ approved })
      })
  },

  reviews: {
    getCarReviews: (carId) =>
      request(`/cars/${carId}/reviews`, {
        method: 'GET'
      }),

    createReview: (bookingId, rating, comment) =>
      request(`/bookings/${bookingId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      })
  },

  support: {
    createTicket: (subject, message) =>
      request('/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, message })
      }),

    getMyTickets: () =>
      request('/support/tickets', {
        method: 'GET'
      }),

    resolveTicket: (id) =>
      request(`/support/tickets/${id}/resolve`, {
        method: 'PUT'
      }),

    createDispute: (bookingId, description) =>
      request('/support/disputes', {
        method: 'POST',
        body: JSON.stringify({ bookingId, description })
      })
  },

  system: {
    getConfig: () =>
      request('/system/config', {
        method: 'GET'
      })
  },

  admin: {
    getStats: () => 
      request('/admin/stats', {
        method: 'GET'
      }),
      
    getUsers: () => 
      request('/admin/users', {
        method: 'GET'
      }),
      
    approveLicense: (id, status) => 
      request(`/admin/users/${id}/license`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      }),
      
    getBookings: () => 
      request('/admin/bookings', {
        method: 'GET'
      }),
      
    updateBookingStatus: (id, status) => 
      request(`/admin/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      }),
      
    deleteCar: (id) => 
      request(`/admin/cars/${id}`, {
        method: 'DELETE'
      }),

    approveKyc: (id, status) =>
      request(`/admin/users/${id}/kyc`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      }),

    getIncidents: () =>
      request('/admin/incidents', {
        method: 'GET'
      }),

    resolveIncident: (bookingId) =>
      request(`/admin/incidents/${bookingId}/resolve`, {
        method: 'PUT'
      }),

    getSupportTickets: () =>
      request('/admin/support/tickets', {
        method: 'GET'
      }),

    replySupportTicket: (id, replyText) =>
      request(`/admin/support/tickets/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ replyText })
      }),

    getReviews: () =>
      request('/admin/reviews', {
        method: 'GET'
      }),

    updateReviewStatus: (id, status) =>
      request(`/admin/reviews/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      }),

    getDisputes: () =>
      request('/admin/disputes', {
        method: 'GET'
      }),

    resolveDispute: (id, resolutionDetails) =>
      request(`/admin/disputes/${id}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ resolutionDetails })
      }),

    refundDeposit: (bookingId, status) =>
      request(`/admin/bookings/${bookingId}/refund-deposit`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      }),

    getPendingCars: () =>
      request('/admin/cars/pending', {
        method: 'GET'
      }),

    moderateCar: (id, status, rejectionReason) =>
      request(`/admin/cars/${id}/moderation`, {
        method: 'PUT',
        body: JSON.stringify({ status, rejectionReason })
      }),

    updateSystemConfig: (config) =>
      request('/admin/system/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      }),

    updateUserRole: (id, role) =>
      request(`/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      })
  },
  
  emails: {
    getEmails: () => 
      request('/emails', {
        method: 'GET'
      }),
      
    markRead: () => 
      request('/emails/mark-read', {
        method: 'POST'
      }),
      
    clearAll: () => 
      request('/emails/clear', {
        method: 'POST'
      })
  }
};

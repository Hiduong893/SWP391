import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, 'db.json');

// Preset Cars to populate database on first boot
const DEFAULT_CARS = [
  {
    id: 'car-preset-1',
    brand: 'VinFast',
    model: 'VF 8 (Điện)',
    seats: 5,
    transmission: 'Tự động',
    fuel: 'Điện',
    pricePerDay: 1200000,
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80',
    location: 'Hà Nội',
    ownerId: null,
    status: 'available',
    plateNumber: '30K-123.45',
    createdAt: new Date().toISOString()
  },
  {
    id: 'car-preset-2',
    brand: 'Toyota',
    model: 'Vios',
    seats: 5,
    transmission: 'Số sàn',
    fuel: 'Xăng',
    pricePerDay: 700000,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    location: 'Hà Nội',
    ownerId: null,
    status: 'available',
    plateNumber: '30L-999.88',
    createdAt: new Date().toISOString()
  },
  {
    id: 'car-preset-3',
    brand: 'Hyundai',
    model: 'SantaFe',
    seats: 7,
    transmission: 'Tự động',
    fuel: 'Dầu',
    pricePerDay: 1400000,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    location: 'TP. Hồ Chí Minh',
    ownerId: null,
    status: 'available',
    plateNumber: '51G-567.89',
    createdAt: new Date().toISOString()
  },
  {
    id: 'car-preset-4',
    brand: 'Honda',
    model: 'City',
    seats: 5,
    transmission: 'Tự động',
    fuel: 'Xăng',
    pricePerDay: 800000,
    image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=600&q=80',
    location: 'TP. Hồ Chí Minh',
    ownerId: null,
    status: 'available',
    plateNumber: '51H-111.22',
    createdAt: new Date().toISOString()
  },
  {
    id: 'car-preset-5',
    brand: 'Mitsubishi',
    model: 'Xpander',
    seats: 7,
    transmission: 'Tự động',
    fuel: 'Xăng',
    pricePerDay: 950000,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
    location: 'Đà Nẵng',
    ownerId: null,
    status: 'available',
    plateNumber: '43A-555.55',
    createdAt: new Date().toISOString()
  },
  {
    id: 'car-preset-6',
    brand: 'Kia',
    model: 'Seltos',
    seats: 5,
    transmission: 'Tự động',
    fuel: 'Xăng',
    pricePerDay: 900000,
    image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=600&q=80',
    location: 'Đà Nẵng',
    ownerId: null,
    status: 'available',
    plateNumber: '43C-678.90',
    createdAt: new Date().toISOString()
  }
];

// Helper to generate default test users
const makeAdminUser = () => ({
  id: 'user-admin-1',
  email: 'admin@bonboncar.vn',
  password: bcrypt.hashSync('admin', 10),
  name: 'Hệ Thống Admin',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  bio: 'Quản trị viên tối cao của BonBonCar',
  isEmailVerified: true,
  role: 'admin',
  licenseStatus: 'verified',
  licenseImage: null,
  walletBalance: 15000000,
  bankAccount: { bankName: 'MBBank', accountNumber: '1903456789012', accountHolder: 'HE THONG ADMIN' },
  createdAt: new Date().toISOString()
});

const makeAdmin2User = () => ({
  id: 'user-admin-2',
  email: 'admin2@bonboncar.vn',
  password: bcrypt.hashSync('admin', 10),
  name: 'Admin Hồ Văn Dương',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  bio: 'Tài khoản Admin riêng biệt dành riêng cho bạn',
  isEmailVerified: true,
  role: 'admin',
  licenseStatus: 'verified',
  licenseImage: null,
  walletBalance: 20000000,
  bankAccount: { bankName: 'MBBank', accountNumber: '9999999999999', accountHolder: 'HO VAN DUONG ADMIN' },
  createdAt: new Date().toISOString()
});

const makeCskhUser = () => ({
  id: 'user-cskh-1',
  email: 'cskh@bonboncar.vn',
  password: bcrypt.hashSync('cskh', 10),
  name: 'CSKH Minh Anh',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  bio: 'Nhân viên Chăm sóc khách hàng và kiểm duyệt KYC của BonBonCar',
  isEmailVerified: true,
  role: 'cskh',
  licenseStatus: 'verified',
  licenseImage: null,
  walletBalance: 0,
  bankAccount: null,
  createdAt: new Date().toISOString()
});

const makeOwnerUser = () => ({
  id: 'user-owner-1',
  email: 'owner@bonboncar.vn',
  password: bcrypt.hashSync('owner', 10),
  name: 'Chủ Xe Lê Mạnh',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  bio: 'Chủ phương tiện xe ký gửi uy tín, chuyên nghiệp tại Hà Nội',
  isEmailVerified: true,
  role: 'owner',
  licenseStatus: 'verified',
  licenseImage: null,
  walletBalance: 25000000,
  bankAccount: { bankName: 'Vietcombank', accountNumber: '0071001234567', accountHolder: 'LE MANH' },
  createdAt: new Date().toISOString()
});

const makeRenterUser = () => ({
  id: 'user-renter-1',
  email: 'renter@bonboncar.vn',
  password: bcrypt.hashSync('renter', 10),
  name: 'Khách Thuê Quang Huy',
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  bio: 'Khách hàng đam mê trải nghiệm các dòng xe tự lái đời mới',
  isEmailVerified: true,
  role: 'renter',
  licenseStatus: 'verified',
  licenseImage: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=600&q=80',
  walletBalance: 5000000,
  bankAccount: { bankName: 'Techcombank', accountNumber: '19030011223344', accountHolder: 'NGUYEN QUANG HUY' },
  createdAt: new Date().toISOString()
});

// Default configuration settings
const DEFAULT_SYSTEM_CONFIG = {
  serviceFeePercent: 5,
  insuranceMultiplier: 1.1,
  systemNotice: 'Chào mừng bạn đến với BonBonCar - Nền tảng Cho thuê và Ký gửi xe tự lái hàng đầu Việt Nam. Hãy hoàn tất KYC bằng lái xe trong mục Hồ sơ để bắt đầu trải nghiệm thuê xe ngay!'
};

// Initialize database file
const initDb = () => {
  if (!fs.existsSync(dbFilePath)) {
    const initialData = {
      users: [makeAdminUser(), makeAdmin2User(), makeCskhUser(), makeOwnerUser(), makeRenterUser()],
      emails: [],
      cars: DEFAULT_CARS,
      bookings: [],
      reviews: [],
      support_tickets: [],
      disputes: [],
      system_config: DEFAULT_SYSTEM_CONFIG
    };
    fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
  } else {
    // Read and ensure all keys exist
    try {
      const data = JSON.parse(fs.readFileSync(dbFilePath, 'utf-8'));
      let updated = false;
      if (!data.users) { data.users = [makeAdminUser(), makeAdmin2User(), makeCskhUser(), makeOwnerUser(), makeRenterUser()]; updated = true; }
      if (!data.emails) { data.emails = []; updated = true; }
      if (!data.cars || data.cars.length === 0) { data.cars = DEFAULT_CARS; updated = true; }
      if (!data.bookings) { data.bookings = []; updated = true; }
      if (!data.reviews) { data.reviews = []; updated = true; }
      if (!data.support_tickets) { data.support_tickets = []; updated = true; }
      if (!data.disputes) { data.disputes = []; updated = true; }
      if (!data.system_config) { data.system_config = DEFAULT_SYSTEM_CONFIG; updated = true; }
      
      // Ensure all standard test users are present
      const userEmails = data.users.map(u => u.email);
      if (!userEmails.includes('admin@bonboncar.vn')) { data.users.push(makeAdminUser()); updated = true; }
      if (!userEmails.includes('admin2@bonboncar.vn')) { data.users.push(makeAdmin2User()); updated = true; }
      if (!userEmails.includes('cskh@bonboncar.vn')) { data.users.push(makeCskhUser()); updated = true; }
      if (!userEmails.includes('owner@bonboncar.vn')) { data.users.push(makeOwnerUser()); updated = true; }
      if (!userEmails.includes('renter@bonboncar.vn')) { data.users.push(makeRenterUser()); updated = true; }
      
      // Upgrade users with bankAccounts & walletBalances if missing
      data.users = data.users.map(user => {
        let userUpdated = false;
        if (user.walletBalance === undefined) { user.walletBalance = user.role === 'admin' ? 15000000 : user.role === 'owner' ? 25000000 : user.role === 'renter' ? 5000000 : 0; userUpdated = true; }
        if (user.bankAccount === undefined) { 
          user.bankAccount = user.role === 'admin' 
            ? { bankName: 'MBBank', accountNumber: '1903456789012', accountHolder: 'HE THONG ADMIN' } 
            : user.role === 'owner' 
            ? { bankName: 'Vietcombank', accountNumber: '0071001234567', accountHolder: 'LE MANH' } 
            : user.role === 'renter' 
            ? { bankName: 'Techcombank', accountNumber: '19030011223344', accountHolder: 'NGUYEN QUANG HUY' } 
            : null; 
          userUpdated = true; 
        }
        if (user.kycDocuments === undefined) {
          user.kycDocuments = { cccd: null, license: user.licenseImage || null, carPapers: null };
          userUpdated = true;
        }
        if (userUpdated) updated = true;
        return user;
      });

      if (updated) {
        fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (e) {
      const initialData = { 
        users: [makeAdminUser(), makeCskhUser(), makeOwnerUser(), makeRenterUser()], 
        emails: [], 
        cars: DEFAULT_CARS, 
        bookings: [],
        reviews: [],
        support_tickets: [],
        disputes: [],
        system_config: DEFAULT_SYSTEM_CONFIG
      };
      fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }
};

initDb();

// Read database
const readDb = () => {
  try {
    const data = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file:', error);
    return { users: [], emails: [], cars: DEFAULT_CARS, bookings: [], reviews: [], support_tickets: [], disputes: [], system_config: DEFAULT_SYSTEM_CONFIG };
  }
};

// Write database
const writeDb = (data) => {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database file:', error);
  }
};

export const db = {
  // Users Operations
  users: {
    findMany: () => {
      return readDb().users;
    },

    findOne: (filter) => {
      const users = readDb().users;
      return users.find(user => {
        for (const key in filter) {
          if (user[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    create: (userData) => {
      const data = readDb();
      const newUser = {
        id: crypto.randomUUID(),
        email: userData.email.toLowerCase().trim(),
        password: userData.password || null,
        name: userData.name || '',
        avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        bio: userData.bio || '',
        isEmailVerified: userData.isEmailVerified || false,
        emailVerificationToken: userData.emailVerificationToken || null,
        resetPasswordToken: userData.resetPasswordToken || null,
        resetPasswordExpires: userData.resetPasswordExpires || null,
        googleId: userData.googleId || null,
        role: userData.role || 'renter',
        licenseStatus: 'not_uploaded',
        licenseImage: null,
        walletBalance: 0,
        bankAccount: null,
        kycDocuments: { cccd: null, license: null, carPapers: null },
        createdAt: new Date().toISOString()
      };
      data.users.push(newUser);
      writeDb(data);
      return newUser;
    },

    update: (id, updateData) => {
      const data = readDb();
      const index = data.users.findIndex(user => user.id === id);
      if (index === -1) return null;

      const { id: _, createdAt: __, ...validUpdates } = updateData;
      data.users[index] = {
        ...data.users[index],
        ...validUpdates
      };
      
      writeDb(data);
      return data.users[index];
    }
  },

  // Emails Operations
  emails: {
    findMany: () => {
      const data = readDb();
      return [...data.emails].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
    },

    create: (emailData) => {
      const data = readDb();
      const newEmail = {
        id: crypto.randomUUID(),
        to: emailData.to.toLowerCase().trim(),
        subject: emailData.subject,
        body: emailData.body,
        sentAt: new Date().toISOString(),
        isRead: false
      };
      data.emails.push(newEmail);
      writeDb(data);
      return newEmail;
    },

    markAllAsRead: () => {
      const data = readDb();
      data.emails = data.emails.map(email => ({ ...email, isRead: true }));
      writeDb(data);
      return true;
    },

    clearAll: () => {
      const data = readDb();
      data.emails = [];
      writeDb(data);
      return true;
    }
  },

  // Cars Operations
  cars: {
    findMany: (filter = {}) => {
      const cars = readDb().cars;
      return cars.filter(car => {
        for (const key in filter) {
          if (filter[key] !== undefined && filter[key] !== null && filter[key] !== '') {
            if (key === 'seats') {
              if (car.seats !== parseInt(filter.seats)) return false;
            } else if (key === 'location') {
              if (!car.location.toLowerCase().includes(filter.location.toLowerCase())) return false;
            } else {
              if (car[key] !== filter[key]) return false;
            }
          }
        }
        return true;
      });
    },

    findOne: (filter) => {
      const cars = readDb().cars;
      return cars.find(car => {
        for (const key in filter) {
          if (car[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    create: (carData) => {
      const data = readDb();
      const newCar = {
        id: crypto.randomUUID(),
        brand: carData.brand,
        model: carData.model,
        seats: parseInt(carData.seats) || 5,
        transmission: carData.transmission || 'Tự động',
        fuel: carData.fuel || 'Xăng',
        pricePerDay: parseInt(carData.pricePerDay) || 800000,
        image: carData.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        location: carData.location || 'Hà Nội',
        ownerId: carData.ownerId || null,
        plateNumber: carData.plateNumber || '30A-XX.XXX',
        carPapers: carData.carPapers || null,
        status: carData.ownerId ? 'pending_moderation' : 'available', // Cars listed by owners require moderation
        rejectionReason: null,
        createdAt: new Date().toISOString()
      };
      data.cars.push(newCar);
      writeDb(data);
      return newCar;
    },

    update: (id, updateData) => {
      const data = readDb();
      const index = data.cars.findIndex(car => car.id === id);
      if (index === -1) return null;

      const { id: _, createdAt: __, ...validUpdates } = updateData;
      data.cars[index] = {
        ...data.cars[index],
        ...validUpdates
      };
      writeDb(data);
      return data.cars[index];
    },

    delete: (id) => {
      const data = readDb();
      data.cars = data.cars.filter(car => car.id !== id);
      writeDb(data);
      return true;
    }
  },

  // Bookings Operations
  bookings: {
    findMany: (filter = {}) => {
      const bookings = readDb().bookings;
      const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return sortedBookings.filter(booking => {
        for (const key in filter) {
          if (booking[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    findOne: (filter) => {
      const bookings = readDb().bookings;
      return bookings.find(booking => {
        for (const key in filter) {
          if (booking[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    create: (bookingData) => {
      const data = readDb();
      
      // Retrieve car to calculate if owner requires approval
      const car = data.cars.find(c => c.id === bookingData.carId);
      const isOwnerCar = car && car.ownerId !== null;

      const newBooking = {
        id: crypto.randomUUID(),
        userId: bookingData.userId,
        carId: bookingData.carId,
        pickupDate: bookingData.pickupDate,
        returnDate: bookingData.returnDate,
        pickupLocation: bookingData.pickupLocation,
        totalPrice: parseInt(bookingData.totalPrice),
        depositAmount: 5000000, // Fixed 5,000,000 VND deposit
        depositStatus: 'paid', // Marked paid instantly on VietQR checkout demo
        status: isOwnerCar ? 'pending_owner' : 'confirmed', // If system car, auto-confirms, else Owner approves
        paymentMethod: bookingData.paymentMethod || 'bank_transfer',
        handoverDocs: {
          pickup: null,
          return: null
        },
        issueReport: null,
        createdAt: new Date().toISOString()
      };
      data.bookings.push(newBooking);
      
      // Update car status to rented (or reserved)
      const carIndex = data.cars.findIndex(c => c.id === bookingData.carId);
      if (carIndex !== -1) {
        data.cars[carIndex].status = 'rented';
      }

      writeDb(data);
      return newBooking;
    },

    update: (id, updateData) => {
      const data = readDb();
      const index = data.bookings.findIndex(booking => booking.id === id);
      if (index === -1) return null;

      const { id: _, createdAt: __, ...validUpdates } = updateData;
      data.bookings[index] = {
        ...data.bookings[index],
        ...validUpdates
      };

      // If booking was cancelled or rejected, restore car status to available
      if (validUpdates.status === 'cancelled' || validUpdates.status === 'rejected') {
        const carId = data.bookings[index].carId;
        const carIndex = data.cars.findIndex(car => car.id === carId);
        if (carIndex !== -1) {
          data.cars[carIndex].status = 'available';
        }
      }

      writeDb(data);
      return data.bookings[index];
    }
  },

  // Reviews Operations
  reviews: {
    findMany: (filter = {}) => {
      const reviews = readDb().reviews || [];
      const sorted = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return sorted.filter(review => {
        for (const key in filter) {
          if (review[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    create: (reviewData) => {
      const data = readDb();
      if (!data.reviews) data.reviews = [];
      const newReview = {
        id: crypto.randomUUID(),
        bookingId: reviewData.bookingId,
        carId: reviewData.carId,
        userId: reviewData.userId,
        userName: reviewData.userName,
        rating: parseInt(reviewData.rating) || 5,
        comment: reviewData.comment || '',
        status: 'visible',
        createdAt: new Date().toISOString()
      };
      data.reviews.push(newReview);
      writeDb(data);
      return newReview;
    },

    update: (id, updateData) => {
      const data = readDb();
      const index = data.reviews.findIndex(r => r.id === id);
      if (index === -1) return null;
      data.reviews[index] = {
        ...data.reviews[index],
        ...updateData
      };
      writeDb(data);
      return data.reviews[index];
    }
  },

  // Support Tickets Operations
  support_tickets: {
    findMany: (filter = {}) => {
      const tickets = readDb().support_tickets || [];
      const sorted = [...tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return sorted.filter(ticket => {
        for (const key in filter) {
          if (ticket[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    findOne: (filter) => {
      const tickets = readDb().support_tickets || [];
      return tickets.find(ticket => {
        for (const key in filter) {
          if (ticket[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    create: (ticketData) => {
      const data = readDb();
      if (!data.support_tickets) data.support_tickets = [];
      const newTicket = {
        id: crypto.randomUUID(),
        userId: ticketData.userId,
        userName: ticketData.userName,
        userRole: ticketData.userRole,
        subject: ticketData.subject,
        message: ticketData.message,
        status: 'open',
        replies: [],
        createdAt: new Date().toISOString()
      };
      data.support_tickets.push(newTicket);
      writeDb(data);
      return newTicket;
    },

    update: (id, updateData) => {
      const data = readDb();
      const index = data.support_tickets.findIndex(t => t.id === id);
      if (index === -1) return null;
      data.support_tickets[index] = {
        ...data.support_tickets[index],
        ...updateData
      };
      writeDb(data);
      return data.support_tickets[index];
    }
  },

  // Disputes Operations
  disputes: {
    findMany: (filter = {}) => {
      const disputes = readDb().disputes || [];
      return disputes.filter(dispute => {
        for (const key in filter) {
          if (dispute[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    create: (disputeData) => {
      const data = readDb();
      if (!data.disputes) data.disputes = [];
      const newDispute = {
        id: crypto.randomUUID(),
        bookingId: disputeData.bookingId,
        renterId: disputeData.renterId,
        ownerId: disputeData.ownerId,
        description: disputeData.description,
        status: 'open',
        resolutionDetails: null,
        createdAt: new Date().toISOString()
      };
      data.disputes.push(newDispute);
      writeDb(data);
      return newDispute;
    },

    update: (id, updateData) => {
      const data = readDb();
      const index = data.disputes.findIndex(d => d.id === id);
      if (index === -1) return null;
      data.disputes[index] = {
        ...data.disputes[index],
        ...updateData
      };
      writeDb(data);
      return data.disputes[index];
    }
  },

  // System Config Operations
  system_config: {
    get: () => {
      return readDb().system_config || DEFAULT_SYSTEM_CONFIG;
    },

    update: (newConfig) => {
      const data = readDb();
      data.system_config = {
        ...(data.system_config || DEFAULT_SYSTEM_CONFIG),
        ...newConfig
      };
      writeDb(data);
      return data.system_config;
    }
  }
};

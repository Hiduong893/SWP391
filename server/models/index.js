import { userModel } from './userModel.js';
import { carModel } from './carModel.js';
import { bookingModel, reviewModel, disputeModel } from './bookingModel.js';
import { ticketModel } from './ticketModel.js';
import { emailModel, configModel } from './configModel.js';
import { paymentModel } from './paymentModel.js';

export const db = {
  users: userModel,
  emails: emailModel,
  cars: carModel,
  bookings: bookingModel,
  reviews: reviewModel,
  support_tickets: ticketModel,
  disputes: disputeModel,
  system_config: configModel,
  payments: paymentModel,
};

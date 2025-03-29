const mongoose = require('mongoose');

// User Schema
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['admin', 'dentist', 'customer'], default: 'customer' }
});

// Service Schema
const ServiceSchema = new mongoose.Schema({
    name: String,
    price: Number
});

// Dentist Schema
const DentistSchema = new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:'User', required: true, unique: true  },
    mobileNo: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'female', 'Other'], required: true },
    hourlyRate: Number
});

// Booking Schema
const BookingSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    dentist: { type: mongoose.Schema.Types.ObjectId, ref: 'Dentist' },
    bookingDate: Date,
    timeSlot: String,
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    status: { type: String, enum: ['booked', 'completed'], default: 'booked' }
});

// Report Schema
const ReportSchema = new mongoose.Schema({
    period: String,
    details: String
});

// Booking Restriction Schema
const BookingRestrictionSchema = new mongoose.Schema({
    day: String,
    startTime: String,
    endTime: String,
    maxBookingsPerDentist: Number
});

const User = mongoose.model('User', UserSchema);
const Service = mongoose.model('Service', ServiceSchema);
const Dentist = mongoose.model('Dentist', DentistSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Report = mongoose.model('Report', ReportSchema);
const BookingRestriction = mongoose.model('BookingRestriction', BookingRestrictionSchema);

module.exports= { User, Service, Dentist, Booking, Report, BookingRestriction };

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  User,
  Booking,
  Service,
  Report,
  BookingRestriction,
  Dentist,
} = require("../models");
const { authenticateUser } = require("../middleware/auth.middleware");
const router = express.Router();

JWT_SECRET = process.env.JWT_SECRET;

router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User is already registered' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user with role 'customer'
    const newUser = new User({
      name: fullName,
      email,
      username,
      password: hashedPassword,
      role: 'customer'
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// User Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res. status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token, role: user.role, user_id: user._id });
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

// Create a new booking (Customer)
router.post("/book", async (req, res) => {
  const { customerId, serviceId, dentistId, bookingDate, timeSlot, totalAmount } = req.body;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(bookingDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return res.status(400).json({ error: "You cannot choose past dates." });
    }

    const day = selectedDate.getDay();
    if (day === 0 || day === 6) {
      return res.status(400).json({ error: "Appointments are only available Monday to Friday." });
    }

    const [startTime] = timeSlot.split(" - ");
    const [startHours, startMinutes] = startTime.split(/[: ]/);
    const isPM = startTime.includes("PM");

    // Convert to 24-hour format
    let convertedStartHours = parseInt(startHours);
    if (isPM && convertedStartHours !== 12) {
      convertedStartHours += 12;
    } else if (!isPM && convertedStartHours === 12) {
      convertedStartHours = 0;
    }

    // Create a date object with the selected time
    const selectedDateTime = new Date(bookingDate);
    selectedDateTime.setHours(convertedStartHours, parseInt(startMinutes), 0, 0);

    // Check if the selected time is within business hours (8:30 AM - 5:30 PM)
    const businessStartTime = new Date(bookingDate);
    businessStartTime.setHours(8, 30, 0, 0);

    const businessEndTime = new Date(bookingDate);
    businessEndTime.setHours(17, 30, 0, 0);

    if (selectedDateTime < businessStartTime || selectedDateTime >= businessEndTime) {
      return res.status(400).json({ error: "Booking is only available between 8:30 AM and 5:30 PM." });
    }

    // Check if the customer already booked this time slot on the same date
    const existingCustomerBooking = await Booking.findOne({
      customer: customerId,
      bookingDate,
      timeSlot
    });

    if (existingCustomerBooking) {
      return res.status(400).json({ error: "You have already booked this time slot." });
    }

    // Check if the dentist is already booked for this time slot
    const existingDentistBooking = await Booking.findOne({
      dentist: dentistId,
      bookingDate,
      timeSlot
    });

    if (existingDentistBooking) {
      return res.status(400).json({ error: "This dentist is already booked for this time slot." });
    }

    // Check if the dentist has already been booked twice on the same day
    const dentistDailyBookings = await Booking.countDocuments({
      dentist: dentistId,
      bookingDate
    });

    if (dentistDailyBookings >= 2) {
      return res.status(400).json({ error: "This dentist is fully booked for today." });
    }

    // Create and save the booking
    const booking = new Booking({
      customer: customerId,
      service: serviceId,
      dentist: dentistId,
      timeSlot,
      bookingDate,
      totalAmount,
      paymentStatus: "completed",
    });

    await booking.save();
    res.status(201).json({ message: "Booking created, pending payment" });

  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Error creating booking" });
  }
});


// Mark booking as completed (Dentist)
router.put("/booking/:id/complete", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "completed" },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json({ message: "Booking marked as completed", booking });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Add a new service (Admin)
router.post("/service", authenticateUser, async (req, res) => {
  const { name, price } = req.body;
  try {
    const service = new Service({ name, price });
    await service.save();
    res.status(201).json({ message: "Service added successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error adding service" });
  }
});

router.get("/get-all-dentists-services", authenticateUser, async (req, res) => {
  try {
    const dentists=await Dentist.find().populate("userId", "name email")
    const services=await Service.find()
    console.log(dentists,services)
    res.status(201).json({ data:{
      dentists,
      services
    } });
  } catch (error) {
    res.status(500).json({ error: "Error Fetching service" });
  }
});

router.get("/get-bookings-dentists/:id", authenticateUser, async (req, res) => {
  try {
    
    const bookings = await Booking.find({ dentist: req.params.id }).populate("service customer");

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found for this dentist" });
    }

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("Server Error:", error); 
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

router.get("/get-all-bookings", authenticateUser, async (req, res) => {
  try {
    const bookings = await Booking.aggregate([
      {
        $lookup: {
          from: "services", // Service collection
          localField: "service",
          foreignField: "_id",
          as: "service"
        }
      },
      {
        $unwind: { path: "$service", preserveNullAndEmptyArrays: true } // Convert array to object
      },
      {
        $lookup: {
          from: "users", // User collection (customers)
          localField: "customer",
          foreignField: "_id",
          as: "customer"
        }
      },
      {
        $unwind: { path: "$customer", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "dentists", // Dentist collection
          localField: "dentist",
          foreignField: "userId",
          as: "dentist"
        }
      },
      {
        $unwind: { path: "$dentist", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "users", // User collection (to get dentist details)
          localField: "dentist.userId",
          foreignField: "_id",
          as: "dentist.user"
        }
      },
      {
        $unwind: { path: "$dentist.user", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          bookingDate: 1,
          timeSlot: 1,
          paymentStatus: 1,
          status: 1,
          "service._id": 1,
          "service.name": 1,
          "customer._id": 1,
          "customer.name": 1,
          "customer.email": 1,
          "dentist._id": 1,
          "dentist.hourlyRate": 1,
          "dentist.user.name": 1,
          "dentist.user.email": 1
        }
      }
    ]);

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found" });
    }

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});


router.get("/get-bookings-patient/:id", authenticateUser, async (req, res) => {
  try {
  
    const bookings=await Booking.aggregate([
      {
        $match:{
          customer:new mongoose.Types.ObjectId(req.params.id)
        },
      },
      {
        $lookup:{
          from:"dentists",
          localField: "dentist",
          foreignField:"userId",
          as:"dentist"
        }
      },
      {
        $lookup:{
          from:"services",
          localField:"service",
          foreignField:"_id",
          as:"service"
        }

      }
       
    ])

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found for this dentist" });
    }

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("Server Error:", error); 
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});


router.post("/add-dentist", authenticateUser, async (req, res) => {
  try {
    const { name, email, password, mobileNo, gender, hourlyRate } = req.body;

    console.log("Received dentist data:", req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Dentist already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role: "dentist" });

    const savedUser = await newUser.save();
    console.log("User saved successfully:", savedUser);

    if (!savedUser || !savedUser._id) {
      return res.status(500).json({ message: "Failed to create user" });
    }

    const newDentist = new Dentist({
      userId: savedUser._id,
      mobileNo,
      gender,
      hourlyRate,
    });

    const savedDentist = await newDentist.save();
    console.log("Dentist saved successfully:", savedDentist);

    return res.status(201).json({ message: "Dentist added successfully", user: savedUser, dentist: savedDentist });
  } catch (error) {
    console.error("Error adding dentist:", error);
    res.status(500).json({ message: "Server error while adding Dentist", error: error.message });
  }
});

// Fetch weekly/monthly reports (Admin)
router.get("/report/:period", async (req, res) => {
  try {
    const today = new Date();
    let startDate, endDate;

    if (req.params.period === "weekly") {
      // Get start of the week (Sunday)
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay());
      startDate.setUTCHours(0, 0, 0, 0);

      // Get end of the week (Saturday)
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setUTCHours(23, 59, 59, 999);
    } else if (req.params.period === "monthly") {
      // Get first day of the month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.setUTCHours(0, 0, 0, 0);

      // Get last day of the month
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setUTCHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({ error: "Invalid period. Use 'weekly' or 'monthly'." });
    }

    console.log("Start Date:", startDate, "End Date:", endDate);

    const bookings = await Booking.aggregate([
      {
        $match: {
          bookingDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "customer",
          foreignField: "_id",
          as: "customer"
        }
      },
      {
        $lookup: {
          from: "services",
          localField: "service",
          foreignField: "_id",
          as: "service"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "dentist",
          foreignField: "_id",
          as: "dentist"
        }
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$dentist", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          bookingDate: 1,
          timeSlot: 1,
          paymentStatus: 1,
          status: 1,
          customerName: { $ifNull: ["$customer.name", "Unknown"] },
          serviceName: { $ifNull: ["$service.name", "Unknown Service"] },
          dentistName: { $ifNull: ["$dentist.name", "Unknown"] }
        }
      }
    ]);

    console.log("Fetched Bookings:", bookings);

    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found for the selected period." });
    }

    const report = {};

    bookings.forEach((booking) => {
      const dentistName = booking.dentistName || "Unknown";

      if (!report[dentistName]) {
        report[dentistName] = {
          dentistName,
          noOfBookings: 0,
          patientList: []
        };
      }

      report[dentistName].noOfBookings += 1; 
      report[dentistName].patientList.push({
        patientName: booking.customerName,
        serviceRequested: booking.serviceName,
        bookingDate: new Date(booking.bookingDate).toLocaleDateString(),
      });
    });

    console.log("Final Report:", report);

    return res.status(200).json({
      period: req.params.period,
      report: Object.values(report),
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});






module.exports = router;

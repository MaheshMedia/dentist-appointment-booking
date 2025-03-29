import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PatientDashboard.css";
import api from "./api/api";
import axios from "axios";

const PatientDashboard = () => {
  const [view, setView] = useState("calendar");
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [formData, setFormData] = useState({
    dentist: "",
    dentistUserId: "",
    service: "",
    timeSlot: "",
    date: null,
  });

  const [activeView, setActiveView] = useState("dashboard");

  const [dentistList, setDentistsList] = useState([]);
  const [serviceList, setServiceList] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([
    "08:30 AM",
    "09:30 AM",
    "10:30 AM",
    "11:30 AM",
    "12:30 PM",
    "01:30 PM",
    "02:30 PM",
    "03:30 PM",
    "04:30 PM",
  ]);

  const navigate = useNavigate();

  const getData = async () => {
    const {
      data: { data },
    } = await api.get("/get-all-dentists-services");
    console.log("data", data);
    setDentistsList(data?.dentists);
    setServiceList(data?.services);
  };

  const getAllAppointment = async () => {
    try {
      const { data } = await api.get("get-all-bookings");
      console.log("Raw Booking Data:", data);

      if (data && data.bookings) {
        // Format the booking data properly
        const formattedBookings = data.bookings.map((booking) => {
          // Log the full booking object to understand its structure
          console.log("Individual Booking:", booking);

          return {
            _id: booking._id,
            date: new Date(booking.bookingDate),
            timeSlot: booking.timeSlot,
            customerId: booking.customer ? booking.customer._id : null,
            status: booking.status,
            // Most flexible dentist ID extraction
            dentist:
              booking.dentist?._id ||
              booking.dentist?.userId?._id ||
              booking.dentist ||
              null,
            service: booking.service ? booking.service._id : null,
            paymentStatus: booking.paymentStatus,
          };
        });

        console.log("Formatted Bookings with Dentist IDs:", formattedBookings);
        setAllAppointments(formattedBookings);
      } else {
        setAllAppointments([]);
      }
    } catch (error) {
      console.error(
        "Error fetching appointments:",
        error.response?.data || error.message
      );
    }
  };

  console.log("allAppointments", allAppointments);
  const getAppointmentForUser = async () => {
    try {
      const userId = localStorage.getItem("userId");
      console.log("Fetching for user:", userId);

      // Fix the API endpoint URL
      const { data } = await api.get(`/get-bookings-patient/${userId}`);
      console.log("Appointments Data:", data);

      if (data && data.bookings) {
        // Format the booking data properly
        const formattedBookings = data.bookings.map((booking) => ({
          _id: booking._id,
          date: new Date(booking.bookingDate),
          timeSlot: booking.timeSlot,
          customerId: booking.customer,
          status: booking.status,
          dentist: booking.dentist[0] ? booking.dentist[0].userId : null,
          service: booking.service[0] ? booking.service[0] : null,
          paymentStatus: booking.paymentStatus,
        }));
        setAppointments(formattedBookings);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error(
        "Error fetching appointments:",
        error.response?.data || error.message
      );
    }
  };

  useEffect(() => {
    getData();
    getAppointmentForUser();
    getAllAppointment();
  }, []);

  // Generate calendar dates for current month view
  const getDaysInMonth = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    let days = [];
    // Add empty slots for days from previous month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: "", empty: true });
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);

      // Check if this date has an appointment using the correct date comparison
      const hasAppointment = appointments.some((app) => {
        return (
          app.date &&
          app.date.getDate() === date.getDate() &&
          app.date.getMonth() === date.getMonth() &&
          app.date.getFullYear() === date.getFullYear()
        );
      });

      days.push({
        day: i,
        date: date,
        hasAppointment,
      });
    }

    return days;
  };

  const handleDateClick = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      alert("You cannot book an appointment for a past date.");
      return;
    }

    const day = date.getDay();
    if (day === 0 || day === 6) {
      alert("Appointments are only available Monday to Friday.");
      return;
    }

    setSelectedDate(date);
    setFormData({ ...formData, date: date });
    setShowModal(true);
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [field]: value,
    }));
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();

    try {
        const token = localStorage.getItem("token");

        const service = serviceList.find((s) => s._id === formData.service);
        const servicePrice = service ? service.price : 0;

        const dentist = dentistList.find((d) => d._id === formData.dentist);
        const dentistCharge = dentist ? dentist.hourlyRate : 0;

        const totalAmount = servicePrice + dentistCharge;

        const bookingData = {
            customerId: localStorage.getItem("userId"),
            serviceId: formData.service,
            dentistId: formData.dentistUserId, 
            bookingDate: selectedDate,
            timeSlot: formData.timeSlot,
            totalAmount, // Send total amount
            paymentStatus: "pending",
        };

        const response = await axios.post(
            "http://localhost:5000/api/book",
            bookingData,
            {
                headers: {
                    Authorization: `${token}`,
                },
            }
        );

        console.log("Booking added:", response.data);
        setShowModal(false);
        alert("Slot Booked successfully");

        setAppointments([...appointments, {
            _id: response.data._id || Date.now().toString(),
            date: selectedDate,
            timeSlot: formData.timeSlot,
            dentist: { name: dentist ? dentist.userId.name : "Selected Dentist" },
            service: { name: service ? service.name : "Selected Service" },
            totalAmount,
            paymentStatus: "pending",
        }]);

        getAppointmentForUser();
        setActiveView("dashboard");

    } catch (error) {
        console.error("Error adding Booking:", error.response?.data || error.message);
        alert("Error adding Booking: " + (error.response?.data?.error || error.message));
    }
};


  // Navigate between months
  const changeMonth = (increment) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setSelectedMonth(newMonth);
  };

  // Get all appointments for the currently selected date
  const getAppointmentsForDay = (date) => {
    if (!date) return [];

    return appointments.filter(
      (app) =>
        app.date &&
        app.date.getDate() === date.getDate() &&
        app.date.getMonth() === date.getMonth() &&
        app.date.getFullYear() === date.getFullYear()
    );
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get dentist name from ID
  const getDentistName = (dentistId) => {
    const dentist = dentistList.find((d) => d.userId._id === dentistId);
    return dentist ? dentist.userId.name : "Unknown Dentist";
  };

  // Get service name from ID
  const getServiceName = (serviceId) => {
    const service = serviceList.find((s) => s._id === serviceId);
    return service ? service.name : "Unknown Service";
  };

  const getBookedSlotsForDentist = () => {
    if (!selectedDate || !formData.dentist) return [];

    console.log("all appointments....", allAppointments);
    console.log("formData....", formData);

    return allAppointments
      .filter((app) => {
        // Convert both dates to YYYY-MM-DD format
        const appointmentDate = new Date(app.date).toISOString().split("T")[0];
        const selectedDateFormatted = new Date(formData.date)
          .toISOString()
          .split("T")[0];

        return (
          app.dentist === formData.dentist && // Compare with dentist._id
          appointmentDate === selectedDateFormatted // Compare date
        );
      })
      .map((app) => app.timeSlot);
  };

  const getBookedSlotsForPatient = () => {
    if (!selectedDate) return [];

    const userId = localStorage.getItem("userId");

    return appointments
      .filter(
        (app) =>
          app.customerId === userId &&
          app.date.toDateString() === selectedDate.toDateString()
      )
      .map((app) => app.timeSlot);
  };

  const getCurrentTimeSlot = () => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    return availableTimeSlots.find((slot) => {
      const [time, period] = slot.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      return (
        hours > currentHours ||
        (hours === currentHours && minutes >= currentMinutes)
      );
    });
  };

  const bookedSlotsByDentist = getBookedSlotsForDentist();
  const bookedSlotsByPatient = getBookedSlotsForPatient();

  console.log("bookedSlotsByPatient", bookedSlotsByPatient);
  console.log("bookedSlotsByDentist", bookedSlotsByDentist);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="logo">LOGO</div>
        <div className="nav-tabs">
          <button onClick={() => setView("calendar")}>Dashboard</button>
        </div>
        <div className="user-info">
          <span>{localStorage.getItem("userEmail")}</span>
          <div className="avatar"></div>
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Sidebar */}
        <div className="dashboard-sidebar">
          <div className="sidebar-item active">Dashboard</div>
        </div>

        {/* Main Panel */}
        <div className="dashboard-main">
          {/* Tabs */}
          <div className="main-header">
            <button
              className={`tab-button ${view === "calendar" ? "active" : ""}`}
              onClick={() => setView("calendar")}
            >
              Book Appointment
            </button>
            <div className="calendar-controls">
              {view === "calendar" && (
                <>
                  <button
                    onClick={() => changeMonth(-1)}
                    className="nav-button"
                  >
                    &lt;
                  </button>
                  <span className="month-name">
                    {selectedMonth.toLocaleString("default", { month: "long" })}
                  </span>
                  <button onClick={() => changeMonth(1)} className="nav-button">
                    &gt;
                  </button>
                </>
              )}
              <button
                className="history-button"
                onClick={() =>
                  setView(view === "calendar" ? "history" : "calendar")
                }
              >
                {view === "calendar" ? "Booking History" : "Calendar View"}
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {view === "calendar" && (
            <div className="calendar-view">
              {/* Month Navigation */}
              <div className="month-navigation">
                <button onClick={() => changeMonth(-1)}>&laquo; Prev</button>
                <h2>
                  {selectedMonth.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <button onClick={() => changeMonth(1)}>Next &raquo;</button>
              </div>

              {/* Days of Week Header */}
              <div className="calendar-header">
                <div className="calendar-cell">Sun</div>
                <div className="calendar-cell">Mon</div>
                <div className="calendar-cell">Tue</div>
                <div className="calendar-cell">Wed</div>
                <div className="calendar-cell">Thu</div>
                <div className="calendar-cell">Fri</div>
                <div className="calendar-cell">Sat</div>
              </div>

              {/* Calendar Grid */}
              <div className="calendar-grid">
                {getDaysInMonth(
                  selectedMonth.getFullYear(),
                  selectedMonth.getMonth()
                ).map((day, i) => (
                  <div
                    key={i}
                    className={`calendar-day ${day.empty ? "empty" : ""} ${
                      day.hasAppointment ? "has-appointment" : ""
                    }`}
                    onClick={() => day.day && handleDateClick(day.date)}
                  >
                    {!day.empty && (
                      <div className="day-content">
                        <span className="day-number">{day.day}</span>
                        {day.hasAppointment && (
                          <div className="appointment-indicator">
                            <span className="appointment-count">•</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History View */}
          {view === "history" && (
            <div className="history-view">
              <h2>Booking History</h2>

              {appointments.length === 0 ? (
                <div className="no-appointments">No appointments found</div>
              ) : (
                <div className="appointments-list">
                  {appointments.map((appointment, index) => (
                    <div
                      key={appointment._id || index}
                      className={`appointment-card ${
                        appointment.status === "completed" ? "completed" : ""
                      }`}
                    >
                      <div className="appointment-date">
                        Date: {formatDate(appointment.date)}
                      </div>
                      <div className="appointment-time">
                        Time: {appointment.timeSlot}
                      </div>
                      <div className="appointment-details">
                        <div className="dentist-name">
                          Dentist:{" "}
                          {appointment.dentist && appointment.dentist.name
                            ? appointment.dentist.name
                            : appointment.dentist
                            ? getDentistName(appointment.dentist)
                            : "Unknown Dentist"}
                        </div>
                        <div className="service-name">
                          Service:{" "}
                          {appointment.service && appointment.service.name
                            ? appointment.service.name
                            : appointment.service
                            ? getServiceName(appointment.service)
                            : "Unknown Service"}
                        </div>
                        <div className="payment-status">Payment: {"Done"}</div>
                        <div
                          className={`appointment-status ${
                            appointment.status === "completed"
                              ? "status-completed"
                              : "status-pending"
                          }`}
                        >
                          Status:{" "}
                          {appointment.status == "completed"
                            ? "Completed"
                            : "Pending"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="close-button"
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>

            <h2 className="modal-title">Book Appointment</h2>

            <div className="date-selector">
              <span className="selected-date">
                {selectedDate &&
                  selectedDate.toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
              </span>
            </div>

            <div className="appointment-form">
              <select
                className="form-select"
                value={formData.dentist || ""}
                onChange={(e) => {
                  const selectedDentistId = e.target.value;
                  const selectedDentist = dentistList.find(
                    (d) => d._id === selectedDentistId
                  );

                  setFormData((prev) => ({
                    ...prev,
                    dentist: selectedDentistId,
                    dentistUserId: selectedDentist
                      ? selectedDentist.userId._id
                      : "",
                  }));

                  console.log("Updated Dentist:", selectedDentistId);
                  console.log(
                    "Updated Dentist User ID:",
                    selectedDentist ? selectedDentist.userId._id : ""
                  );
                }}
              >
                <option value="">Select Dentist</option>
                {dentistList.map((dentist) => (
                  <option key={dentist._id} value={dentist._id}>
                    {dentist.userId.name}
                  </option>
                ))}
              </select>
              <select
                className="form-select"
                value={formData.service}
                onChange={(e) => handleInputChange("service", e.target.value)}
              >
                <option value="">Select Service</option>

                {serviceList &&
                  serviceList.map((service) => {
                    return (
                      <option key={service._id} value={service._id}>
                        {service.name}
                      </option>
                    );
                  })}
              </select>
              <div className="time-slot-label">Select Time Slot</div>
              <div className="time-slot-grid">
                {availableTimeSlots.map((slot) => {
                  const isBooked =
                    bookedSlotsByDentist.includes(slot) ||
                    bookedSlotsByPatient.includes(slot);

                  const isPastSlot =
                    new Date(formData.date).toDateString() ===
                      new Date().toDateString() && slot < getCurrentTimeSlot();

                  return (
                    <button
                      key={slot}
                      className={`time-slot-button ${
                        formData.timeSlot === slot ? "selected" : ""
                      }`}
                      onClick={() => handleInputChange("timeSlot", slot)}
                      disabled={isBooked || isPastSlot}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
              ;
              <div className="cost-display">
                <div className="cost-amount">
                  {(() => {
                    const servicePrice =
                      serviceList.find((s) => s._id === formData.service)
                        ?.price || 0;
                    const dentistCharge =
                      dentistList.find((d) => d._id === formData.dentist)
                        ?.hourlyRate || 0;

                    return (servicePrice + dentistCharge).toFixed(2); 
                  })()}
                  <span className="cost-note"> including GST</span>
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="payment-button"
                  onClick={handleSubmitBooking}
                >
                  Make Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;

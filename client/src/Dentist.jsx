import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dentist.css";
import api from "./api/api";

const Dentist = ({ userType }) => {
  const [view, setView] = useState("month"); // 'month' or 'week'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [appointments, setAppointments] = useState([]);

  const getAppointments = async () => {
    try {
      const userId = localStorage.getItem("userId");
      console.log("Fetching for user:", userId);

      const { data } = await api.get(`/get-bookings-dentists/${userId}`);
      console.log("Appointments Data:", data);

      if (data && data.bookings) {
        // Convert string dates to Date objects
        const formattedBookings = data.bookings.map((booking) => ({
          ...booking,
          bookingDate: new Date(booking.bookingDate),
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
    getAppointments();
  }, []);

  const navigate = useNavigate();

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setView("week");
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const handleCompleteAppointment = async (bookingId) => {
    if (!bookingId) {
      alert("Invalid appointment ID");
      return;
    }

    try {
      const { data } = await api.put(`/booking/${bookingId}/complete`);
      console.log("Booking Updated:", data);

      getAppointments();

      alert("Appointment marked as completed!");
    } catch (error) {
      console.error(
        "Error completing appointment:",
        error.response?.data || error.message
      );
      alert("Failed to complete appointment. Try again.");
    }
  };

  const handleCancelModal = () => {
    setShowAppointmentDetails(false);
  };

  // Get current month appointments count
  const currentMonthAppointments = appointments.filter(
    (app) =>
      app.bookingDate.getMonth() === selectedDate.getMonth() &&
      app.bookingDate.getFullYear() === selectedDate.getFullYear()
  );

  // Get week range for weekly view
  const getWeekDates = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Monday

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  // Get time slots for weekly view
  const timeSlots = [
    "8:30 AM",
    "9:30 AM",
    "10:30 AM",
    "11:30 AM",
    "12:30 PM",
    "1:30 PM",
    "2:30 PM",
    "3:30 PM",
    "4:30 PM",
  ];

  // Filter appointments for selected week
  const weekDates = getWeekDates();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  // Check if a date has appointments
  const hasAppointment = (date) => {
    return appointments.some(
      (app) =>
        app.bookingDate.getDate() === date.getDate() &&
        app.bookingDate.getMonth() === date.getMonth() &&
        app.bookingDate.getFullYear() === date.getFullYear()
    );
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date) => {
    return appointments.filter(
      (app) =>
        app.bookingDate.getDate() === date.getDate() &&
        app.bookingDate.getMonth() === date.getMonth() &&
        app.bookingDate.getFullYear() === date.getFullYear()
    );
  };

  const getAppointmentFor = (date, time) => {

    const normalizeTime = (timeStr) => {
      return timeStr.replace(/^0*/, '').toUpperCase().trim();
    };
  
    const filteredAppointments = appointments.filter((app) => {
 
      // Robust date comparison
      const sameDate = 
        app.bookingDate.getDate() === date.getDate() &&
        app.bookingDate.getMonth() === date.getMonth() &&
        app.bookingDate.getFullYear() === date.getFullYear();
  
      // Normalize time comparison
      const sameTime = normalizeTime(app.timeSlot || app.appTimeSlot) === normalizeTime(time);
  
      return sameDate && sameTime;
    });
  
    return filteredAppointments;
  };

  // Count weekly appointments
  const weeklyAppointments = appointments.filter(
    (app) => app.bookingDate >= weekStart && app.bookingDate <= weekEnd
  );

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="logo">LOGO</div>
        <div
          className={`sidebar-item ${
            view === "month" || view === "week" ? "active" : ""
          }`}
          onClick={() => setView("month")}
        >
          Dentist
        </div>
      </div>

      <div className="main-content">
        <div className="top-bar">
          <div className="page-title">Dentist</div>
          <div className="user-info">
            Dentist
            <div className="user-avatar"></div>
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

        <div className="content-area">
          {view === "month" && (
            <div className="month-view">
              <div className="summary">
                <div className="summary-text">
                  Total Appointment: {currentMonthAppointments.length}
                </div>
              </div>

              <div className="calendar-container">
                <div className="calendar-header">
                  <button
                    className="nav-button"
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(selectedDate.getMonth() - 1);
                      setSelectedDate(newDate);
                    }}
                  >
                    &lt;
                  </button>
                  <div className="current-month">
                    {selectedDate.toLocaleString("default", { month: "long" })}{" "}
                    {selectedDate.getFullYear()}
                  </div>
                  <button
                    className="nav-button"
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(selectedDate.getMonth() + 1);
                      setSelectedDate(newDate);
                    }}
                  >
                    &gt;
                  </button>
                </div>

                <div className="calendar-view">
                  <div className="calendar-header">
                    <div className="calendar-cell">Sunday</div>
                    <div className="calendar-cell">Monday</div>
                    <div className="calendar-cell">Tuesday</div>
                    <div className="calendar-cell">Wednesday</div>
                    <div className="calendar-cell">Thursday</div>
                    <div className="calendar-cell">Friday</div>
                    <div className="calendar-cell">Saturday</div>
                  </div>

                  <div className="calendar-grid">
                    {(() => {
                      // Generate the calendar grid
                      const monthStart = new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        1
                      );
                      const monthEnd = new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth() + 1,
                        0
                      );
                      const startDate = new Date(monthStart);
                      startDate.setDate(
                        startDate.getDate() - startDate.getDay()
                      );

                      const endDate = new Date(monthEnd);
                      if (endDate.getDay() !== 6) {
                        endDate.setDate(
                          endDate.getDate() + (6 - endDate.getDay())
                        );
                      }

                      const dateGrid = [];
                      let currentDate = new Date(startDate);

                      while (currentDate <= endDate) {
                        dateGrid.push(new Date(currentDate));
                        currentDate.setDate(currentDate.getDate() + 1);
                      }

                      return dateGrid.map((date, index) => {
                        const dateAppointments = getAppointmentsForDate(date);
                        return (
                          <div
                            key={index}
                            className={`calendar-date ${
                              date.getMonth() !== selectedDate.getMonth()
                                ? "other-month"
                                : ""
                            } ${
                              dateAppointments.length > 0
                                ? "has-appointment"
                                : ""
                            }`}
                            onClick={() => handleDateClick(date)}
                          >
                            <div className="date-number">{date.getDate()}</div>
                            {dateAppointments.length > 0 && (
                              <div className="appointment-indicator">
                                {dateAppointments.map((app) => (
                                  <div
                                    key={app.id}
                                    className={`appointment-dot ${
                                      app.status == "completed"
                                        ? "completed"
                                        : ""
                                    }`}
                                  >
                                    <span className="appointment-time">
                                      {app.timeSlot}
                                    </span>{" "}
                                    -
                                    <span className="patient-name">
                                      {app.customer?.name || "Unknown"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "week" && (
            <div className="week-view">
              <div className="summary">
                <div className="summary-text">
                  Total Appointment: {weeklyAppointments.length}
                </div>
                <div className="date-range">
                  {weekStart.toLocaleDateString("default", {
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  -
                  {weekEnd.toLocaleDateString("default", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>

              <div className="weekly-calendar">
                <div className="calendar-header">
                  <button
                    className="nav-button"
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(selectedDate.getDate() - 7);
                      setSelectedDate(newDate);
                    }}
                  >
                    &lt;
                  </button>
                  <div className="current-month">
                    {selectedDate.toLocaleString("default", { month: "long" })}
                  </div>
                  <button
                    className="nav-button"
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(selectedDate.getDate() + 7);
                      setSelectedDate(newDate);
                    }}
                  >
                    &gt;
                  </button>
                </div>

                <div className="week-grid">
                  <div className="time-column">
                    <div className="time-header">Time</div>
                    {timeSlots.map((time, index) => (
                      <div key={index} className="time-slot">
                        {time}
                      </div>
                    ))}
                  </div>

                  {weekDates.slice(0, 5).map((date, dateIndex) => (
                    <div key={dateIndex} className="day-column">
                      <div className="calendar-cell">
                        {date.toLocaleString("default", { weekday: "long" })}
                        <div className="day-date">{date.getDate()}</div>
                      </div>

                      {timeSlots.map((time, timeIndex) => {
                        const appointments = getAppointmentFor(date, time);

                        return (
                          <div
                            key={timeIndex}
                            className={`time-cell ${
                              appointments.length > 0 ? "has-appointment" : ""
                            }`}
                            onClick={() =>
                              appointments.length > 0 &&
                              handleAppointmentClick(appointments[0])
                            }
                          >
                            {appointments.map((appointment, idx) => (
                              <div
                                key={idx}
                                className={`appointment-card ${
                                  appointment.status === "completed"
                                    ? "completed"
                                    : ""
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAppointmentClick(appointment);
                                }}
                              >
                                <div className="appointment-details">
                                  <div className="patient-name">
                                    {appointment.customer?.name ||
                                      "Unknown Patient"}
                                  </div>
                                  <div className="appointment-time">
                                    {appointment.timeSlot}
                                  </div>
                                  <div className="service-name">
                                    {appointment.service?.name ||
                                      "General Service"}
                                  </div>
                                  {appointment.status === "completed" && (
                                    <div className="completion-status">
                                      Completed
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="view-toggle">
                <button
                  className="view-button"
                  onClick={() => setView("month")}
                >
                  Back to Month View
                </button>
              </div>
            </div>
          )}

          {/* Appointment Details Modal */}
          {showAppointmentDetails && selectedAppointment && (
            <div className="modal-overlay">
              <div className="appointment-modal">
                <div className="modal-header">
                  <h3>Appointment Details</h3>
                  <button className="close-button" onClick={handleCancelModal}>
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Patient Name</label>
                    <input
                      type="text"
                      value={selectedAppointment.customer?.name || "Unknown"}
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Service Name</label>
                    <input
                      type="text"
                      value={selectedAppointment.service?.name || "Service"}
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Date & Time</label>
                    <input
                      type="text"
                      value={`${
                        selectedAppointment.bookingDate
                          ? new Date(
                              selectedAppointment.bookingDate
                            ).toLocaleDateString()
                          : "Unknown Date"
                      } at ${selectedAppointment.timeSlot || "Unknown Time"}`}
                      readOnly
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="cancel-button" onClick={handleCancelModal}>
                    Cancel
                  </button>
                  <button
                    className="complete-button"
                    onClick={() =>
                      handleCompleteAppointment(selectedAppointment._id)
                    }
                    disabled={selectedAppointment.completed}
                  >
                    {selectedAppointment.completed
                      ? "Already Completed"
                      : "Complete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dentist;

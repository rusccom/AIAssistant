// appointment-tools.ts
//import { appointmentService } from './appointment-service';
import { appointmentService, AvailabilitySlot, Appointment } from './appointment-service';


// Types for API responses
interface AppointmentToolResponse {
  error?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Parse the tool use content from the request
 */
export const parseToolContent = (toolUseContent: any): any | null => {
  try {
    if (toolUseContent && typeof toolUseContent.content === 'string') {
      return JSON.parse(toolUseContent.content);
    }
    return null;
  } catch (error) {
    console.error("Failed to parse tool content:", error);
    return null;
  }
};

/**
 * Process the check_doctor_availability tool request
 */
export const checkDoctorAvailability = (toolUseContent: any): AppointmentToolResponse => {
  try {
    const content = parseToolContent(toolUseContent);
    if (!content) {
      return { error: "Invalid tool content" };
    }
    
    const { doctorId, specialty, startDate, endDate } = content;
    
    // If doctorId is provided, get availability for that doctor
    if (doctorId) {
      const availabilityData = appointmentService.getDoctorAvailability(doctorId, startDate, endDate);
      
      if (!availabilityData) {
        return { error: "Doctor not found" };
      }
      
      return {
        doctor: {
          id: availabilityData.doctorId,
          name: availabilityData.doctorName,
          specialty: availabilityData.specialty
        },
        availability: availabilityData.availability,
        calendar: formatEnhancedAvailabilityCalendar(availabilityData.availability, availabilityData.doctorName)
      };
    }
    
    // If specialty is provided, get all doctors of that specialty
    if (specialty) {
      const doctors = appointmentService.getDoctorsBySpecialty(specialty);
      
      if (!doctors || doctors.length === 0) {
        return { error: `No doctors found with specialty: ${specialty}` };
      }
      
      // Get availability for each doctor
      const results = doctors.map(doctor => {
        const availabilityData = appointmentService.getDoctorAvailability(doctor.id, startDate, endDate);
        if (!availabilityData) {
          return {
            doctor: {
              id: doctor.id,
              name: doctor.name,
              specialty: doctor.specialty
            },
            availability: [],
            calendar: "No availability data found."
          };
        }
        
        return {
          doctor: {
            id: doctor.id,
            name: doctor.name,
            specialty: doctor.specialty
          },
          availability: availabilityData.availability,
          calendar: formatEnhancedAvailabilityCalendar(availabilityData.availability, availabilityData.doctorName)
        };
      });
      
      return { results };
    }
    
    // If neither doctorId nor specialty is provided, return all doctors
    const doctors = appointmentService.getAllDoctors();
    return { doctors };
    
  } catch (error) {
    console.error("Error checking doctor availability:", error);
    return { error: String(error) };
  }
};

/**
 * Process the check_appointments tool request
 */
export const checkAppointments = (toolUseContent: any): AppointmentToolResponse => {
  try {
    const content = parseToolContent(toolUseContent);
    if (!content) {
      return { error: "Invalid tool content" };
    }
    
    const { doctorId, patientName } = content;
    
    // If doctorId is provided, get appointments for that doctor
    if (doctorId) {
      const doctor = appointmentService.getDoctorById(doctorId);
      if (!doctor) {
        return { error: "Doctor not found" };
      }
      
      const appointments = appointmentService.getDoctorAppointments(doctorId);
      
      return {
        doctor: {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty
        },
        appointments,
        calendar: appointmentService.formatAppointmentsCalendar(appointments)
      };
    }
    
    // If patientName is provided, get appointments for that patient
    if (patientName) {
      const appointments = appointmentService.getPatientAppointments(patientName);
      
      if (!appointments || appointments.length === 0) {
        return { message: `No appointments found for patient: ${patientName}` };
      }
      
      return {
        patient: patientName,
        appointments,
        calendar: appointmentService.formatAppointmentsCalendar(appointments)
      };
    }
    
    return { error: "Either doctorId or patientName must be provided" };
    
  } catch (error) {
    console.error("Error checking appointments:", error);
    return { error: String(error) };
  }
};

/**
 * Process the schedule_appointment tool request
 */
export const scheduleAppointment = (toolUseContent: any): AppointmentToolResponse => {
  try {
    const content = parseToolContent(toolUseContent);
    if (!content) {
      return { error: "Invalid tool content" };
    }
    
    const { doctorId, patientName, date, time, reason } = content;
    
    // Validate required fields
    if (!doctorId || !patientName || !date || !time || !reason) {
      return { error: "Missing required fields" };
    }
    
    // Create appointment
    const result = appointmentService.createAppointment(doctorId, patientName, date, time, reason);
    
    if (!result.success) {
      return { error: result.error };
    }
    
    // Get doctor info
    const doctor = appointmentService.getDoctorById(doctorId);
    if (!doctor) {
      return { error: "Doctor not found after creating appointment" };
    }
    
    return {
      success: true,
      appointment: result.appointment,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty
      },
      confirmationDetails: `Appointment scheduled for ${patientName} with ${doctor.name} on ${date} at ${time} for ${reason}.`
    };
    
  } catch (error) {
    console.error("Error scheduling appointment:", error);
    return { error: String(error) };
  }
};

/**
 * Process the cancel_appointment tool request
 */
export const cancelAppointment = (toolUseContent: any): AppointmentToolResponse => {
  try {
    const content = parseToolContent(toolUseContent);
    if (!content) {
      return { error: "Invalid tool content" };
    }
    
    const { appointmentId } = content;
    
    // Validate required fields
    if (!appointmentId) {
      return { error: "Appointment ID is required" };
    }
    
    // Find appointment before cancelling (for confirmation details)
    const appointment = appointmentService.getPatientAppointments("").find(apt => apt.id === appointmentId);
    
    if (!appointment) {
      return { error: "Appointment not found" };
    }
    
    // Get doctor info for confirmation
    const doctor = appointmentService.getDoctorById(appointment.doctorId);
    if (!doctor) {
      return { error: "Doctor not found for this appointment" };
    }
    
    // Cancel appointment
    const result = appointmentService.cancelAppointment(appointmentId);
    
    if (!result.success) {
      return { error: result.error };
    }
    
    return {
      success: true,
      message: result.message,
      cancelledAppointment: {
        id: appointmentId,
        patient: appointment.patientName,
        doctorName: doctor.name,
        date: appointment.date,
        time: appointment.time
      },
      confirmationDetails: `Appointment for ${appointment.patientName} with ${doctor.name} on ${appointment.date} at ${appointment.time} has been cancelled.`
    };
    
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return { error: String(error) };
  }
};

export const formatMonthCalendarView = (availability: AvailabilitySlot[], doctorName: string): string => {
  if (!availability || availability.length === 0) {
    return "No available slots found.";
  }
  
  // Group availability by month and year
  const monthGroups = new Map<string, { dates: Set<string>, availabilityMap: Map<string, string[]> }>();
  
  availability.forEach(slot => {
    const date = new Date(slot.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!monthGroups.has(monthYear)) {
      monthGroups.set(monthYear, { 
        dates: new Set(), 
        availabilityMap: new Map()
      });
    }
    
    const group = monthGroups.get(monthYear)!;
    group.dates.add(slot.date);
    group.availabilityMap.set(slot.date, slot.times);
  });
  
  // Generate calendar for each month
  const calendars: string[] = [];
  
  monthGroups.forEach((group, monthYear) => {
    const [year, month] = monthYear.split('-').map(n => parseInt(n));
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    
    // Add month header
    calendars.push(`### ${monthName} ${year} - Dr. ${doctorName}`);
    
    // Create the calendar grid header
    calendars.push("| Sun | Mon | Tue | Wed | Thu | Fri | Sat |");
    calendars.push("|-----|-----|-----|-----|-----|-----|-----|");
    
    // Determine first day of month and total days
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();
    
    // Calculate starting position (0 = Sunday, 6 = Saturday)
    const startingDay = firstDay.getDay();
    
    // Build calendar rows
    let calendarRow = "";
    let currentDay = 1;
    
    // Initial empty cells
    for (let i = 0; i < startingDay; i++) {
      calendarRow += "|   ";
    }
    
    // Fill in the days
    for (let i = startingDay; i < 7; i++) {
      const dateString = `${year}-${month.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}`;
      
      if (group.dates.has(dateString)) {
        const times = group.availabilityMap.get(dateString)!;
        // Add a cell with the date and a marker showing available slots
        calendarRow += `| **${currentDay}**✓ `;
      } else {
        calendarRow += `| ${currentDay} `;
      }
      
      currentDay++;
    }
    
    calendars.push(calendarRow + "|");
    
    // Remaining weeks
    while (currentDay <= totalDays) {
      calendarRow = "";
      
      for (let i = 0; i < 7; i++) {
        if (currentDay <= totalDays) {
          const dateString = `${year}-${month.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}`;
          
          if (group.dates.has(dateString)) {
            const times = group.availabilityMap.get(dateString)!;
            // Add a cell with the date and a marker showing available slots
            calendarRow += `| **${currentDay}**✓ `;
          } else {
            calendarRow += `| ${currentDay} `;
          }
          
          currentDay++;
        } else {
          calendarRow += "|   ";
        }
      }
      
      calendars.push(calendarRow + "|");
    }
    
    // Add availability details for dates with available slots
    calendars.push("\n**Available Time Slots:**");
    
    const sortedDates = Array.from(group.dates).sort();
    sortedDates.forEach(date => {
      const times = group.availabilityMap.get(date)!;
      const displayDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      
      calendars.push(`- **${displayDate}**: ${times.join(' | ')}`);
    });
    
    calendars.push("\n");
  });
  
  return calendars.join("\n");
};

export const formatEnhancedAvailabilityCalendar = (availability: AvailabilitySlot[], doctorName: string): string => {
  if (!availability || availability.length === 0) {
    return "No available slots found.";
  }
  
  // Get the table view from the service's function
  const tableView = appointmentService.formatAvailabilityCalendar(availability);
  
  // Get the calendar view from our new function
  const calendarView = formatMonthCalendarView(availability, doctorName);
  
  return `## Availability Table\n${tableView}\n\n## Calendar View\n${calendarView}`;
};
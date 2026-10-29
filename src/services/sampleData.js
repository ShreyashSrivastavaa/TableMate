import { DEFAULT_TABLES, RESERVATION_STATUS, RESERVATION_SOURCE } from '../domain/constants';
import { getTodayKolkata, addDaysToDate } from '../domain/time';

export function generateSampleReservations(baseDate = getTodayKolkata()) {
  const rawList = [
    // Past reservations (-3 to -1 days)
    { offset: -3, time: '12:30', name: 'Aarav Sharma', phone: '9820000001', guests: 2, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T1', notes: 'Anniversary lunch' },
    { offset: -3, time: '13:00', name: 'Priya Sundaram', phone: '9820000002', guests: 4, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T3', notes: '' },
    { offset: -3, time: '19:30', name: 'Rohan Mehta', phone: '9820000003', guests: 6, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T6', notes: 'Quiet corner preferred' },
    { offset: -2, time: '13:30', name: 'Ananya Iyer', phone: '9820000004', guests: 4, status: RESERVATION_STATUS.CANCELLED, tableId: null, notes: 'Cancelled due to travel' },
    { offset: -2, time: '20:00', name: 'Vikram Singh', phone: '9820000005', guests: 2, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T2', notes: '' },
    { offset: -2, time: '20:30', name: 'Deepa Krishnan', phone: '9820000006', guests: 8, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T7', notes: 'Birthday celebration' },
    { offset: -1, time: '13:00', name: 'Kavita Rao', phone: '9820000007', guests: 2, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T1', notes: 'Window table request' },
    { offset: -1, time: '19:00', name: 'Rahul Joshi', phone: '9820000008', guests: 4, status: RESERVATION_STATUS.REJECTED, tableId: null, notes: 'Requested outside hours' },
    { offset: -1, time: '20:00', name: 'Siddharth Nair', phone: '9820000009', guests: 4, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T4', notes: 'Spicy coastal dishes' },

    // Today's reservations (offset 0)
    { offset: 0, time: '12:30', name: 'Neha Deshmukh', phone: '9820000010', guests: 2, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T1', notes: 'Business lunch' },
    { offset: 0, time: '13:00', name: 'Manish Verma', phone: '9820000011', guests: 4, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T3', notes: '' },
    { offset: 0, time: '14:00', name: 'Aditi Chawla', phone: '9820000012', guests: 6, status: RESERVATION_STATUS.PENDING, tableId: 'T6', notes: 'Will need high chair' },
    { offset: 0, time: '19:00', name: 'Karan Malhotra', phone: '9820000013', guests: 2, status: RESERVATION_STATUS.PENDING, tableId: 'T2', notes: 'First time visiting' },
    { offset: 0, time: '19:30', name: 'Tanvi Pillai', phone: '9820000014', guests: 4, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T4', notes: 'Allergic to peanuts' },
    { offset: 0, time: '20:30', name: 'Arjun Nambiar', phone: '9820000015', guests: 4, status: RESERVATION_STATUS.PENDING, tableId: 'T5', notes: 'Outdoor patio please' },
    { offset: 0, time: '21:00', name: 'Sanya Mukherjee', phone: '9820000016', guests: 8, status: RESERVATION_STATUS.CANCELLED, tableId: null, notes: 'Flight delayed' },

    // Upcoming reservations (+1 to +7 days)
    { offset: 1, time: '13:00', name: 'Rohan Mehta', phone: '9820000003', guests: 4, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T3', notes: 'Repeat guest' },
    { offset: 1, time: '19:30', name: 'Varun Grover', phone: '9820000017', guests: 2, status: RESERVATION_STATUS.PENDING, tableId: 'T1', notes: 'Date night' },
    { offset: 1, time: '20:00', name: 'Smita Sen', phone: '9820000018', guests: 6, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T6', notes: '' },
    { offset: 2, time: '12:30', name: 'Priya Sundaram', phone: '9820000002', guests: 2, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T2', notes: 'Corner seating' },
    { offset: 2, time: '20:00', name: 'Karthik Raja', phone: '9820000019', guests: 4, status: RESERVATION_STATUS.PENDING, tableId: 'T4', notes: 'Family gathering' },
    { offset: 3, time: '19:30', name: 'Divya Hegde', phone: '9820000020', guests: 4, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T5', notes: 'Vegetarian options inquiry' },
    { offset: 4, time: '20:30', name: 'Naveen Reddy', phone: '9820000021', guests: 8, status: RESERVATION_STATUS.PENDING, tableId: 'T7', notes: 'Team celebration' },
    { offset: 5, time: '13:30', name: 'Meera Kulkarni', phone: '9820000022', guests: 2, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T1', notes: '' },
    { offset: 7, time: '20:00', name: 'Harish Bhatt', phone: '9820000023', guests: 6, status: RESERVATION_STATUS.CONFIRMED, tableId: 'T6', notes: 'Wine pairing request' },
  ];

  return rawList.map((item, index) => {
    const reservationDate = addDaysToDate(baseDate, item.offset);
    const refCode = (100100 + index).toString(36).toUpperCase().padStart(6, 'X');
    const reference = `TM-${refCode}`;
    const id = `res_${Date.now() - (25 - index) * 3600000}_${index}`;
    const createdAt = new Date(Date.now() - (10 - item.offset) * 86400000).toISOString();

    const statusHistory = [
      {
        from: null,
        to: RESERVATION_STATUS.PENDING,
        timestamp: createdAt,
        reason: 'Initial reservation request',
      },
    ];

    if (item.status !== RESERVATION_STATUS.PENDING) {
      statusHistory.push({
        from: RESERVATION_STATUS.PENDING,
        to: item.status,
        timestamp: new Date(Date.now() - (9 - item.offset) * 86400000).toISOString(),
        reason: item.status === RESERVATION_STATUS.CONFIRMED ? 'Confirmed by host' : 'Status updated',
      });
    }

    return {
      id,
      reference,
      name: item.name,
      phone: item.phone,
      date: reservationDate,
      time: item.time,
      guests: item.guests,
      notes: item.notes,
      status: item.status,
      source: RESERVATION_SOURCE.SAMPLE,
      tableId: item.tableId,
      createdAt,
      updatedAt: createdAt,
      statusHistory,
      reminderDue: `${reservationDate}T${item.time}:00+05:30`,
    };
  });
}

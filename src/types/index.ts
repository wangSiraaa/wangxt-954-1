export interface ShipType {
  id: string;
  name: string;
  capacity: number;
  description: string;
  safetyCertExpiry: string;
}

export interface Captain {
  id: string;
  name: string;
  licenseNo: string;
  licenseExpiry: string;
  phone: string;
  status: "on-duty" | "off-duty" | "leave";
}

export interface Dock {
  id: string;
  name: string;
  capacity: number;
  location: string;
  status: "open" | "closed" | "maintenance";
}

export interface Route {
  id: string;
  name: string;
  startDockId: string;
  endDockId: string;
  duration: number;
  distance: number;
  description: string;
}

export interface TideWindow {
  id: string;
  date: string;
  highTideTimes: string[];
  lowTideTimes: string[];
  minWaterLevel: number;
  maxWaterLevel: number;
  isSailable: boolean;
}

export interface CrewSchedule {
  id: string;
  captainId: string;
  shipId: string;
  scheduleId: string;
  date: string;
  shift: "morning" | "afternoon" | "evening";
  status: "scheduled" | "completed" | "cancelled";
}

export interface Ship {
  id: string;
  name: string;
  shipTypeId: string;
  capacity: number;
  status: "available" | "maintenance" | "in-operation" | "docked";
  currentDockId?: string;
  lastInspectionDate: string;
  nextInspectionDate: string;
}

export interface Maintenance {
  id: string;
  shipId: string;
  startDate: string;
  endDate: string;
  reason: string;
  isActive: boolean;
  type: "routine" | "repair" | "inspection";
  inspector?: string;
  notes?: string;
}

export interface Schedule {
  id: string;
  shipId: string;
  routeId: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  ticketPrice: number;
  availableSeats: number;
  totalSeats: number;
  dockCapacity: number;
  tideWindowId?: string;
  status: "scheduled" | "cancelled" | "completed" | "in-progress";
  cancellationReason?: string;
}

export interface StopDay {
  date: string;
  reason: string;
  type: "weather" | "tide" | "emergency" | "scheduled";
  affectedRoutes?: string[];
}

export interface Passenger {
  id: string;
  name: string;
  idCard: string;
  phone: string;
  birthDate?: string;
  gender?: "male" | "female";
}

export interface Insurance {
  id: string;
  name: string;
  price: number;
  coverage: string;
  duration: number;
}

export interface WaitingList {
  id: string;
  scheduleId: string;
  passengerIds: string[];
  ticketCount: number;
  contactPhone: string;
  status: "waiting" | "converted" | "expired" | "cancelled";
  position: number;
  createdAt: string;
  expiresAt: string;
}

export interface RescheduleRecord {
  id: string;
  orderId: string;
  fromScheduleId: string;
  toScheduleId: string;
  reason: string;
  fee: number;
  createdAt: string;
  operator?: string;
}

export interface RefundDetail {
  id: string;
  orderId: string;
  amount: number;
  fee: number;
  netAmount: number;
  reason: string;
  type: "passenger-initiated" | "flight-cancelled" | "reschedule-fee";
  status: "pending" | "completed" | "rejected";
  createdAt: string;
  processedAt?: string;
}

export interface GroupTicket {
  id: string;
  orderId: string;
  groupName: string;
  leaderName: string;
  leaderPhone: string;
  passengerCount: number;
}

export interface Order {
  id: string;
  scheduleId: string;
  orderNo: string;
  touristName: string;
  ticketCount: number;
  totalPrice: number;
  insuranceAmount: number;
  status: "pending" | "boarded" | "refunded" | "cancelled" | "rescheduled";
  passengerIds: string[];
  passengers: Passenger[];
  insuranceId?: string;
  groupTicket?: GroupTicket;
  rescheduleHistory: RescheduleRecord[];
  qrCode: string;
  createdAt: string;
  paidAt?: string;
  cancellationReason?: string;
}

export interface BoardingRecord {
  id: string;
  orderId: string;
  scheduleId: string;
  passengerIds: string[];
  boardedAt: string;
  verifiedBy: string;
  qrCodeScanned: boolean;
  notes?: string;
}

export interface ShipInspection {
  id: string;
  shipId: string;
  inspectionDate: string;
  inspector: string;
  items: {
    name: string;
    status: "pass" | "fail" | "na";
    notes?: string;
  }[];
  overallResult: "pass" | "fail";
  nextInspectionDate: string;
  notes?: string;
}

export interface OperationStats {
  date: string;
  routeId: string;
  totalSchedules: number;
  cancelledSchedules: number;
  totalPassengers: number;
  totalRevenue: number;
  refundAmount: number;
  occupancyRate: number;
  refundRate: number;
}

export type Role = "dispatcher" | "tourist" | "dock-staff";

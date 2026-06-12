export interface Ship {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "maintenance";
}

export interface Maintenance {
  id: string;
  shipId: string;
  startDate: string;
  endDate: string;
  reason: string;
  isActive: boolean;
}

export interface Schedule {
  id: string;
  shipId: string;
  date: string;
  departureTime: string;
  ticketPrice: number;
  availableSeats: number;
  totalSeats: number;
}

export interface StopDay {
  date: string;
  reason: string;
}

export interface Order {
  id: string;
  scheduleId: string;
  touristName: string;
  ticketCount: number;
  totalPrice: number;
  status: "pending" | "boarded" | "refunded";
  createdAt: string;
}

export interface BoardingRecord {
  id: string;
  orderId: string;
  scheduleId: string;
  boardedAt: string;
}

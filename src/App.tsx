import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import RoleSelect from "@/pages/RoleSelect";
import ShipManage from "@/pages/dispatcher/ShipManage";
import MaintenanceManage from "@/pages/dispatcher/MaintenanceManage";
import ScheduleManage from "@/pages/dispatcher/ScheduleManage";
import StopDayCalendar from "@/pages/dispatcher/StopDayCalendar";
import DispatcherCalendar from "@/pages/dispatcher/DispatcherCalendar";
import SeatMatrix from "@/pages/dispatcher/SeatMatrix";
import OrderDetail from "@/pages/dispatcher/OrderDetail";
import WaitingListConvert from "@/pages/dispatcher/WaitingListConvert";
import StopDayDisposal from "@/pages/dispatcher/StopDayDisposal";
import RefundDetails from "@/pages/dispatcher/RefundDetails";
import ShipInspection from "@/pages/dispatcher/ShipInspection";
import OperationStats from "@/pages/dispatcher/OperationStats";
import ScheduleQuery from "@/pages/tourist/ScheduleQuery";
import MyOrders from "@/pages/tourist/MyOrders";
import BoardingRegister from "@/pages/dock/BoardingRegister";
import BoardingRecords from "@/pages/dock/BoardingRecords";
import BoardingVerification from "@/pages/dock/BoardingVerification";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/dispatcher" element={<Layout role="dispatcher" />}>
          <Route index element={<DispatcherCalendar />} />
          <Route path="calendar" element={<DispatcherCalendar />} />
          <Route path="ships" element={<ShipManage />} />
          <Route path="maintenance" element={<MaintenanceManage />} />
          <Route path="schedule" element={<ScheduleManage />} />
          <Route path="seat-matrix" element={<SeatMatrix />} />
          <Route path="orders" element={<OrderDetail />} />
          <Route path="waiting-list" element={<WaitingListConvert />} />
          <Route path="stop-days" element={<StopDayCalendar />} />
          <Route path="stop-disposal" element={<StopDayDisposal />} />
          <Route path="refunds" element={<RefundDetails />} />
          <Route path="inspection" element={<ShipInspection />} />
          <Route path="stats" element={<OperationStats />} />
        </Route>
        <Route path="/tourist" element={<Layout role="tourist" />}>
          <Route index element={<ScheduleQuery />} />
          <Route path="order" element={<MyOrders />} />
        </Route>
        <Route path="/dock" element={<Layout role="dock" />}>
          <Route index element={<BoardingVerification />} />
          <Route path="verification" element={<BoardingVerification />} />
          <Route path="register" element={<BoardingRegister />} />
          <Route path="records" element={<BoardingRecords />} />
        </Route>
      </Routes>
    </Router>
  );
}

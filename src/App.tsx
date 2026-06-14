import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
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
import { initDemoData, clearAllStores } from "@/utils/demoData";

function AppInitializer() {
  const location = useLocation();
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const needReset = searchParams.get("reset") === "1" || searchParams.get("reset") === "true";
      if (needReset) {
        clearAllStores();
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      const result = initDemoData();
      if (result) {
        console.log("[演示数据初始化]", result.message);
        if (result.stats) console.log("[演示数据-统计]", JSON.stringify(result.stats, null, 2));
        if (result.errors && result.errors.length > 0) console.log("[演示数据-问题]", result.errors);
      }
    } catch (e) {
      console.error("初始化演示数据失败:", e);
    }
  }, [location.search]);
  return null;
}

export default function App() {

  return (
    <Router>
      <AppInitializer />
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

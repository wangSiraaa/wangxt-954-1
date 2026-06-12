import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import RoleSelect from "@/pages/RoleSelect";
import ShipManage from "@/pages/dispatcher/ShipManage";
import MaintenanceManage from "@/pages/dispatcher/MaintenanceManage";
import ScheduleManage from "@/pages/dispatcher/ScheduleManage";
import StopDayCalendar from "@/pages/dispatcher/StopDayCalendar";
import ScheduleQuery from "@/pages/tourist/ScheduleQuery";
import MyOrders from "@/pages/tourist/MyOrders";
import BoardingRegister from "@/pages/dock/BoardingRegister";
import BoardingRecords from "@/pages/dock/BoardingRecords";
import { initDemoData } from "@/utils/initDemoData";

export default function App() {
  useEffect(() => {
    initDemoData();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/dispatcher" element={<Layout role="dispatcher" />}>
          <Route index element={<ShipManage />} />
          <Route path="maintenance" element={<MaintenanceManage />} />
          <Route path="schedule" element={<ScheduleManage />} />
          <Route path="stop-days" element={<StopDayCalendar />} />
        </Route>
        <Route path="/tourist" element={<Layout role="tourist" />}>
          <Route index element={<ScheduleQuery />} />
          <Route path="order" element={<MyOrders />} />
        </Route>
        <Route path="/dock" element={<Layout role="dock" />}>
          <Route index element={<BoardingRegister />} />
          <Route path="records" element={<BoardingRecords />} />
        </Route>
      </Routes>
    </Router>
  );
}

import {
  FaHome,
  FaUsers,
  FaCalendarAlt,
  FaRoute,
  FaCog,
} from "react-icons/fa";

import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h2 className="logo">🐶 Backyard Relief</h2>

      <nav>
        <NavLink to="/"> <FaHome /> Dashboard </NavLink>
        <NavLink to="/customers"> <FaUsers /> Customers </NavLink>
        <NavLink to="/schedule"> <FaCalendarAlt /> Schedule </NavLink>
        <NavLink to="/routes"> <FaRoute /> Routes </NavLink>
        <NavLink to="/settings"> <FaCog /> Settings </NavLink>
      </nav>
    </div>
  );
}
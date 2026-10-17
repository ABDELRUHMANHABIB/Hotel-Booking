import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import RoomDetails from "./pages/RoomDetails"
import Rooms from "./pages/Rooms"
import BookingResult from "./pages/BookingResult"
import OfferDetails from "./pages/OfferDetails"
import Footer from "./components/Footer"
import OwnerDashboard from "./pages/OwnerDashboard"
import { Routes, Route, useLocation } from "react-router-dom"

function App() {
  const isOwnerPath = useLocation().pathname.startsWith("/owner");
  return (
    <div>
      {!isOwnerPath && <Navbar />}
      <div className='min-h-[70vh]'>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:roomId" element={<RoomDetails />} />
          <Route path="/offers/:offerId" element={<OfferDetails />} />
          <Route path="/booking/success" element={<BookingResult />} />
          <Route path="/booking/cancelled" element={<BookingResult />} />
          <Route path="/owner" element={<OwnerDashboard />} />
        </Routes>
      </div>
      {!isOwnerPath && <Footer />}
    </div>
  )
}

export default App

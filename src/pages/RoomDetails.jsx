import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { assets, facilityIcons } from "../assets/assets";
import { apiUrl, readApiResponse } from "../utils/api";
import { fetchRooms } from "../utils/rooms";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNextDate = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return getLocalDateString(date);
};

const getNightCount = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  const [inYear, inMonth, inDay] = checkIn.split("-").map(Number);
  const [outYear, outMonth, outDay] = checkOut.split("-").map(Number);
  const checkInUtc = Date.UTC(inYear, inMonth - 1, inDay);
  const checkOutUtc = Date.UTC(outYear, outMonth - 1, outDay);

  return Math.max(0, (checkOutUtc - checkInUtc) / 86_400_000);
};

function RoomDetails() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [bookingError, setBookingError] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const today = getLocalDateString();
  const nights = getNightCount(checkIn, checkOut);
  const totalPrice = nights * (room?.pricePerNight ?? 0);

  useEffect(() => {
    const controller = new AbortController();
    fetchRooms({ signal: controller.signal })
      .then((rooms) => {
        setRoom(rooms.find((item) => item._id === roomId) || null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [roomId]);

  if (!room) {
    return (
      <main className="px-5 pb-20 pt-32 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-4xl rounded-2xl bg-slate-50 p-8 text-center">
          <h1 className="font-playfair text-3xl font-semibold text-slate-900">
            {isLoading ? "Loading room..." : loadError ? "Rooms unavailable" : "Room not found"}
          </h1>
          <p className="mt-3 text-slate-600">
            {loadError || "This room may no longer be available."}
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const handleBooking = async (event) => {
    event.preventDefault();
    setBookingError("");

    if (!room.isAvailable || nights < 1) {
      setBookingError("Choose a valid check-in and check-out date.");
      return;
    }

    setIsBooking(true);
    try {
      const response = await fetch(apiUrl("/api/create-checkout-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room._id,
          checkIn,
          checkOut,
          guests: Number(guests),
        }),
      });
      const result = await readApiResponse(response);

      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setBookingError(error.message);
      setIsBooking(false);
    }
  };

  return (
    <main className="bg-white px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
        >
          <span aria-hidden="true">←</span> Back to featured hotels
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              {room.hotel.city}
            </p>
            <h1 className="font-playfair mt-1 text-3xl font-semibold text-slate-900 sm:text-4xl">
              {room.hotel.name}
            </h1>
            <p className="mt-2 text-slate-600">{room.hotel.address}</p>
          </div>
          <p className="text-sm text-slate-500">
            Room type:{" "}
            <span className="font-medium text-slate-800">{room.roomType}</span>
          </p>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={room.images[selectedImage]}
              alt={`${room.hotel.name} ${room.roomType} room`}
              className="aspect-[4/3] h-full w-full object-cover md:aspect-[16/10]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
            {room.images.slice(1).map((image, index) => {
              const imageIndex = index + 1;
              return (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(imageIndex)}
                  aria-label={`Show room photo ${imageIndex + 1}`}
                  aria-pressed={selectedImage === imageIndex}
                  className={`overflow-hidden rounded-xl bg-slate-100 ring-offset-2 transition focus:outline-none focus:ring-2 focus:ring-primary ${
                    selectedImage === imageIndex ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <img
                    src={image}
                    alt=""
                    className="aspect-[4/3] h-full w-full object-cover transition hover:scale-105"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_360px]">
          <section>
            <div className="border-b border-slate-200 pb-7">
              <h2 className="font-playfair text-2xl font-semibold text-slate-900">
                About this room
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                Enjoy a comfortable {room.roomType.toLowerCase()} stay at{" "}
                {room.hotel.name}, with thoughtful amenities and a convenient
                location in {room.hotel.city}.
              </p>
              <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
                <img
                  src={assets.locationFilledIcon}
                  alt=""
                  className="h-4 w-4"
                />
                <span>
                  {room.hotel.address}, {room.hotel.city}
                </span>
              </div>
            </div>

            <div className="border-b border-slate-200 py-7">
              <h2 className="font-playfair text-2xl font-semibold text-slate-900">
                Room amenities
              </h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {(room.amenities || []).map((amenity) => (
                  <li
                    key={amenity}
                    className="flex items-center gap-3 text-slate-700"
                  >
                    <img
                      src={facilityIcons[amenity]}
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                    <span>{amenity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
            <p className="text-sm text-slate-500">Price per night</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              ${room.pricePerNight}
              <span className="text-sm font-normal text-slate-500"> / night</span>
            </p>

            <form onSubmit={handleBooking} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Check-in
                  <input
                    type="date"
                    required
                    min={today}
                    value={checkIn}
                    onChange={(event) => setCheckIn(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Check-out
                  <input
                    type="date"
                    required
                    min={checkIn ? getNextDate(checkIn) : getNextDate(today)}
                    value={checkOut}
                    onChange={(event) => setCheckOut(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Guests
                <select
                  value={guests}
                  onChange={(event) => setGuests(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {[1, 2, 3, 4].map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </label>

              {nights > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      ${room.pricePerNight} × {nights}{" "}
                      {nights === 1 ? "night" : "nights"}
                    </span>
                    <span>${totalPrice}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>Total</span>
                    <span>${totalPrice}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!room.isAvailable || isBooking}
                className="w-full rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {!room.isAvailable
                  ? "Room unavailable"
                  : isBooking
                    ? "Connecting to secure checkout..."
                    : "Book and pay by card"}
              </button>

              <p className="text-center text-xs leading-5 text-slate-500">
                Secure card payment is processed by Stripe. Your booking is
                confirmed after payment succeeds.
              </p>

              {bookingError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {bookingError}
                </p>
              )}
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default RoomDetails;

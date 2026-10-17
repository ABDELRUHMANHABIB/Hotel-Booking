import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { exclusiveOffers } from "../assets/assets";
import { readApiResponse } from "../utils/api";
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

function OfferDetails() {
  const { offerId } = useParams();
  const offer = exclusiveOffers.find((item) => String(item._id) === offerId);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomsError, setRoomsError] = useState("");
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [bookingError, setBookingError] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const room = availableRooms.find((item) => item._id === roomId);
  const today = getLocalDateString();
  const nights = getNightCount(checkIn, checkOut);
  const originalPrice = nights * (room?.pricePerNight ?? 0);
  const discountedNightPrice = room
    ? Math.round(room.pricePerNight * 100 * (100 - (offer?.priceOff ?? 0)) / 100)
    : 0;
  const totalPrice = offer
    ? (discountedNightPrice * nights) / 100
    : 0;
  const savings = originalPrice - totalPrice;

  useEffect(() => {
    const controller = new AbortController();
    fetchRooms({ signal: controller.signal })
      .then((rooms) => {
        const available = rooms.filter((item) => item.isAvailable);
        setAvailableRooms(available);
        setRoomId((currentId) =>
          available.some((roomItem) => roomItem._id === currentId)
            ? currentId
            : available[0]?._id ?? "",
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") setRoomsError(error.message);
      });
    return () => controller.abort();
  }, []);

  const handleBooking = async (event) => {
    event.preventDefault();
    setBookingError("");

    if (!room || nights < 1) {
      setBookingError("Choose a room and valid check-in and check-out dates.");
      return;
    }

    setIsBooking(true);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room._id,
          offerId: String(offer._id),
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

  if (!offer) {
    return (
      <main className="px-5 pb-20 pt-32 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-4xl rounded-2xl bg-slate-50 p-8 text-center">
          <h1 className="font-playfair text-3xl font-semibold text-slate-900">
            Offer not found
          </h1>
          <p className="mt-3 text-slate-600">
            This offer may no longer be available.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Back to offers
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
        >
          <span aria-hidden="true">←</span> Back to exclusive offers
        </Link>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="relative min-h-[280px] overflow-hidden bg-slate-900 sm:min-h-[380px]">
              <img
                src={offer.image}
                alt={offer.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
              <span className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow">
                Save {offer.priceOff}%
              </span>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/80">
                  Exclusive offer
                </p>
                <h1 className="font-playfair mt-2 text-3xl font-semibold sm:text-4xl">
                  {offer.title}
                </h1>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-base leading-7 text-slate-600">
                {offer.description}
              </p>
              <div className="mt-6 rounded-xl bg-blue-50 p-5">
                <p className="font-semibold text-slate-900">
                  Your {offer.priceOff}% offer is applied at checkout
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Choose a room and your stay dates to see the discounted total.
                  The final amount is calculated and verified securely on our
                  payment server.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
            <h2 className="font-playfair text-2xl font-semibold text-slate-900">
              Book with this offer
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Save {offer.priceOff}% on your room rate.
            </p>

            {roomsError ? (
              <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {roomsError}
              </p>
            ) : availableRooms.length === 0 ? (
              <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                There are no available rooms to book right now.
              </p>
            ) : (
              <form onSubmit={handleBooking} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Room
                  <select
                    value={roomId}
                    onChange={(event) => setRoomId(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    {availableRooms.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.hotel.name} · {item.roomType} · $
                        {item.pricePerNight}/night
                      </option>
                    ))}
                  </select>
                </label>

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

                {nights > 0 && room && (
                  <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>
                        ${room.pricePerNight} × {nights}{" "}
                        {nights === 1 ? "night" : "nights"}
                      </span>
                      <span>${originalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>Offer discount ({offer.priceOff}%)</span>
                      <span>−${savings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
                      <span>Total after discount</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!room || isBooking}
                  className="w-full rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isBooking
                    ? "Connecting to secure checkout..."
                    : "Book and pay with offer"}
                </button>

                <p className="text-center text-xs leading-5 text-slate-500">
                  Stripe securely processes your card payment. The offer
                  discount is included in the checkout total.
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
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default OfferDetails;
